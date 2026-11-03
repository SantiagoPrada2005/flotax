# Index: `src/components`

**Responsibility**: Componentes UI reutilizables y modulares de la aplicación.
**Architectural Layer**: Presentation Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`alquiler/`](./alquiler/) | Componentes interactivos para el embudo multi-paso de alquiler de vehículos y calendario editorial de franjas de disponibilidad. | [INDEX.md](./alquiler/INDEX.md) |
| [`auth/`](./auth/) | Componentes de autenticación, flujos de acceso OTP y wizards de inducción de personal operativo. | [INDEX.md](./auth/INDEX.md) |
| [`caja/`](./caja/) | Dashboard interactivo de Caja y Finanzas con Bento Grid, gráficos de flujo reales y modales transaccionales. | [INDEX.md](./caja/INDEX.md) |
| [`dashboard/`](./dashboard/) | Componentes modulares del Bento Grid para el panel de control operativo (Hero, Métricas con Sparkline, Operaciones y Categorías). | [INDEX.md](./dashboard/INDEX.md) |
| [`flota/`](./flota/) | Dominio de Flota, catálogo bento, ficha de estudio 360° y wizard multi-paso. | [INDEX.md](./flota/INDEX.md) |
| [`landing/`](./landing/) | Componentes visuales y secciones promocionales de la landing page principal de FlotaX. | [INDEX.md](./landing/INDEX.md) |
| [`navigation/`](./navigation/) | Componentes atómicos y estructurales de navegación (Bottom Navigation Bar, Top App Bar, Desktop Sidebar). | [INDEX.md](./navigation/INDEX.md) |
| [`notificaciones/`](./notificaciones/) | Centro de notificaciones in-app, campana de avisos, panel popover y activación Web Push. | [INDEX.md](./notificaciones/INDEX.md) |
| [`perfil/`](./perfil/) | Componentes de interfaz de usuario para el perfil de usuario y control de conmutación de portal (Cliente / Operativo). | [INDEX.md](./perfil/INDEX.md) |
| [`react/`](./react/) | Directory `react` | *(No index)* |
| [`reservas/`](./reservas/) | Componentes interactivos del portal de reservas del cliente (`/reservas` y `/reservas/[codigo]`), incluyendo el Calendario Editorial Suizo + Listado de Alquileres y la Vista Dedicada de Inspección R2, Waybill y Feature Highlights. | [INDEX.md](./reservas/INDEX.md) |
| [`ui/`](./ui/) | Primitivas y componentes visuales agnósticos Tier 1 del sistema de diseño FlotaX. | [INDEX.md](./ui/INDEX.md) |
| [`verificacion/`](./verificacion/) | Flujo multi-paso de verificación pericial KYC de identidad y licencias de conducir con integración a R2 y D1. | [INDEX.md](./verificacion/INDEX.md) |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| *(None)* | - | - | - |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
