# Index: `src/lib/metricas`

**Responsibility**: Dominio de métricas y telemetría operativa de flota: ganancia diaria con vehículos, ocupación mensual (reservas y ganancias por mes), automóviles alquilados y movimientos diarios en COP.
**Architectural Layer**: Application / Domain Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.ts`](./index.ts) | Barrel Export | Re-exporta todos los contratos y proveedores del dominio de métricas | `./types`, `./telemetry-provider`, `./repositorio` |
| [`repositorio.ts`](./repositorio.ts) | Repositorio D1 de Métricas | `obtenerDatosMetricasLocalD1`, `DatosMetricasLocalD1` | `@/db/schema`, `@/lib/db`, `@/lib/time/client-time`, `drizzle-orm` |
| [`telemetry-provider.ts`](./telemetry-provider.ts) | Proveedor de Métricas Operativas | `getYardMetricsSnapshot`, `BuildMetricsInput` | `@/lib/caja`, `@/lib/flota`, [`./types.ts`](./types.ts), [`./repositorio.ts`](./repositorio.ts) |
| [`types.ts`](./types.ts) | Contratos de Dominio | `YardMetricsSnapshot`, `DailyVehicleEarningsSummary`, `VehicleEarningsCategorySlice`, `HourlyEarningsSlot`, `MonthlyFleetOccupancySummary`, `MonthlyOccupancyPoint`, `RentedFleetComplement`, `RentedAutomobileItem`, `DailyMovementsSummary`, `DailyMovementCurvePoint`, `DailyCompanyMovementItem`, `DailyMovementKind`, `DailyMovementFilter`, `DailyCurveSeriesFilter`, `MetricsFocusView`, `ProgressiveSectionId` | - |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
