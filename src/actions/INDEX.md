# Index: `src/actions`

**Responsibility**: Capa de aplicación y casos de uso del servidor (Astro Server Actions) con validación estricta de esquemas Zod y control RBAC multi-tenant.
**Architectural Layer**: Application Layer / Server Actions

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`caja.ts`](./caja.ts) | Server Action / Caso de Uso | `registrarAbono` | `astro:actions`, `zod`, `@/lib/auth` |
| [`flota.ts`](./flota.ts) | Server Action / Flota y Unidades | `guardarVehiculoAction`, `cambiarEstadoVehiculoAction`, `eliminarVehiculoAction`, `obtenerVehiculoDetalleAction` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/flota/repositorio` |
| [`index.ts`](./index.ts) | Barrel Export / Server Actions Root | `server` | `./caja`, `./portal`, `./flota`, `./reservas` |
| [`notificaciones.ts`](./notificaciones.ts) | TypeScript / JavaScript Module | - | - |
| [`perfil.ts`](./perfil.ts) | Server Action / Perfil de Usuario | `actualizarPerfilAction` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/db`, `@/lib/auth` |
| [`verificacion.ts`](./verificacion.ts) | Server Action / KYC & Multimedia R2 | `subirFotoDocumentoAction`, `finalizarVerificacionAction`, `obtenerEstadoVerificacionAction` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/db`, `@/lib/auth` |
| [`portal.ts`](./portal.ts) | Server Action / Casos de Uso | `cambiarModoPortal`, `conmutarLocalActivo`, `finalizarOnboardingOperativo`, `crearPatioOperativo` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/auth` |
| [`reservas.ts`](./reservas.ts) | Server Action / Operaciones de Reserva | `cambiarEstadoReservaAction`, `registrarCobroWaybillAction`, `registrarEntregaEvaluacionAction` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/flota/repositorio`, `@/lib/notificaciones` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
