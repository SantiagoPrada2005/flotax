# Índice: `/` (Raíz del Repositorio)

**Responsabilidad**: Punto de entrada principal del proyecto Movix (Flotax). Configuración del stack tecnológico (Astro 5 + Cloudflare Workers + D1 + Drizzle ORM + Better Auth + Tailwind CSS v4).
**Capa Arquitectónica**: Root / Orchestration Layer

## Subdirectorios y Módulos Hijos

| Subdirectorio | Responsabilidad | Índice |
| :--- | :--- | :--- |
| [`src/`](./src/) | Código fuente de la aplicación (Actions, DB, Layouts, Lib, Pages, Styles) | [INDEX.md](./src/INDEX.md) |
| [`docs/`](./docs/) | Documentación arquitectónica, ADRs y especificación de bases de datos | [INDEX.md](./docs/INDEX.md) |
| [`design/`](./design/) | Sistema de diseño de interfaces Pencil (`design.pen`), assets y exports | [INDEX.md](./design/INDEX.md) |
| [`.agents/`](./.agents/) | Configuración de agentes de IA, skills del proyecto y herramientas especializadas | *(Configuración de Agentes)* |
| [`public/`](./public/) | Assets estáticos servidos directamente por el servidor | *(Estáticos)* |

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`astro.config.mjs`](./astro.config.mjs) | Configuración de Framework | Configuración de Astro con adaptador `@astrojs/cloudflare` | `@astrojs/cloudflare` |
| [`wrangler.jsonc`](./wrangler.jsonc) | Configuración de Infraestructura | Configuración de Cloudflare Workers, bindings D1 y variables | Cloudflare Workers |
| [`drizzle.config.ts`](./drizzle.config.ts) | Configuración de ORM | Configuración del CLI de Drizzle para SQLite/D1 | `drizzle-kit` |
| [`tsconfig.json`](./tsconfig.json) | Configuración TypeScript | Paths (`@/*`), opciones estrictas de compilación | TypeScript |
| [`package.json`](./package.json) | Manifiesto de Paquetes | Scripts (`dev`, `build`, `check`), dependencias del proyecto | pnpm |
| [`pnpm-workspace.yaml`](./pnpm-workspace.yaml) | Configuración de Monorepo / Workspace | Gestión de paquetes pnpm | pnpm |
| [`skills-lock.json`](./skills-lock.json) | Bloqueo de Skills | Registro de versiones de skills instaladas en el repositorio | Antigravity Skills |

## Invariantes y Reglas del Proyecto

- **Navegación Index-First Obligatoria**: Antes de explorar o editar archivos, consultar el `INDEX.md` correspondiente para minimizar consumo de tokens.
- **Definición de Terminado (DoD)**: Todo cambio, adición o eliminación de archivos debe actualizar el `INDEX.md` de su directorio correspondiente.
- **Verificación**: Ejecutar `python3 .agents/skills/codebase-index/scripts/index_manager.py audit` para asegurar cero desincronización en los índices.

<!-- Reconciled by codebase-index -->
