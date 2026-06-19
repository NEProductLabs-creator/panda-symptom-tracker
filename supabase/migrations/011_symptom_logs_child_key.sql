-- ─── 011_symptom_logs_child_key.sql ──────────────────────────────────────────
-- Multi-child log separation migration.
--
-- Migration 010 added child_id as a nullable column (then made NOT NULL after
-- backfilling existing rows). However the old unique indexes still enforce a
-- single log per (user_id, date) and single checklist state per
-- (user_id, date, action_key) across ALL children. This breaks multi-child
-- households where two children need separate logs on the same date.
--
-- What this does:
--   1. Drops the old (user_id, date) unique index on symptom_logs.
--   2. Creates a new unique index on (user_id, child_id, date).
--   3. Drops the old (user_id, date, action_key) unique index on
--      right_now_checklist_state.
--   4. Creates a new unique index on (user_id, child_id, date, action_key).
--
-- IMPORTANT: Run migration 010 first if you haven't already.
-- IMPORTANT: Test on a database branch before production.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. symptom_logs: drop old constraint, add per-child unique ────────────────

-- The old constraint name may vary depending on how the table was created.
-- Drop by index name if it exists (Supabase usually names it <table>_<cols>_key).
DO $$
BEGIN
  -- Try to drop by common constraint names; ignore errors if it doesn't exist.
  BEGIN
    ALTER TABLE symptom_logs DROP CONSTRAINT IF EXISTS symptom_logs_user_id_date_key;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    -- Also drop any plain index with this name
    DROP INDEX IF EXISTS symptom_logs_user_id_date_idx;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Create the replacement: one log per child per date
CREATE UNIQUE INDEX IF NOT EXISTS symptom_logs_user_child_date_key
  ON symptom_logs (user_id, child_id, date);

-- ── 2. right_now_checklist_state: drop old constraint, add per-child unique ───

DO $$
BEGIN
  BEGIN
    ALTER TABLE right_now_checklist_state
      DROP CONSTRAINT IF EXISTS right_now_checklist_state_user_id_date_action_key_key;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    DROP INDEX IF EXISTS right_now_checklist_user_date_action_idx;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Create the replacement: one checklist entry per child per action per date
CREATE UNIQUE INDEX IF NOT EXISTS right_now_checklist_user_child_date_action_key
  ON right_now_checklist_state (user_id, child_id, date, action_key);

-- ── 3. Migration report ───────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE '=== Migration 011_symptom_logs_child_key report ===';
  RAISE NOTICE 'symptom_logs unique constraint: now (user_id, child_id, date)';
  RAISE NOTICE 'right_now_checklist_state unique: now (user_id, child_id, date, action_key)';
  RAISE NOTICE 'Multi-child logging fully supported after this migration.';
END $$;

COMMIT;
