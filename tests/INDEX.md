# Index: `tests`

**Responsibility**: Suites de pruebas unitarias del dominio y utilidades de soporte para ejecutarlas con `node:test` (resolución del alias `@/` y de imports `.ts`).
**Architectural Layer**: Quality / Test Infrastructure

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`admin_dashboard_real_data.test.ts`](./admin_dashboard_real_data.test.ts) | Test Suite | Validación de métricas operativas y datos reales del dashboard administrativo | `node:test`, `src/lib/metricas` |
| [`caja_reconciliacion.test.ts`](./caja_reconciliacion.test.ts) | Test Suite | Validación de balance de caja, arqueos y conciliación financiera | `node:test`, `src/lib/caja` |
| [`calculos_financieros.test.ts`](./calculos_financieros.test.ts) | Test Suite | Validación de cálculos de caja, garantías, saldos, moneda e indicadores financieros | `node:test`, `src/lib/caja/calculos.ts` |
| [`ciclo_alquiler_inicio_entrega.test.ts`](./ciclo_alquiler_inicio_entrega.test.ts) | Test Suite | Integración de inicio de alquiler, inspección R2, entrega y ciclo operativo | `node:test`, `src/lib/flota/ciclo-alquiler.ts` |
| [`ciclo_alquiler_transiciones.test.ts`](./ciclo_alquiler_transiciones.test.ts) | Test Suite | Validación de transiciones de estado, máquina de estados y cálculo de penalidades | `node:test`, `src/lib/flota/ciclo-alquiler-transiciones.ts` |
| [`dashboard_proceso_y_guest.test.ts`](./dashboard_proceso_y_guest.test.ts) | Test Suite | Validación de visualización de reservas en proceso y modo invitado | `node:test`, `src/lib/flota` |
| [`disponibilidad_vehiculo.test.ts`](./disponibilidad_vehiculo.test.ts) | Test Suite | Validación de consulta de disponibilidad, detección de colisiones, franjas y preselección inteligente | `node:test`, `src/lib/flota/disponibilidad.ts` |
| [`liquid-notch.test.ts`](./liquid-notch.test.ts) | Test Suite | Validación de comportamiento y estados visuales del Liquid Notch | `node:test` |
| [`loader-ts.mjs`](./loader-ts.mjs) | ESM Loader | Hook `resolve` que mapea `@/` a `src/` y añade `.ts` a imports sin extensión | `node:fs`, `node:url` |
| [`metricas_reales_local.test.ts`](./metricas_reales_local.test.ts) | Test Suite | Validación de cálculo de indicadores operacionales por local | `node:test`, `src/lib/metricas` |
| [`page-transitions.test.ts`](./page-transitions.test.ts) | Test Suite | Validación de contratos de View Transitions y navegación SPA | `node:test` |
| [`portal_modo_persistencia.test.ts`](./portal_modo_persistencia.test.ts) | Test Suite | Validación de resolución y persistencia del modo portal (Cliente/Admin) | `node:test`, `src/lib/auth/portal-modo.ts` |
| [`pwa_cache_policy.test.ts`](./pwa_cache_policy.test.ts) | Test Suite | Matriz de `Cache-Control`/`Vary` por ruta y comportamiento de `aplicarPoliticaCacheHtml` | `node:test`, `src/lib/pwa/cache-policy.ts` |
| [`rbac_permisos_alquiler.test.ts`](./rbac_permisos_alquiler.test.ts) | Test Suite | Validación de matriz RBAC, capacidades operativas y permisos según rol | `node:test`, `src/lib/auth/capacidades-alquiler.ts` |
| [`register-loader.mjs`](./register-loader.mjs) | ESM Registration | Registra `loader-ts.mjs` con `module.register` para `node --test` | `node:module` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
