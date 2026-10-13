# Index: `src/pages`

**Responsibility**: Enrutamiento basado en archivos de Astro para páginas visuales públicas, portal de clientes y endpoints API REST.
**Architectural Layer**: Presentation / Client Routing Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`admin/`](./admin/) | Enrutamiento de páginas del entorno operativo y administración de FlotaX (Dashboard de patio, control de flota, operaciones, reservas y caja). | [INDEX.md](./admin/INDEX.md) |
| [`alquilar/`](./alquilar/) | Directory `alquilar` | *(No index)* |
| [`api/`](./api/) | Directory `api` | *(No index)* |
| [`catalogo/`](./catalogo/) | Directory `catalogo` | *(No index)* |
| [`notificaciones/`](./notificaciones/) | Directory `notificaciones` | *(No index)* |
| [`perfil/`](./perfil/) | Directory `perfil` | *(No index)* |
| [`reservas/`](./reservas/) | Directory `reservas` | *(No index)* |
| [`vehiculos/`](./vehiculos/) | Directory `vehiculos` | *(No index)* |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`404.astro`](./404.astro) | Página Error `/404` | Vista de contingencia 404 (Ruta o unidad fuera de perímetro con escáner CAD) | `@/components/navigation/FlotaxErrorStateIsland` |
| [`500.astro`](./500.astro) | Página Error `/500` | Vista de contingencia operativa 500 con confirmación de integridad de sesión | `@/components/navigation/FlotaxErrorStateIsland` |
| [`animacion.astro`](./animacion.astro) | Vista dedicada `/animacion` | Visor y simulador interactivo de la animación de carga full-screen | `@/components/navigation/FlotaxLoaderPreviewIsland` |
| [`error.astro`](./error.astro) | Fallback `/error` | Redirección defensiva hacia `/login` preservando query params | `Astro.redirect` |
| [`home.astro`](./home.astro) | Router `/home` | Enrutador inteligente por rol hacia `/admin` o `/catalogo` | `Astro.locals.usuario` |
| [`index.astro`](./index.astro) | Página raíz `/` | Onboarding y landing pública de FlotaX | `@/layouts/LayoutApp.astro` |
| [`login.astro`](./login.astro) | Página `/login` | Flujo de acceso OTP / Google | `@/components/auth/LoginFlow` |
| [`offline.astro`](./offline.astro) | Página `/offline` | Vista de modo autónomo sin conexión a internet con sonar, auto-ping y rutas en caché | `@/components/navigation/FlotaxErrorStateIsland` |
| [`registro.astro`](./registro.astro) | Página `/registro` | Registro de nuevos usuarios clientes | `@/components/auth/LoginFlow` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
