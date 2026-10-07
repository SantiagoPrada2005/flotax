# Rule: Page Architecture & Modular Composition Standards (Anti-Monolith Governance)

## 1. The Role of a Page (`src/pages/*.astro`): Lean Orchestrators

In Phoenix, pages in `src/pages/` are **pure route orchestrators (Containers)**. They are NOT component dumps or widget builders.

```
Page Role:
[ Layout (AppShell / CircadianLayout) ]
   └── [ Page Container / Orchestrator (<150 LOC) ]
         ├── [ Domain Module UI: Tier 2 Component ]
         ├── [ Domain Module UI: Tier 2 Component ]
         └── [ Domain Module UI: Tier 2 Component ]
```

### Prohibitions:
- **NO Inline Widgets**: Prohibited to write layout grids of widgets, metric clusters, cards, or custom tables directly inside `src/pages/*.astro`.
- **NO Embedded or Imperative DOM Scripts**: Prohibited to place imperative `<script>` tags or vanilla TS controller files doing manual DOM mutations (`document.createElement`, `innerHTML`, `appendChild`), global event wiring, or manual state management. Any dynamic, interactive, or streaming client state MUST be built as a declarative **React Island (`.tsx`)** mounted with `client:*` directives. See `.agents/rules/reactive-islands.md`.
- **NO Monolithic Styles**: A page file must never exceed 50 lines of `<style>`. Page styles must ONLY govern the macro layout (max-width, page grid, spacing between sections). Component-specific styles belong to their respective components.
- **Hard LOC Limit**: Any `.astro` file under `src/pages/` exceeding **150 lines of code** is a failure of decomposition and must be refactored immediately.

---

## 2. Strict 5-Tier Component Hierarchy

This expands `.agents/rules/design-system.md` to define the complete component lifecycle:

| Tier | Location | Scope | Max LOC | Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 0** | `src/styles/tokens.css` | Global | N/A | Design tokens (colors, spacing, radii, motion) |
| **Tier 1** | `src/components/ui/` | Agnostic | 120 | Reusable atomic primitives (`Button`, `Badge`, `Card`, `Input`, `ProgressRing`) |
| **Tier 2** | `src/modules/{module}/ui/` | Domain / Feature | 180 | Feature components (`A1FrogCard`, `AbcdeTaskList`, `FocusTimer`, `BalanceRadarCard`) |
| **Tier 3** | `src/layouts/` | Shell | 200 | App chrome, navigation, headers, circadian theme providers (`AppShell`, `CircadianLayout`) |
| **Tier 4** | `src/pages/` | Routing | 150 | Top-level routing, server props/data loading, composition of Tier 2 & Tier 3 |

---

## 3. Container / Presentational Separation (Astro Edition)

1. **Server Fetching & Initial Props (Page / Container)**:
   - Pages run server-side frontmatter (`---`). Their only job is resolving route parameters, reading Cloudflare D1/KV context, loading domain entities via application services, and passing typed props to domain components.
2. **Presentational Domain Components (`src/modules/{module}/ui/`)**:
   - Must be self-contained: template + scoped styles + encapsulated client scripts.
   - Reusable across multiple pages (e.g. `A1FrogCard` in both `/` and `/tunnel`).
3. **Mobile Deep-Work Pattern (Glance Card vs. Dedicated Route)**:
   - For complex, cognitively dense domain features (e.g. ABCDE Matrix, Daily Goals Notebook, KRA Radar, AI Insights), Tier 2 components must provide a concise **Glance Card** for dashboard pages, and Tier 4 must provide a **Dedicated Page Route** (`100dvh`) for deep focus. See `.agents/rules/mobile-deep-work.md`.

---

## 4. Decomposition Checklist Before Approving Any Page

Before creating or editing any page in `src/pages/`:
1. [ ] **User Flow Verification**: Does this page conform to [`docs/user-flows.md`](../../docs/user-flows.md) and pass the criteria in [`.agents/rules/user-flows.md`](./user-flows.md)?
2. [ ] Does the page template only invoke Tier 2/3 components without declaring raw sections or inline markup?
3. [ ] Is the page under 150 lines total?
4. [ ] Are all scripts extracted into encapsulated component scripts or TS utilities?
5. [ ] Are all domain-specific styles living inside their respective `src/modules/{module}/ui/*.astro` files?
6. [ ] Can each section of the page be tested or rendered in isolation?
