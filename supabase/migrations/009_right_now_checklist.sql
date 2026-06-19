-- Migration: right_now_checklist_state
-- Persists per-user, per-day completion state for the /right-now/today checklist.
-- user_id is TEXT (Clerk format: user_2xyz...) — not a Supabase auth UUID.

CREATE TABLE IF NOT EXISTS right_now_checklist_state (
  id          TEXT        PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  date        TEXT        NOT NULL,       -- YYYY-MM-DD string
  action_key  TEXT        NOT NULL,
  completed   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT right_now_checklist_unique UNIQUE (user_id, date, action_key)
);

CREATE INDEX IF NOT EXISTS right_now_checklist_user_date_idx
  ON right_now_checklist_state (user_id, date);

ALTER TABLE right_now_checklist_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON right_now_checklist_state
  USING (true)
  WITH CHECK (true);
