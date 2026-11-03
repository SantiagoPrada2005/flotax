# Index: `src/lib/notificaciones`

**Responsibility**: Dominio y motor de notificaciones multi-canal (In-App Fan-Out en D1, Web Push RFC 8292/8291 con WebCrypto y Email transaccional Cloudflare).
**Architectural Layer**: Domain & Infrastructure Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| *(None)* | - | - |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`canales.ts`](./canales.ts) | Channel Adapters | `CanalPush`, `CanalEmail`, `CanalNotificacion` | `./webpush`, `./plantillas` |
| [`destinatarios.ts`](./destinatarios.ts) | Scope Resolver | `resolverDestinatarios` | `drizzle-orm`, `@/db/schema` |
| [`index.ts`](./index.ts) | Factory & Barrel Export | `crearServicioNotificaciones`, `ServicioNotificaciones` | `./servicio`, `./canales` |
| [`lotes.ts`](./lotes.ts) | Pure Utility: Batching | `enLotes` | - |
| [`plantillas.ts`](./plantillas.ts) | Pure Templates & Channel Mapping | `renderizarNotificacion`, `canalesDeTipo` | `./tipos` |
| [`servicio.ts`](./servicio.ts) | Core Domain Service | `ServicioNotificaciones` | `drizzle-orm`, `@/db/schema`, `./plantillas` |
| [`tipos.ts`](./tipos.ts) | Domain Types & Contracts | Tipos de notificación, alcance, prioridad y payloads | `@/db/schema` |
| [`webpush.ts`](./webpush.ts) | WebCrypto Push Client | `enviarWebPush`, `ClavesVapid`, `DestinoPush` | WebCrypto (`crypto.subtle`) |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
