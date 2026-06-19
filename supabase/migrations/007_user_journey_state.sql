-- ─── 007_user_journey_state.sql ──────────────────────────────────────────────
-- Tracks each user's chosen journey stage and onboarding completion.
-- Run once in the Supabase SQL Editor.
--
-- NOTE: user_id is TEXT (Clerk format: "user_2xyz..."), NOT a UUID.
-- This app authenticates via Clerk, not Supabase Auth, so auth.uid()-based
-- RLS policies cannot be used. Service role access (via the API server) is
-- the only path in, and service role bypasses RLS automatically.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_journey_state (
  user_id                TEXT PRIMARY KEY,
  journey_stage          TEXT CHECK (journey_stage IN ('exploring', 'in_crisis', 'tracking')),
  journey_stage_set_at   TIMESTAMPTZ,
  onboarding_completed   BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: deny direct access from anon/authenticated Supabase sessions.
-- The API server uses the service role key which bypasses RLS automatically.
ALTER TABLE public.user_journey_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.user_journey_state
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
