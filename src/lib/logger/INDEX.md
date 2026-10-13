# Index: `src/lib/logger`

**Responsibility**: Módulo de logging centralizado, sanitización de datos sensibles (PII/Secretos), gobernanza de errores y alertas tempranas con prevención de tormentas por correo para desarrolladores en Cloudflare Workers y D1.
**Architectural Layer**: Application / Infrastructure Port & Adapter / Observability

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`alerts/`](./alerts/) | Directory `alerts` | *(No index)* |
| [`sinks/`](./sinks/) | Directory `sinks` | *(No index)* |
| [`templates/`](./templates/) | Directory `templates` | *(No index)* |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.ts`](./index.ts) | Public Facade & Factory | `getLogger(envContext, initialContext)`, re-exports | `./types`, `./logger`, `./sinks`, `./alerts` |
| [`logger.ts`](./logger.ts) | Core Logger Implementation | `Logger` | `./types`, `./serializer` |
| [`serializer.ts`](./serializer.ts) | Sanitization & Serialization | `cleanLogContext`, `serializeError`, `sanitizeContext` | `./types` |
| [`types.ts`](./types.ts) | Domain Types & Contracts | `ILogger`, `ILogSink`, `LogEntry`, `LogLevel`, `LogContext`, `AlertThrottleConfig` | — |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
