# Index: `src/components/flota/disponibilidad`

**Responsibility**: Componentes React 19 para la gestión visual de disponibilidad, cabecera de unidad, órdenes activas de taller, wizard typeform de mantenimiento, modal de egreso de taller e isla coordinadora.
**Architectural Layer**: Presentation Layer (Tier 2 Domain Modules)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`ActiveMaintenanceCard.tsx`](./ActiveMaintenanceCard.tsx) | Componente React 19: Tarjeta de Orden en Taller | `ActiveMaintenanceCard`, `ActiveMaintenanceCardProps` | `@/lib/mantenimientos/types`, `@/lib/flota/disponibilidad` |
| [`AvailabilityHeader.tsx`](./AvailabilityHeader.tsx) | Componente React 19: Cabecera con Placa, Estado y Odómetro | `AvailabilityHeader`, `AvailabilityHeaderProps` | `astro:transitions/client`, `@/db/schema`, `@/lib/flota/types` |
| [`AvailabilityOverviewView.tsx`](./AvailabilityOverviewView.tsx) | Componente React 19: Tablero de Disponibilidad con Calendario y Órdenes | `AvailabilityOverviewView`, `AvailabilityOverviewViewProps` | `@/components/alquiler/EditorialAvailabilityCalendar`, `./ActiveMaintenanceCard` |
| [`CompleteMaintenanceModal.tsx`](./CompleteMaintenanceModal.tsx) | Componente React 19: Modal de Egreso y Liquidación de Taller | `CompleteMaintenanceModal`, `CompleteMaintenanceModalProps` | `astro:actions`, `@/lib/flota/types`, `@/lib/mantenimientos/types`, `@/lib/caja` |
| [`MaintenanceWizardFlow.tsx`](./MaintenanceWizardFlow.tsx) | Componente React 19: Wizard Typeform (5 Pasos) de Programación de Mantenimiento | `MaintenanceWizardFlow`, `MaintenanceWizardFlowProps` | `astro:actions`, `framer-motion`, `@/components/alquiler/EditorialAvailabilityCalendar`, `@/lib/flota/disponibilidad`, `@/lib/caja` |
| [`VehicleAvailabilityIsland.tsx`](./VehicleAvailabilityIsland.tsx) | Isla React 19 Coordinadora: Orquestación de Tablero, Wizard, Modal de Salida y Toast | `VehicleAvailabilityIsland`, `VehicleAvailabilityIslandProps` | `astro:transitions/client`, `@/lib/flota/types`, `@/lib/mantenimientos/types`, `./AvailabilityHeader`, `./AvailabilityOverviewView`, `./MaintenanceWizardFlow`, `./CompleteMaintenanceModal` |
| [`index.ts`](./index.ts) | Barril de Re-exportación | Componentes y tipos de disponibilidad | `./AvailabilityHeader`, `./ActiveMaintenanceCard`, `./AvailabilityOverviewView`, `./MaintenanceWizardFlow`, `./CompleteMaintenanceModal`, `./VehicleAvailabilityIsland` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
