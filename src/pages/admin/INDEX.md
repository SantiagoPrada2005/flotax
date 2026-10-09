# Index: `src/pages/admin`

**Responsibility**: Enrutamiento de páginas del entorno operativo y administración de FlotaX (Dashboard de patio, control de flota, operaciones, reservas y caja).
**Architectural Layer**: Presentation / Admin Routing Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`flota/`](./flota/) | Control de inventario, mantenimiento y estados de flota. | — |
| [`operaciones/`](./operaciones/) | Entrega, devolución y peritajes multimedia en R2. | — |
| [`reservas/`](./reservas/) | Gestión de solicitudes, contratos y calendario de patio. | — |
| [`caja/`](./caja/) | Arqueo de turnos, abonos y finanzas operativas. | — |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.astro`](./index.astro) | Panel Principal `/admin` | Dashboard operativo Bento Grid de patio | `@/layouts/LayoutAdmin.astro`, `@/components/dashboard/*` |

## Invariants & Directory Rules

- All pages must be protected by RBAC in middleware (`isAdminRoute`) and restricted to staff roles.
- Pages must use `LayoutAdmin.astro` and adhere strictly to `<150 LOC`.

<!-- Reconciled by codebase-index -->
