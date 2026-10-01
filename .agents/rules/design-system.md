# Rule: Phoenix Design System & Visual Identity Governance

## 1. The 4-Tier Component Architecture (Strict Separation)

All UI elements in Phoenix must strictly adhere to the 4-tier hierarchy. Creating ad-hoc or cross-tier components is prohibited.

```
Tier 0: Design Tokens (Single Source of Truth)   -> src/styles/tokens.css
Tier 1: UI Primitives (Agnostic Atoms/Molecules) -> src/components/ui/
Tier 2: Domain UI (Screaming Architecture)       -> src/modules/{module}/ui/
Tier 3: Shells & Layouts (Responsive Framework)  -> src/layouts/
```

### Tier 0: Design Tokens
- **No Hardcoded Values**: Never write raw hex codes (e.g. `#FF5F1F`), arbitrary pixel paddings (e.g. `19px`), or custom font declarations directly in components.
- **Mandatory Variable Consumption**:
  - Surfaces: `var(--bg)`, `var(--surface)`, `var(--surface-elevated)`
  - Colors: `var(--orange-primary)`, `var(--orange-secondary)`, `var(--tangerine)`, `var(--yellow)`, `var(--peach-soft)`
  - Spacing: `var(--spacing-1)` (4px) through `var(--spacing-16)` (64px)
  - Radii: `var(--radius-small)` (6px), `var(--radius-medium)` (12px), `var(--radius-large)` (20px), `var(--radius-extra-large)` (28px), `var(--radius-pill)` (9999px)
  - Typography: `var(--font-display)` (Space Grotesk), `var(--font-body)` (Inter)
  - Motion: `var(--motion-short)` (150ms), `var(--motion-medium)` (260ms), `var(--motion-emphasis)` (450ms)
- **Token Source**: Run `node scripts/extract-pen-tokens.mjs` whenever `design/design.pen` variables change.

### Tier 1: UI Primitives (`src/components/ui/`)
- Must be **100% domain-agnostic** (no references to "tasks", "frogs", "goals", or "drizzle").
- Exclusively consume tokens; provide typed variants, sizes, and ARIA attributes.
- Touch target minimum: interactive touch targets must measure at least **44x44px** (`IconButton.astro`, `phx-nav-fab-btn`, etc.).
- Available Primitives: `Button`, `IconButton`, `Badge`, `Pill`, `Input`, `Toggle`, `SegmentedControl`, `Card`, `BottomSheet`, `QuickActionSheet`, `ProgressRing`, `Icon`.

### Tier 2: Domain Components (`src/modules/{module}/ui/`)
- Must reside within their respective module folder following **Screaming Architecture**:
  - `tunnel/ui/`: `A1FrogCard.astro`, `FocusTimer.astro`
  - `circadian/ui/`: `AbcdeTaskCard.astro`
  - `activation/ui/`: `GoalCard.astro`, `ThreePValidator.astro`
  - `strategic/ui/`: `ClarityScore.astro`, `WeeklyChart.astro`, `BalanceRadarCard.astro`
- Domain components MUST compose Tier 1 primitives. Never recreate buttons, cards, or inputs inside a domain component.

### Tier 3: Shells & Layouts (`src/layouts/`)
- `AppShell.astro`: Mandatory container for authenticated application views. Features the floating pill navigation bar (`phx-floating-pill-nav`) with the center FAB quick-action trigger.
- `CircadianLayout.astro`: Base HTML shell with theme attribute (`data-theme="circadian" | "dark" | "light"`).

---

## 2. Visual Identity & Signature Atmosphere (See `.agents/rules/pen-fidelity.md`)

Phoenix implements a distinctive visual language based on the psychology of focus and achievement directly defined in `design/design.pen`. Every screen must respect these signature atmosphere rules:

### A. Rayos & Foco (Sunburst Energy & Acoustic Resonance)
- When a task is designated as **Sapo A-1** or when a timer is in execution, it must be visually accompanied by the radiating sunburst system (`SolarRayBurst.astro` / `TimerCard.astro`) and acoustic resonance rings (`FocusRings.astro`).
- Solar bursts must feature `BurstA`, `BurstB`, `BurstC` and the elliptical dashed orbit with satellites and star core.
- Beams must use warm orange/amber gradients (`linear-gradient(var(--orange-primary), transparent)`) with gentle continuous rotation.

### B. Órbitas & Partículas (Momentum & Rhythm)
- Concentric orbital rings and satellites (`OrbitSystem.astro`) represent time cadence and focus cycles. Must draw from the 8 canonical Muestras (`halo`, `concentric`, `satellite`, `dual`, `constellation`, `corona`, `spiral`, `dotgrid`).
- Cards must project spatial depth using `CardBackdropOrbit.astro` (`Demo · Tras una card` & `Demo · Arcos tras timer`).
- Satellites must be colored strictly using the system scale: tangerine (`#FF5F1F`), yellow (`#FFC531`), and peach (`#FFD9B4`).

### C. Global Ambient Atmosphere (`AmbientBackground.astro`)
- Every view inside `AppShell.astro` inherits `AmbientBackground.astro` with the peach/yellow thermal blobs, faint background structural orbits (780px/440px/380px on desktop; 360px/280px on mobile), and floating corner rays.
- **OLED Mode Invariance**: In circadian mode (`data-theme="circadian"`), the background must remain absolute true black (`#000000`). Ambient auras blur deeply (>= 56px) at low opacity (12%) to completely eliminate blue light and protect melatonin.

### D. Tactile Notebook Texture (Brian Tracy Spiral SAR)
- Module 2 (Activación Matutina) and goal writing areas must integrate `DotGrid.astro` to evoke the tactile sensory trigger of writing in a physical spiral notebook.

### E. Teleological Hierarchy (Single-Handling Principle)
- The **A-1 task must visually dominate** all other interface elements on the screen.
- Secondary tasks (B, C, D, E) must never compete in size, elevation, or visual weight with A-1.
- In **Modo Túnel**, secondary tasks and global navigation are hidden completely.

---

## 3. Mandatory Pre-Creation Component Audit & Reuse Contract

**BEFORE creating any new UI component, the following protocol is STRICTLY MANDATORY:**

1. **Audit Existing Components**:
   - Check `src/components/ui/` (Tier 1 primitives) and `src/modules/{module}/ui/` (Tier 2 domain components).
   - If an existing component already covers the use case or can be parameterized via props/slots (e.g., adding a variant, pattern, or size), **you MUST reuse or extend the existing component**.
   - NEVER create parallel duplicates (e.g., creating another sunburst when `SolarRayBurst` exists, or another orbit when `OrbitSystem` / `CardBackdropOrbit` exist).

2. **Mandatory In-File Component Header Documentation**:
   - **Every** Astro component MUST begin with a frontmatter JSDoc comment describing:
     - `@component` Name and canonical Pen node ID reference.
     - `@description` Purpose and visual role.
     - `@usage` When to use (clear triggers/scenarios).
     - `@avoid` When NOT to use (anti-patterns, pointing to the alternative component to use instead).
     - `@see` Related components.

```astro
---
/**
 * @component ComponentName
 * @source design/design.pen -> "Frame Name" (NodeID)
 * @description Brief explanation of what this component renders.
 * 
 * @usage WHEN TO USE:
 * - Scenario 1...
 * - Scenario 2...
 * 
 * @avoid WHEN NOT TO USE:
 * - Do NOT use for X; use <AlternativeComponent /> instead.
 * - Do NOT use when Y.
 * 
 * @see RelatedComponent
 */
---
```

---

## 4. Strict Prohibitions

1. **NO Arbitrary CSS**: Never declare hardcoded color values or random border radii.
2. **NO Redundant Components**: Before creating any new component, verify if a Tier 1 primitive or Tier 2 domain widget already exists.
3. **NO Blue Light in Circadian Mode**: Never use cool blues, violet tints, or harsh white flashes in nighttime views.
4. **NO Unchecked TypeScript**: All Astro and TS files must pass `pnpm check` with **0 errors, 0 warnings, and 0 hints**.

