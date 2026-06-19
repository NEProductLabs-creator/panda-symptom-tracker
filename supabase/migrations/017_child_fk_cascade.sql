-- Migration 017: Add REFERENCES children(id) ON DELETE CASCADE to every table
-- that carries a child_id column.  Orphan rows (child_id references a children
-- row that no longer exists) are scrubbed first so the constraint can be added
-- without error.

-- ── symptom_logs ──────────────────────────────────────────────────────────────

DO $$
DECLARE removed int;
BEGIN
  DELETE FROM public.symptom_logs
  WHERE child_id IS NOT NULL
    AND child_id NOT IN (SELECT id FROM public.children);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE 'symptom_logs: removed % orphan row(s)', removed;
END $$;

ALTER TABLE public.symptom_logs
  ADD CONSTRAINT symptom_logs_child_id_fkey
  FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;

-- ── ptec_logs ─────────────────────────────────────────────────────────────────
-- child_id was added in migration 015; cover it here so cascade is consistent.

DO $$
DECLARE removed int;
BEGIN
  DELETE FROM public.ptec_logs
  WHERE child_id IS NOT NULL
    AND child_id NOT IN (SELECT id FROM public.children);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE 'ptec_logs: removed % orphan row(s)', removed;
END $$;

ALTER TABLE public.ptec_logs
  ADD CONSTRAINT ptec_logs_child_id_fkey
  FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;

-- ── lab_results ───────────────────────────────────────────────────────────────
-- child_id is NOT NULL in this table (migration 012).

DO $$
DECLARE removed int;
BEGIN
  DELETE FROM public.lab_results
  WHERE child_id NOT IN (SELECT id FROM public.children);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE 'lab_results: removed % orphan row(s)', removed;
END $$;

ALTER TABLE public.lab_results
  ADD CONSTRAINT lab_results_child_id_fkey
  FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;

-- ── parent_observation_summaries ──────────────────────────────────────────────

DO $$
DECLARE removed int;
BEGIN
  DELETE FROM public.parent_observation_summaries
  WHERE child_id IS NOT NULL
    AND child_id NOT IN (SELECT id FROM public.children);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE 'parent_observation_summaries: removed % orphan row(s)', removed;
END $$;

ALTER TABLE public.parent_observation_summaries
  ADD CONSTRAINT parent_observation_summaries_child_id_fkey
  FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;

-- ── right_now_checklist_state ─────────────────────────────────────────────────

DO $$
DECLARE removed int;
BEGIN
  DELETE FROM public.right_now_checklist_state
  WHERE child_id IS NOT NULL
    AND child_id NOT IN (SELECT id FROM public.children);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RAISE NOTICE 'right_now_checklist_state: removed % orphan row(s)', removed;
END $$;

ALTER TABLE public.right_now_checklist_state
  ADD CONSTRAINT right_now_checklist_state_child_id_fkey
  FOREIGN KEY (child_id) REFERENCES public.children(id) ON DELETE CASCADE;
