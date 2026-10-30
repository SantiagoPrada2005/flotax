# Index: `src/components/notificaciones`

**Responsibility**: Componentes interactivos de UI para el sistema de notificaciones in-app y gestión del ciclo de vida Web Push en cliente.
**Architectural Layer**: Presentation Layer (Tier 2 Domain Modules)

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| *(None)* | - | - |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`ActivarPush.tsx`](./ActivarPush.tsx) | Isla React 19: Control Web Push | `ActivarPush` | `astro:actions`, `@/lib/pwa` |
| [`ListaNotificaciones.tsx`](./ListaNotificaciones.tsx) | Componente: Lista de Avisos | `ListaNotificaciones` | `./NotificacionItem`, `./NotificacionesEstados` |
| [`NotificacionItem.tsx`](./NotificacionItem.tsx) | Componente: Tarjeta de Notificación | `NotificacionItem` | `lucide-react`, `@/db/schema` |
| [`NotificacionesBell.tsx`](./NotificacionesBell.tsx) | Componente: Campana con Contador | `NotificacionesBell` | `./PanelNotificaciones`, `./useNotificaciones` |
| [`NotificacionesEstados.tsx`](./NotificacionesEstados.tsx) | Componente: Estados Vacíos / Carga | `NotificacionesVacio`, `NotificacionesSkeleton` | `lucide-react` |
| [`NotificacionesPagina.tsx`](./NotificacionesPagina.tsx) | Isla React 19: Historial Completo | `NotificacionesPagina` | `./ListaNotificaciones`, `./useNotificaciones` |
| [`PanelNotificaciones.tsx`](./PanelNotificaciones.tsx) | Isla React 19: Popover / Bottom Sheet | `PanelNotificaciones` | `framer-motion`, `./ActivarPush`, `./ListaNotificaciones` |
| [`useNotificaciones.ts`](./useNotificaciones.ts) | Custom Hooks React | `useContadorNotificaciones`, `useListaNotificaciones` | `astro:actions` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
