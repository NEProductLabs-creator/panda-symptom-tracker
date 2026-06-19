---
name: Framer Motion v12 Variants typing
description: How to safely type Variants and Transition objects in framer-motion ^12 with strict TypeScript.
---

## Rule

Do not put `ease` (or other `Transition` fields) inline inside a `Variants` object — the TS compiler will infer the value as `string` or `number[]` rather than the `Easing` union, causing a type error.

**Why:** framer-motion v12 uses strict `Easing` type unions. An untyped object literal's `ease: "easeOut"` becomes `string`, not `Easing`, which fails assignability to `Variants`.

**How to apply:**

1. Type variant objects explicitly: `const myVariant: Variants = { ... }`.
2. Extract any per-element transition into a separately typed constant:
   ```ts
   const ITEM_TRANSITION: Transition = { duration: 0.48, ease: "easeOut" };
   ```
3. Apply it via the `transition` prop on the motion element:
   ```tsx
   <motion.div variants={fadeUp} transition={ITEM_TRANSITION} />
   ```
4. Container stagger config (`staggerChildren`, `delayChildren`) placed inside the `transition` key of the `show` variant is fine — it does not involve `Easing`.
