# Index: `src/actions`

**Responsibility**: Capa de aplicación y casos de uso del servidor (Astro Server Actions) con validación estricta de esquemas Zod y control RBAC multi-tenant.
**Architectural Layer**: Application Layer / Server Actions

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`caja.ts`](./caja.ts) | Server Action / Caso de Uso | `registrarAbono` | `astro:actions`, `zod`, `@/lib/auth` |
| [`flota.ts`](./flota.ts) | Server Action / Flota y Unidades | `guardarVehiculoAction`, `cambiarEstadoVehiculoAction`, `eliminarVehiculoAction`, `obtenerVehiculoDetalleAction`, `consultarDisponibilidadVehiculoAction` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/flota/repositorio`, `@/lib/flota/disponibilidad` |
| [`index.ts`](./index.ts) | Barrel Export / Server Actions Root | `server` | `./caja`, `./portal`, `./flota`, `./reservas`, `./notificaciones`, `./mantenimientos` |
| [`mantenimientos.ts`](./mantenimientos.ts) | Server Action / Mantenimiento y Disponibilidad | `crearMantenimiento`, `cambiarEstadoMantenimiento` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/auth`, `@/lib/mantenimientos/repositorio` |
| [`notificaciones.ts`](./notificaciones.ts) | Server Action / Notificaciones & Web Push | `listarNotificaciones`, `contarNotificacionesNoLeidas`, `marcarNotificacionesLeidas`, `marcarTodasNotificacionesLeidas`, `deshacerNotificacionesLeidas`, `suscribirPush`, `cancelarPush`, `enviarPruebaPush` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/auth`, `@/lib/notificaciones` |
| [`perfil.ts`](./perfil.ts) | Server Action / Perfil de Usuario | `actualizarPerfilAction` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/db`, `@/lib/auth` |
| [`portal.ts`](./portal.ts) | Server Action / Casos de Uso | `cambiarModoPortal`, `conmutarLocalActivo`, `finalizarOnboardingOperativo`, `crearPatioOperativo`, `actualizarPerfilCatalogoLocal` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/auth`, `@/lib/flota/locales-captacion` |
| [`reservas.ts`](./reservas.ts) | Server Action / Operaciones de Reserva y Ciclo de Alquiler | `crearReservaAction`, `confirmarReservaAction`, `rechazarReservaAction`, `guardarInspeccionR2Action`, `entregarVehiculoAction`, `pausarAlquilerAction`, `reanudarAlquilerAction`, `prorrogarAlquilerAction`, `devolverYCerrarAlquilerAction`, `cancelarReservaAction`, `anularContratoAction`, `reabrirReservaAction`, `registrarCobroWaybillAction`, `registrarEntregaEvaluacionAction`, `registrarOActualizarDocumentosRapidoAction`, `buscarClientesLocalAction`, `cambiarEstadoReservaAction` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/flota/ciclo-alquiler`, `@/lib/notificaciones`, `@/db/schema` |
| [`verificacion.ts`](./verificacion.ts) | Server Action / KYC & Multimedia R2 | `subirFotoDocumentoAction`, `finalizarVerificacionAction`, `obtenerEstadoVerificacionAction` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/db`, `@/lib/auth` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
