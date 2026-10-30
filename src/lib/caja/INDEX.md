# Index: `src/lib/caja`

**Responsibility**: Dominio financiero y de caja operativa: cálculos de balance, liquidación de depósitos de garantía, repositorio transaccional D1 y exportación de reportes.
**Architectural Layer**: Domain & Infrastructure Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| *(None)* | - | - |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`calculos.ts`](./calculos.ts) | Pure Utilities: Cálculos de Balance | Funciones de balance, arqueo y series temporales | - |
| [`exportar.ts`](./exportar.ts) | Pure Utilities: Exportación | `exportarMovimientosCSV` | - |
| [`index.ts`](./index.ts) | Barrel Export | Exportaciones públicas del módulo caja | `./repositorio`, `./calculos`, `./tipos` |
| [`repositorio.ts`](./repositorio.ts) | Repository / Database Access | Operaciones CRUD y transacciones de caja sobre D1 | `drizzle-orm`, `@/lib/db`, `@/db/schema` |
| [`semillas.ts`](./semillas.ts) | Database Seeds | Datos semilla para cuentas de caja | `@/db/schema` |
| [`tipos.ts`](./tipos.ts) | Domain Types & Contracts | Tipos e interfaces del dominio de caja | `@/db/schema` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
