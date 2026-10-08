# Index: `src/components/navigation`

**Responsibility**: Componentes atómicos y estructurales de navegación (Bottom Navigation Bar, Top App Bar, Desktop Sidebar).
**Architectural Layer**: Presentation / Navigation Components

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`BottomNav.astro`](./BottomNav.astro) | Barra Inferior Móvil con FAB 56px | Componente `<BottomNav activeTab="..." />` | Design tokens FlotaX (`tokens.css`) |
| [`TopBar.astro`](./TopBar.astro) | Barra Superior Móvil y Desktop | Componente `<TopBar title="..." showBack="..." />` | Design tokens FlotaX (`tokens.css`) |
| [`Sidebar.astro`](./Sidebar.astro) | Barra Lateral de Navegación Desktop | Componente `<Sidebar activeTab="..." />` | Design tokens FlotaX (`tokens.css`) |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Touch targets must adhere to minimum 44px ergonomics.

<!-- Reconciled by codebase-index -->
