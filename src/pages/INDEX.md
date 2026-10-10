# Index: `src/pages`

**Responsibility**: Enrutamiento basado en archivos de Astro para páginas visuales públicas, portal de clientes y endpoints API REST.
**Architectural Layer**: Presentation / Client Routing Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`admin/`](./admin/) | Sistema operativo y panel administrativo de patio (`/admin/**`). | [INDEX.md](./admin/INDEX.md) |
| [`catalogo/`](./catalogo/) | Catálogo público y filtros de vehículos disponibles (`/catalogo`). | — |
| [`vehiculos/`](./vehiculos/) | Ficha técnica detallada de unidad (`/vehiculos/[id]`). | — |
| [`alquilar/`](./alquilar/) | Embudo multi-paso de alquiler con calendario de franjas (`/alquilar/[id]`). | — |
| [`reservas/`](./reservas/) | Portal de historial y reservas del cliente (`/reservas`). | — |
| [`perfil/`](./perfil/) | Datos personales y licencia de conducción del cliente (`/perfil`). | — |
| [`api/`](./api/) | Endpoints REST internos y webhooks (`/api/**`). | — |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.astro`](./index.astro) | Página raíz `/` | Onboarding y landing pública de FlotaX | `@/layouts/LayoutApp.astro` |
| [`home.astro`](./home.astro) | Router `/home` | Enrutador inteligente por rol hacia `/admin` o `/catalogo` | `Astro.locals.usuario` |
| [`login.astro`](./login.astro) | Página `/login` | Flujo de acceso OTP / Google | `@/components/auth/LoginFlow` |
| [`registro.astro`](./registro.astro) | Página `/registro` | Registro de nuevos usuarios clientes | `@/components/auth/LoginFlow` |
| [`error.astro`](./error.astro) | Fallback `/error` | Redirección defensiva hacia `/login` preservando query params | `Astro.redirect` |

## Invariants & Directory Rules

- Client routes reside at the root; administrative routes reside strictly under `/admin/`.
- All additions, deletions, or public API modifications must be reflected in this index.

<!-- Reconciled by codebase-index -->
