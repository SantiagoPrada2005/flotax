# Index: `src/lib/ubicacion`

**Responsibility**: Dominio geoespacial, evaluación de cobertura y recargos por distancia de entregas a domicilio, generación de enlaces externos de navegación (Google Maps / Waze) y cliente perimetral de Mapbox Geocoding v6 con control de cuota diaria en Cloudflare KV.
**Architectural Layer**: Domain / Infrastructure Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`cobertura.ts`](./cobertura.ts) | Motor Geodésico y Reglas de Cobertura | `PATIO_COORDENADAS_DEFECTO`, `POLITICA_DOMICILIO_DEFECTO`, `ZONAS_REFERENCIA_MEDELLIN`, `sonCoordenadasValidas`, `calcularDistanciaKmHaversine`, `normalizarPoliticaDomicilio`, `evaluarCoberturaDomicilio`, `construirPoligonoCirculoGeoJson`, `construirEnlacesNavegacion`, `calcularBoundingBoxCobertura`, `formatearCoordenadasHumanas`, `formatearDistanciaKm` | `@/db/schema` |
| [`index.ts`](./index.ts) | Barrel Export | Re-exporta utilidades de cobertura geoespacial y cliente Mapbox | `./cobertura`, `./mapbox` |
| [`mapbox.ts`](./mapbox.ts) | Cliente Mapbox Geocoding v6 + Tope Diario KV | `LIMITE_DIARIO_GEOCODIFICACION_DEFECTO`, `resolverTokenMapboxPublico`, `resolverTokenMapboxServidor`, `resolverRefererMapbox`, `resolverLimiteDiarioGeocode`, `verificarYConsumirCuotaDiariaMapbox`, `buscarDireccionesMapbox`, `geocodificarInversaMapbox` | `@cloudflare/workers-types`, `./cobertura` |

## Invariants & Directory Rules

- Nunca exponer `MAPBOX_SECRET_TOKEN` ni tokens `sk.*` hacia el cliente; usar exclusivamente `resolverTokenMapboxPublico()` para la UI.
- Toda evaluación definitiva de cobertura y recargo de domicilio se ejecuta con las funciones puras de `cobertura.ts` en servidor.
- El autocompletado Mapbox solo se invoca cuando la modalidad es `DOMICILIO_MEDELLIN`, nunca en `PATIO_PRINCIPAL`.

<!-- Reconciled by codebase-index -->
