# Índice: `src`

**Responsabilidad**: Raíz del código fuente de la aplicación Astro / Cloudflare Workers (Lógica de negocio, base de datos, Server Actions y UI).
**Capa Arquitectónica**: Application Core

## Subdirectorios y Módulos Hijos

| Subdirectorio | Responsabilidad | Índice |
| :--- | :--- | :--- |
| [`actions/`](./actions/) | Casos de uso y Server Actions de Astro con validación Zod | [INDEX.md](./actions/INDEX.md) |
| [`db/`](./db/) | Capa de datos y esquemas Drizzle ORM | [INDEX.md](./db/INDEX.md) |
| [`layouts/`](./layouts/) | Layouts estructurales de página | [INDEX.md](./layouts/INDEX.md) |
| [`lib/`](./lib/) | Módulos transversales (Autenticación Better Auth, DB Client, Time) | [INDEX.md](./lib/INDEX.md) |
| [`pages/`](./pages/) | Enrutamiento de páginas y endpoints API | [INDEX.md](./pages/INDEX.md) |
| [`styles/`](./styles/) | Estilos globales Tailwind CSS v4 y tokens de diseño | *(CSS Global)* |

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`middleware.ts`](./middleware.ts) | Middleware de Astro | `onRequest` (Inyección de sesión, RBAC y contexto de local) | `astro:middleware`, `@/lib/auth` |
| [`env.d.ts`](./env.d.ts) | Tipado Global | Declaraciones de tipos para variables de entorno y Cloudflare D1 | `astro/client` |

## Invariantes y Reglas del Directorio

- Todo el código del servidor se ejecuta sobre el runtime de Cloudflare Workers (compatible con Web Standards / Edge).
- No importar APIs exclusivas de Node.js incompatibles con Workers.

<!-- Reconciled by codebase-index -->
