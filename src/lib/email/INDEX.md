# Index: `src/lib/email`

**Responsibility**: Módulo de envío de correos electrónicos transaccionales para FlotaX sobre Cloudflare Workers (API `send_email`) y dominio `flotax.innovaweb.pro`.
**Architectural Layer**: Application / Infrastructure Port & Adapter

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`templates/`](./templates/) | Motores de renderizado de plantillas HTML responsivas y texto plano (OTP, Reservas, Inspecciones). | — |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`types.ts`](./types.ts) | Domain Types & Contracts | `IEmailSender`, `SendEmailOptions`, `EmailResult`, schemas Zod | `zod` |
| [`service.ts`](./service.ts) | Hexagonal Adapters & Domain Service | `EmailService`, `CloudflareEmailAdapter`, `ConsoleEmailAdapter` | `@cloudflare/workers-types`, `./types`, `./templates` |
| [`index.ts`](./index.ts) | Public Facade & Factory | `getEmailService(env)`, re-export de tipos y plantillas | `./service`, `./types`, `./templates` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
