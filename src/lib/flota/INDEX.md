# Index: `src/lib/flota`

**Responsibility**: Dominio de catálogo, especificaciones técnicas, buscador evaluativo de unidades, motor de franjas de disponibilidad, calendario suizo de reservas e inspección R2/waybill del cliente.
**Architectural Layer**: Domain / Application Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`disponibilidad.ts`](./disponibilidad.ts) | Motor de Franjas y Tarifas | `construirCalendarioMes`, `calcularCotizacionAlquiler`, `esRangoDisponibleValido`, `formatearFechaCorta`, `sumarDiasISO` | `./types`, `@/lib/time/client-time` |
| [`index.ts`](./index.ts) | Barrel Export | Re-exporta todos los contratos y funciones del dominio flota | `./types`, `./mock-vehiculos`, `./disponibilidad`, `./reservas-cliente`, `./repositorio` |
| [`mock-vehiculos.ts`](./mock-vehiculos.ts) | Repositorio y Búsqueda | `FLOTA_CANONICA`, `buscarVehiculos`, `obtenerVehiculoPorId` | `./types` |
| [`repositorio.ts`](./repositorio.ts) | Repositorio D1 & Memoria | `listarVehiculos`, `obtenerVehiculoAsync`, `guardarVehiculo`, `actualizarEstadoVehiculo`, `darDeBajaVehiculo` | `./mock-vehiculos`, `@/db/schema/vehiculos`, `@/lib/db` |
| [`reservas-cliente.ts`](./reservas-cliente.ts) | Reservas, Calendario Suizo, Waybill e Inspección R2 | `ReservaClienteItem`, `PuntoInspeccionR2`, `RubroLiquidacionWaybill`, `hidratarReservasCliente`, `obtenerReservaClientePorCodigo`, `construirCalendarioSuizoReservas`, `obtenerPuntosInspeccionPorVehiculo`, `obtenerRubrosWaybillReserva` | `./types`, `./disponibilidad`, `./mock-vehiculos` |
| [`types.ts`](./types.ts) | Definiciones de Tipos | `VehiculoItem`, `EstadoVehiculo`, `CategoriaVehiculo`, `CotizacionAlquiler`, `DiaCalendarioItem`, `FranjaDisponible` | — |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
