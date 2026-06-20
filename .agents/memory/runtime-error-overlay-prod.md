---
name: runtimeErrorOverlay prod guard
description: @replit/vite-plugin-runtime-error-modal must be dev-only or it silently swallows React render errors in production, leaving a white page.
---

## Rule
Always guard `runtimeErrorOverlay()` in vite.config.ts with a `NODE_ENV !== "production"` check:

```ts
...(process.env.NODE_ENV !== "production" ? [runtimeErrorOverlay()] : []),
```

## Why
In production mode the plugin intercepts React render errors via global error handlers but its overlay modal has no CSS/visibility — it swallows the error silently and the React root unmounts, leaving a completely white page with no console error. This is indistinguishable from a CSS failure or a blank render, making it very hard to diagnose.

## How to apply
Any time `runtimeErrorOverlay()` appears in `plugins: [...]` in vite.config.ts, check it is wrapped in a production guard. Same applies to any other Replit dev-only plugins (`cartographer`, `devBanner`).
