# Index: `src/components`

**Responsibility**: Componentes UI reutilizables y modulares de la aplicación.
**Architectural Layer**: Presentation Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`alquiler/`](./alquiler/) | Componentes interactivos para el embudo multi-paso de alquiler de vehículos y calendario editorial de franjas de disponibilidad. | [INDEX.md](./alquiler/INDEX.md) |
| [`auth/`](./auth/) | Componentes de autenticación, flujos de acceso OTP, fondos vectoriales automotrices y wizards de inducción de personal operativo. | [INDEX.md](./auth/INDEX.md) |
| [`caja/`](./caja/) | Componentes interactivos de UI para el módulo de Caja, Arqueos, Flujos Financieros, Depósitos de Garantía y Transferencias entre Patios. | [INDEX.md](./caja/INDEX.md) |
| [`configuracion/`](./configuracion/) | Componentes visuales e interactivos para la configuración de usuario, gestión de apariencia (modo claro, modo oscuro, sistema) e internacionalización (lenguaje y formatos regionales). | [INDEX.md](./configuracion/INDEX.md) |
| [`dashboard/`](./dashboard/) | Componentes modulares del panel de control y del módulo de Métricas y Telemetría en grilla Bento no lineal con Progressive Disclosure de 3 niveles y alto contraste canónico (azul oscuro `#111827` / `#1F2937` + blanco `#FFFFFF`). | [INDEX.md](./dashboard/INDEX.md) |
| [`flota/`](./flota/) | Componentes interactivos del dominio de Flota: Catálogo Exclusivo iOS Editorial Showcase por Local, Ficha 360° de Estudio, Centro de Compartición con Progressive Disclosure y Gestor de Inventario. | [INDEX.md](./flota/INDEX.md) |
| [`landing/`](./landing/) | Componentes visuales y secciones promocionales de la landing page principal de FlotaX. | [INDEX.md](./landing/INDEX.md) |
| [`navigation/`](./navigation/) | Componentes atómicos y estructurales de navegación (Bottom Navigation Bar, Minimalist Top App Bar con Menú Desplegable de Usuario, Desktop Sidebar). | [INDEX.md](./navigation/INDEX.md) |
| [`notificaciones/`](./notificaciones/) | Componentes interactivos de UI para el sistema de notificaciones in-app y gestión del ciclo de vida Web Push en cliente. | [INDEX.md](./notificaciones/INDEX.md) |
| [`perfil/`](./perfil/) | Componentes de interfaz de usuario para el perfil de usuario y control de conmutación de portal (Cliente / Operativo). | [INDEX.md](./perfil/INDEX.md) |
| [`react/`](./react/) | Directory `react` | *(No index)* |
| [`reservas/`](./reservas/) | Componentes interactivos unificados de reservas (`modo="cliente" | "admin"`) para `/reservas`, `/reservas/[codigo]`, `/admin/reservas` y `/admin/reservas/[codigo]`, incluyendo el Calendario Editorial Suizo + Agenda con Triage Operativo y la Vista Dedicada de Inspección R2, Waybill, Expediente del Conductor y Máquina de Estados. | [INDEX.md](./reservas/INDEX.md) |
| [`seo/`](./seo/) | Componentes transversales para inyección de metadatos SEO, Open Graph, Twitter Cards y Schema.org JSON-LD. | [INDEX.md](./seo/INDEX.md) |
| [`ui/`](./ui/) | Primitivas y componentes visuales agnósticos Tier 1 del sistema de diseño FlotaX. | [INDEX.md](./ui/INDEX.md) |
| [`verificacion/`](./verificacion/) | Componentes interactivos y presentación para el flujo multi-paso de verificación pericial KYC de identidad y licencias de conducir con integración directa a Cloudflare R2 y D1. | [INDEX.md](./verificacion/INDEX.md) |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| *(None)* | - | - | - |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
