# Index: `src/db`

**Responsibility**: Capa de persistencia relacional, esquemas de tablas Drizzle ORM y configuración de base de datos para SQLite / Cloudflare D1.
**Architectural Layer**: Infrastructure / Data Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`schema/`](./schema/) | Definición canónica de tablas, relaciones y tipos del ORM Drizzle para SQLite/Cloudflare D1 (Multi-tenant y Better Auth). | [INDEX.md](./schema/INDEX.md) |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| *(None)* | - | - | - |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
