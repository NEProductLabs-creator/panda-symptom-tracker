/**
 * Native push token management.
 *
 * POST /api/push/register-native   — upsert an FCM/APNs device token
 * POST /api/push/unregister-native — delete token(s) for the authenticated user
 */

import { Router, type Request } from "express";
import { requireAuth } from "../middlewares/supabaseAuth.js";
import { requireSupabase } from "../lib/supabase.js";
import { logger, errCode } from "../lib/logger.js";

const router = Router();

function userId(req: Request): string {
  return req.userId as string;
}

// ── POST /api/push/register-native ────────────────────────────────────────────
router.post("/register-native", requireAuth, async (req, res) => {
  const db = requireSupabase();
  const uid = userId(req);

  const { token, platform, reminder_time, timezone } = req.body as {
    token: string;
    platform: string;
    reminder_time?: string;
    timezone?: string;
  };

  if (!token || !platform || !["ios", "android"].includes(platform)) {
    res.status(400).json({ error: "Missing or invalid fields: token (string), platform (ios|android)" });
    return;
  }

  const { error } = await db.from("push_subscriptions_native").upsert(
    {
      user_id: uid,
      device_token: token,
      platform,
      reminder_time: reminder_time ?? "20:00",
      timezone: timezone ?? "UTC",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_token" },
  );

  if (error) {
    logger.error({ err: errCode(error) }, "POST /push/register-native failed");
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  res.json({ ok: true });
});

// ── POST /api/push/unregister-native ─────────────────────────────────────────
// Removes all native registrations (or just one token) for the authenticated user.
router.post("/unregister-native", requireAuth, async (req, res) => {
  const db = requireSupabase();
  const uid = userId(req);
  const { token } = req.body as { token?: string };

  // Build the delete query — optionally scoped to a specific token
  const baseQuery = db.from("push_subscriptions_native").delete().eq("user_id", uid);
  const query = token ? baseQuery.eq("device_token", token) : baseQuery;

  const { error } = await query;

  if (error) {
    logger.error({ err: errCode(error) }, "POST /push/unregister-native failed");
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  res.json({ ok: true });
});

export default router;
