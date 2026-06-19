/**
 * send-reminders.ts
 *
 * Run every minute (via the "Reminder: Daily push" workflow loop).
 * For each push subscription whose reminder_time matches the current
 * minute in the subscriber's timezone, checks whether the user has
 * already logged today; if not, sends a "Daily check-in" push.
 *
 * Expired subscriptions (HTTP 410) are removed automatically.
 */

import webpush from "web-push";
import { requireSupabase } from "../lib/supabase.js";
import { logger, errCode } from "../lib/logger.js";

// ── VAPID setup ───────────────────────────────────────────────────────────────

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@panstrack.app";

if (!vapidPublicKey || !vapidPrivateKey) {
  logger.error("VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set — aborting");
  process.exit(1);
}

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

// ── Date/time helpers ─────────────────────────────────────────────────────────

/** Returns "HH:MM" (24-hour, zero-padded) in the given IANA timezone. */
function currentHHMM(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
  }
}

/** Returns "YYYY-MM-DD" in the given IANA timezone. */
function todayDate(tz: string): string {
  try {
    // en-CA locale produces YYYY-MM-DD naturally
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const db = requireSupabase();

  // 1. Load all subscriptions
  const { data: subs, error: subErr } = await db
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth, reminder_time, timezone");

  if (subErr) {
    logger.error({ err: errCode(subErr) }, "send-reminders: failed to fetch subscriptions");
    process.exit(1);
  }

  if (!subs || subs.length === 0) {
    logger.info("send-reminders: no subscriptions — nothing to do");
    return;
  }

  let sent = 0;
  let skipped = 0;

  for (const sub of subs) {
    const tz: string = (sub.timezone as string) || "UTC";
    const reminderTime: string = (sub.reminder_time as string) || "20:00";
    const now = currentHHMM(tz);

    // 2. Does this subscriber's reminder time match the current minute?
    if (now !== reminderTime) {
      skipped++;
      continue;
    }

    // 3. Has the user already logged today?
    const today = todayDate(tz);
    const { count, error: logErr } = await db
      .from("symptom_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", sub.user_id as string)
      .eq("date", today);

    if (logErr) {
      logger.warn(
        { err: errCode(logErr), userId: sub.user_id },
        "send-reminders: could not check log count — skipping",
      );
      continue;
    }

    if ((count ?? 0) > 0) {
      skipped++;
      logger.debug({ userId: sub.user_id, today }, "send-reminders: already logged — skipping");
      continue;
    }

    // 4. Send the push notification
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint as string,
          keys: {
            p256dh: sub.p256dh as string,
            auth: sub.auth as string,
          },
        },
        JSON.stringify({
          title: "Daily check-in",
          body: "Take a minute to log today.",
          url: "/log",
        }),
      );
      sent++;
      logger.info({ userId: sub.user_id }, "send-reminders: push sent");
    } catch (e) {
      // HTTP 410: subscription is expired or was revoked — remove it
      if (
        typeof e === "object" &&
        e !== null &&
        "statusCode" in e &&
        (e as { statusCode: number }).statusCode === 410
      ) {
        logger.warn({ userId: sub.user_id }, "send-reminders: subscription expired (410) — deleting");
        await db.from("push_subscriptions").delete().eq("user_id", sub.user_id as string);
      } else {
        logger.warn({ err: errCode(e), userId: sub.user_id }, "send-reminders: push send failed");
      }
    }
  }

  logger.info(
    { sent, skipped, total: subs.length },
    "send-reminders: run complete",
  );
}

main().catch((e) => {
  logger.error({ err: errCode(e) }, "send-reminders: fatal error");
  process.exit(1);
});
