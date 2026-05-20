-- PANS & PANDAS Tracker — Complete schema for Clerk-authenticated users
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query → paste → Run
--
-- All tables use TEXT user_id (Clerk format: user_2xyz…) instead of
-- Supabase auth UUIDs. The API server enforces access via Clerk middleware.

-- Drop old migration's symptom_logs if it exists (had Supabase auth FK)
DROP TABLE IF EXISTS public.symptom_logs CASCADE;

-- ── 1. Symptom Logs ──────────────────────────────────────────────────────────
CREATE TABLE public.symptom_logs (
  id         TEXT        NOT NULL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  date       TEXT        NOT NULL,          -- YYYY-MM-DD, for unique constraint
  data       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT symptom_logs_user_date UNIQUE (user_id, date)
);
CREATE INDEX idx_symptom_logs_user ON public.symptom_logs (user_id);

-- ── 2. Medications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medications (
  id         TEXT        NOT NULL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  data       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medications_user ON public.medications (user_id);

-- ── 3. Medication Library ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.med_library (
  id         TEXT        NOT NULL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  data       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_med_library_user ON public.med_library (user_id);

-- ── 4. Milestones ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.milestones (
  id         TEXT        NOT NULL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  data       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_milestones_user ON public.milestones (user_id);

-- ── 5. Child Baseline (one per user — upsert by user_id) ─────────────────────
CREATE TABLE IF NOT EXISTS public.child_baseline (
  user_id    TEXT        NOT NULL PRIMARY KEY,
  data       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. PTEC Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ptec_logs (
  id         TEXT        NOT NULL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  week_start TEXT        NOT NULL,          -- YYYY-MM-DD for unique constraint
  data       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ptec_logs_user_week UNIQUE (user_id, week_start)
);
CREATE INDEX IF NOT EXISTS idx_ptec_logs_user ON public.ptec_logs (user_id);

-- ── 7. Flare History ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flare_history (
  id         TEXT        NOT NULL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  data       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_flare_history_user ON public.flare_history (user_id);

-- ── 8. Trigger Log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trigger_log (
  id         TEXT        NOT NULL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  data       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_trigger_log_user ON public.trigger_log (user_id);

-- ── 9. Household Health ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.household_health (
  id         TEXT        NOT NULL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  data       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_household_health_user ON public.household_health (user_id);

-- ── 10. Wellbeing Logs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wellbeing_logs (
  id         TEXT        NOT NULL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  date       TEXT        NOT NULL,          -- YYYY-MM-DD for unique constraint
  data       JSONB       NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wellbeing_logs_user_date UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS idx_wellbeing_logs_user ON public.wellbeing_logs (user_id);
