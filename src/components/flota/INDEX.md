# Index: `src/components/flota`

**Responsibility**: TODO: Define core domain responsibility of this directory.
**Architectural Layer**: TODO: (e.g. Domain | Application | Infrastructure | Presentation | Shared)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`BrandFilterBar.tsx`](./BrandFilterBar.tsx) | Module / Utility | - | - |
| [`CatalogSearchTrigger.tsx`](./CatalogSearchTrigger.tsx) | Module / Utility | - | - |
| [`FleetCatalogList.tsx`](./FleetCatalogList.tsx) | Isla React 19: Catálogo con filtro de marcas y grid PC | Componente `<FleetCatalogList ... />` | [`BrandFilterBar.tsx`](./BrandFilterBar.tsx), [`VehicleCatalogCard.tsx`](./VehicleCatalogCard.tsx) |
| [`FleetInventoryManager.tsx`](./FleetInventoryManager.tsx) | Module / Utility | - | - |
| [`VehicleCatalogCard.tsx`](./VehicleCatalogCard.tsx) | Module / Utility | - | - |
| [`VehicleFormIsland.tsx`](./VehicleFormIsland.tsx) | Wrapper Isla React 19: Asistente guiado paso a paso para flota | `VehicleFormIsland`, `VehicleFormIslandProps` | [`./wizard/VehicleWizardIsland.tsx`](./wizard/VehicleWizardIsland.tsx) |
| [`VehicleSearchResultItem.tsx`](./VehicleSearchResultItem.tsx) | Module / Utility | - | - |
| [`VehicleSearchSpotlight.tsx`](./VehicleSearchSpotlight.tsx) | Module / Utility | - | - |
| [`wizard/`](./wizard/INDEX.md) | Sub-módulo: Componentes atómicos del asistente multi-paso (Stepper, Steps 1-6) | - | - |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
