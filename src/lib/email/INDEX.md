# Index: `src/lib/email`

**Responsibility**: Módulo de envío de correos electrónicos transaccionales para FlotaX sobre Cloudflare Workers (API `send_email`) y dominio `flotax.innovaweb.pro`.
**Architectural Layer**: Application / Infrastructure Port & Adapter

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`templates/`](./templates/) | Directory `templates` | *(No index)* |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.ts`](./index.ts) | Public Facade & Factory | `getEmailService(env)`, re-export de tipos y plantillas | `./service`, `./types`, `./templates` |
| [`service.ts`](./service.ts) | Hexagonal Adapters & Domain Service | `EmailService`, `CloudflareEmailAdapter`, `ConsoleEmailAdapter` | `@cloudflare/workers-types`, `./types`, `./templates` |
| [`types.ts`](./types.ts) | Domain Types & Contracts | `IEmailSender`, `SendEmailOptions`, `EmailResult`, schemas Zod | `zod` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
