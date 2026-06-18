-- ─── 005_shares.sql ──────────────────────────────────────────────────────────
-- Care-team share tokens.
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shares (
  token          TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  include_notes  BOOLEAN NOT NULL DEFAULT true,
  revoked        BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shares_user_id_idx ON public.shares (user_id);

-- RLS: deny all for authenticated/anon; service role bypasses RLS automatically
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.shares
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
