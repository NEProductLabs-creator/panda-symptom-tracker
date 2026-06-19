# PANS & PANDAS Symptom & Medication Tracker

A daily symptom and medication tracking app for parents managing children with PANS or PANDAS. Logs symptom scores across 6 categories, tracks medications, visualizes 30-day trends, and generates a print-friendly doctor summary.

## Run & Operate

- `pnpm --filter @workspace/pans-tracker run dev` — run the tracker app
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck (note: lib/db has a pre-existing drizzle error, ignore it)
- Required env: `SUPABASE_SERVICE_ROLE_KEY` (Replit secret) for Supabase sync

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter (routing), Recharts (charts), Clerk auth
- Styling: Tailwind CSS v4, shadcn/ui components
- Data: localStorage (instant cache) + Supabase (sync via API server)
- Auth: Clerk (Replit-managed)

## Where things live

- `artifacts/pans-tracker/src/` — main app source
  - `lib/types.ts` — all data type definitions
  - `lib/storage.ts` — localStorage read/write helpers (cache layer)
  - `lib/api.ts` — typed API client (createApiClient factory, uses Clerk token)
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
  - `routes/data.ts` — all data CRUD routes (`/api/data/*`), protected by Clerk auth
  - `lib/supabase.ts` — server-side Supabase client (service-role key)

## Architecture decisions

- **Dual-layer persistence**: localStorage = instant state, Supabase = cross-device sync
- On mount (if authenticated), hooks fetch from server; if server has data → use it; if server empty → migrate localStorage data up
- All mutations update localStorage immediately (optimistic), then fire API call (best-effort)
- API server uses Clerk JWT middleware; data routes enforce auth, query Supabase with service-role key (no RLS needed)
- User IDs are Clerk format (TEXT `user_2xyz...`) — not Supabase auth UUIDs
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

- Data hooks (all 9+) call `useAuth()` from `@clerk/react` — must be rendered inside ClerkProvider
- useSymptomLogs is now child-scoped: filters by activeChildId on init + API sync; preserves other children's localStorage data on every write by reading storage.getLogs() and filtering out the active child's entries before merging
- ChildSwitcher has 3 variants: "sidebar" (full nav block), "mobile" (header pill), "pill" (page-level "Viewing: {name}" indicator rendered globally in Layout)
- ViewingPill (ChildSwitcher variant="pill") is hidden on /learn/* and /settings/children; visible on all other child-scoped pages
- HMR hook-order errors are transient; a full page reload after hook changes resolves them
- `SUPABASE_SERVICE_ROLE_KEY` must be set as a Replit secret; without it, `/api/data/*` routes return 500
- Print page has its own layout (no sidebar) — enforced by route check in App.tsx Layout component
- Google Fonts import must be the very first line in index.css
- Pre-existing `lib/db` TS error about drizzle-orm (unrelated to this app — ignore in full typecheck)

## Supabase schema setup

Run migrations in order in the Supabase SQL editor:
1. `supabase/migrations/002_all_tables.sql` — base schema
2. `supabase/migrations/010_children.sql` — adds children table + child_id to symptom_logs, right_now_checklist_state, parent_observation_summaries
3. `supabase/migrations/011_symptom_logs_child_key.sql` — changes unique constraints to (user_id, child_id, date) so two children can have logs on the same date

Tables use TEXT `user_id` (Clerk format) — NOT Supabase auth UUIDs.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
