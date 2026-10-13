# Index: `src/pages/admin/flota`

**Responsibility**: Enrutamiento para la gestión perimetral e inventario de la flota (listado, alta de nuevas unidades y edición).
**Architectural Layer**: Presentation / Admin Routing Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`[id]/`](./[id]/) | Directory `[id]` | *(No index)* |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.astro`](./index.astro) | Panel `/admin/flota` | Vista de inventario, filtros y estados | `@/components/flota/FleetInventoryManager` |
| [`nuevo.astro`](./nuevo.astro) | Pantalla `/admin/flota/nuevo` | Formulario de alta para ofrecer nuevo vehículo en alquiler | `@/components/flota/VehicleFormIsland` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
