-- Migration 017: Enforce RLS on every table in the public schema
--
-- Context: the application never talks to Supabase directly from the client.
-- All DB access goes through the API server using the service-role key, which
-- bypasses RLS. Enabling RLS + FORCE ROW LEVEL SECURITY and denying anon/
-- authenticated roles ensures no direct client access is possible even if
-- anon or authenticated credentials were leaked.
--
-- Safe to re-run (idempotent): the DROP POLICY IF EXISTS guard handles that.

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    -- Enable RLS on this table
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      tbl.table_name
    );

    -- Force RLS even for the table owner
    EXECUTE format(
      'ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',
      tbl.table_name
    );

    -- Drop the policy if it already exists (idempotent re-runs)
    EXECUTE format(
      'DROP POLICY IF EXISTS service_role_only ON public.%I',
      tbl.table_name
    );

    -- Deny anon and authenticated roles all operations.
    -- The service-role key used by the API server bypasses RLS entirely,
    -- so this policy does not affect any application behaviour.
    EXECUTE format(
      $policy$
        CREATE POLICY service_role_only
          ON public.%I
          FOR ALL
          TO anon, authenticated
          USING (false)
          WITH CHECK (false)
      $policy$,
      tbl.table_name
    );

    RAISE NOTICE 'RLS enforced on public.%', tbl.table_name;
  END LOOP;
END;
$$;

-- Verification: confirm every table in public has RLS enabled and forced.
-- Run this after applying the migration to check the result.
SELECT
  t.tablename,
  c.relrowsecurity      AS rowsecurity,
  c.relforcerowsecurity AS forcerowsecurity
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename;
