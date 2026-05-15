# PANS & PANDAS Symptom & Medication Tracker

A daily symptom and medication tracking app for parents managing children with PANS or PANDAS. Logs symptom scores across 6 categories, tracks medications, visualizes 30-day trends, and generates a print-friendly doctor summary.

## Run & Operate

- `pnpm --filter @workspace/pans-tracker run dev` — run the tracker app
- `pnpm run typecheck` — full typecheck across all packages
- Required env: none (all data is localStorage-only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter (routing), Recharts (charts)
- Styling: Tailwind CSS v4, shadcn/ui components
- Data: localStorage only (no backend, no database)

## Where things live

- `artifacts/pans-tracker/src/` — main app source
  - `lib/types.ts` — SymptomLog and Medication types
  - `lib/storage.ts` — localStorage read/write helpers
  - `hooks/useSymptomLogs.ts` — hook for symptom log CRUD
  - `hooks/useMedications.ts` — hook for medication CRUD
  - `components/layout/Sidebar.tsx` — navigation sidebar
  - `components/charts/SymptomChart.tsx` — Recharts line chart with medication overlays
  - `pages/Dashboard.tsx` — main dashboard with chart + quick log
  - `pages/LogEntry.tsx` — full log entry form + history table
  - `pages/Medications.tsx` — medication management
  - `pages/PrintSummary.tsx` — print-optimized doctor summary

## Architecture decisions

- Pure localStorage for persistence — no backend required, all data stays on device
- ReferenceArea from Recharts used for medication period overlays on the line chart
- Print summary uses `@media print` CSS and `window.print()` — no server-side rendering
- Score buttons (1–5) as toggle groups rather than sliders for quick finger-friendly entry
- Print page bypasses the sidebar layout via route-based check in App.tsx

## Product

- Dashboard: 30-day symptom trend line chart with medication overlays + quick daily log form
- Daily Log: log or edit any date's symptoms (6 categories, 1–5 scale) with free-text notes
- Medications: add/edit/delete medications with name, dose, type, date range, and notes
- Print Summary: formatted doctor-visit report with medication table, 30-day score grid, and notes

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- All data is stored in localStorage under keys `pans_tracker_symptom_logs` and `pans_tracker_medications`
- Print page has its own layout (no sidebar) — enforced by route check in App.tsx Layout component
- Google Fonts import must be the very first line in index.css

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
