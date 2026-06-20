---
name: Production build gotchas
description: Two bugs that caused a silent production build failure and a React scheduler crash — both hard to diagnose remotely.
---

# Production build gotchas

## 1. PORT / BASE_PATH must have defaults, not throws

**Rule:** `vite.config.ts` must never throw on missing `PORT` or `BASE_PATH`. Use defaults (`?? "3000"` / `?? "/"`).

**Why:** Replit injects `[services.env]` vars at *runtime* only, not during the production build step. A hard throw causes the build to fail silently; Replit then serves whatever the last cached successful build was (could be a stale Clerk-era bundle). All subsequent code changes have zero effect in production.

**How to apply:** Any time `vite.config.ts` reads `process.env.PORT` or `process.env.BASE_PATH`, use nullish coalescing with a safe default. The static build output doesn't depend on PORT at all; BASE_PATH defaults to "/" which is correct for the root-mounted artifact.

## 2. Rollup manualChunks must use anchored path segments for React packages

**Rule:** Match `/react-dom/`, `/react/`, `/scheduler/`, `/react-is/` (with leading/trailing slashes), not loose substrings like `"react-dom"` or `"scheduler"`.

**Why:** Loose substring matches can accidentally include unrelated packages and, more critically, can let `scheduler` fall into the `vendor` chunk while `react-dom` goes into the `react` chunk. Two scheduler instances crash at startup with `TypeError: Cannot set properties of undefined (setting 'unstable_now')`.

**How to apply:** Every time `manualChunks` is touched, use anchored path segments for all React-ecosystem packages in the react chunk:
```js
if (
  id.includes("/react-dom/") ||
  id.includes("/react/") ||
  id.includes("/scheduler/") ||
  id.includes("/react-is/")
) return "react";
```
