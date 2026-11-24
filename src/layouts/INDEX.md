# Index: `src/layouts`

**Responsibility**: Layouts estructurales compartidos para la interfaz de usuario en Astro.
**Architectural Layer**: Presentation Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`LayoutAdmin.astro`](./LayoutAdmin.astro) | Layout Astro Principal (Alias) | Componente `<LayoutAdmin title="...">` | [`LayoutApp.astro`](./LayoutApp.astro) |
| [`LayoutApp.astro`](./LayoutApp.astro) | Layout Base con Navegación Adaptativa | Componente `<LayoutApp title="..." activeTab="..." ...>` | [`BottomNav.astro`](../components/navigation/BottomNav.astro), [`TopBar.astro`](../components/navigation/TopBar.astro), [`Sidebar.astro`](../components/navigation/Sidebar.astro) |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
