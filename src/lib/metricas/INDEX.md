# Index: `src/lib/metricas`

**Responsibility**: Dominio de telemetría operativa, series temporales, matrices de unidades y agregación de métricas para el panel móvil iOS de FlotaX.
**Architectural Layer**: Application / Domain Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.ts`](./index.ts) | Barrel Export | Re-exporta todos los tipos y funciones del dominio de métricas | `./types`, `./telemetry-provider` |
| [`telemetry-provider.ts`](./telemetry-provider.ts) | Proveedor de Telemetría | `getYardMetricsSnapshot`, `BuildMetricsInput` | [`./types.ts`](./types.ts) |
| [`types.ts`](./types.ts) | Contratos de Dominio | `YardMetricsSnapshot`, `SplineDataPoint`, `FleetCategorySummary`, `WaffleUnitNode`, `ShiftMovementItem`, `LiveTelemetryPulse`, `MetricTimeRange`, `FleetCategoryFilter` | - |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
