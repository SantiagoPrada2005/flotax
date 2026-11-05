# Index: `src/lib/theme`

**Responsibility**: Motor de temas visuales (Claro, Oscuro, Preferencia del Sistema) y persistencia cross-page sin FOUC.
**Architectural Layer**: Presentation / Shared Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.ts`](./index.ts) | Theme Engine | `obtenerTemaActual`, `guardarTema`, `determinarEsOscuro`, `esModoOscuroActivo`, `aplicarTema`, `registrarEscuchadorTemaSistema`, `suscribirCambioTema` | - |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->

