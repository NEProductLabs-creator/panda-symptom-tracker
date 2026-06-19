-- ─── 013_fix_rls_policies.sql ────────────────────────────────────────────────
--
-- SECURITY FIX: Restore deny-all RLS policies on three tables whose policies
-- were created incorrectly in earlier migrations.
--
-- Root cause:
--   Migrations 008 (parent_observation_summaries), 009 (right_now_checklist_state),
--   and 010 (children) each added a policy named "service_role_only" but wrote:
--
--       CREATE POLICY "service_role_only" ON public.table_name
--         USING (true) WITH CHECK (true);
--
--   USING (true) / WITH CHECK (true) with no role clause defaults to PUBLIC —
--   meaning the policy *permits* all access from any role, including the anon
--   key path.  This is the opposite of the intended behavior and contradicts
--   the pattern established in 004_enable_rls.sql.
--
-- Intended behavior (004_enable_rls.sql pattern):
--   The service role (used by the API server) bypasses RLS at the Postgres level
--   and requires no policy.  The authenticated and anon roles, which correspond
--   to any direct Supabase client call, must be explicitly denied so that a
--   leaked or mis-used anon key cannot read or write user data.
--
-- This migration drops the three bad policies and recreates them correctly,
-- restoring defense-in-depth for these tables.
--
-- Run once in the Supabase SQL Editor after all previous migrations.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── children (introduced in 010_children.sql) ─────────────────────────────────

DROP POLICY IF EXISTS "service_role_only" ON public.children;

CREATE POLICY "service_role_only" ON public.children
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── parent_observation_summaries (introduced in 008_parent_observation_summaries.sql) ──

DROP POLICY IF EXISTS "service_role_only" ON public.parent_observation_summaries;

CREATE POLICY "service_role_only" ON public.parent_observation_summaries
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── right_now_checklist_state (introduced in 009_right_now_checklist.sql) ──────

DROP POLICY IF EXISTS "service_role_only" ON public.right_now_checklist_state;

CREATE POLICY "service_role_only" ON public.right_now_checklist_state
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
