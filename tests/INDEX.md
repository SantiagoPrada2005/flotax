# Index: `tests`

**Responsibility**: Suites de pruebas unitarias del dominio y utilidades de soporte para ejecutarlas con `node:test` (resolución del alias `@/` y de imports `.ts`).
**Architectural Layer**: Quality / Test Infrastructure

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`calculos_financieros.test.ts`](./calculos_financieros.test.ts) | Test Suite | Validación de cálculos de caja, garantías, saldos, moneda e indicadores financieros | `node:test`, `src/lib/caja/calculos.ts` |
| [`loader-ts.mjs`](./loader-ts.mjs) | ESM Loader | Hook `resolve` que mapea `@/` a `src/` y añade `.ts` a imports sin extensión | `node:fs`, `node:url` |
| [`pwa_cache_policy.test.ts`](./pwa_cache_policy.test.ts) | Test Suite | Matriz de `Cache-Control`/`Vary` por ruta y comportamiento de `aplicarPoliticaCacheHtml` | `node:test`, `src/lib/pwa/cache-policy.ts` |
| [`register-loader.mjs`](./register-loader.mjs) | ESM Registration | Registra `loader-ts.mjs` con `module.register` para `node --test` | `node:module` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Las pruebas deben ejecutarse con `pnpm test`; no añadir frameworks ni dependencias de test.
- Los tests importan código de `src/` sin duplicar lógica de dominio.

<!-- Reconciled by codebase-index -->
