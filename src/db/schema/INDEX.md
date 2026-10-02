# Índice: `src/db/schema`

**Responsabilidad**: Definición canónica de tablas, relaciones y tipos del ORM Drizzle para SQLite/Cloudflare D1 (Multi-tenant y Better Auth).
**Capa Arquitectónica**: Infrastructure / Data Layer

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`index.ts`](./index.ts) | Barrel Export | Re-exporta todos los esquemas y tipos de base de datos | Todos los esquemas locales |
| [`auth.ts`](./auth.ts) | Esquema Drizzle | Tablas Better Auth (`user`, `session`, `account`, `verification`) | `drizzle-orm/sqlite-core` |
| [`locales.ts`](./locales.ts) | Esquema Drizzle | Tabla `locales` (entidad multi-tenant) | `drizzle-orm/sqlite-core` |
| [`miembros.ts`](./miembros.ts) | Esquema Drizzle | Tabla `miembros` y asignación de roles por local | `drizzle-orm/sqlite-core` |
| [`clientes_local.ts`](./clientes_local.ts) | Esquema Drizzle | Tabla `clientesLocal` (cartera de clientes por local) | `drizzle-orm/sqlite-core` |
| [`invitaciones.ts`](./invitaciones.ts) | Esquema Drizzle | Tabla `invitaciones` a locales | `drizzle-orm/sqlite-core` |
| [`transferencias.ts`](./transferencias.ts) | Esquema Drizzle | Tabla `transferencias` operativas | `drizzle-orm/sqlite-core` |
| [`usuarios_admin.ts`](./usuarios_admin.ts) | Esquema Drizzle (Legacy) | `usuarioAdmin`, `rolesValidos`, tipos de usuario admin | `drizzle-orm/sqlite-core` |

## Invariantes y Reglas del Directorio

- Cada entidad debe definir claves primarias UUID o texto estándar y marcas de tiempo (`createdAt`, `updatedAt`).
- Todas las nuevas tablas deben agregarse aquí y re-exportarse a través de `index.ts`.
- Las migraciones de Drizzle deben reflejar los cambios realizados en estos esquemas.

<!-- Reconciled by codebase-index -->
