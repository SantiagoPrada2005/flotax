# Index: `src/components/auth`

**Responsibility**: Componentes de autenticación, flujos de acceso OTP, fondos vectoriales automotrices y wizards de inducción de personal operativo.
**Architectural Layer**: Presentation / Auth Domain Components

## Directory Sub-Manifest

- [`assets/`](./assets/INDEX.md): Componentes SVG vectoriales nativos extraídos de `design/logo.pen` (Blueprint, Sketch 3-vistas, CAD 3D, Stencil).

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`AuthBlueprintBackground.astro`](./AuthBlueprintBackground.astro) | Componente SSR: Fondo Arquitectónico Fusionado | Componente `<AuthBlueprintBackground />` | [`AuthVectorBackground.tsx`](./AuthVectorBackground.tsx) |
| [`AuthVectorBackground.tsx`](./AuthVectorBackground.tsx) | Orquestador de Fondos Vectoriales SVG Nativos | `default function AuthVectorBackground`, `type AuthBackgroundVariant` | [`assets/`](./assets/) |
| [`LoginFlow.tsx`](./LoginFlow.tsx) | Isla React 19: Flujo OTP y Acceso | Componente `<LoginFlow />` | [`AuthVectorBackground.tsx`](./AuthVectorBackground.tsx), Better Auth client |
| [`LoginForm.astro`](./LoginForm.astro) | Orquestador SSR Formulario de Acceso | Componente `<LoginForm />` | [`LoginFlow.tsx`](./LoginFlow.tsx) |
| [`OperatorOnboardingWizard.tsx`](./OperatorOnboardingWizard.tsx) | Isla React 19: Inducción de Patio en 3 Pasos | Componente `<OperatorOnboardingWizard ... />` | `astro:actions`, `astro:transitions/client` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
