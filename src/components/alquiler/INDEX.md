# Index: `src/components/alquiler`

**Responsibility**: Componentes interactivos para el embudo multi-paso de alquiler de vehículos y calendario editorial de franjas de disponibilidad.
**Architectural Layer**: Presentation / Domain Components (Tier 2)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`EditorialAvailabilityCalendar.tsx`](./EditorialAvailabilityCalendar.tsx) | Isla React 19: Calendario Editorial | `EditorialAvailabilityCalendar`, `EditorialAvailabilityCalendarProps` | `@/lib/flota` |
| [`RentalWizardFlow.tsx`](./RentalWizardFlow.tsx) | Isla React 19: Orquestador Multi-Paso | `RentalWizardFlow`, `RentalWizardFlowProps` | `./EditorialAvailabilityCalendar`, `@/lib/flota` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
