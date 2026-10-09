# Index: `src/components/dashboard`

**Responsibility**: Componentes modulares del Bento Grid para el panel de control operativo (Hero, Métricas con Sparkline, Operaciones y Categorías).
**Architectural Layer**: Presentation Layer (Tier 2: Domain Modules)

## Files & Exports

| File | Purpose | Exports / Contracts |
| :--- | :--- | :--- |
| [`BentoHeroCard.astro`](./BentoHeroCard.astro) | Tarjeta hero de ocupación con porcentaje y mini-tarjeta anidada. | `occupancyPercentage`, `dateLabel`, `activeUnits`, `totalUnits`, `yardName` |
| [`BentoMetricsGrid.astro`](./BentoMetricsGrid.astro) | Grilla de 2 columnas bento con micro sparkline de cobros e indicador de unidades disponibles. | `availableCount`, `availableLabel`, `availableTrend`, `revenueAmount`, `revenueTrend` |
| [`BentoOperationsCard.astro`](./BentoOperationsCard.astro) | Tarjeta de estado pericial con desglose de autos, motos, patinetas y utilitarios. | `inspectionsCompleted`, `carsCount`, `motorcyclesCount`, `scootersCount`, `inspectionRate` |

## Invariants & Directory Rules

- Strictly adhere to FlotaX canonical neutral palette with semantic status indicators.
- No direct database access or heavy business logic; receive typed props only.

<!-- Reconciled by codebase-index -->
