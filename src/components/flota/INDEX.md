# Index: `src/components/flota`

**Responsibility**: Componentes interactivos del dominio de Flota: Catálogo Exclusivo iOS Editorial Showcase por Local, Ficha 360° de Estudio, Centro de Compartición con Progressive Disclosure y Gestor de Inventario.
**Architectural Layer**: Presentation Layer (Tier 2 Domain Modules)

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`disponibilidad/`](./disponibilidad/) | Componentes React 19 para la gestión visual de disponibilidad, cabecera de unidad, órdenes activas de taller, wizard typeform de mantenimiento, modal de egreso de taller e isla coordinadora. | [INDEX.md](./disponibilidad/INDEX.md) |
| [`wizard/`](./wizard/) | Experiencia inmersiva de pantalla completa («Una pantalla, una tarea», máx. 4 entradas) inspirada en Apple/iOS para el registro y edición de unidades vehiculares en FlotaX. | [INDEX.md](./wizard/INDEX.md) |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`BrandFilterBar.tsx`](./BrandFilterBar.tsx) | Isla React 19: Filtro de Marcas | `BrandFilterBar`, `KNOWN_BRANDS` | `react` |
| [`CatalogSearchTrigger.tsx`](./CatalogSearchTrigger.tsx) | Isla React 19: Disparador de Búsqueda | `CatalogSearchTrigger` | `react` |
| [`FleetCatalogList.tsx`](./FleetCatalogList.tsx) | Isla React 19: Catálogo con filtro de marcas y grid PC | Componente `<FleetCatalogList ... />` | [`BrandFilterBar.tsx`](./BrandFilterBar.tsx), [`VehicleCatalogCard.tsx`](./VehicleCatalogCard.tsx) |
| [`FleetInventoryManager.tsx`](./FleetInventoryManager.tsx) | Isla React 19: Gestor de Inventario en Patio con Filtros Progresivos | `FleetInventoryManager`, `FleetInventoryManagerProps` | `astro:actions`, `@/lib/flota/types` |
| [`LocalCatalogShareCard.tsx`](./LocalCatalogShareCard.tsx) | Isla React 19: Enlace del Catálogo del Local con Progressive Disclosure (3 niveles) | `LocalCatalogShareCard`, `LocalCatalogShareCardProps` | `astro:actions`, `@/lib/flota/locales-captacion` |
| [`LocalCatalogShowcase.tsx`](./LocalCatalogShowcase.tsx) | Isla React 19: Catálogo Exclusivo del Local (Pantallas 1 y 2 iOS Editorial Bento + Hero Spotlight) | `LocalCatalogShowcase` | `@/lib/flota/types`, `@/lib/flota/locales-captacion` |
| [`VehicleCatalogCard.tsx`](./VehicleCatalogCard.tsx) | Isla React 19: Tarjeta de Catálogo | `VehicleCatalogCard` | `@/lib/flota/types` |
| [`VehicleFormIsland.tsx`](./VehicleFormIsland.tsx) | Wrapper Isla React 19: Asistente guiado paso a paso para flota | `VehicleFormIsland`, `VehicleFormIslandProps` | [`./wizard/VehicleWizardIsland.tsx`](./wizard/VehicleWizardIsland.tsx) |
| [`VehicleSearchResultItem.tsx`](./VehicleSearchResultItem.tsx) | Componente Resultado Spotlight | `VehicleSearchResultItem` | `@/lib/flota/types` |
| [`VehicleSearchSpotlight.tsx`](./VehicleSearchSpotlight.tsx) | Isla React 19: Buscador Spotlight con aislamiento por local | `VehicleSearchSpotlight` | `@/lib/flota/mock-vehiculos` |
| [`VehicleStudioShowcase.tsx`](./VehicleStudioShowcase.tsx) | Isla React 19: Ficha de Vehículo Estudio 360° (Pantallas 3 y 4 iOS Editorial con pedestal) | `VehicleStudioShowcase` | `@/lib/flota/types` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
