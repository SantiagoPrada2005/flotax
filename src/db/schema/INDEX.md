# Index: `src/db/schema`

**Responsibility**: Definición canónica de tablas, relaciones y tipos del ORM Drizzle para SQLite/Cloudflare D1 (Multi-tenant y Better Auth).
**Architectural Layer**: Infrastructure / Data Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`auth.ts`](./auth.ts) | Esquema Drizzle | Tablas Better Auth (`user`, `session`, `account`, `verification`) | `drizzle-orm/sqlite-core` |
| [`caja.ts`](./caja.ts) | Esquema Drizzle + Dominios | Tablas `cuentasFinancieras`, `movimientosCaja`, `sesionesCaja`, `depositosGarantia`, `auditoriaFinanciera`; enums `tiposCuentaFinanciera`, `tiposMovimientoCaja`, `categoriasIngreso`, `categoriasEgreso`, `categoriasMovimiento`, `metodosPagoFinanciero`, `estadosMovimientoCaja`, `estadosSesionCaja`, `estadosDepositoGarantia`, `entidadesAuditoria`, `accionesAuditoria` | `drizzle-orm/sqlite-core`, `./locales`, `./auth`, `./vehiculos` |
| [`clientes_local.ts`](./clientes_local.ts) | Esquema Drizzle | Tabla `clientesLocal` (cartera de clientes por local) | `drizzle-orm/sqlite-core` |
| [`incidentes.ts`](./incidentes.ts) | Esquema Drizzle + Dominios | Tabla `incidentesSistema`; enums `nivelesIncidente`, `estadosIncidente` | `drizzle-orm/sqlite-core` |
| [`index.ts`](./index.ts) | Barrel Export | Re-exporta todos los esquemas, enums y tipos de base de datos | Todos los esquemas locales |
| [`invitaciones.ts`](./invitaciones.ts) | Esquema Drizzle + Dominios | Tabla `invitacionesLocal`; enums `rolesInvitacionValidos`, `estadosInvitacion` | `drizzle-orm/sqlite-core` |
| [`locales.ts`](./locales.ts) | Esquema Drizzle | Tabla `localesAlquiler` (entidad multi-tenant) | `drizzle-orm/sqlite-core` |
| [`miembros.ts`](./miembros.ts) | Esquema Drizzle + Dominios | Tabla `miembrosLocal`; enum `rolesEmpleadoValidos` | `drizzle-orm/sqlite-core` |
| [`notificaciones.ts`](./notificaciones.ts) | Esquema Drizzle + Dominios | Tablas `notificaciones`, `suscripcionesPush`; enums `tiposNotificacion`, `alcancesNotificacion`, `prioridadesNotificacion` | `drizzle-orm/sqlite-core` |
| [`transferencias.ts`](./transferencias.ts) | Esquema Drizzle | Tabla `historialTransferenciasLocal` | `drizzle-orm/sqlite-core` |
| [`usuarios_admin.ts`](./usuarios_admin.ts) | Esquema Drizzle (Legacy) | `usuarioAdmin`, `rolesValidos`, `RolUsuarioAdmin`, `UsuarioAdminPublico`, `UsuarioAdminSelect`, `UsuarioAdminInsert` | `drizzle-orm/sqlite-core` |
| [`vehiculos.ts`](./vehiculos.ts) | Esquema Drizzle + Dominios | Tabla `vehiculos`; enums `categoriasVehiculo`, `estadosVehiculo`, `transmisionesVehiculo`, `combustiblesVehiculo` | `drizzle-orm/sqlite-core`, `./locales` |
| [`verificaciones.ts`](./verificaciones.ts) | Esquema Drizzle + Dominios | Tabla `verificacionesIdentidad`; enums `tiposDocumentoIdentidad`, `estadosVerificacion` | `drizzle-orm/sqlite-core`, `./auth` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Los dominios cerrados de cada columna se declaran aquí con `text('columna', { enum: [...] })` y se consumen vía `$inferSelect`; ningún módulo de `src/lib` debe redeclarar esas uniones.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
