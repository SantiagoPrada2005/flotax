# Index: `src/lib/auth`

**Responsibility**: Sistema central de autenticación y autorización (Better Auth, RBAC multi-tenant, sesiones y guards).
**Architectural Layer**: Application / Infrastructure (Cross-cutting Auth)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`client.ts`](./client.ts) | Cliente Better Auth | `authClient` (instancia de cliente browser con plugins) | `better-auth/client` |
| [`guard.ts`](./guard.ts) | Guard / Middleware Helpers | `requireLocalAuth()`, `requireAuth()`, validaciones de ruta | `astro` context |
| [`index.ts`](./index.ts) | Factory & Barrel Export | `createAuth()`, `Auth`, `CreateAuthOptions`, `BetterAuthSession`, `BetterAuthUser`, `BetterAuthSessionData` | `better-auth`, `drizzle-orm` |
| [`permisos.ts`](./permisos.ts) | Catálogo de Permisos | `PERMISOS` (constante tipada de permisos granulares) | - |
| [`rbac.ts`](./rbac.ts) | Lógica RBAC | `tienePermiso()`, `obtenerRolEnLocal()`, tipos de roles | - |
| [`session.ts`](./session.ts) | Manejador de Sesión | `resolveLocalActivo()`, `obtenerLocalesMembresia()`, `completarOnboardingOperativo()`, tipos de sesión | `drizzle-orm` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
