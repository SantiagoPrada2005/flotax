# Index: `/`

**Responsibility**: Punto de entrada principal del proyecto Movix (Flotax). Configuración del stack tecnológico (Astro 5 + Cloudflare Workers + D1 + Drizzle ORM + Better Auth + Tailwind CSS v4).
**Architectural Layer**: Root / Orchestration Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`design/`](./design/) | Diseños visuales vectoriales (Pencil / .pen), assets gráficos exportados y especificaciones UI/UX. | [INDEX.md](./design/INDEX.md) |
| [`docs/`](./docs/) | Documentación técnica, registros de decisiones arquitectónicas (ADRs), especificación del modelo de datos y lineamientos de UX/ergonomía. | [INDEX.md](./docs/INDEX.md) |
| [`public/`](./public/) | Directory `public` | *(No index)* |
| [`src/`](./src/) | Raíz del código fuente de la aplicación Astro / Cloudflare Workers (Lógica de negocio, base de datos, Server Actions y UI). | [INDEX.md](./src/INDEX.md) |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`astro.config.mjs`](./astro.config.mjs) | Configuración de Framework | Configuración de Astro con adaptador `@astrojs/cloudflare` | `@astrojs/cloudflare` |
| [`drizzle.config.ts`](./drizzle.config.ts) | Configuración de ORM | Configuración del CLI de Drizzle para SQLite/D1 | `drizzle-kit` |
| [`package.json`](./package.json) | Manifiesto de Paquetes | Scripts (`dev`, `build`, `check`), dependencias del proyecto | pnpm |
| [`pnpm-workspace.yaml`](./pnpm-workspace.yaml) | Configuración de Monorepo / Workspace | Gestión de paquetes pnpm | pnpm |
| [`skills-lock.json`](./skills-lock.json) | Bloqueo de Skills | Registro de versiones de skills instaladas en el repositorio | Antigravity Skills |
| [`tsconfig.json`](./tsconfig.json) | Configuración TypeScript | Paths (`@/*`), opciones estrictas de compilación | TypeScript |
| [`wrangler.jsonc`](./wrangler.jsonc) | Configuración de Infraestructura | Configuración de Cloudflare Workers, bindings D1 y variables | Cloudflare Workers |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
