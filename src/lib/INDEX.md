# Index: `src/lib`

**Responsibility**: Módulos de soporte técnico transversal, factories de infraestructura (Base de Datos D1, Autenticación Better Auth) y utilidades.
**Architectural Layer**: Infrastructure / Shared Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`auth/`](./auth/) | Sistema central de autenticación y autorización (Better Auth, RBAC multi-tenant, sesiones y guards). | [INDEX.md](./auth/INDEX.md) |
| [`email/`](./email/) | Módulo transaccional de correos con Cloudflare Workers API y dominio flotax.innovaweb.pro. | [INDEX.md](./email/INDEX.md) |
| [`logger/`](./logger/) | Módulo de logging centralizado, sanitización de datos y alertas tempranas a desarrolladores. | [INDEX.md](./logger/INDEX.md) |
| [`time/`](./time/) | Funciones y utilidades de cliente para manipulación y visualización de fechas y zonas horarias. | [INDEX.md](./time/INDEX.md) |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`db.ts`](./db.ts) | Factory / Client DB | `getDb(d1Binding)` | `drizzle-orm/d1`, `@cloudflare/workers-types` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
