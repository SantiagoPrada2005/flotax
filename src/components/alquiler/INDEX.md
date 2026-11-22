# Index: `src\components\alquiler`

**Responsibility**: Componentes interactivos para el embudo multi-paso de alquiler de vehículos y calendario editorial de franjas de disponibilidad.
**Architectural Layer**: Presentation / Domain Components (Tier 2)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`DeliveryLocationSelector.tsx`](./DeliveryLocationSelector.tsx) | Isla React 19: Selector de Punto de Entrega con Mapa Diferido, Autocompletado Exclusivo y GPS | `DeliveryLocationSelector`, `DeliveryLocationSelectorProps`, `EstadoEntregaWizard`, `ModalidadEntregaSeleccion` | `./MapboxCanvas`, `@/lib/ubicacion`, `astro:actions` |
| [`EditorialAvailabilityCalendar.tsx`](./EditorialAvailabilityCalendar.tsx) | Isla React 19: Calendario Editorial | `EditorialAvailabilityCalendar`, `EditorialAvailabilityCalendarProps` | `@/lib/flota` |
| [`MapboxCanvas.tsx`](./MapboxCanvas.tsx) | Componente React 19: Lienzo Mapbox GL JS Diferido (Claro/Oscuro, Pin Fijo o Arrastrable y Polígono de Cobertura) | `MapboxCanvas`, `MapboxCanvasProps` | `mapbox-gl`, `@/lib/ubicacion` |
| [`RentalVehicleHero.tsx`](./RentalVehicleHero.tsx) | Componente React 19: Presentación Protagonista del Vehículo | `RentalVehicleHero`, `RentalVehicleHeroProps` | `@/lib/flota` |
| [`RentalWizardFlow.tsx`](./RentalWizardFlow.tsx) | Isla React 19: Orquestador Multi-Slide (5 Slides con Progressive Disclosure) | `RentalWizardFlow`, `RentalWizardFlowProps`, `PasoWizard`, `UsuarioSesionCliente` | `./DeliveryLocationSelector`, `./EditorialAvailabilityCalendar`, `./RentalVehicleHero`, `./SlideToConfirmControl`, `@/lib/flota`, `@/lib/ubicacion` |
| [`SlideToConfirmControl.tsx`](./SlideToConfirmControl.tsx) | Control Interactivo: Deslizamiento Horizontal para Confirmar | `SlideToConfirmControl`, `SlideToConfirmControlProps`, `SlideConfirmStatus` | `react` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
