# Index: `src/components/caja`

**Responsibility**: Componentes interactivos de UI para el módulo de Caja, Arqueos, Flujos Financieros, Depósitos de Garantía y Transferencias entre Patios.
**Architectural Layer**: Presentation Layer (Tier 2 Domain Modules)

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| *(None)* | - | - |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`CajaBarraFlujo.tsx`](./CajaBarraFlujo.tsx) | Componente: Barra Proporcional de Flujos Financieros | `CajaBarraFlujo` | `@/lib/caja` |
| [`CajaDashboardIsland.tsx`](./CajaDashboardIsland.tsx) | Isla React 19: Dashboard de Caja | `CajaDashboardIsland` | `astro:actions`, `@/lib/caja` |
| [`CajaGraficos.tsx`](./CajaGraficos.tsx) | Componente: Visualización de Gastos y Canales de Pago | `CajaGraficos` | `@/lib/caja` |
| [`CajaKpiCard.tsx`](./CajaKpiCard.tsx) | Componente: Tarjeta KPI de Balance | `CajaKpiCard` | `lucide-react` |
| [`ModalArqueoCierre.tsx`](./ModalArqueoCierre.tsx) | Modal: Arqueo y Cierre de Caja | `ModalArqueoCierre` | `astro:actions`, `@/lib/caja` |
| [`ModalComprobante.tsx`](./ModalComprobante.tsx) | Modal: Visor de Comprobante Digital | `ModalComprobante` | `lucide-react` |
| [`ModalGarantia.tsx`](./ModalGarantia.tsx) | Modal: Gestión de Depósitos de Garantía | `ModalGarantia` | `astro:actions`, `@/lib/caja` |
| [`ModalMovimiento.tsx`](./ModalMovimiento.tsx) | Modal: Registro de Ingreso / Egreso | `ModalMovimiento` | `astro:actions`, `@/lib/caja` |
| [`ModalTransferencia.tsx`](./ModalTransferencia.tsx) | Modal: Transferencia entre Cuentas | `ModalTransferencia` | `astro:actions`, `@/lib/caja` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
