---
name: Onboarding gate pattern
description: How the per-child onboarding gate is structured in App.tsx Router
---

The gate is split into two sequential effects inside the `Router` component.

**Rule:** Always check `childrenLoading` before any gate decision. Never check `journeyState` before knowing children exist.

**Gate effect order:**
1. Wait for `isLoaded && isSignedIn && !isDemoMode`
2. Wait for `!childrenLoading`
3. Skip if already on `/onboarding/*`, `/sign-in`, `/sign-up`, `/about`, `/print`
4. If `!children?.length` → navigate `/onboarding/add-child`
5. Else wait for `!journeyStateLoading && !journeyStateError && journeyState`
6. If `journeyState.journey_stage !== null` → return (gate does not apply)
7. navigate `/onboarding/start`

**Post-login landing effect** must also guard with `childrenLoading || !children?.length` before the journey_stage redirect — otherwise it fires before children are loaded and skips the gate.

**Why:** journey_stage lives on the active child (post migration 010). Without children, there is no active child, so journeyState.journey_stage is always null. Checking children first prevents an infinite loop where a user with no children gets gate→/onboarding/start→gate loop.

**How to apply:** Any time the gate logic is modified, ensure both effects include the `childrenLoading`/`children.length` guard before accessing journeyState.
