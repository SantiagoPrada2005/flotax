# Índice: `src/lib/auth`

**Responsabilidad**: Sistema central de autenticación y autorización (Better Auth, RBAC multi-tenant, sesiones y guards).
**Capa Arquitectónica**: Application / Infrastructure (Cross-cutting Auth)

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`index.ts`](./index.ts) | Factory & Barrel Export | `createAuth()`, `Auth`, `AuthEnv`, re-exporta auth modules | `better-auth`, `drizzle-orm` |
| [`guard.ts`](./guard.ts) | Guard / Middleware Helpers | `requireLocalAuth()`, `requireAuth()`, validaciones de ruta | `astro` context |
| [`permisos.ts`](./permisos.ts) | Catálogo de Permisos | `PERMISOS` (constante tipada de permisos granulares) | - |
| [`rbac.ts`](./rbac.ts) | Lógica RBAC | `tienePermiso()`, `obtenerRolEnLocal()`, tipos de roles | - |
| [`session.ts`](./session.ts) | Manejador de Sesión | Funciones de resolución de sesión y cookies de local activo | `better-auth` |

## Invariantes y Reglas del Directorio

- Autenticación passwordless obligatoria (OTP email o OAuth Google).
- En operaciones dentro de un local, siempre invocar `requireLocalAuth` para validar pertenencia y RBAC.

<!-- Reconciled by codebase-index -->
