# Index: `src/actions`

**Responsibility**: Capa de aplicación y casos de uso del servidor (Astro Server Actions) con validación estricta de esquemas Zod y control RBAC multi-tenant.
**Architectural Layer**: Application Layer / Server Actions

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`caja.ts`](./caja.ts) | Server Action / Caso de Uso | `registrarAbono` | `astro:actions`, `zod`, `@/lib/auth` |
| [`portal.ts`](./portal.ts) | Server Action / Casos de Uso | `cambiarModoPortal`, `conmutarLocalActivo`, `finalizarOnboardingOperativo`, `crearPatioOperativo` | `astro:actions`, `zod`, `cloudflare:workers`, `@/lib/auth` |
| [`index.ts`](./index.ts) | Barrel Export / Server Actions Root | `server` | `./caja`, `./portal` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
