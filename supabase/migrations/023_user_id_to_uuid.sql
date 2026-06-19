-- Migration 023: Change user_id columns from TEXT to UUID
--
-- Context: user_id was originally TEXT to hold Clerk-format IDs (user_2xyz…).
-- After the Supabase Auth migration, user_id holds Supabase auth UUIDs (the
-- JWT `sub` claim). This migration:
--   1. Truncates all user-scoped tables — no data migration, fresh start.
--   2. Alters every user_id column from TEXT to UUID.
--   3. Adds FOREIGN KEY → auth.users(id) ON DELETE CASCADE on each table.
--
-- !! Run this ONCE in the Supabase SQL editor. It is irreversible. !!
-- All existing user data (Clerk-era rows) will be permanently deleted.

BEGIN;

-- ── 1. Truncate all user-scoped tables ───────────────────────────────────────
-- CASCADE handles FK dependencies between these tables automatically.
TRUNCATE TABLE
  public.symptom_logs,
  public.medications,
  public.med_library,
  public.milestones,
  public.ptec_logs,
  public.flare_history,
  public.shares,
  public.push_subscriptions,
  public.user_journey_state,
  public.wellbeing_logs,
  public.household_health,
  public.trigger_log,
  public.push_subscriptions_native,
  public.terms_agreements,
  public.terms_status,
  public.parent_observation_summaries,
  public.right_now_checklist_state,
  public.lab_results,
  public.children
CASCADE;

-- ── 2. Tables where user_id IS the primary key ───────────────────────────────
-- Must drop the PK constraint, retype, then re-add PK + FK.

-- push_subscriptions
ALTER TABLE public.push_subscriptions DROP CONSTRAINT push_subscriptions_pkey;
ALTER TABLE public.push_subscriptions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.push_subscriptions ADD PRIMARY KEY (user_id);
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_journey_state
ALTER TABLE public.user_journey_state DROP CONSTRAINT user_journey_state_pkey;
ALTER TABLE public.user_journey_state ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.user_journey_state ADD PRIMARY KEY (user_id);
ALTER TABLE public.user_journey_state
  ADD CONSTRAINT user_journey_state_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- terms_status
ALTER TABLE public.terms_status DROP CONSTRAINT terms_status_pkey;
ALTER TABLE public.terms_status ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.terms_status ADD PRIMARY KEY (user_id);
ALTER TABLE public.terms_status
  ADD CONSTRAINT terms_status_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── 3. Tables with user_id as NOT NULL (non-PK) column ───────────────────────

ALTER TABLE public.symptom_logs ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.symptom_logs
  ADD CONSTRAINT symptom_logs_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.medications ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.medications
  ADD CONSTRAINT medications_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.med_library ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.med_library
  ADD CONSTRAINT med_library_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.milestones ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.milestones
  ADD CONSTRAINT milestones_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.ptec_logs ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.ptec_logs
  ADD CONSTRAINT ptec_logs_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.flare_history ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.flare_history
  ADD CONSTRAINT flare_history_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.shares ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.shares
  ADD CONSTRAINT shares_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.wellbeing_logs ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.wellbeing_logs
  ADD CONSTRAINT wellbeing_logs_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.household_health ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.household_health
  ADD CONSTRAINT household_health_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.trigger_log ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.trigger_log
  ADD CONSTRAINT trigger_log_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.push_subscriptions_native ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.push_subscriptions_native
  ADD CONSTRAINT push_subscriptions_native_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.parent_observation_summaries ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.parent_observation_summaries
  ADD CONSTRAINT parent_observation_summaries_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.right_now_checklist_state ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.right_now_checklist_state
  ADD CONSTRAINT right_now_checklist_state_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.lab_results ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.lab_results
  ADD CONSTRAINT lab_results_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.children ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE public.children
  ADD CONSTRAINT children_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── 4. terms_agreements: nullable user_id (type change only, no NOT NULL FK) ─
-- user_id is NULL for demo-mode agreements, so no FK constraint is added.
ALTER TABLE public.terms_agreements ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

COMMIT;
