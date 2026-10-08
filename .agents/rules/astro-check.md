# Rule: Zero-Tolerance AstroCheck Quality Contract

This rule is mandatory and active across all iterations, features, refactors, and component implementations in the FlotaX codebase.

## 1. Mandatory Per-Step Verification Gate

- **Zero-Tolerance Rule**: No task, subtask, step, or iteration is considered complete until `pnpm check` executes cleanly with **0 errors, 0 warnings, and 0 hints**.
- **Every Iteration Check**: Whenever an Astro component, TypeScript file, module script, or page is created or edited, run `pnpm check` immediately before handing back control to the user.
- **Never Ignore Warnings or Unused Declarations**:
  - `tsconfig.json` has `noUnusedLocals: true` (inherited from `astro/tsconfigs/strictest`). Every imported identifier, prop, or variable MUST either be used or removed.
  - `exactOptionalPropertyTypes: true` is strictly enforced. Optional props (e.g. `prop?: Type`) must not be assigned `undefined` explicitly without `Type | undefined` in the interface declaration.
  - **Zero Deprecated APIs**: Prohibido usar APIs o métodos marcados como `@deprecated` (e.g. `TS6385`, `TS6387`). Cumplir estrictamente con la regla `RUL-FLX-018` ([`no-deprecated-code.md`](./no-deprecated-code.md)).
  - Never pass an undefined string into required HTML/Astro attributes (e.g. `<Button href={optionalHref}>` must be conditionally branched or guarded).
  - DOM methods that can receive `null` or `undefined` (such as `querySelector`, `getElementById`, `lastElementChild`) must be guarded with optional chaining `?.` or explicit truthy checks before calling methods like `.remove()`, `.appendChild()`, or `.textContent`.

## 2. Standard Verification Routine

At the end of **every single step** of work:
1. Run `pnpm check` (which runs `astro check`).
2. Verify output explicitly reports:
   ```
   Result (X files):
   - 0 errors
   - 0 warnings
   - 0 hints
   ```
3. Run `pnpm build` to confirm Cloudflare adapter asset bundling and SSR compilation succeed.
4. If ANY diagnostic fails, resolve the root cause immediately before proceeding.
