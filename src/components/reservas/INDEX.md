# Index: `src/components/reservas`

**Responsibility**: Componentes interactivos unificados de reservas (`modo="cliente" | "admin"`) para `/reservas`, `/reservas/[codigo]`, `/admin/reservas` y `/admin/reservas/[codigo]`, incluyendo el Calendario Editorial Suizo + Agenda con Triage Operativo y la Vista Dedicada de Inspección R2, Waybill, Expediente del Conductor y Máquina de Estados.
**Architectural Layer**: Presentation / Domain Components (Tier 2)

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`entrega-wizard/`](./entrega-wizard/) | Directory `entrega-wizard` | *(No index)* |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`AdminControlCenterPanel.tsx`](./AdminControlCenterPanel.tsx) | Isla React 19: Panel Derecho Colapsable (6 secciones, scroll acotado y pie fijo) | `AdminControlCenterPanel`, `AdminControlCenterPanelProps` | `@/lib/flota`, `@/lib/flota/detalle-reserva-admin`, `@/lib/media/image-compression`, `./SemaforoDocumentalPanel`, `astro:actions` |
| [`AlquilerCicloModals.tsx`](./AlquilerCicloModals.tsx) | Islas React 19: Modales del Ciclo Operativo | `ModalPausar`, `ModalProrrogar`, `ModalDevolverCerrar`, `ModalCancelarAnular` | `react`, `@/db/schema`, `astro:actions` |
| [`AlquilerDetalleView.tsx`](./AlquilerDetalleView.tsx) | Isla React 19: Consola Operativa de Alquiler (Admin) y Ciclo Operativo | `AlquilerDetalleView`, `AlquilerDetalleViewProps` | `@/lib/flota`, `./AdminControlCenterPanel`, `./FinalizarAlquilerWizardModal`, `./FacturaAlquilerModal`, `./DeliveryPointCard`, `astro:actions`, `astro:transitions/client` |
| [`DeliveryPointCard.tsx`](./DeliveryPointCard.tsx) | Componente React 19: Tarjeta de Punto de Entrega a Domicilio (Dirección, Coordenadas, Enlaces Google Maps/Waze y Mapa Mapbox Diferido) | `DeliveryPointCard`, `DeliveryPointCardProps` | `@/lib/ubicacion`, `@/components/alquiler/MapboxCanvas` |
| [`FacturaAlquilerModal.tsx`](./FacturaAlquilerModal.tsx) | Modal React 19: Comprobante y Factura Final con Cobros Adicionales y Trazabilidad | `FacturaAlquilerModal`, `FacturaAlquilerModalProps` | `@/lib/flota`, `@/lib/flota/detalle-reserva-admin` |
| [`FinalizarAlquilerWizardModal.tsx`](./FinalizarAlquilerWizardModal.tsx) | Modal React 19: Comparativa Fotográfica (Lado a Lado / Deslizador Móvil), Novedades, Cobros y Cruce de Garantía | `FinalizarAlquilerWizardModal`, `FinalizarAlquilerWizardModalProps` | `@/lib/flota`, `@/lib/flota/detalle-reserva-admin`, `@/lib/media/image-compression`, `astro:actions` |
| [`MisReservasHub.tsx`](./MisReservasHub.tsx) | Isla React 19: Calendario Suizo + Agenda de Alquileres (Cliente y Admin) | `MisReservasHub`, `MisReservasHubProps` | `@/lib/flota`, `astro:actions`, `astro:transitions/client` |
| [`ReservaClienteDetalleView.tsx`](./ReservaClienteDetalleView.tsx) | Isla React 19: Vista Dedicada de Reserva para Cliente (`/reservas/[codigo]`) | `ReservaClienteDetalleView`, `ReservaClienteDetalleViewProps` | `@/lib/flota`, `astro:transitions/client`, `./AlquilerCicloModals` |
| [`SemaforoDocumentalPanel.tsx`](./SemaforoDocumentalPanel.tsx) | Componente React 19: Semáforo Documental | `SemaforoDocumentalPanel`, `SemaforoDocumentalPanelProps` | `react`, `@/lib/flota` |
| [`VehiculoEntregaWizard.tsx`](./VehiculoEntregaWizard.tsx) | Isla React 19: Full-Screen Wizard (100dvh) de Autoevaluación de Retorno del Cliente | `VehiculoEntregaWizard`, `VehiculoEntregaWizardProps` | `@/lib/flota`, `astro:actions`, `astro:transitions/client` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
