# Index: `src/lib/mantenimientos`

**Responsibility**: Dominio de gestión de mantenimiento, órdenes técnicas de taller, alistamiento de patio, bloqueos operativos y resolución del estado de disponibilidad de la flota en Cloudflare D1.
**Architectural Layer**: Shared / Domain Repository Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.ts`](./index.ts) | Public Module Barrel | Re-export all types and repository functions | `./types`, `./repositorio` |
| [`repositorio.ts`](./repositorio.ts) | D1 Database Repository | `listarMantenimientosPorVehiculo`, `detectarReservasSolapadas`, `resolverEstadoActualVehiculo`, `crearOrdenMantenimiento`, `actualizarEstadoOrdenMantenimiento` | `@/lib/db`, `@/lib/db/diagnostics`, `@/lib/time/client-time`, `@/db/schema`, `drizzle-orm` |
| [`types.ts`](./types.ts) | Domain Types & Contracts | `CrearMantenimientoParams`, `ActualizarEstadoMantenimientoParams`, `AdvertenciaReservaSolapada`, `ResultadoCrearMantenimiento`, `ResultadoActualizarEstadoMantenimiento`, re-exports Drizzle (`MantenimientoVehiculoSelect`, etc.) | `@/db/schema` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
