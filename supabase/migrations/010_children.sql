-- ─── 010_children.sql ────────────────────────────────────────────────────────
-- Multi-child support migration.
--
-- What this does:
--   1. Creates the children table.
--   2. Adds nullable child_id to: symptom_logs, parent_observation_summaries,
--      right_now_checklist_state.
--      (No dedicated "reports" table exists in the DB; report history is
--       localStorage-only via lib/reportHistory.ts.)
--   3. Backfills one child row per distinct user and sets child_id on all
--      existing rows.
--   4. Makes child_id NOT NULL on the backfilled tables.
--   5. Drops journey_stage + journey_stage_set_at from user_journey_state
--      (now managed on the children table).
--   6. Prints a short migration report.
--
-- user_id is TEXT (Clerk format: user_2xyz...) — NOT a Supabase auth UUID.
-- This matches every other table in the schema.
--
-- IMPORTANT: Test on a database branch / staging copy before production.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Create children table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS children (
  id                   TEXT        PRIMARY KEY,
  user_id              TEXT        NOT NULL,
  name                 TEXT        NOT NULL,
  date_of_birth        DATE,
  diagnosis_status     TEXT        NOT NULL DEFAULT 'undiagnosed'
                         CHECK (diagnosis_status IN ('undiagnosed', 'suspected', 'diagnosed')),
  journey_stage        TEXT
                         CHECK (journey_stage IS NULL
                                OR journey_stage IN ('exploring', 'in_crisis', 'tracking')),
  journey_stage_set_at TIMESTAMPTZ,
  is_archived          BOOLEAN     NOT NULL DEFAULT false,
  sort_order           INTEGER     NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS children_user_id_idx
  ON children (user_id);

-- RLS: service-role key bypasses these policies (our API server pattern).
-- Note: auth.uid() returns a Supabase UUID; our user_id is a Clerk TEXT id,
-- so these policies are for defence-in-depth only — they will not match
-- Clerk-issued sessions.
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON children
  USING (true) WITH CHECK (true);

-- ── 2. Add nullable child_id to child-scoped tables ───────────────────────────

ALTER TABLE symptom_logs
  ADD COLUMN IF NOT EXISTS child_id TEXT;

CREATE INDEX IF NOT EXISTS symptom_logs_user_child_idx
  ON symptom_logs (user_id, child_id);

ALTER TABLE parent_observation_summaries
  ADD COLUMN IF NOT EXISTS child_id TEXT;

CREATE INDEX IF NOT EXISTS parent_obs_user_child_idx
  ON parent_observation_summaries (user_id, child_id);

ALTER TABLE right_now_checklist_state
  ADD COLUMN IF NOT EXISTS child_id TEXT;

CREATE INDEX IF NOT EXISTS right_now_checklist_user_child_idx
  ON right_now_checklist_state (user_id, child_id);

-- ── 3. Backfill: one child row per distinct user, then set child_id ───────────

DO $$
DECLARE
  rec           RECORD;
  new_child_id  TEXT;
  child_name    TEXT;
  has_logs      BOOLEAN;
  has_obs       BOOLEAN;
  diag_status   TEXT;
  journey       TEXT;
  journey_at    TIMESTAMPTZ;
BEGIN
  FOR rec IN
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM symptom_logs
      UNION
      SELECT user_id FROM parent_observation_summaries
      UNION
      SELECT user_id FROM right_now_checklist_state
    ) AS all_users
  LOOP
    -- Generate a text id via random bytes (hex-encoded, 24 chars)
    new_child_id := encode(gen_random_bytes(12), 'hex');

    -- Resolve child name from child_baseline JSONB
    SELECT (data->>'childName') INTO child_name
      FROM child_baseline
      WHERE user_id = rec.user_id
      LIMIT 1;
    IF child_name IS NULL OR trim(child_name) = '' THEN
      child_name := 'My child';
    END IF;

    -- Determine diagnosis_status based on what data exists
    SELECT EXISTS (
      SELECT 1 FROM symptom_logs WHERE user_id = rec.user_id LIMIT 1
    ) INTO has_logs;

    SELECT EXISTS (
      SELECT 1 FROM parent_observation_summaries WHERE user_id = rec.user_id LIMIT 1
    ) INTO has_obs;

    IF has_logs THEN
      diag_status := 'diagnosed';
    ELSIF has_obs THEN
      diag_status := 'suspected';
    ELSE
      diag_status := 'undiagnosed';
    END IF;

    -- Copy journey_stage from user_journey_state (before we drop the columns)
    SELECT journey_stage, journey_stage_set_at
      INTO journey, journey_at
      FROM user_journey_state
      WHERE user_id = rec.user_id
      LIMIT 1;

    -- Insert child row (skip if id collides — extremely unlikely with 96 random bits)
    INSERT INTO children (
      id, user_id, name, diagnosis_status,
      journey_stage, journey_stage_set_at, sort_order
    )
    VALUES (
      new_child_id, rec.user_id, child_name, diag_status,
      journey, journey_at, 0
    )
    ON CONFLICT DO NOTHING;

    -- Stamp child_id on every existing row for this user
    UPDATE symptom_logs
      SET child_id = new_child_id
      WHERE user_id = rec.user_id AND child_id IS NULL;

    UPDATE parent_observation_summaries
      SET child_id = new_child_id
      WHERE user_id = rec.user_id AND child_id IS NULL;

    UPDATE right_now_checklist_state
      SET child_id = new_child_id
      WHERE user_id = rec.user_id AND child_id IS NULL;

  END LOOP;
END $$;

-- ── 4. Make child_id NOT NULL after backfill ──────────────────────────────────

ALTER TABLE symptom_logs
  ALTER COLUMN child_id SET NOT NULL;

ALTER TABLE parent_observation_summaries
  ALTER COLUMN child_id SET NOT NULL;

ALTER TABLE right_now_checklist_state
  ALTER COLUMN child_id SET NOT NULL;

-- ── 5. Remove journey_stage columns from user_journey_state ───────────────────
-- journey_stage is now owned by the children table.

ALTER TABLE user_journey_state
  DROP COLUMN IF EXISTS journey_stage,
  DROP COLUMN IF EXISTS journey_stage_set_at;

-- ── 6. Migration report ───────────────────────────────────────────────────────

DO $$
DECLARE
  n_children   INTEGER;
  n_logs       INTEGER;
  n_obs        INTEGER;
  n_checklist  INTEGER;
BEGIN
  SELECT COUNT(*) INTO n_children  FROM children;
  SELECT COUNT(*) INTO n_logs      FROM symptom_logs;
  SELECT COUNT(*) INTO n_obs       FROM parent_observation_summaries;
  SELECT COUNT(*) INTO n_checklist FROM right_now_checklist_state;

  RAISE NOTICE '=== Migration 010_children report ===';
  RAISE NOTICE 'children rows created:                  %', n_children;
  RAISE NOTICE 'symptom_logs rows (all have child_id):  %', n_logs;
  RAISE NOTICE 'parent_observation_summaries backfilled: %', n_obs;
  RAISE NOTICE 'right_now_checklist_state backfilled:   %', n_checklist;
END $$;

COMMIT;
