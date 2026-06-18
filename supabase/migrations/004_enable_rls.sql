-- ─── 004_enable_rls.sql ──────────────────────────────────────────────────────
--
-- Defense-in-depth: enable Row Level Security on every application table.
--
-- Why this matters:
--   The API server authenticates every request via Clerk and queries Supabase
--   with the SERVICE_ROLE key, which bypasses RLS automatically — so normal
--   app traffic is unaffected.
--
--   However, the Supabase anon key is also a project dependency (supabase-js
--   is in package.json). If the anon key were ever accidentally used directly
--   from the frontend — now or in a future refactor — RLS would be the last
--   line of defense ensuring no user can read or write another user's data.
--
--   Policy: deny everything for the `authenticated` and `anon` roles.
--   The service role is exempt from RLS by Postgres design and needs no policy.
--
-- Run once in the Supabase SQL Editor (see instructions at the bottom).
-- ─────────────────────────────────────────────────────────────────────────────


-- ── symptom_logs ─────────────────────────────────────────────────────────────
ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.symptom_logs
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── medications ──────────────────────────────────────────────────────────────
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.medications
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── med_library ──────────────────────────────────────────────────────────────
ALTER TABLE public.med_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.med_library
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── milestones ───────────────────────────────────────────────────────────────
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.milestones
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── child_baseline ───────────────────────────────────────────────────────────
ALTER TABLE public.child_baseline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.child_baseline
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── ptec_logs ────────────────────────────────────────────────────────────────
ALTER TABLE public.ptec_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.ptec_logs
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── flare_history ────────────────────────────────────────────────────────────
ALTER TABLE public.flare_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.flare_history
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── trigger_log ──────────────────────────────────────────────────────────────
ALTER TABLE public.trigger_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.trigger_log
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── household_health ─────────────────────────────────────────────────────────
ALTER TABLE public.household_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.household_health
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── wellbeing_logs ───────────────────────────────────────────────────────────
ALTER TABLE public.wellbeing_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.wellbeing_logs
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── terms_agreements ─────────────────────────────────────────────────────────
ALTER TABLE public.terms_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.terms_agreements
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- ── user_terms ───────────────────────────────────────────────────────────────
ALTER TABLE public.user_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.user_terms
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
