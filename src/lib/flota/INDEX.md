# Módulo Flota — Biblioteca de Dominio

| Archivo | Tipo | Descripción | Relaciones Clave |
| :--- | :--- | :--- | :--- |
| [`types.ts`](./types.ts) | Definiciones de Tipos | Contratos TypeScript para vehículos, estados, categorías y filtros | [`mock-vehiculos.ts`](./mock-vehiculos.ts) |
| [`mock-vehiculos.ts`](./mock-vehiculos.ts) | Datos y Búsqueda | Repositorio canónico de flota y algoritmo puro de búsqueda evaluativa | [`types.ts`](./types.ts) |
| [`index.ts`](./index.ts) | Re-exportación Canónica | Punto de entrada del dominio flota | [`types.ts`](./types.ts), [`mock-vehiculos.ts`](./mock-vehiculos.ts) |
