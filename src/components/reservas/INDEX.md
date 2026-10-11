# Index: `src/components/reservas`

**Responsibility**: Componentes interactivos del portal de reservas del cliente (`/reservas` y `/reservas/[codigo]`), incluyendo el Calendario Editorial Suizo + Listado de Alquileres y la Vista Dedicada de Inspección R2, Waybill y Feature Highlights.
**Architectural Layer**: Presentation / Domain Components (Tier 2)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`MisReservasHub.tsx`](./MisReservasHub.tsx) | Isla React 19: Calendario + Listado de Alquileres | `MisReservasHub`, `MisReservasHubProps` | `@/lib/flota`, `astro:transitions/client` |
| [`AlquilerDetalleView.tsx`](./AlquilerDetalleView.tsx) | Isla React 19: Vista Dedicada de Alquiler e Inspección R2 | `AlquilerDetalleView`, `AlquilerDetalleViewProps` | `@/lib/flota` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
