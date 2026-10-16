# Index: `src/components/flota`

**Responsibility**: Componentes interactivos del dominio de Flota: Catálogo Exclusivo iOS Editorial Showcase por Local, Ficha 360° de Estudio, Centro de Compartición de Enlace Anti-Fuga y Gestor de Inventario.
**Architectural Layer**: Presentation Layer (Tier 2 Domain Modules)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`BrandFilterBar.tsx`](./BrandFilterBar.tsx) | Isla React 19: Filtro de Marcas | `BrandFilterBar`, `KNOWN_BRANDS` | `react` |
| [`CatalogSearchTrigger.tsx`](./CatalogSearchTrigger.tsx) | Isla React 19: Disparador de Búsqueda | `CatalogSearchTrigger` | `react` |
| [`FleetCatalogList.tsx`](./FleetCatalogList.tsx) | Isla React 19: Catálogo con filtro de marcas y grid PC | Componente `<FleetCatalogList ... />` | [`BrandFilterBar.tsx`](./BrandFilterBar.tsx), [`VehicleCatalogCard.tsx`](./VehicleCatalogCard.tsx) |
| [`FleetInventoryManager.tsx`](./FleetInventoryManager.tsx) | Isla React 19: Gestor de Inventario en Patio | `FleetInventoryManager` | `astro:actions`, `@/lib/flota/types` |
| [`LocalCatalogShareCard.tsx`](./LocalCatalogShareCard.tsx) | Isla React 19: Centro de Compartición iOS (/c/[slug], QR y edición de slug) | `LocalCatalogShareCard` | `astro:actions`, `@/lib/flota/locales-captacion` |
| [`LocalCatalogShowcase.tsx`](./LocalCatalogShowcase.tsx) | Isla React 19: Catálogo Exclusivo del Local (Pantallas 1 y 2 iOS Editorial Bento + Hero Spotlight) | `LocalCatalogShowcase` | `@/lib/flota/types`, `@/lib/flota/locales-captacion` |
| [`VehicleCatalogCard.tsx`](./VehicleCatalogCard.tsx) | Isla React 19: Tarjeta de Catálogo | `VehicleCatalogCard` | `@/lib/flota/types` |
| [`VehicleFormIsland.tsx`](./VehicleFormIsland.tsx) | Isla React 19: Formulario Alta/Edición de Unidad | `VehicleFormIsland` | `astro:actions`, `@/lib/flota/types` |
| [`VehicleSearchResultItem.tsx`](./VehicleSearchResultItem.tsx) | Componente Resultado Spotlight | `VehicleSearchResultItem` | `@/lib/flota/types` |
| [`VehicleSearchSpotlight.tsx`](./VehicleSearchSpotlight.tsx) | Isla React 19: Buscador Spotlight con aislamiento por local | `VehicleSearchSpotlight` | `@/lib/flota/mock-vehiculos` |
| [`VehicleStudioShowcase.tsx`](./VehicleStudioShowcase.tsx) | Isla React 19: Ficha de Vehículo Estudio 360° (Pantallas 3 y 4 iOS Editorial con pedestal y planes) | `VehicleStudioShowcase` | `@/lib/flota/types`, `@/lib/flota/disponibilidad` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
