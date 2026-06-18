-- ─── 006_notifications.sql ───────────────────────────────────────────────────
-- PWA push notification subscriptions.
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  user_id          TEXT PRIMARY KEY,
  endpoint         TEXT NOT NULL,
  p256dh           TEXT NOT NULL,
  auth             TEXT NOT NULL,
  reminder_time    TEXT NOT NULL DEFAULT '20:00',   -- "HH:MM" in user's timezone
  timezone         TEXT NOT NULL DEFAULT 'UTC',
  inactivity_nudge BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: deny all for authenticated/anon; service role bypasses RLS automatically
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.push_subscriptions
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
