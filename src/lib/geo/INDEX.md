# Index: `src/lib/geo`

**Responsibility**: Catálogo geográfico oficial de Colombia (DANE DIVIPOLA: 32 departamentos + Bogotá D.C. y sus 1,122 municipios) y utilidades de búsqueda normalizada.
**Architectural Layer**: Domain Data / Shared Utilities

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`colombia.ts`](./colombia.ts) | Catálogo Geográfico DANE | `DEPARTAMENTOS_COLOMBIA`, `DepartamentoColombia`, `obtenerDepartamentosColombia`, `obtenerCiudadesPorDepartamento`, `normalizarTextoBusqueda`, `formatearUbicacionOperativa` | *(None)* |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
