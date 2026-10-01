# Rule: Tailwind CSS v4 & Tiered Styling Architecture Governance

## 1. Context & Purpose

In this project (**Movix / Sistema de Alquiler de Vehículos**), the application is architected as a serverless monolith running on **Astro 7+** powered by **Vite** and deployed to **Cloudflare Pages / Workers**, featuring interactive islands driven by **React 19**.

To achieve sub-5ms edge response times, eliminate styling fragmentation across Astro and React, and maintain strict design token governance, the styling engine is standardized on **Tailwind CSS v4** compiled natively via the **Vite plugin (`@tailwindcss/vite`)**.

This rule establishes the layered styling architecture, forbids arbitrary class abuse, and specifies how styles must be authored across `.astro` templates and `.tsx` islands.

---

## 2. The 3-Tier Layered Architecture

All styling in the codebase must strictly map to one of three tiers. Cross-tier contamination is forbidden:

```
Tier 0: Design Tokens & Platform Shielding  -> src/styles/tokens.css
Tier 1: Agnostic UI Primitives (Astro)      -> src/components/ui/*.astro
Tier 2: Interactive Reactive Islands (React)-> src/components/react/*.tsx
```

### Tier 0: Design Tokens & Universal Mobile Shielding (`src/styles/tokens.css`)
- **Single Source of Truth**: Variables are defined natively in CSS using Tailwind v4's `@theme` directive.
- **No `tailwind.config.js`**: Tailwind v4 configuration resides entirely within CSS.
- **Semantic Token Names**: Colors, radii, typography, and spacing must declare semantic aliases (e.g. `--color-surface-bg`, `--color-brand-primary`, `--radius-touch`).
- **Platform Invariants**: Global ergonomics rules (e.g., the 16px font-size floor for iOS WebKit inputs, `scroll-margin` on forms, tap highlight removals) MUST be defined in `tokens.css`. Never delegate platform safety to individual utility classes in components.

### Tier 1: Agnostic UI Primitives (`src/components/ui/`)
- Reusable base components (`Button.astro`, `Card.astro`, `Input.astro`, `Modal.astro`).
- Must compose Tailwind v4 utility classes linked to Tier 0 tokens.
- Must accept a `class?: string` prop and combine it via `class:list={[defaultClasses, className]}`.
- Must enforce the **44x44px** minimum touch target on interactive elements.

### Tier 2: Interactive React 19 Islands (`src/components/react/`)
- Stateful islands (`FormularioInspeccion.tsx`, `CalendarioFlota.tsx`, `TablaCartera.tsx`).
- Styled using the exact same Tailwind v4 utilities as Tier 1.
- **NO CSS Modules**: Do NOT create `*.module.css` or `*.scoped.css` files for React components.
- **NO CSS-in-JS**: Styled-components, Emotion, or inline style objects are strictly prohibited.

---

## 3. Strict Prohibitions for AI Agents & Developers

1. **NO Hardcoded Hex Codes or Raw Colors**:
   - ❌ FORBIDDEN: `bg-[#131211]`, `text-[#2563eb]`, `border-[#E5E7EB]`
   - ✅ REQUIRED: `bg-brand-primary`, `text-brand-accent`, `border-border-subtle`
2. **NO Arbitrary Pixel Spacings or Widths from Design Files**:
   - ❌ FORBIDDEN: `w-[1376px]`, `gap-[36px]`, `p-[64px]` (raw exports from tools like Pencil or Figma)
   - ✅ REQUIRED: Use standard Tailwind scale (`gap-8`, `p-12`, `max-w-7xl`) or declare a named token in `tokens.css` if it represents a recurring layout boundary.
3. **NO Ad-hoc Mobile Input Workarounds**:
   - ❌ FORBIDDEN: Scattering `text-base md:text-sm` across all inputs to prevent iOS zoom.
   - ✅ REQUIRED: Rely on the Tier 0 global rule in `tokens.css` which enforces `font-size: 16px !important` on screens `< 768px`.
4. **NO Manual Class Strings in JavaScript Logic**:
   - When conditionally toggling classes in React 19 or Astro, use `clsx` or `class:list`. Do not concatenate strings manually with string interpolation (`className={`btn ${isActive ? 'active' : ''}`}`).

---

## 4. Canonical Tailwind v4 Setup Reference

### `src/styles/tokens.css`
```css
@import "tailwindcss";

@theme {
  /* Brand & Status Colors */
  --color-brand-primary: #131211;
  --color-brand-accent: #2563eb;
  --color-status-success: #16a34a;
  --color-status-warning: #f59e0b;
  --color-status-danger: #dc2626;

  /* Surfaces & Neutral Hierarchy */
  --color-surface-canvas: #f1f0ec;
  --color-surface-card: #ffffff;
  --color-surface-elevated: #fbfbf9;
  --color-border-subtle: #e5e5e0;

  /* Typography Scales */
  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Radii & Ergonomics */
  --radius-touch: 20px;
  --radius-card: 16px;
  --radius-input: 12px;
}

/* Universal Mobile Ergonomics Shielding (iOS WebKit Anti-Zoom) */
@media screen and (max-width: 768px) {
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]),
  textarea,
  select {
    font-size: 16px !important;
  }
}

/* Breathing room for virtual keyboards */
input, textarea, select {
  scroll-margin-top: 80px;
  scroll-margin-bottom: 80px;
}
```

### `astro.config.mjs` (Vite Native Integration)
```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  adapter: cloudflare(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()]
  }
});
```

---

## 5. Pre-Merge Verification Checklist for Agents

Before completing any task that adds or modifies styles:
1. [ ] Are all utilities referencing design tokens or standard Tailwind scale instead of arbitrary brackets (`[...]`)?
2. [ ] Are both Astro templates and React islands using uniform Tailwind classes with zero `*.module.css` files?
3. [ ] Are interactive touch targets at least 44x44px for mobile administration?
4. [ ] Does the build run without dead CSS warnings and pass `pnpm check` with 0 errors and 0 warnings?
