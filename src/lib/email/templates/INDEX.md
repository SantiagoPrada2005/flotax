# Index: `src/lib/email/templates`

**Responsibility**: Plantillas HTML de correos electrónicos transaccionales con diseño responsive y tokens canónicos de FlotaX.
**Architectural Layer**: Presentation / Email Layer

## Subdirectories & Child Modules

| Subdirectory | Responsibility | Index |
| :--- | :--- | :--- |
| *(None)* | - | - |

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`base.ts`](./base.ts) | Plantilla Base HTML | `plantillaBaseEmail` | - |
| [`index.ts`](./index.ts) | Barrel Export | Exportaciones de plantillas de correo | `./otp`, `./reserva`, `./inspeccion` |
| [`inspeccion.ts`](./inspeccion.ts) | Plantilla Acta Pericial | `plantillaInspeccionVehiculo` | `./base` |
| [`otp.ts`](./otp.ts) | Plantilla Código OTP | `plantillaCodigoOtp` | `./base` |
| [`reserva.ts`](./reserva.ts) | Plantilla Confirmación Reserva | `plantillaConfirmacionReserva` | `./base` |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
