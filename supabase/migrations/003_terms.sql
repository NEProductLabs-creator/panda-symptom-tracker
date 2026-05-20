-- Run this in the Supabase SQL editor after 002_all_tables.sql

-- Audit log: every agreement event is recorded here
create table if not exists public.terms_agreements (
  id          bigserial primary key,
  user_id     text,           -- Clerk user_id (null for demo-mode agreements)
  email       text,           -- email at time of agreement
  terms_version text not null,-- version string, e.g. "2026-05-20"
  agreed_at   timestamptz not null default now(),
  ip_address  text,
  context     text not null check (context in ('signup', 'demo'))
);

create index if not exists terms_agreements_user_id_idx on public.terms_agreements (user_id);
create index if not exists terms_agreements_email_idx   on public.terms_agreements (email);

-- Fast lookup: one row per authenticated user, stores their current agreed version
create table if not exists public.user_terms (
  user_id              text primary key,
  terms_version_agreed text not null,
  terms_agreed_at      timestamptz not null
);
