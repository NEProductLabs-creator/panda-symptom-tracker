-- Migration 019: Backfill and enforce NOT NULL on lab_results timestamps.
-- Any rows that were inserted before created_at/updated_at had defaults
-- receive the current timestamp, then the columns are made NOT NULL.

UPDATE public.lab_results SET created_at = now() WHERE created_at IS NULL;
UPDATE public.lab_results SET updated_at = now() WHERE updated_at IS NULL;

ALTER TABLE public.lab_results
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;
