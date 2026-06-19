import { Router, type Request } from "express";
import { requireAuth } from "@clerk/express";
import { randomBytes } from "crypto";
import { requireSupabase } from "../lib/supabase.js";
import { logger, errCode } from "../lib/logger.js";

const router = Router();

const TOKEN_RE = /^[0-9a-f]{64}$/;

function userId(req: Request): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req as any).auth.userId as string;
}

function buildShareUrl(req: Request, token: string): string {
  const domains = process.env.REPLIT_DOMAINS?.split(",");
  if (domains?.[0]) {
    return `https://${domains[0].trim()}/shared/${token}`;
  }
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ??
    (req.headers.host as string | undefined) ??
    "localhost";
  return `${proto}://${host}/shared/${token}`;
}

// POST /api/shares — create a share link (auth required)
router.post("/", requireAuth(), async (req, res) => {
  const db = requireSupabase();
  const { expiresInDays, includeNotes, child_id } = req.body as {
    expiresInDays: unknown;
    includeNotes: unknown;
    child_id?: string;
  };

  if (!([7, 30, 90] as unknown[]).includes(expiresInDays)) {
    res.status(400).json({ error: "expiresInDays must be 7, 30, or 90" });
    return;
  }

  // Resolve child_id: use the supplied value or fall back to the user's first
  // non-archived child so the share link is always scoped to a specific child.
  let resolvedChildId: string | null = child_id ?? null;
  if (!resolvedChildId) {
    const { data: dc } = await db
      .from("children")
      .select("id")
      .eq("user_id", userId(req))
      .eq("is_archived", false)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    resolvedChildId = (dc as { id: string } | null)?.id ?? null;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + (expiresInDays as number) * 86_400_000,
  ).toISOString();

  const { error } = await db.from("shares").insert({
    token,
    user_id: userId(req),
    expires_at: expiresAt,
    include_notes: includeNotes === true,
    revoked: false,
    ...(resolvedChildId ? { child_id: resolvedChildId } : {}),
  });

  if (error) {
    logger.error({ err: errCode(error) }, "POST /shares insert failed");
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  res.json({ url: buildShareUrl(req, token), token, expiresAt });
});

// GET /api/shares — list caller's active shares (auth required)
router.get("/", requireAuth(), async (req, res) => {
  const db = requireSupabase();
  try {
    const { data, error } = await db
      .from("shares")
      .select("token, expires_at, include_notes, revoked, created_at, child_id")
      .eq("user_id", userId(req))
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (e) {
    logger.error({ err: errCode(e) }, "GET /shares failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/shares/:token — public, no auth required
router.get("/:token", async (req, res) => {
  const db = requireSupabase();
  const { token } = req.params;

  if (!TOKEN_RE.test(token)) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  try {
    const { data: share, error: shareErr } = await db
      .from("shares")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (shareErr) throw shareErr;
    if (!share) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (share.revoked) {
      res.status(410).json({ error: "revoked" });
      return;
    }
    if (new Date(share.expires_at as string) < new Date()) {
      res.status(410).json({ error: "expired" });
      return;
    }

    const uid = share.user_id as string;
    const includeNotes = share.include_notes as boolean;
    const shareChildId = share.child_id as string | null;

    type ChildRow = { id: string; name: string; baseline: unknown };

    // ── Phase 1: children + shared (non-child-scoped) data ────────────────────
    const [childrenRes, medsRes, medLibRes, milestonesRes] = await Promise.all([
      db
        .from("children")
        .select("id, name, baseline")
        .eq("user_id", uid)
        .eq("is_archived", false)
        .order("sort_order", { ascending: true }),
      db.from("medications").select("data").eq("user_id", uid),
      db.from("med_library").select("data").eq("user_id", uid),
      db.from("milestones").select("data").eq("user_id", uid),
    ]);

    const children = (childrenRes.data ?? []) as ChildRow[];
    // Resolve child: prefer the share's pinned child_id, fall back to first child.
    const resolvedChild: ChildRow | null =
      shareChildId
        ? (children.find((c) => c.id === shareChildId) ?? children[0] ?? null)
        : (children[0] ?? null);

    // ── Phase 2: child-scoped data ─────────────────────────────────────────────
    // symptom_logs and ptec_logs carry a child_id column — filter to the
    // resolved child when one exists so the viewer sees only that child's data.
    const childFilter = resolvedChild?.id;
    const [logsRes, ptecRes] = await Promise.all([
      childFilter
        ? db.from("symptom_logs").select("data").eq("user_id", uid).eq("child_id", childFilter)
        : db.from("symptom_logs").select("data").eq("user_id", uid),
      childFilter
        ? db.from("ptec_logs").select("data").eq("user_id", uid).eq("child_id", childFilter)
        : db.from("ptec_logs").select("data").eq("user_id", uid),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let logs: any[] = (logsRes.data ?? []).map((r) => r.data);
    if (!includeNotes) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logs = logs.map((l: any) => {
        const copy = { ...l };
        delete copy.notes;
        return copy;
      });
    }

    res.json({
      child: resolvedChild ? { id: resolvedChild.id, name: resolvedChild.name } : null,
      logs,
      ptecLogs: (ptecRes.data ?? []).map((r) => r.data),
      medications: (medsRes.data ?? []).map((r) => r.data),
      medLibrary: (medLibRes.data ?? []).map((r) => r.data),
      baseline: resolvedChild?.baseline ?? null,
      milestones: (milestonesRes.data ?? []).map((r) => r.data),
      meta: {
        expiresAt: share.expires_at as string,
        includeNotes: share.include_notes as boolean,
      },
    });
  } catch (e) {
    logger.error({ err: errCode(e) }, "GET /shares/:token failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/shares/:token/revoke — revoke a share (auth required, must own it)
router.post("/:token/revoke", requireAuth(), async (req, res) => {
  const db = requireSupabase();
  const token = req.params["token"] as string;

  if (!TOKEN_RE.test(token)) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }

  try {
    const { data, error } = await db
      .from("shares")
      .update({ revoked: true })
      .eq("token", token)
      .eq("user_id", userId(req))
      .select("token")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      res.status(404).json({ error: "Share not found" });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    logger.error({ err: errCode(e) }, "POST /shares/:token/revoke failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
