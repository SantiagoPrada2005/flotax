# Index: `src/components/perfil`

**Responsibility**: Componentes de interfaz de usuario para el perfil de usuario y control de conmutación de portal (Cliente / Operativo).
**Architectural Layer**: Presentation / Profile Domain Components

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`PerfilEditorCard.tsx`](./PerfilEditorCard.tsx) | Isla React 19: Editor de Perfil e Inset Grouped Form con Logout (Apple HIG) | Componente `<PerfilEditorCard ... />` | `astro:actions`, `astro:transitions/client`, `@/lib/auth/client` |
| [`PortalSwitchCard.tsx`](./PortalSwitchCard.tsx) | Isla React 19: Conmutador de Portal Persistente | Componente `<PortalSwitchCard ... />` | `astro:actions`, `astro:transitions/client`, `@/lib/auth/session` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
