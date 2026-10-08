# Index: `src`

**Responsibility**: Raíz del código fuente de la aplicación Astro / Cloudflare Workers (Lógica de negocio, base de datos, Server Actions y UI).
**Architectural Layer**: Application Core

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`actions/`](./actions/) | Capa de aplicación y casos de uso del servidor (Astro Server Actions) con validación estricta de esquemas Zod y control RBAC multi-tenant. | [INDEX.md](./actions/INDEX.md) |
| [`components/`](./components/) | Componentes UI y de navegación reutilizables. | [INDEX.md](./components/INDEX.md) |
| [`db/`](./db/) | Capa de persistencia relacional, esquemas de tablas Drizzle ORM y configuración de base de datos para SQLite / Cloudflare D1. | [INDEX.md](./db/INDEX.md) |
| [`layouts/`](./layouts/) | Layouts estructurales compartidos para la interfaz de usuario en Astro. | [INDEX.md](./layouts/INDEX.md) |
| [`lib/`](./lib/) | Módulos de soporte técnico transversal, factories de infraestructura (Base de Datos D1, Autenticación Better Auth) y utilidades. | [INDEX.md](./lib/INDEX.md) |
| [`pages/`](./pages/) | Enrutamiento basado en archivos de Astro para páginas visuales y endpoints API REST. | [INDEX.md](./pages/INDEX.md) |
| [`styles/`](./styles/) | Directory `styles` | *(No index)* |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`env.d.ts`](./env.d.ts) | Tipado Global | Declaraciones de tipos para variables de entorno y Cloudflare D1 | `astro/client` |
| [`middleware.ts`](./middleware.ts) | Middleware de Astro | `onRequest` (Inyección de sesión, RBAC y contexto de local) | `astro:middleware`, `@/lib/auth` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
