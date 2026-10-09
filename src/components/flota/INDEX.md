# Módulo Flota — Componentes de UI

| Archivo | Tipo | Descripción | Relaciones Clave |
| :--- | :--- | :--- | :--- |
| [`VehicleSearchSpotlight.tsx`](./VehicleSearchSpotlight.tsx) | Isla React 19: Buscador de Flota | Overlay a pantalla completa con búsqueda predictiva y filtros rápidos | [`VehicleSearchResultItem.tsx`](./VehicleSearchResultItem.tsx), [`mock-vehiculos.ts`](../../lib/flota/mock-vehiculos.ts) |
| [`VehicleSearchResultItem.tsx`](./VehicleSearchResultItem.tsx) | Componente Fila de Vehículo | Tarjeta compacta de resultado con foto, specs, placa, precio y badge | [`VehicleSearchSpotlight.tsx`](./VehicleSearchSpotlight.tsx), [`types.ts`](../../lib/flota/types.ts) |
| [`CatalogSearchTrigger.tsx`](./CatalogSearchTrigger.tsx) | Isla React 19: Disparador de Catálogo | Botón accesible que sincroniza el catálogo con el buscador global iOS 27 | [`TopBarSearch.tsx`](../navigation/TopBarSearch.tsx) |
| [`VehicleCatalogCard.tsx`](./VehicleCatalogCard.tsx) | Isla React 19: Tarjeta Popular Cars | Tarjeta con foto 3/4 de estudio, sombra de suelo y grid de 4 especificaciones | [`mock-vehiculos.ts`](../../lib/flota/mock-vehiculos.ts) |
| [`BrandFilterBar.tsx`](./BrandFilterBar.tsx) | Isla React 19: Carrusel de Marcas | Selector horizontal de marcas y categorías con chips interactivos | [`catalogo/index.astro`](../../pages/catalogo/index.astro) |
