# Index: `src/components/reservas`

**Responsibility**: Componentes interactivos unificados de reservas (`modo="cliente" | "admin"`) para `/reservas`, `/reservas/[codigo]`, `/admin/reservas` y `/admin/reservas/[codigo]`, incluyendo el Calendario Editorial Suizo + Agenda con Triage Operativo y la Vista Dedicada de Inspección R2, Waybill, Expediente del Conductor y Máquina de Estados.
**Architectural Layer**: Presentation / Domain Components (Tier 2)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`AlquilerDetalleView.tsx`](./AlquilerDetalleView.tsx) | Isla React 19: Vista Dedicada de Alquiler, Inspección R2 y Ciclo Operativo | `AlquilerDetalleView`, `AlquilerDetalleViewProps` | `@/lib/flota`, `astro:actions`, `astro:transitions/client` |
| [`MisReservasHub.tsx`](./MisReservasHub.tsx) | Isla React 19: Calendario Suizo + Agenda de Alquileres (Cliente y Admin) | `MisReservasHub`, `MisReservasHubProps` | `@/lib/flota`, `astro:actions`, `astro:transitions/client` |
| [`VehiculoEntregaWizard.tsx`](./VehiculoEntregaWizard.tsx) | Isla React 19: Full-Screen Wizard (100dvh) de Entrega y Evaluación del Servicio | `VehiculoEntregaWizard`, `VehiculoEntregaWizardProps` | `@/lib/flota`, `astro:actions`, `astro:transitions/client` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
