-- Migration 011 (011_symptom_logs_child_key.sql) intended to drop the
-- pre-multi-child unique indexes before adding new (user_id, child_id, date)
-- constraints. However, it referenced the wrong constraint/index names in its
-- DROP statements, so DROP IF EXISTS silently succeeded without removing
-- anything. This left both the old single-child unique indexes and the new
-- multi-child unique indexes in place simultaneously, causing duplicate-key
-- violations whenever two children have a log on the same date — breaking
-- multi-child support at the database layer.
--
-- This migration drops the three legacy indexes by their actual names.
-- The verification block at the end raises an exception if any are still
-- present, so a silent no-op cannot go undetected again.

-- symptom_logs_user_date and right_now_checklist_unique are constraint-backed
-- indexes; they must be removed via ALTER TABLE DROP CONSTRAINT (which also
-- drops the backing index). right_now_checklist_user_date_idx is a plain index.
ALTER TABLE public.symptom_logs
  DROP CONSTRAINT IF EXISTS symptom_logs_user_date;

ALTER TABLE public.right_now_checklist_state
  DROP CONSTRAINT IF EXISTS right_now_checklist_unique;

DROP INDEX IF EXISTS public.right_now_checklist_user_date_idx;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname IN (
        'symptom_logs_user_date',
        'right_now_checklist_unique'
      )
  ) THEN
    RAISE EXCEPTION 'Legacy unique indexes still present';
  END IF;
  RAISE NOTICE 'Legacy unique indexes successfully dropped.';
END $$;
