# Index: `src/lib/mantenimientos`

**Responsibility**: Dominio de gestión de mantenimiento, órdenes técnicas de taller, alistamiento de patio, bloqueos operativos y resolución del estado de disponibilidad de la flota en Cloudflare D1.
**Architectural Layer**: Shared / Domain Repository Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`types.ts`](./types.ts) | Domain Types & Contracts | `CrearMantenimientoParams`, `ActualizarEstadoMantenimientoParams`, `AdvertenciaReservaSolapada`, `ResultadoCrearMantenimiento`, `ResultadoActualizarEstadoMantenimiento`, re-exports Drizzle (`MantenimientoVehiculoSelect`, etc.) | `@/db/schema` |
| [`repositorio.ts`](./repositorio.ts) | D1 Database Repository | `listarMantenimientosPorVehiculo`, `detectarReservasSolapadas`, `resolverEstadoActualVehiculo`, `crearOrdenMantenimiento`, `actualizarEstadoOrdenMantenimiento` | `@/lib/db`, `@/lib/db/diagnostics`, `@/lib/time/client-time`, `@/db/schema`, `drizzle-orm` |
| [`index.ts`](./index.ts) | Public Module Barrel | Re-export all types and repository functions | `./types`, `./repositorio` |

## Invariants & Directory Rules

- Strictly enforce schema-first type derivation from Drizzle ORM (`$inferSelect`, `$inferInsert`).
- Zero tolerance for `any` or loose type casting.
- All database errors are caught and logged with `logFalloD1` without crashing callers unexpectedly.
- State transitions automatically evaluate and resolve vehicle physical status between `DISPONIBLE`, `MANTENIMIENTO`, and `RESERVADO`, respecting `FUERA_SERVICIO` administrative lock.
