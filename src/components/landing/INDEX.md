# Index: `src/components/landing`

**Responsibility**: Componentes visuales y secciones promocionales de la landing page principal de FlotaX.
**Architectural Layer**: Presentation Layer / Landing Domain

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`LandingBookingCard.astro`](./LandingBookingCard.astro) | Wrapper del cotizador rápido | `default` | `./LandingBookingIsland` |
| [`LandingBookingIsland.tsx`](./LandingBookingIsland.tsx) | Cotizador rápido con fechas y categorías | `default` | React |
| [`LandingCategories.astro`](./LandingCategories.astro) | Astro UI Component | Astro Template | - |
| [`LandingFaq.astro`](./LandingFaq.astro) | Preguntas frecuentes | `default` | Astro |
| [`LandingFeatured.astro`](./LandingFeatured.astro) | Astro UI Component | Astro Template | - |
| [`LandingFinalCta.astro`](./LandingFinalCta.astro) | Llamado a la acción final | `default` | Astro |
| [`LandingFleetShowcase.astro`](./LandingFleetShowcase.astro) | Sección unificada de flota y categorías | `default` | `./LandingFleetShowcaseIsland`, `@/lib/flota` |
| [`LandingFleetShowcaseIsland.tsx`](./LandingFleetShowcaseIsland.tsx) | Isla interactiva con TextRoll, cards azules y preview de flota | `default` | React, `@/components/ui/text-roll` |
| [`LandingFooter.astro`](./LandingFooter.astro) | Pie de página corporativo | `default` | Astro |
| [`LandingHeader.astro`](./LandingHeader.astro) | Encabezado principal y navegación | `default` | Astro |
| [`LandingHero.astro`](./LandingHero.astro) | Wrapper del Hero Canvas | `default` | `./LandingHeroIsland` |
| [`LandingHeroIsland.tsx`](./LandingHeroIsland.tsx) | Isla interactiva Hero con Canvas 3D | `default` | React |
| [`LandingPriceBreakdown.astro`](./LandingPriceBreakdown.astro) | Desglose y política de precios | `default` | Astro |
| [`LandingRequirements.astro`](./LandingRequirements.astro) | Requisitos para alquilar | `default` | Astro |
| [`LandingSteps.astro`](./LandingSteps.astro) | Proceso de 3 pasos de alquiler | `default` | Astro |
| [`LandingTrust.astro`](./LandingTrust.astro) | Pilares de confianza y seguridad | `default` | Astro |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
