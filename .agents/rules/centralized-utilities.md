# Rule: Centralized Utilities & Auxiliary Function Governance (Anti-Duplication Standard)

## 1. Context & Purpose

In FlotaX, auxiliary functions (such as date/time formatters, duration calculators, currency/rate formatters, string sanitizers, math algorithms, and array transformations) are frequently needed across multiple components, hooks, and services.

Defining these functions as ad-hoc, private helpers inside React hooks, Astro frontmatters, or UI components creates **code drift**, **duplicated logic**, **bundle bloat**, and **untestable code**.

This rule mandates that any pure or auxiliary function with potential reuse across the application MUST be centralized in its designated domain within `src/lib/` or the module's domain/application layer.

---

## 2. Strict Prohibitions

1. **NO Trapped Helpers in Hooks or UI Files**:
   - Strictly forbidden to define pure auxiliary functions (e.g. `formatTime`, `formatDuration`, `pad`, `slugify`, `formatCurrency`) inside React hook files (e.g. `useChatStream.ts`), Astro components (`*.astro`), or React UI components (`*.tsx`).
2. **NO Inline String Padding or Date Parsing Hacks**:
   - Forbidden to write ad-hoc date/time string manipulations (e.g. `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`) directly in templates or callbacks. Always consume the centralized utility from `src/lib/time/`.
3. **NO Monolithic "Junk Drawer" Files (`utils.ts`)**:
   - Forbidden to create a single catch-all `utils.ts` or `helpers.ts` containing unrelated utilities. Utilities must be categorized by semantic domain under `src/lib/{domain}/`.
4. **NO Silent Timezone Inconsistencies**:
   - All time, date, and duration helpers must align with `.agents/rules/client-time-context.md`. They must be timezone-aware and safe across both Cloudflare Workers (UTC edge runtime) and client browsers.

---

## 3. Categorization & Location Taxonomy

All utilities must be placed in one of the following architectural locations:

```
src/
├── lib/                         # Cross-cutting, domain-agnostic or infrastructure utilities
│   ├── time/                    # Date, time, duration, and timezone utilities
│   │   ├── client-time.ts       # formatTime, formatDuration, toClientISODate, resolveClientTimeContext
│   │   └── index.ts             # Clean barrel export
│   ├── client/                  # Browser-only utilities, shared hooks, and HTTP client
│   │   ├── api-client.ts        # Typed fetch wrapper
│   │   ├── hooks/               # Generic hooks (useCountdown, useOptimisticMutation)
│   │   └── index.ts             # Clean barrel export
│   ├── ai/                      # AI message transformers, prompt utilities, and token helpers
│   ├── audio/                   # Audio recording, Web Audio API, sound feedback helpers
│   ├── db/                      # Schema helpers, query builders, and database sanitizers
│   └── cloudflare/              # Edge bindings, KV, and D1 utility wrappers
│
└── modules/{module}/            # Feature-specific domain logic
    ├── domain/                  # Pure domain business rules and entity calculations
    └── application/             # Application services and module-specific orchestration
```

### Placement Decision Matrix:

| Type of Utility | Destination | Example |
| :--- | :--- | :--- |
| Date / Time / Duration formatting | `src/lib/time/` | `formatTime(date)`, `formatDuration(seconds)` |
| Client-side API / Network helpers | `src/lib/client/` | `fetchJson<T>()`, `handleApiError()` |
| Reusable Client UI Hooks | `src/lib/client/hooks/` | `useCountdown()`, `useOptimisticMutation()` |
| Math / Statistical primitives | `src/lib/math/` | `clamp()`, `movingAverage()`, `linearInterpolate()` |
| String / Slug / Parsing | `src/lib/string/` (or domain) | `sanitizeHtml()`, `truncateWithEllipsis()` |
| Module-specific Business Logic | `src/modules/{module}/domain/` | `calculateCircadianScore()`, `rankFrogTasks()` |

---

## 4. Design Standards for Centralized Utilities

All centralized utilities must adhere to the following contracts:

1. **Pure & Deterministic**:
   - Given the same arguments, the function must always return the exact same output without side effects or mutation of input arguments.
2. **Defensive by Default**:
   - Gracefully handle `null`, `undefined`, `NaN`, and `Invalid Date` without throwing unhandled runtime exceptions. Provide clear fallbacks (e.g. `'--:--'`, `0`, `''`).
3. **Strictly Typed**:
   - Every parameter and return type must have explicit TypeScript types. No implicit or explicit `any`.
4. **Zero Heavyweight Dependencies**:
   - Prefer native Web standards (`Intl.DateTimeFormat`, `Math`, native `Date`, `URL`, `crypto`) over bulky third-party libraries (e.g. `moment`, `dayjs`, `lodash`).
5. **Barrel Exports (`index.ts`)**:
   - Each utility directory under `src/lib/{domain}/` should maintain an `index.ts` file re-exporting public functions for clean and stable imports.

---

## 5. Verification Checklist for Agents & Engineers

Before submitting or completing any task:
1. [ ] Are all auxiliary functions extracted from React hooks, components, and pages into `src/lib/{domain}/`?
2. [ ] Are there zero inline manual date/time padding hacks (`padStart`) in components?
3. [ ] Does `src/lib/{domain}/` export the helper cleanly (e.g. via `index.ts` or documented module)?
4. [ ] Does `pnpm check` report **0 errors, 0 warnings, and 0 hints**?
5. [ ] Does `pnpm build` succeed cleanly?
