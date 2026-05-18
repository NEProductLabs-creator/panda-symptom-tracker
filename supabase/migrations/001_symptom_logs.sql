-- PANS & PANDAS Tracker — Symptom Logs table
-- Run this in your Supabase dashboard:
--   Dashboard → SQL Editor → New query → paste → Run

CREATE TABLE IF NOT EXISTS public.symptom_logs (
  id                TEXT        PRIMARY KEY,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date              TEXT        NOT NULL,           -- YYYY-MM-DD
  ocd               SMALLINT    NOT NULL DEFAULT 0, -- 0–5
  anxiety           SMALLINT    NOT NULL DEFAULT 0,
  rage              SMALLINT    NOT NULL DEFAULT 0,
  tics              SMALLINT    NOT NULL DEFAULT 0,
  sleep             SMALLINT    NOT NULL DEFAULT 0,
  cognition         SMALLINT    NOT NULL DEFAULT 0,
  notes             TEXT,
  medications_taken TEXT[]      NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT symptom_logs_user_date UNIQUE (user_id, date)
);

-- Row-Level Security: each user can only see and modify their own rows
ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own symptom logs"
  ON public.symptom_logs
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
