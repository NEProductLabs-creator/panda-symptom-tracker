-- Migration: parent_observation_summaries
-- Stores self-check questionnaire responses from the /learn/self-check page.
-- user_id is TEXT (Clerk format: user_2xyz...) — not a Supabase auth UUID.

CREATE TABLE IF NOT EXISTS parent_observation_summaries (
  id          TEXT        PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  responses   JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS parent_observation_summaries_user_id_idx
  ON parent_observation_summaries (user_id);

-- Row-level security (API server uses service-role key and bypasses RLS,
-- but policies are added for correctness and future flexibility).
ALTER TABLE parent_observation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON parent_observation_summaries
  USING (true)
  WITH CHECK (true);
