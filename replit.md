# PANS & PANDAS Symptom & Medication Tracker

A daily symptom and medication tracking app for parents managing children with PANS or PANDAS. Logs symptom scores across 6 categories, tracks medications, visualizes 30-day trends, and generates a print-friendly doctor summary.

## Run & Operate

- `pnpm --filter @workspace/pans-tracker run dev` — run the tracker app
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck (all packages should pass clean)
- Required env: `SUPABASE_SERVICE_ROLE_KEY` (Replit secret) for Supabase sync

## How to deploy

Before publishing, set these Replit secrets (Secrets tab → Add secret):

| Secret | Description |
|---|---|
| `VAPID_PUBLIC_KEY` | VAPID public key for web push (base64url) |
| `VAPID_PRIVATE_KEY` | VAPID private key for web push (base64url) |
| `VAPID_SUBJECT` | Contact URI for push service, e.g. `mailto:admin@example.com` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key for server-side DB access |

The **"Reminder: Daily push"** workflow must also be started after deployment. It loops every 60 seconds, checks `push_subscriptions` for matching `reminder_time` values, and sends a "Daily check-in" push to users who haven't logged yet today. VAPID keys can be generated with `npx web-push generate-vapid-keys`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter (routing), Recharts (charts), Supabase Auth
- Styling: Tailwind CSS v4, shadcn/ui components
- Data: localStorage (instant cache) + Supabase (sync via API server)
- Auth: Supabase Auth (email/password + Google OAuth). Frontend uses `@supabase/supabase-js` `createClient` with localStorage + PKCE (no `@supabase/ssr` — cookies break in the proxied iframe and Capacitor). API verifies Supabase JWTs via JWKS using `jose` `createRemoteJWKSet` (no `SUPABASE_JWT_SECRET`).

## Where things live

- `artifacts/pans-tracker/src/` — main app source
  - `lib/types.ts` — all data type definitions
  - `lib/storage.ts` — localStorage read/write helpers (cache layer)
  - `lib/api.ts` — typed API client (createApiClient factory, uses Supabase access token)
  - `lib/supabaseClient.ts` — singleton Supabase browser client (localStorage + PKCE) + `getSupabaseToken`
  - `contexts/AuthContext.tsx` — `AuthProvider` (onAuthStateChange), `useAuthContext`, normalized `AppUser`
  - `hooks/useSupabaseAuth.ts` — Clerk-compatible `useAuth`/`useUser`/`useClerk` shims backed by Supabase (kept the Clerk call shapes so consumers only needed an import-path swap)
  - `hooks/useSymptomLogs.ts` — symptom log CRUD (localStorage + API sync)
  - `hooks/useMedications.ts` — medication CRUD
  - `hooks/useMedLibrary.ts` — medication library CRUD
  - `hooks/useMilestones.ts` — milestone CRUD
  - `hooks/useChildBaseline.ts` — child baseline get/set
  - `hooks/usePTECLogs.ts` — PTEC log CRUD + flare detection
  - `hooks/useTriggerLog.ts` — trigger log CRUD
  - `hooks/useHouseholdHealth.ts` — household illness CRUD
  - `hooks/useWellbeingLogs.ts` — wellbeing log CRUD
  - `components/layout/Sidebar.tsx` — navigation sidebar
  - `components/charts/SymptomChart.tsx` — Recharts line chart with medication overlays
  - `pages/Dashboard.tsx` — main dashboard with chart + quick log
  - `pages/LogEntry.tsx` — full log entry form + history table
  - `pages/Medications.tsx` — medication management
  - `pages/PrintSummary.tsx` — print-optimized doctor summary
- `artifacts/api-server/src/` — Express API server
  - `routes/data.ts` — all data CRUD routes (`/api/data/*`), protected by Supabase JWT auth
  - `middlewares/supabaseAuth.ts` — `attachUser` (best-effort, sets `req.userId`) + `requireAuth`; verifies JWTs against `${VITE_SUPABASE_URL}/auth/v1/.well-known/jwks.json` (issuer + audience `authenticated`)
  - `lib/supabase.ts` — server-side Supabase client (service-role key)

## Architecture decisions

- **Child baseline storage**: `baseline` is a JSONB column on the `children` row (not a separate table). Accessed via `GET /api/data/children/:id/baseline` and `PUT /api/data/children/:id/baseline`. The old `child_baseline` table was dropped in migration 016. `useChildBaseline` scopes reads/writes to `activeChildId`.
- **Per-child vs household-level data** (deliberate split):
  - *Per-child* — symptom logs, lab results, baseline, PTEC logs, right-now checklist, flare history: clinical observations tied to a specific child's body and history.
  - *Household-level / shared across all children* — medications, medication library, milestones, trigger log, household health: these capture the family's treatment history and environmental context. Triggers (strep, stress, schedule change) and household illness events affect all children simultaneously; the medication list records the household's cumulative treatment experience; milestones (appointments, lab results) are family health events. Scoping these per-child would split the treatment timeline artificially and make the print summary misleading for single-child families (the majority). Users with multiple PANS children can include the child's name in the title/notes of each entry.
- **Dual-layer persistence**: localStorage = instant state, Supabase = cross-device sync
- On mount (if authenticated), hooks fetch from server; if server has data → use it; if server empty → migrate localStorage data up
- All mutations update localStorage immediately (optimistic), then fire API call (best-effort)
- API server verifies Supabase JWTs via JWKS (`jose` `createRemoteJWKSet`); `attachUser` runs globally and sets `req.userId`, `requireAuth` enforces it on protected routes; data routes query Supabase with service-role key (no RLS needed)
- User IDs are Supabase auth UUIDs (the JWT `sub` claim) stored in TEXT `user_id` columns. **Auth migration was a fresh start — pre-migration Clerk-format user data (`user_2xyz...`) is not carried over.**
- Google OAuth uses `supabase.auth.signInWithOAuth` with `redirectTo` = `origin + basePath + '/auth/callback'`; the `/auth/callback` route lets supabase-js exchange the code (detectSessionInUrl) then routes home or back to sign-in
- ReferenceArea from Recharts used for medication period overlays on the line chart
- Print summary uses `@media print` CSS and `window.print()` — no server-side rendering
- Score buttons (0–5) as toggle groups rather than sliders for quick finger-friendly entry; 0 = none/poor, 5 = extreme/excellent; null = not entered
- Print page bypasses the sidebar layout via route-based check in App.tsx

## Product

- Dashboard: 30-day symptom trend line chart with medication overlays + quick daily log form
- Daily Log: log or edit any date's symptoms (6 categories, 0–5 scale) with free-text notes
- Medications: add/edit/delete medications with name, dose, type, date range, and notes
- Print Summary: formatted doctor-visit report with medication table, 30-day score grid, and notes
- PTEC Check-in: weekly parent stress / executive function tracker
- Milestones, Triggers, Household Health, Wellbeing — all synced to Supabase

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Data hooks (all 9+) call `useAuth()` from `@/hooks/useSupabaseAuth` — must be rendered inside `AuthProvider`
- The `useSupabaseAuth` hooks intentionally keep Clerk-shaped names/signatures (`useAuth`/`useUser`/`useClerk`, `useClerk().addListener`); leftover "Clerk" wording in comments/aliases is by design, not a missed migration
- useSymptomLogs is now child-scoped: filters by activeChildId on init + API sync; preserves other children's localStorage data on every write by reading storage.getLogs() and filtering out the active child's entries before merging
- ChildSwitcher has 3 variants: "sidebar" (full nav block), "mobile" (header pill), "pill" (page-level "Viewing: {name}" indicator rendered globally in Layout)
- ViewingPill (ChildSwitcher variant="pill") is hidden on /learn/* and /settings/children; visible on all other child-scoped pages
- HMR hook-order errors are transient; a full page reload after hook changes resolves them
- `SUPABASE_SERVICE_ROLE_KEY` must be set as a Replit secret; without it, `/api/data/*` routes return 500
- Print page has its own layout (no sidebar) — enforced by route check in App.tsx Layout component
- Google Fonts import must be the very first line in index.css

## Supabase schema setup

Run migrations in order in the Supabase SQL editor:
1. `supabase/migrations/002_all_tables.sql` — base schema
2. `supabase/migrations/010_children.sql` — adds children table + child_id to symptom_logs, right_now_checklist_state, parent_observation_summaries
3. `supabase/migrations/011_symptom_logs_child_key.sql` — changes unique constraints to (user_id, child_id, date) so two children can have logs on the same date

Tables use TEXT `user_id` columns holding Supabase auth UUIDs (the JWT `sub` claim).

## Supabase Auth — required dashboard config

The JWKS-based JWT verification and OAuth flow depend on dashboard settings (user actions, not code):

1. **Asymmetric JWT signing keys** — the project must use asymmetric signing keys (RS256/ES256) so a JWKS endpoint exists at `${VITE_SUPABASE_URL}/auth/v1/.well-known/jwks.json`. Legacy HS256 (shared secret) projects publish no JWKS and the API cannot verify tokens. Migrate keys under Authentication → JWT Keys.
2. **Redirect URL allowlist** — add the app origin(s) + `/auth/callback` (dev `${REPLIT_DEV_DOMAIN}` and the production domain) under Authentication → URL Configuration → Redirect URLs.
3. **Google provider** — enable Google under Authentication → Providers and supply the OAuth client ID/secret for Google sign-in to work.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
