/**
 * sendInactivityReminders.ts
 *
 * Weekly script: finds users with no symptom log in the last 5 days and
 * sends a gentle "we're here when you're ready" push notification.
 *
 * Recommended schedule: once per day (the 5-day window prevents duplicates).
 *
 * Required env vars:
 *   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (optional)
 */

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { subDays, format } from "date-fns";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT ?? "mailto:admin@panstrack.app";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("[sendInactivityReminders] Missing SUPABASE env vars — exiting");
  process.exit(1);
}
if (!vapidPublicKey || !vapidPrivateKey) {
  console.error("[sendInactivityReminders] Missing VAPID env vars — exiting");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey);
webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

async function run(): Promise<void> {
  const now = new Date();
  const cutoff = format(subDays(now, 5), "yyyy-MM-dd");

  const { data: subs, error: subsErr } = await db
    .from("push_subscriptions")
    .select("*")
    .eq("inactivity_nudge", true);

  if (subsErr) {
    console.error("[sendInactivityReminders] DB error:", subsErr);
    process.exit(1);
  }

  if (!subs?.length) {
    console.log("[sendInactivityReminders] No inactivity-nudge subscriptions");
    return;
  }

  let sent = 0;
  let skipped = 0;

  for (const sub of subs) {
    // Check if user has any log in the last 5 days
    const { data: logs } = await db
      .from("symptom_logs")
      .select("id")
      .eq("user_id", sub.user_id as string)
      .gte("date", cutoff)
      .limit(1);

    if (logs?.length) {
      skipped++;
      continue; // Active user — no nudge needed
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint as string,
          keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
        },
        JSON.stringify({
          title: "PANS Tracker is here for you",
          body: "We're here when you're ready. Logging takes just a minute.",
          url: "/",
        }),
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      console.warn(`[sendInactivityReminders] Push failed for ${sub.user_id as string} (status ${code ?? "?"})`, e);
      if (code === 410) {
        await db.from("push_subscriptions").delete().eq("user_id", sub.user_id as string);
      }
    }
  }

  console.log(
    `[sendInactivityReminders] Done — sent: ${sent}, skipped: ${skipped}, total: ${subs.length} (run at ${now.toISOString()})`,
  );
}

run().catch((e) => {
  console.error("[sendInactivityReminders] Fatal error:", e);
  process.exit(1);
});
