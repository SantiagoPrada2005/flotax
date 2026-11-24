# Index: `src/lib/db`

**Responsibility**: Bootstrap defensivo de esquemas D1, diagnósticos de persistencia y seed idempotente de demostración para entornos local, preview y producción.
**Architectural Layer**: Infrastructure / Data Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`bootstrap.ts`](./bootstrap.ts) | D1 Schema Bootstrap | `ensureD1Schema` | `@cloudflare/workers-types`, `./diagnostics` |
| [`diagnostics.ts`](./diagnostics.ts) | D1 Error Telemetry | `logFalloD1` | - |
| [`seed.ts`](./seed.ts) | Idempotent D1 Demo Seed | `ejecutarSeedDemostracionD1`, `SEED_LOCAL_PATIO_NORTE_ID`, `SEED_DUENO_USER_ID` | `@/db/schema`, `@/lib/db`, `@/lib/flota/disponibilidad` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
