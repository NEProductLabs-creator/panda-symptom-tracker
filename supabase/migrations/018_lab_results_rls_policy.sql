-- Migration 018: Ensure lab_results RLS policy blocks direct client access.
-- The service-role key used by the API server bypasses RLS, so this policy
-- is a safety net that prevents any authenticated or anon Supabase client
-- from reading or writing lab_results directly.

DROP POLICY IF EXISTS "service_role_only" ON public.lab_results;

CREATE POLICY "service_role_only" ON public.lab_results
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
