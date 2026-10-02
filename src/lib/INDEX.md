# Índice: `src/lib`

**Responsabilidad**: Módulos de soporte técnico transversal, factories de infraestructura (Base de Datos D1, Autenticación Better Auth) y utilidades.
**Capa Arquitectónica**: Infrastructure / Shared Layer

## Subdirectorios y Módulos Hijos

| Subdirectorio | Responsabilidad | Índice |
| :--- | :--- | :--- |
| [`auth/`](./auth/) | Autenticación, RBAC multi-tenant, sesiones y guards | [INDEX.md](./auth/INDEX.md) |
| [`time/`](./time/) | Utilidades de formato y sincronización horaria del cliente | [INDEX.md](./time/INDEX.md) |

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`db.ts`](./db.ts) | Factory / Client DB | `getDb(d1Binding)` | `drizzle-orm/d1`, `@cloudflare/workers-types` |

## Invariantes y Reglas del Directorio

- `getDb` debe recibir el binding D1 directamente desde el ciclo de vida de la petición de Cloudflare/Astro.

<!-- Reconciled by codebase-index -->
