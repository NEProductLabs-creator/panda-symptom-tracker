-- Migration 024: Create screener_results table
--
-- Stores the output of the PANS/PANDAS screener wizard, keyed by user and
-- optionally by child. One row per screening session; users may retake freely.
--
-- Follows post-migration-023 conventions:
--   • user_id is UUID with FK → auth.users(id) ON DELETE CASCADE
--   • child_id is TEXT (children.id is TEXT primary key)
--   • RLS enabled; per-user CRUD policies use auth.uid()::text = user_id::text
--     (the ::text cast matches the pattern established in 013_fix_rls_policies.sql
--      and is consistent with how user_id is set by the API server)
--   • updated_at trigger via a shared set_updated_at() function so any direct
--     Supabase update also bumps the timestamp (API server also sets it manually
--     in UPDATE queries, matching the dual-path pattern used elsewhere)
--
-- Run once in the Supabase SQL Editor after migrations 001–023.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Shared updated_at trigger function (idempotent, safe to re-run) ────────
--
-- No other migration has created this function yet; this is the first table in
-- the project to add a BEFORE UPDATE trigger.  CREATE OR REPLACE is safe to
-- re-run if the function already exists from a later migration.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.screener_results (
  id            UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id      TEXT        REFERENCES public.children(id) ON DELETE CASCADE,
  answers       JSONB       NOT NULL,
  result_bucket TEXT        NOT NULL
                              CHECK (result_bucket IN ('strong_match', 'partial_match', 'no_match')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Indexes ────────────────────────────────────────────────────────────────

-- Covers: list all results for a user, ordered most-recent-first
CREATE INDEX IF NOT EXISTS idx_screener_results_user
  ON public.screener_results (user_id, created_at DESC);

-- Covers: list results for a specific child, ordered most-recent-first
CREATE INDEX IF NOT EXISTS idx_screener_results_user_child
  ON public.screener_results (user_id, child_id, created_at DESC);

-- ── 4. updated_at trigger ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS set_screener_results_updated_at ON public.screener_results;

CREATE TRIGGER set_screener_results_updated_at
  BEFORE UPDATE ON public.screener_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.screener_results ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated user sees only their own rows
CREATE POLICY "screener_results_select"
  ON public.screener_results
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id::text);

-- INSERT: authenticated user may only insert rows they own
CREATE POLICY "screener_results_insert"
  ON public.screener_results
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- UPDATE: authenticated user may only update their own rows
CREATE POLICY "screener_results_update"
  ON public.screener_results
  FOR UPDATE TO authenticated
  USING  (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- DELETE: authenticated user may only delete their own rows
CREATE POLICY "screener_results_delete"
  ON public.screener_results
  FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id::text);
