# Index: `src/components/navigation`

**Responsibility**: Componentes atómicos y estructurales de navegación (Bottom Navigation Bar, Top App Bar, Desktop Sidebar).
**Architectural Layer**: Presentation / Navigation Components

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`BottomNav.astro`](./BottomNav.astro) | Orquestador SSR Barra Inferior Móvil | Componente `<BottomNav activeTab="..." />` | [`BottomNavIsland.tsx`](./BottomNavIsland.tsx) |
| [`BottomNavIsland.tsx`](./BottomNavIsland.tsx) | Isla React 19: Dock Flotante iOS 27 | Componente `<BottomNavIsland ... />` | Tokens de física de resorte y háptica |
| [`TopBar.astro`](./TopBar.astro) | Orquestador SSR Barra Superior | Componente `<TopBar title="..." showBack="..." />` | [`TopBarIsland.tsx`](./TopBarIsland.tsx) |
| [`TopBarIsland.tsx`](./TopBarIsland.tsx) | Isla React 19: Dynamic Island Scroll | Componente `<TopBarIsland ... />` | Tokens de vidrio líquido y badges vivos |
| [`TopBarSearch.tsx`](./TopBarSearch.tsx) | Isla React 19: Buscador Morphing iOS 27 | Componente `<TopBarSearch ... />` | [`VehicleSearchSpotlight.tsx`](../flota/VehicleSearchSpotlight.tsx) |
| [`Sidebar.astro`](./Sidebar.astro) | Barra Lateral de Navegación Desktop | Componente `<Sidebar activeTab="..." />` | Design tokens FlotaX (`tokens.css`) |
| [`ExitAdminButton.tsx`](./ExitAdminButton.tsx) | Botón Conmutador a Portal Cliente | Componente `<ExitAdminButton />` | `astro:actions`, `astro:transitions/client` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Touch targets must adhere to minimum 44px ergonomics.

<!-- Reconciled by codebase-index -->
