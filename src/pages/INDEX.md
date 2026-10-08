# Index: `src/pages`

**Responsibility**: Enrutamiento basado en archivos de Astro para páginas visuales y endpoints API REST.
**Architectural Layer**: Presentation / API Routing Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`api/`](./api/) | Directory `api` | *(No index)* |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.astro`](./index.astro) | Página / Ruta raíz `/` | Landing page pública de FlotaX | `@/layouts/LayoutApp.astro` |
| [`home.astro`](./home.astro) | Página `/home` | Dashboard y panel operativo protegido | `@/layouts/LayoutAdmin.astro`, `@/lib/time/client-time` |
| [`login.astro`](./login.astro) | Página `/login` | Flujo de acceso OTP / Google | `@/components/auth/LoginFlow` |
| [`registro.astro`](./registro.astro) | Página `/registro` | Registro de nuevos usuarios | `@/components/auth/LoginFlow` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
