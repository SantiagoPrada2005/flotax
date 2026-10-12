# Index: `src/components/ui`

**Responsibility**: Primitivas y componentes visuales agnósticos Tier 1 del sistema de diseño FlotaX.
**Architectural Layer**: Presentation Layer / UI Primitives

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`FlotaxIsotype.tsx`](./FlotaxIsotype.tsx) | Isla React 19: Isotipo Vectorial | `default`, `FLOTAX_ISOTYPE_PATH` | React |
| [`FlotaxIsotype.astro`](./FlotaxIsotype.astro) | Componente SSR Astro: Isotipo Vectorial | `default` | Astro |
| [`shiny-button.tsx`](./shiny-button.tsx) | Botón React con efecto de brillo | `ShinyButton` | React |
| [`text-roll.tsx`](./text-roll.tsx) | Animación 3D de texto carácter por carácter | `TextRoll` | `framer-motion` |
| [`testimonial.tsx`](./testimonial.tsx) | Componente de testimonios y valoraciones | `Testimonial` | React |
| [`index.ts`](./index.ts) | Barrel de exportación | Todos los componentes UI Tier 1 | Componentes internos |

## Invariants & Directory Rules

- Componentes reutilizables agnósticos de lógica de negocio o D1/Workers.
- Fidelidad estricta con la paleta canónica de 5 tonos neutros y tokens de diseño.
