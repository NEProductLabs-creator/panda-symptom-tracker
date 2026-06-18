/**
 * sendDailyReminders.ts
 *
 * Cron-style script: run every 15 minutes (e.g. via a scheduled task or cron job).
 * Finds users whose local time is within the 15-minute window before their chosen
 * reminder time and who have not yet logged symptoms today, then sends a push.
 *
 * Required env vars:
 *   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (optional)
 */

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { toZonedTime, format as tzFormat } from "date-fns-tz";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@panstrack.app";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("[sendDailyReminders] Missing SUPABASE env vars — exiting");
  process.exit(1);
}
if (!vapidPublicKey || !vapidPrivateKey) {
  console.error("[sendDailyReminders] Missing VAPID env vars — exiting");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey);
webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

async function run(): Promise<void> {
  const now = new Date();
  const todayUtc = now.toISOString().slice(0, 10);

  const { data: subs, error: subsErr } = await db
    .from("push_subscriptions")
    .select("*");

  if (subsErr) {
    console.error("[sendDailyReminders] DB error fetching subscriptions:", subsErr);
    process.exit(1);
  }

  if (!subs?.length) {
    console.log("[sendDailyReminders] No subscriptions found — nothing to do");
    return;
  }

  let sent = 0;
  let skipped = 0;

  for (const sub of subs) {
    const timezone = (sub.timezone as string) || "UTC";
    const reminderTime = (sub.reminder_time as string) || "20:00";

    // Convert current UTC time to the user's local timezone
    let zonedNow: Date;
    try {
      zonedNow = toZonedTime(now, timezone);
    } catch {
      zonedNow = now;
    }

    const localTimeStr = tzFormat(zonedNow, "HH:mm", { timeZone: timezone });
    const localDateStr = tzFormat(zonedNow, "yyyy-MM-dd", { timeZone: timezone });

    // Parse reminder time and current local time to minutes-of-day
    const [remH, remM] = reminderTime.split(":").map(Number);
    const [locH, locM] = localTimeStr.split(":").map(Number);
    const remMinutes = (remH ?? 20) * 60 + (remM ?? 0);
    const locMinutes = (locH ?? 0) * 60 + (locM ?? 0);

    // Only fire within the 15-minute window at or after the reminder time
    const diff = locMinutes - remMinutes;
    if (diff < 0 || diff > 15) {
      skipped++;
      continue;
    }

    // Check if the user has already logged today (in their local timezone)
    const { data: logs } = await db
      .from("symptom_logs")
      .select("id")
      .eq("user_id", sub.user_id as string)
      .eq("date", localDateStr)
      .limit(1);

    if (logs?.length) {
      skipped++;
      continue; // Already logged today
    }

    // Send the push notification
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint as string,
          keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
        },
        JSON.stringify({
          title: "Time to log today",
          body: "Don't forget to track symptoms — it only takes a minute.",
          url: "/log",
        }),
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      console.warn(`[sendDailyReminders] Push failed for ${sub.user_id as string} (status ${code ?? "?"})`, e);
      // 410 = subscription expired — clean it up
      if (code === 410) {
        await db.from("push_subscriptions").delete().eq("user_id", sub.user_id as string);
      }
    }
  }

  console.log(
    `[sendDailyReminders] Done — sent: ${sent}, skipped: ${skipped}, total: ${subs.length} (run at ${now.toISOString()})`,
  );
}

run().catch((e) => {
  console.error("[sendDailyReminders] Fatal error:", e);
  process.exit(1);
});
