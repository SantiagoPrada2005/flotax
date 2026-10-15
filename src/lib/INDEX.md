# Index: `src/lib`

**Responsibility**: Módulos de soporte técnico transversal, factories de infraestructura (Base de Datos D1, Autenticación Better Auth) y utilidades.
**Architectural Layer**: Infrastructure / Shared Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`auth/`](./auth/) | Sistema central de autenticación y autorización (Better Auth, RBAC multi-tenant, sesiones y guards). | [INDEX.md](./auth/INDEX.md) |
| [`db/`](./db/) | Directory `db` | *(No index)* |
| [`email/`](./email/) | Módulo de envío de correos electrónicos transaccionales para FlotaX sobre Cloudflare Workers (API `send_email`) y dominio `flotax.innovaweb.pro`. | [INDEX.md](./email/INDEX.md) |
| [`flota/`](./flota/) | Dominio de catálogo, especificaciones técnicas, buscador evaluativo de unidades, motor de franjas de disponibilidad, calendario suizo de reservas e inspección R2/waybill del cliente. | [INDEX.md](./flota/INDEX.md) |
| [`logger/`](./logger/) | Módulo de logging centralizado, sanitización de datos sensibles (PII/Secretos), gobernanza de errores y alertas tempranas con prevención de tormentas por correo para desarrolladores en Cloudflare Workers y D1. | [INDEX.md](./logger/INDEX.md) |
| [`media/`](./media/) | Utilidades perimetrales de procesamiento multimedia, compresión de imágenes en el cliente y normalización de evidencias fotográficas para almacenamiento en Cloudflare R2. | [INDEX.md](./media/INDEX.md) |
| [`metricas/`](./metricas/) | Dominio de telemetría operativa, series temporales, matrices de unidades y agregación de métricas para el panel móvil iOS de FlotaX. | [INDEX.md](./metricas/INDEX.md) |
| [`notificaciones/`](./notificaciones/) | Directory `notificaciones` | *(No index)* |
| [`pwa/`](./pwa/) | Utilidades de dominio para ejecución como Progressive Web App (PWA) en modo standalone, instalación adaptativa (Android `beforeinstallprompt` e iOS Safari/Chrome), validación de rutas SPA y registro del Service Worker perimetral. | [INDEX.md](./pwa/INDEX.md) |
| [`time/`](./time/) | Funciones y utilidades de cliente para manipulación y visualización de fechas y zonas horarias. | [INDEX.md](./time/INDEX.md) |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`db.ts`](./db.ts) | Factory / Client DB | `getDb(d1Binding)` | `drizzle-orm/d1`, `@cloudflare/workers-types` |
| [`utils.ts`](./utils.ts) | Pure Utilities | - | - |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
