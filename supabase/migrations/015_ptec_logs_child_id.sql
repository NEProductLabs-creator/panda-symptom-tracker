-- Migration 011 added child_id scoping to symptom_logs and
-- right_now_checklist_state. This migration brings ptec_logs into the same
-- pattern: each PTEC check-in belongs to a specific child, keyed by
-- (user_id, child_id, week_start).
--
-- Steps:
--   1. Add a nullable child_id TEXT column.
--   2. Backfill every existing row to the user's first non-archived child.
--      Rows whose user has no children are deleted with a NOTICE (orphans).
--   3. Set child_id NOT NULL.
--   4. Drop the old (user_id, week_start) unique index.
--   5. Add a new (user_id, child_id, week_start) unique index.
--   6. Add a covering index on (user_id, child_id) for filtered lookups.

-- Step 1: add column
ALTER TABLE public.ptec_logs ADD COLUMN IF NOT EXISTS child_id TEXT;

-- Step 2: backfill — assign each row to the user's first non-archived child
UPDATE public.ptec_logs p
SET child_id = (
  SELECT id
  FROM public.children
  WHERE user_id = p.user_id
    AND is_archived = false
  ORDER BY sort_order ASC
  LIMIT 1
);

-- Step 2b: delete orphan rows and emit NOTICE
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.ptec_logs
  WHERE child_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE NOTICE 'Deleting % orphan ptec_logs row(s): user has no non-archived child', orphan_count;
    DELETE FROM public.ptec_logs WHERE child_id IS NULL;
  END IF;
END $$;

-- Step 3: enforce NOT NULL now that every remaining row has a child_id
ALTER TABLE public.ptec_logs ALTER COLUMN child_id SET NOT NULL;

-- Step 4: drop the old single-child unique constraint (and its backing index)
ALTER TABLE public.ptec_logs DROP CONSTRAINT IF EXISTS ptec_logs_user_week;

-- Step 5: new unique index scoped to (user_id, child_id, week_start)
CREATE UNIQUE INDEX IF NOT EXISTS ptec_logs_user_child_week
  ON public.ptec_logs (user_id, child_id, week_start);

-- Step 6: covering index for per-child fetches
CREATE INDEX IF NOT EXISTS ptec_logs_user_child_idx
  ON public.ptec_logs (user_id, child_id);
