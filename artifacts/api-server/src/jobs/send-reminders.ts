/**
 * send-reminders.ts
 *
 * Run every minute (via the "Reminder: Daily push" workflow loop).
 *
 * For each push subscription whose reminder_time matches the current minute in
 * the subscriber's timezone, checks whether the user has already logged today;
 * if not, sends a "Daily check-in" notification.
 *
 * Two delivery paths:
 *   1. Web push — existing VAPID / web-push flow (push_subscriptions table)
 *   2. Native push — FCM / APNs via Firebase Admin (push_subscriptions_native table)
 *
 * If FIREBASE_SERVICE_ACCOUNT_JSON is absent the native loop is skipped with a
 * warning so the job still works in environments that only have VAPID configured.
 * Expired web-push subscriptions (HTTP 410) are deleted automatically.
 */

import webpush from "web-push";
import { requireSupabase } from "../lib/supabase.js";
import { logger, errCode } from "../lib/logger.js";
import { sendPush, isFcmConfigured } from "../lib/fcm.js";

// ── VAPID setup ───────────────────────────────────────────────────────────────

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:info@pandascompanion.com";

if (!vapidPublicKey || !vapidPrivateKey) {
  logger.error("VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY not set — aborting");
  process.exit(1);
}

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

// ── Shared notification copy ──────────────────────────────────────────────────

const REMINDER = {
  title: "Daily check-in",
  body: "Take a minute to log today.",
  data: { url: "/log" },
} as const;

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

// ── Shared helper: has user already logged today? ─────────────────────────────

async function hasLoggedToday(userId: string, tz: string): Promise<boolean> {
  const db = requireSupabase();
  const today = todayDate(tz);
  const { count, error } = await db
    .from("symptom_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("date", today);
  if (error) {
    logger.warn({ err: errCode(error), userId }, "send-reminders: could not check log count");
    return false; // err on the side of sending rather than suppressing
  }
  return (count ?? 0) > 0;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const db = requireSupabase();

  let webSent = 0, webSkipped = 0;
  let nativeSent = 0, nativeSkipped = 0;

  // ── 1. Web push (VAPID) ─────────────────────────────────────────────────────
  {
    const { data: subs, error: subErr } = await db
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth, reminder_time, timezone");

    if (subErr) {
      logger.error({ err: errCode(subErr) }, "send-reminders: failed to fetch web subscriptions");
      process.exit(1);
    }

    for (const sub of subs ?? []) {
      const tz: string = (sub.timezone as string) || "UTC";
      const reminderTime: string = (sub.reminder_time as string) || "20:00";

      if (currentHHMM(tz) !== reminderTime) { webSkipped++; continue; }
      if (await hasLoggedToday(sub.user_id as string, tz)) {
        webSkipped++;
        logger.debug({ userId: sub.user_id }, "send-reminders[web]: already logged — skipping");
        continue;
      }

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
          JSON.stringify({ title: REMINDER.title, body: REMINDER.body, url: REMINDER.data.url }),
        );
        webSent++;
        logger.info({ userId: sub.user_id }, "send-reminders[web]: push sent");
      } catch (e) {
        if (typeof e === "object" && e !== null && "statusCode" in e && (e as { statusCode: number }).statusCode === 410) {
          logger.warn({ userId: sub.user_id }, "send-reminders[web]: subscription expired (410) — deleting");
          await db.from("push_subscriptions").delete().eq("user_id", sub.user_id as string);
        } else {
          logger.warn({ err: errCode(e), userId: sub.user_id }, "send-reminders[web]: push send failed");
        }
      }
    }

    logger.info({ webSent, webSkipped }, "send-reminders[web]: run complete");
  }

  // ── 2. Native push (FCM / APNs via Firebase) ──────────────────────────────
  if (!isFcmConfigured()) {
    logger.warn("send-reminders[native]: FIREBASE_SERVICE_ACCOUNT_JSON not set — skipping native push");
    return;
  }

  {
    const { data: nativeSubs, error: nativeErr } = await db
      .from("push_subscriptions_native")
      .select("user_id, device_token, platform, reminder_time, timezone");

    if (nativeErr) {
      logger.error({ err: errCode(nativeErr) }, "send-reminders: failed to fetch native subscriptions");
      return; // non-fatal — web push already ran
    }

    for (const sub of nativeSubs ?? []) {
      const tz: string = (sub.timezone as string) || "UTC";
      const reminderTime: string = (sub.reminder_time as string) || "20:00";

      if (currentHHMM(tz) !== reminderTime) { nativeSkipped++; continue; }
      if (await hasLoggedToday(sub.user_id as string, tz)) {
        nativeSkipped++;
        logger.debug({ userId: sub.user_id }, "send-reminders[native]: already logged — skipping");
        continue;
      }

      try {
        await sendPush(sub.device_token as string, REMINDER);
        nativeSent++;
        logger.info({ userId: sub.user_id, platform: sub.platform }, "send-reminders[native]: push sent");
      } catch (e) {
        // FCM returns specific error codes for invalid / expired tokens
        const msg = e instanceof Error ? e.message : String(e);
        if (
          msg.includes("registration-token-not-registered") ||
          msg.includes("invalid-registration-token")
        ) {
          logger.warn({ userId: sub.user_id }, "send-reminders[native]: token invalid — deleting");
          await db.from("push_subscriptions_native")
            .delete()
            .eq("user_id", sub.user_id as string)
            .eq("device_token", sub.device_token as string);
        } else {
          logger.warn({ err: errCode(e), userId: sub.user_id }, "send-reminders[native]: push send failed");
        }
      }
    }

    logger.info({ nativeSent, nativeSkipped }, "send-reminders[native]: run complete");
  }
}

main().catch((e) => {
  logger.error({ err: errCode(e) }, "send-reminders: fatal error");
  process.exit(1);
});
