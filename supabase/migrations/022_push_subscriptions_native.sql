-- Native push token registrations (FCM for Android, APNs via Firebase for iOS).
-- One row per (user_id, device_token) pair — a user can have multiple devices.
-- The server fans out to all rows matching the current minute in each device's timezone.

CREATE TABLE IF NOT EXISTS push_subscriptions_native (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     text        NOT NULL,
  device_token text       NOT NULL,
  platform    text        NOT NULL CHECK (platform IN ('ios', 'android')),
  reminder_time text      NOT NULL DEFAULT '20:00',
  timezone    text        NOT NULL DEFAULT 'UTC',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_token)
);

-- RLS: allow service-role only (same pattern as push_subscriptions)
ALTER TABLE push_subscriptions_native ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_only ON push_subscriptions_native
  USING (auth.role() = 'service_role');

-- Index: reminder loop fans out by reminder_time; secondary filter on timezone
CREATE INDEX IF NOT EXISTS push_subscriptions_native_reminder_time_idx
  ON push_subscriptions_native (reminder_time);
