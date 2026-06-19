import { Router, type Request } from "express";
import { requireAuth } from "../middlewares/supabaseAuth.js";
import webpush from "web-push";
import { requireSupabase } from "../lib/supabase.js";
import { logger, errCode } from "../lib/logger.js";

const router = Router();

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@panstrack.app";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} else {
  logger.warn("VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set — push notifications unavailable");
}

function userId(req: Request): string {
  return req.userId as string;
}

// POST /api/notifications/subscribe (auth required)
router.post("/subscribe", requireAuth, async (req, res) => {
  if (!vapidPublicKey || !vapidPrivateKey) {
    res.status(503).json({ error: "Push notifications not configured" });
    return;
  }

  const db = requireSupabase();
  const uid = userId(req);
  const { endpoint, keys, reminderTime, timezone, inactivityNudge } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    reminderTime?: string;
    timezone?: string;
    inactivityNudge?: boolean;
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "Missing subscription fields" });
    return;
  }

  const { error } = await db.from("push_subscriptions").upsert(
    {
      user_id: uid,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      reminder_time: reminderTime ?? "20:00",
      timezone: timezone ?? "UTC",
      inactivity_nudge: inactivityNudge ?? true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    logger.error({ err: errCode(error) }, "POST /notifications/subscribe failed");
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  res.json({ ok: true });
});

// POST /api/notifications/unsubscribe (auth required)
router.post("/unsubscribe", requireAuth, async (req, res) => {
  const db = requireSupabase();
  const uid = userId(req);

  const { error } = await db.from("push_subscriptions").delete().eq("user_id", uid);

  if (error) {
    logger.error({ err: errCode(error) }, "POST /notifications/unsubscribe failed");
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  res.json({ ok: true });
});

// POST /api/notifications/test (auth required, dev only)
router.post("/test", requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    res.status(503).json({ error: "Push notifications not configured" });
    return;
  }

  const db = requireSupabase();
  const uid = userId(req);

  const { data: sub, error } = await db
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  if (error || !sub) {
    res.status(404).json({ error: "No subscription found for this user" });
    return;
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint as string,
        keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
      },
      JSON.stringify({
        title: "PANS Tracker",
        body: "Test notification — push is working! 🎉",
        url: "/",
      }),
    );
    res.json({ ok: true });
  } catch (e) {
    logger.error({ err: errCode(e) }, "POST /notifications/test send failed");
    res.status(500).json({ error: "Push send failed" });
  }
});

export default router;
