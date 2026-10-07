# Index: `src/db/schema`

**Responsibility**: Definición canónica de tablas, relaciones y tipos del ORM Drizzle para SQLite/Cloudflare D1 (Multi-tenant y Better Auth).
**Architectural Layer**: Infrastructure / Data Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`auth.ts`](./auth.ts) | Esquema Drizzle | Tablas Better Auth (`user`, `session`, `account`, `verification`) | `drizzle-orm/sqlite-core` |
| [`clientes_local.ts`](./clientes_local.ts) | Esquema Drizzle | Tabla `clientesLocal` (cartera de clientes por local) | `drizzle-orm/sqlite-core` |
| [`index.ts`](./index.ts) | Barrel Export | Re-exporta todos los esquemas y tipos de base de datos | Todos los esquemas locales |
| [`invitaciones.ts`](./invitaciones.ts) | Esquema Drizzle | Tabla `invitaciones` a locales | `drizzle-orm/sqlite-core` |
| [`locales.ts`](./locales.ts) | Esquema Drizzle | Tabla `locales` (entidad multi-tenant) | `drizzle-orm/sqlite-core` |
| [`miembros.ts`](./miembros.ts) | Esquema Drizzle | Tabla `miembros` y asignación de roles por local | `drizzle-orm/sqlite-core` |
| [`transferencias.ts`](./transferencias.ts) | Esquema Drizzle | Tabla `transferencias` operativas | `drizzle-orm/sqlite-core` |
| [`usuarios_admin.ts`](./usuarios_admin.ts) | Esquema Drizzle (Legacy) | `usuarioAdmin`, `rolesValidos`, tipos de usuario admin | `drizzle-orm/sqlite-core` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
