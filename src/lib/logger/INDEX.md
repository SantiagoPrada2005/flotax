# Index: `src/lib/logger`

**Responsibility**: Módulo de logging centralizado, sanitización de datos sensibles (PII/Secretos), gobernanza de errores y alertas tempranas con prevención de tormentas por correo para desarrolladores en Cloudflare Workers y D1.
**Architectural Layer**: Application / Infrastructure Port & Adapter / Observability

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| [`alerts/`](./alerts/) | Motor de alertas tempranas, cálculo de huellas deterministas (`fingerprint`), acelerador (`throttle`), supresión en enfriamiento y disyuntor global (*circuit breaker*). | — |
| [`sinks/`](./sinks/) | Pipeline de salidas del logger (`ConsoleLogSink` para terminal/CF Observability y `EmailAlertSink` para desarrolladores). | — |
| [`templates/`](./templates/) | Plantillas de correo HTML y texto plano canónicas de FlotaX para alertas de incidentes. | — |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`types.ts`](./types.ts) | Domain Types & Contracts | `ILogger`, `ILogSink`, `LogEntry`, `LogLevel`, `LogContext`, `AlertThrottleConfig` | — |
| [`serializer.ts`](./serializer.ts) | Sanitization & Serialization | `cleanLogContext`, `serializeError`, `sanitizeContext` | `./types` |
| [`logger.ts`](./logger.ts) | Core Logger Implementation | `Logger` | `./types`, `./serializer` |
| [`index.ts`](./index.ts) | Public Facade & Factory | `getLogger(envContext, initialContext)`, re-exports | `./types`, `./logger`, `./sinks`, `./alerts` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.
- Zero tolerance to `@deprecated` code and no `any` types.

<!-- Reconciled by codebase-index -->
