---
name: Navigation architecture
description: Sidebar nav structure, mobile bottom tab bar, and post-login landing redirect by journey_stage.
---

## Rule

The sidebar has two nav groups rendered with a divider between them, plus a Settings item at the bottom. The mobile bottom tab bar has 4 items (Report + Advocate collapsed into "Reports" → /reports).

**Why:** The 5 primary pathways (Learn, Right Now, Log, Report, Advocate) need to be prominent without burying the existing tool pages (Dashboard, My Child, Wellbeing, PTEC, Timeline).

**How to apply:**

### Sidebar groups (Sidebar.tsx)
- `PRIMARY_NAV` — 5 items: `/learn` (BookOpen), `/right-now` (LifeBuoy), `/log` (NotebookPen), `/export` (FileText), `/advocate` (Megaphone)
- `SECONDARY_NAV` — `/` Dashboard (LayoutDashboard), `/baseline` My Child, `/wellbeing` For You, `/ptec`, `/timeline`
- `SETTINGS_SECTION` — `/settings` at bottom
- `ALL_NAV = [...PRIMARY, ...SECONDARY, SETTINGS]` used by `getSectionForPath` for active-state detection

### Mobile bottom tabs (MOBILE_TABS)
- 4 tabs: Learn (`/learn`), Right Now (`/right-now`), Log (`/log`), Reports (`/reports`)
- Each tab has `matchPaths` array for sub-route active-state: Log covers `/log, /medications, /triggers, /ptec`; Reports covers `/reports, /export, /advocate, /print, /school`
- Bottom tabs need `pb-20 md:pb-0` on the Layout `<main>` to avoid content hiding behind them

### Post-login landing redirect (App.tsx Router)
- Uses `const postLoginLanded = useRef(false)` declared inside Router function
- First effect clears the flag when `!isSignedIn` (sign-out resets it)
- Second effect fires once per session when journey state loads: `exploring` → `/learn`, `in_crisis` → `/right-now`, `tracking` → stays on `/`
- Does NOT include `location` in dep array — intentional, so it fires only on data load, not on every navigation
