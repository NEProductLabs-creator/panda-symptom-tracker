-- Migration 021: Add child_id scoping to the five shared/household tables.
--
-- Depends on: 010_children.sql (children table), 017_child_fk_cascade.sql (FK pattern).
--
-- Tables affected: medications, med_library, milestones, trigger_log, flare_history.
-- These were previously household-level (user_id only). Adding child_id lets each
-- entry be scoped to a specific child while the app-level default remains the active
-- child, preserving backward-compatibility for single-child families.

BEGIN;

-- ── 1. Add nullable child_id column to each table ────────────────────────────

ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS child_id TEXT
  REFERENCES public.children(id) ON DELETE CASCADE;

ALTER TABLE public.med_library
  ADD COLUMN IF NOT EXISTS child_id TEXT
  REFERENCES public.children(id) ON DELETE CASCADE;

ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS child_id TEXT
  REFERENCES public.children(id) ON DELETE CASCADE;

ALTER TABLE public.trigger_log
  ADD COLUMN IF NOT EXISTS child_id TEXT
  REFERENCES public.children(id) ON DELETE CASCADE;

ALTER TABLE public.flare_history
  ADD COLUMN IF NOT EXISTS child_id TEXT
  REFERENCES public.children(id) ON DELETE CASCADE;

-- ── 2. Backfill: assign each row to the user's lowest sort_order non-archived child ──

-- Reusable CTE: one row per user_id — the id of their first non-archived child.
-- DISTINCT ON (user_id) with ORDER BY sort_order ASC picks the lowest sort_order.

UPDATE public.medications t
SET    child_id = first_child.child_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, id AS child_id
  FROM   public.children
  WHERE  NOT is_archived
  ORDER  BY user_id, sort_order ASC
) AS first_child
WHERE  t.user_id = first_child.user_id
  AND  t.child_id IS NULL;

UPDATE public.med_library t
SET    child_id = first_child.child_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, id AS child_id
  FROM   public.children
  WHERE  NOT is_archived
  ORDER  BY user_id, sort_order ASC
) AS first_child
WHERE  t.user_id = first_child.user_id
  AND  t.child_id IS NULL;

UPDATE public.milestones t
SET    child_id = first_child.child_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, id AS child_id
  FROM   public.children
  WHERE  NOT is_archived
  ORDER  BY user_id, sort_order ASC
) AS first_child
WHERE  t.user_id = first_child.user_id
  AND  t.child_id IS NULL;

UPDATE public.trigger_log t
SET    child_id = first_child.child_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, id AS child_id
  FROM   public.children
  WHERE  NOT is_archived
  ORDER  BY user_id, sort_order ASC
) AS first_child
WHERE  t.user_id = first_child.user_id
  AND  t.child_id IS NULL;

UPDATE public.flare_history t
SET    child_id = first_child.child_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, id AS child_id
  FROM   public.children
  WHERE  NOT is_archived
  ORDER  BY user_id, sort_order ASC
) AS first_child
WHERE  t.user_id = first_child.user_id
  AND  t.child_id IS NULL;

-- ── 3. Enforce NOT NULL now that backfill is complete ─────────────────────────

ALTER TABLE public.medications  ALTER COLUMN child_id SET NOT NULL;
ALTER TABLE public.med_library  ALTER COLUMN child_id SET NOT NULL;
ALTER TABLE public.milestones   ALTER COLUMN child_id SET NOT NULL;
ALTER TABLE public.trigger_log  ALTER COLUMN child_id SET NOT NULL;
ALTER TABLE public.flare_history ALTER COLUMN child_id SET NOT NULL;

-- ── 4. Indexes on (user_id, child_id) ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS medications_user_child_idx
  ON public.medications (user_id, child_id);

CREATE INDEX IF NOT EXISTS med_library_user_child_idx
  ON public.med_library (user_id, child_id);

CREATE INDEX IF NOT EXISTS milestones_user_child_idx
  ON public.milestones (user_id, child_id);

CREATE INDEX IF NOT EXISTS trigger_log_user_child_idx
  ON public.trigger_log (user_id, child_id);

CREATE INDEX IF NOT EXISTS flare_history_user_child_idx
  ON public.flare_history (user_id, child_id);

-- ── 5. Migration summary ──────────────────────────────────────────────────────

DO $$
DECLARE
  r_medications   BIGINT;
  r_med_library   BIGINT;
  r_milestones    BIGINT;
  r_trigger_log   BIGINT;
  r_flare_history BIGINT;
BEGIN
  SELECT COUNT(*) INTO r_medications   FROM public.medications;
  SELECT COUNT(*) INTO r_med_library   FROM public.med_library;
  SELECT COUNT(*) INTO r_milestones    FROM public.milestones;
  SELECT COUNT(*) INTO r_trigger_log   FROM public.trigger_log;
  SELECT COUNT(*) INTO r_flare_history FROM public.flare_history;

  RAISE NOTICE '021 migration summary (total rows now with child_id):';
  RAISE NOTICE '  medications   : %', r_medications;
  RAISE NOTICE '  med_library   : %', r_med_library;
  RAISE NOTICE '  milestones    : %', r_milestones;
  RAISE NOTICE '  trigger_log   : %', r_trigger_log;
  RAISE NOTICE '  flare_history : %', r_flare_history;
END;
$$;

COMMIT;
