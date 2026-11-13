# Index: `src/lib/i18n`

**Responsibility**: Motor de internacionalización y formatos regionales para FlotaX (Español / English, Colombia / US).
**Architectural Layer**: Presentation / Shared Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.ts`](./index.ts) | i18n & Regional Formats Engine | `obtenerIdiomaActual`, `guardarIdioma`, `obtenerRegionActual`, `guardarRegion`, `t`, `formatearFecha`, `formatearHora`, `formatearNumero`, `formatearMonedaRegional`, `suscribirCambioI18n` | - |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
