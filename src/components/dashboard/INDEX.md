# Index: `src/components/dashboard`

**Responsibility**: Componentes modulares del Bento Grid para el panel de control operativo (Hero, Métricas con Sparkline, Operaciones y Categorías).
**Architectural Layer**: Presentation Layer (Tier 2: Domain Modules)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`BentoHeroCard.astro`](./BentoHeroCard.astro) | Astro UI Component | Astro Template | - |
| [`BentoMetricsGrid.astro`](./BentoMetricsGrid.astro) | Astro UI Component | Astro Template | - |
| [`BentoOperationsCard.astro`](./BentoOperationsCard.astro) | Astro UI Component | Astro Template | - |
| [`InteractiveSplineCard.tsx`](./InteractiveSplineCard.tsx) | Module / Utility | - | - |
| [`MetricsInteractiveHub.tsx`](./MetricsInteractiveHub.tsx) | Module / Utility | - | - |
| [`TelemetryBentoGrid.tsx`](./TelemetryBentoGrid.tsx) | Module / Utility | - | - |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
