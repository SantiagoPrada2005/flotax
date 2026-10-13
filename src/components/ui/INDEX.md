# Index: `src/components/ui`

**Responsibility**: Primitivas y componentes visuales agnósticos Tier 1 del sistema de diseño FlotaX.
**Architectural Layer**: Presentation Layer / UI Primitives

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`FlotaxIsotype.astro`](./FlotaxIsotype.astro) | Componente SSR Astro: Isotipo Vectorial | `default` | Astro |
| [`FlotaxIsotype.tsx`](./FlotaxIsotype.tsx) | Isla React 19: Isotipo Vectorial | `default`, `FLOTAX_ISOTYPE_PATH` | React |
| [`index.ts`](./index.ts) | Barrel de exportación | Todos los componentes UI Tier 1 | Componentes internos |
| [`shiny-button.tsx`](./shiny-button.tsx) | Botón React con efecto de brillo | `ShinyButton` | React |
| [`testimonial.tsx`](./testimonial.tsx) | Componente de testimonios y valoraciones | `Testimonial` | React |
| [`text-roll.tsx`](./text-roll.tsx) | Animación 3D de texto carácter por carácter | `TextRoll` | `framer-motion` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
