# Index: `src/components/perfil`

**Responsibility**: Componentes de interfaz de usuario para el perfil de usuario y control de conmutación de portal (Cliente / Operativo).
**Architectural Layer**: Presentation / Profile Domain Components

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`PortalSwitchCard.tsx`](./PortalSwitchCard.tsx) | Isla React 19: Conmutador de Portal Persistente | Componente `<PortalSwitchCard ... />` | `astro:actions`, `astro:transitions/client`, `@/lib/auth/session` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Touch targets must adhere to minimum 44px ergonomics.

<!-- Reconciled by codebase-index -->
