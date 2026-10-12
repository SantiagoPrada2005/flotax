# Index: `src/pages/admin/flota`

**Responsibility**: Enrutamiento para la gestión perimetral e inventario de la flota (listado, alta de nuevas unidades y edición).
**Architectural Layer**: Presentation / Admin Routing Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.astro`](./index.astro) | Panel `/admin/flota` | Vista de inventario, filtros y estados | `@/components/flota/FleetInventoryManager` |
| [`nuevo.astro`](./nuevo.astro) | Pantalla `/admin/flota/nuevo` | Formulario de alta para ofrecer nuevo vehículo en alquiler | `@/components/flota/VehicleFormIsland` |
| [`[id]/editar.astro`](./[id]/editar.astro) | Pantalla `/admin/flota/[id]/editar` | Formulario de modificación de vehículo existente | `@/components/flota/VehicleFormIsland` |

## Invariants & Directory Rules

- All fleet admin pages must use `LayoutAdmin.astro` and have less than 150 LOC.
- Any vehicle state modification or addition is persisted via Astro Actions and Drizzle ORM.

<!-- Reconciled by codebase-index -->
