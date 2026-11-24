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

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
