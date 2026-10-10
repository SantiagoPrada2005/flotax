# Módulo Flota — Biblioteca de Dominio

| Archivo | Tipo | Descripción | Relaciones Clave |
| :--- | :--- | :--- | :--- |
| [`types.ts`](./types.ts) | Definiciones de Tipos | Contratos TypeScript para vehículos, estados, categorías, franjas de disponibilidad y cotizaciones | [`mock-vehiculos.ts`](./mock-vehiculos.ts), [`disponibilidad.ts`](./disponibilidad.ts) |
| [`mock-vehiculos.ts`](./mock-vehiculos.ts) | Datos y Búsqueda | Repositorio canónico de flota y algoritmo puro de búsqueda evaluativa | [`types.ts`](./types.ts) |
| [`disponibilidad.ts`](./disponibilidad.ts) | Motor de Franjas y Tarifas | Generación de calendario mensual, detección de franjas contiguas y liquidación de costos | [`types.ts`](./types.ts), [`client-time.ts`](../time/client-time.ts) |
| [`index.ts`](./index.ts) | Re-exportación Canónica | Punto de entrada del dominio flota | [`types.ts`](./types.ts), [`mock-vehiculos.ts`](./mock-vehiculos.ts), [`disponibilidad.ts`](./disponibilidad.ts) |

