-- Migration 012 (012_lab_results.sql) created the lab_results table but did
-- not enable row-level security or add a deny-all policy. This migration
-- brings lab_results in line with every other table in the schema, which
-- follow the pattern established in 004_enable_rls.sql: the service role
-- (used by the API server) bypasses RLS at the Postgres level, while the
-- authenticated and anon roles are explicitly denied all direct access.

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.lab_results
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
