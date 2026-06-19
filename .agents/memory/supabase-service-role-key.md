---
name: Supabase service-role key (new API key system)
description: SUPABASE_SERVICE_ROLE_KEY must be the sb_secret_ key, not the publishable/anon key, or all DB writes fail under RLS.
---

# Supabase service-role key vs publishable key

This project uses Supabase's **new API key system** (`sb_publishable_…` for the
browser/anon role, `sb_secret_…` for the server/service role) — NOT the legacy
HS256 JWT `anon`/`service_role` keys.

**Rule:** `SUPABASE_SERVICE_ROLE_KEY` (Replit secret, used by the api-server's
`createClient`) must be the `sb_secret_…` key. `VITE_SUPABASE_ANON_KEY` is the
`sb_publishable_…` key. They must be different values.

**Why:** Every public table has RLS enabled with a `service_role_only` policy
that blocks `{anon, authenticated}` for ALL commands; only `service_role`
(`rolbypassrls = true`) can write. If `SUPABASE_SERVICE_ROLE_KEY` is mistakenly
set to the publishable/anon key (they were once identical), the server connects
as a non-privileged role:
- SELECT/GET returns `[]` (RLS-filtered, looks fine) — masks the problem.
- INSERT/POST fails with Postgres `42501` → API returns 500
  ("new row violates row-level security policy"). Symptom logs, terms
  agreements, and all sync writes silently break while reads appear healthy.

**How to apply:** If `/api/data/*` or `/api/terms/agree` POSTs return 500 with
errCode `42501` but GETs return 200, check that `SUPABASE_SERVICE_ROLE_KEY`
!= `VITE_SUPABASE_ANON_KEY` and that it starts with `sb_secret_`. Quick probe:
`curl -X POST $VITE_SUPABASE_URL/rest/v1/terms_agreements -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -d '{...}'` — 201 = service_role OK, 401/42501 = wrong key. The new `sb_secret_` key is NOT accepted by GoTrue **admin** endpoints (`/auth/v1/admin/*` → 401 no_authorization), only by PostgREST/Storage.
