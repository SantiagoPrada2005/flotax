# Index: `src/lib/seo`

**Responsibility**: Biblioteca de generación de esquemas Schema.org JSON-LD para entidades de negocio, vehículos y migas de pan.
**Architectural Layer**: Domain & Infrastructure Utilities

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.ts`](./index.ts) | Barril de Re-exportación | `buildAutoRentalSchema`, `buildVehicleProductSchema`, `buildBreadcrumbSchema` | [`./schema.ts`](./schema.ts) |
| [`schema.ts`](./schema.ts) | Constructores de Esquema | `buildAutoRentalSchema`, `buildVehicleProductSchema`, `buildBreadcrumbSchema` | [`@/lib/flota/types`](../flota/types.ts) |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
