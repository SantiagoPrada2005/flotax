# Index: `src/lib/auth`

**Responsibility**: Sistema central de autenticación y autorización (Better Auth, RBAC multi-tenant con soporte de permisos individuales por miembro, sesiones y guards).
**Architectural Layer**: Application / Infrastructure (Cross-cutting Auth)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`acceso-reserva.ts`](./acceso-reserva.ts) | Guard / Control de Acceso | `validarAccesoReservaLectura`, `esRutaDetalleConTokenPublico`, `ReservaAccesoLectura`, `UsuarioAccesoLectura` | `@/db/schema` |
| [`capacidades-alquiler.ts`](./capacidades-alquiler.ts) | Dominio RBAC / Capacidades | `calcularCapacidadesOperacionAlquiler`, `CapacidadesOperacionAlquiler` | `@/db/schema`, `./rbac`, `./permisos` |
| [`client.ts`](./client.ts) | Cliente Better Auth | `authClient` (instancia de cliente browser con plugins) | `better-auth/client` |
| [`guard.ts`](./guard.ts) | Guard / Middleware Helpers | `requireLocalAuth()`, `requireAuth()`, validaciones de ruta y permisos efectivos | `astro` context, `./rbac`, `./session` |
| [`index.ts`](./index.ts) | Factory & Barrel Export | `createAuth()`, `Auth`, `CreateAuthOptions`, `BetterAuthSession`, `BetterAuthUser`, `BetterAuthSessionData` | `better-auth`, `drizzle-orm` |
| [`permisos.ts`](./permisos.ts) | Catálogo de Permisos | `PERMISOS`, `LISTA_PERMISOS_CANONICOS`, `esPermisoValido`, `Permiso` | - |
| [`portal-modo.ts`](./portal-modo.ts) | Gestión de Modo Portal | `COOKIE_PORTAL_MODO`, `resolverModoPortalInicial`, `evaluarRedireccionModoPortal`, `resolverVarianteDock`, `esUsuarioPersonal` | `astro` context |
| [`rbac.ts`](./rbac.ts) | Lógica RBAC & Overrides | `MATRIZ_ROLES_PERMISOS`, `resolverPermisosEfectivos()`, `tienePermiso()`, `tieneAlgunPermiso()`, `tieneTodosLosPermisos()`, `puedeAccederModulo()`, `requirePermiso()`, `SujetoAutorizacion`, `OverridePermisoIndividual` | `./permisos`, `@/db/schema` |
| [`session.ts`](./session.ts) | Manejador de Sesión | `resolveLocalActivo()`, `obtenerLocalesMembresia()`, `completarOnboardingOperativo()`, `LocalActivoSesion` | `drizzle-orm`, `@/db/schema` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
