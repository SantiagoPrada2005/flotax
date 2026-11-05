# Index: `src/components/flota/disponibilidad`

**Responsibility**: Componentes React 19 para la gestión visual de disponibilidad, cabecera de unidad, órdenes activas de taller y tablero mensual de ocupación.
**Architectural Layer**: Presentation Layer (Tier 2 Domain Modules)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`ActiveMaintenanceCard.tsx`](./ActiveMaintenanceCard.tsx) | Componente React 19: Tarjeta de Orden en Taller | `ActiveMaintenanceCard`, `ActiveMaintenanceCardProps` | `@/lib/mantenimientos/types`, `@/lib/flota/disponibilidad` |
| [`AvailabilityHeader.tsx`](./AvailabilityHeader.tsx) | Componente React 19: Cabecera con Placa, Estado y Odómetro | `AvailabilityHeader`, `AvailabilityHeaderProps` | `astro:transitions/client`, `@/db/schema`, `@/lib/flota/types` |
| [`AvailabilityOverviewView.tsx`](./AvailabilityOverviewView.tsx) | Componente React 19: Tablero de Disponibilidad con Calendario y Órdenes | `AvailabilityOverviewView`, `AvailabilityOverviewViewProps` | `@/components/alquiler/EditorialAvailabilityCalendar`, `./ActiveMaintenanceCard` |
| [`index.ts`](./index.ts) | Barril de Re-exportación | Componentes y tipos de disponibilidad | `./AvailabilityHeader`, `./ActiveMaintenanceCard`, `./AvailabilityOverviewView` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
