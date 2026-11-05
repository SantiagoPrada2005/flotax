# Index: `src/pages/admin/flota/[id]`

**Responsibility**: Enrutamiento para operaciones por unidad de flota: edición de especificaciones técnicas y tablero dedicado de disponibilidad y mantenimiento.
**Architectural Layer**: Presentation / Admin Routing Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`disponibilidad.astro`](./disponibilidad.astro) | Página SSR `/admin/flota/[id]/disponibilidad` | Tablero de disponibilidad mensual, calendario de franjas y órdenes de mantenimiento | `@/layouts/LayoutAdmin`, `@/components/flota/disponibilidad/VehicleAvailabilityIsland`, `@/lib/flota`, `@/lib/mantenimientos` |
| [`editar.astro`](./editar.astro) | Página SSR `/admin/flota/[id]/editar` | Formulario de edición de especificaciones y datos del vehículo | `@/layouts/LayoutAdmin`, `@/components/flota/VehicleFormIsland`, `@/lib/flota` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
