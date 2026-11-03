# Index: `src/components/auth/assets`

**Responsibility**: Biblioteca de primitivas vectoriales SVG nativas para fondos automotrices del flujo de autenticación FlotaX.
**Architectural Layer**: Presentation / Auth Vector Assets (Tier 1/2)

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`AuthBlueprintVector.tsx`](./AuthBlueprintVector.tsx) | Componente SVG React 19: Blueprint Técnico con Cotas | `default function AuthBlueprintVector` | `react` |
| [`AuthCadVector.tsx`](./AuthCadVector.tsx) | Componente SVG React 19: Malla 3D CAD y Telemetría | `default function AuthCadVector` | `react` |
| [`AuthSketchVector.tsx`](./AuthSketchVector.tsx) | Componente SVG React 19: Boceto Industrial de 3 Vistas | `default function AuthSketchVector` | `react` |
| [`AuthStencilVector.tsx`](./AuthStencilVector.tsx) | Componente SVG React 19: Stencil GT3 RS y Código de Barras VIN | `default function AuthStencilVector` | `react` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- All components use `viewBox="0 0 456 500"` and `vectorEffect="non-scaling-stroke"`.
- Canonical palette: `#111827`, `#1F2937`, `#4B5563`, `#9CA3AF`, `#EDEDED`.

<!-- Reconciled by codebase-index -->
