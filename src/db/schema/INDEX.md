# Index: `src/db/schema`

**Responsibility**: Definición canónica de tablas, relaciones y tipos del ORM Drizzle para SQLite/Cloudflare D1 (Multi-tenant, Better Auth, Flota, Historial Multimedia R2, Reservas, Contratos, Peritaje y Caja).
**Architectural Layer**: Infrastructure / Data Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`auth.ts`](./auth.ts) | Esquema Drizzle | Tablas Better Auth (`user`, `session`, `account`, `verification`) | `drizzle-orm/sqlite-core` |
| [`caja.ts`](./caja.ts) | Esquema Drizzle + Dominios | Tablas `cuentasFinancieras`, `movimientosCaja`, `sesionesCaja`, `depositosGarantia`, `auditoriaFinanciera`; enums financieros | `drizzle-orm/sqlite-core`, `./locales`, `./auth`, `./vehiculos` |
| [`clientes_local.ts`](./clientes_local.ts) | Esquema Drizzle | Tabla `clientesLocal` (cartera de clientes por local) | `drizzle-orm/sqlite-core` |
| [`contratos.ts`](./contratos.ts) | Esquema Drizzle + Dominios | Tabla `contratosAlquiler` (1:1 con `reservas`); enums `estadosPagoContrato`, `estadosContratoAlquiler`, `ContratoAlquilerSelect`, `ContratoAlquilerInsert` | `drizzle-orm/sqlite-core`, `./reservas`, `./locales`, `./vehiculos`, `./auth` |
| [`documentos_vehiculo.ts`](./documentos_vehiculo.ts) | Esquema Drizzle + Dominios | Tabla `documentosVehiculo`; enum `tiposDocumentoVehiculo`, `DocumentoVehiculoSelect`, `DocumentoVehiculoInsert` | `drizzle-orm/sqlite-core`, `./locales`, `./vehiculos`, `./auth` |
| [`eventos_alquiler.ts`](./eventos_alquiler.ts) | Esquema Drizzle + Dominios | Tabla `eventosAlquiler`; enums `tiposEventoAlquiler`, `actoresEventoAlquiler`, `EventoAlquilerSelect`, `EventoAlquilerInsert` | `drizzle-orm/sqlite-core`, `./reservas`, `./locales`, `./vehiculos`, `./auth` |
| [`incidentes.ts`](./incidentes.ts) | Esquema Drizzle + Dominios | Tabla `incidentesSistema`; enums `nivelesIncidente`, `estadosIncidente` | `drizzle-orm/sqlite-core` |
| [`index.ts`](./index.ts) | Barrel Export | Re-exporta todos los esquemas, enums y tipos de base de datos | Todos los esquemas locales |
| [`inspecciones.ts`](./inspecciones.ts) | Esquema Drizzle + Dominios | Tablas `plantillasInspeccion`, `inspeccionesPericiales`, `puntosInspeccionR2`, `evaluacionesEntregaCliente`; enums e interfaces de checklist pericial R2 | `drizzle-orm/sqlite-core`, `./reservas`, `./contratos`, `./multimedia_vehiculo`, `./vehiculos` |
| [`invitaciones.ts`](./invitaciones.ts) | Esquema Drizzle + Dominios | Tabla `invitacionesLocal`; enums `rolesInvitacionValidos`, `estadosInvitacion` | `drizzle-orm/sqlite-core` |
| [`locales.ts`](./locales.ts) | Esquema Drizzle | Tabla `localesAlquiler` (entidad multi-tenant) | `drizzle-orm/sqlite-core` |
| [`mantenimientos.ts`](./mantenimientos.ts) | Esquema Drizzle + Dominios | Tabla `mantenimientosVehiculo`; enums `tiposMantenimientoVehiculo`, `estadosMantenimientoVehiculo`, `MantenimientoVehiculoSelect`, `MantenimientoVehiculoInsert` | `drizzle-orm/sqlite-core`, `./locales`, `./vehiculos`, `./reservas`, `./caja` |
| [`miembros.ts`](./miembros.ts) | Esquema Drizzle + Dominios | Tabla `miembrosLocal`; enum `rolesEmpleadoValidos` (`DUENO`, `ADMIN`, `ASESOR`, `ENCARGADO_FLOTA`, `CONTADOR`, `OPERATIVO`, `AUDITOR_FINANCIERO`) | `drizzle-orm/sqlite-core` |
| [`multimedia_vehiculo.ts`](./multimedia_vehiculo.ts) | Esquema Drizzle + Dominios | Tabla `multimediaVehiculo` (historial longitudinal fotos/videos R2 con `posterR2Key`); enums `tiposMedioMultimedia`, `etapasMultimediaVehiculo`, `zonasEvidenciaVehiculo`, `angulosEstudioVehiculo` | `drizzle-orm/sqlite-core`, `./vehiculos`, `./reservas`, `./contratos`, `./mantenimientos` |
| [`notificaciones.ts`](./notificaciones.ts) | Esquema Drizzle + Dominios | Tablas `notificaciones`, `suscripcionesPush`; enums `tiposNotificacion`, `alcancesNotificacion`, `prioridadesNotificacion` | `drizzle-orm/sqlite-core` |
| [`permisos_miembro.ts`](./permisos_miembro.ts) | Esquema Drizzle + Dominios | Tabla `permisosMiembroLocal`; enum `efectosPermisoIndividual` (`CONCEDER`, `REVOCAR`), `PermisoMiembroLocalSelect`, `PermisoMiembroLocalInsert` | `drizzle-orm/sqlite-core`, `./miembros`, `./locales`, `./auth` |
| [`politicas_local.ts`](./politicas_local.ts) | Esquema Drizzle | Tabla `politicasLocal` (1:1 con `localesAlquiler`), `PoliticaLocalSelect`, `PoliticaLocalInsert` | `drizzle-orm/sqlite-core`, `./locales` |
| [`reservas.ts`](./reservas.ts) | Esquema Drizzle + Dominios | Tabla `reservas`; enums `estadosReserva`, `modalidadesEntregaReserva`, `modalidadesPagoInicial`, `metodosAbonoInicial`, `categoriasLicenciaConduccion`, `ReservaSelect`, `ReservaInsert` | `drizzle-orm/sqlite-core`, `./locales`, `./vehiculos`, `./auth`, `./verificaciones` |
| [`transferencias.ts`](./transferencias.ts) | Esquema Drizzle | Tabla `historialTransferenciasLocal` | `drizzle-orm/sqlite-core` |
| [`usuarios_admin.ts`](./usuarios_admin.ts) | Esquema Drizzle (Legacy) | `usuarioAdmin`, `rolesValidos`, `RolUsuarioAdmin`, `UsuarioAdminPublico`, `UsuarioAdminSelect`, `UsuarioAdminInsert` | `drizzle-orm/sqlite-core` |
| [`vehiculos.ts`](./vehiculos.ts) | Esquema Drizzle + Dominios | Tabla `vehiculos`; enums `categoriasVehiculo`, `estadosVehiculo`, `transmisionesVehiculo`, `combustiblesVehiculo`, `unidadesMedidaUso`, `EspecificacionesBentoVehiculoSchema` | `drizzle-orm/sqlite-core`, `./locales` |
| [`verificaciones.ts`](./verificaciones.ts) | Esquema Drizzle + Dominios | Tabla `verificacionesIdentidad`; enums `tiposDocumentoIdentidad`, `estadosVerificacion` | `drizzle-orm/sqlite-core`, `./auth` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Los dominios cerrados de cada columna se declaran aquí con `text('columna', { enum: [...] })` y se consumen vía `$inferSelect`; ningún módulo de `src/lib` debe redeclarar esas uniones.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
