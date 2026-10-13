# Index: `src/pages/admin`

**Responsibility**: Enrutamiento de páginas del entorno operativo y administración de FlotaX (Dashboard de patio, control de flota, operaciones, reservas y caja).
**Architectural Layer**: Presentation / Admin Routing Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`caja/`](./caja/) | Directory `caja` | *(No index)* |
| [`flota/`](./flota/) | Enrutamiento para la gestión perimetral e inventario de la flota (listado, alta de nuevas unidades y edición). | [INDEX.md](./flota/INDEX.md) |
| [`metricas/`](./metricas/) | Directory `metricas` | *(No index)* |
| [`operaciones/`](./operaciones/) | Directory `operaciones` | *(No index)* |
| [`reservas/`](./reservas/) | Directory `reservas` | *(No index)* |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.astro`](./index.astro) | Panel Principal `/admin` | Dashboard operativo Bento Grid de patio | `@/layouts/LayoutAdmin.astro`, `@/components/dashboard/*` |
| [`onboarding.astro`](./onboarding.astro) | Page / Navigation Route | Astro Template | - |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
