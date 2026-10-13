# Index: `src/components/dashboard`

**Responsibility**: Componentes modulares del Bento Grid y sistema de telemetría interactiva iOS para el panel de control operativo (Hero, Métricas con Spline táctil, Instrumentos Visuales de Telemetría y Operaciones).
**Architectural Layer**: Presentation Layer (Tier 2: Domain Modules)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`BentoHeroCard.astro`](./BentoHeroCard.astro) | Astro UI Component | Astro Template | - |
| [`BentoMetricsGrid.astro`](./BentoMetricsGrid.astro) | Astro UI Component | Astro Template | - |
| [`BentoOperationsCard.astro`](./BentoOperationsCard.astro) | Astro UI Component | Astro Template | - |
| [`InteractiveSplineCard.tsx`](./InteractiveSplineCard.tsx) | React 19 Island | `InteractiveSplineCard`, `InteractiveSplineCardProps` | `@/lib/metricas` |
| [`MetricsInteractiveHub.tsx`](./MetricsInteractiveHub.tsx) | React 19 Island | `MetricsInteractiveHub`, `MetricsInteractiveHubProps` | `@/lib/metricas`, `InteractiveSplineCard`, `TelemetryBentoGrid`, `TelemetryVisualModals` |
| [`TelemetryBentoGrid.tsx`](./TelemetryBentoGrid.tsx) | React 19 Island | `TelemetryBentoGrid`, `TelemetryBentoGridProps`, `BentoDetailModalKind` | `@/lib/metricas` |
| [`TelemetryVisualModals.tsx`](./TelemetryVisualModals.tsx) | React 19 Island | `TelemetryVisualModals`, `TelemetryVisualModalsProps` | `@/lib/metricas`, `TelemetryBentoGrid` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
