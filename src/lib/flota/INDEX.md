# Index: `src/lib/flota`

**Responsibility**: Dominio de catálogo, especificaciones técnicas, buscador evaluativo de unidades, motor de franjas de disponibilidad, calendario suizo de reservas e inspección R2/waybill de cliente y administración.
**Architectural Layer**: Domain / Application Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`ciclo-alquiler-transiciones.ts`](./ciclo-alquiler-transiciones.ts) | Máquina de Estados / Dominio | `pausarAlquilerD1`, `reanudarAlquilerD1`, `prorrogarAlquilerD1`, `devolverYCerrarAlquilerD1`, `registrarEvaluacionEntregaClienteD1`, `rechazarReservaD1`, `cancelarReservaD1`, `anularAlquilerD1`, `reabrirReservaD1` | `@/db/schema`, `./errores`, `drizzle-orm` |
| [`ciclo-alquiler.ts`](./ciclo-alquiler.ts) | Orquestador Transaccional | `crearReservaConValidaciones`, `confirmarReservaD1`, `guardarInspeccionR2D1`, `entregarVehiculoConContratoD1`, `registrarOActualizarDocumentosClienteRapidoD1`, `ejecutarBatchOSecuencial` | `@/db/schema`, `./ciclo-alquiler-transiciones`, `./errores`, `drizzle-orm` |
| [`detalle-reserva-admin.ts`](./detalle-reserva-admin.ts) | Repositorio Consolidado Admin | `obtenerDetalleReservaAdminD1`, `obtenerDetalleCompletoAlquilerD1`, `registrarFotoAlquilerR2D1`, `parsearLineasCobrosAdicionales`, `crearDetalleReservaAdminVacio` | `@/db/schema`, `@/lib/media/r2-vehiculo-keys`, `./repositorio-reservas`, `drizzle-orm` |
| [`disponibilidad.ts`](./disponibilidad.ts) | Motor de Franjas y Tarifas | `verificarDisponibilidadVehiculo`, `obtenerBloquesNoDisponiblesD1`, `construirCalendarioMes`, `calcularCotizacionAlquiler`, `esRangoDisponibleValido`, `encontrarPrimerRangoDisponible`, `formatearFechaCorta`, `sumarDiasISO`, `obtenerBloquesNoDisponibles` | `./types`, `@/lib/time/client-time`, `@/db/schema`, `drizzle-orm` |
| [`errores.ts`](./errores.ts) | Dominio de Errores | `ErrorCicloAlquiler`, `ErrorCicloAlquilerCode` | - |
| [`index.ts`](./index.ts) | Barrel Export | Re-exporta todos los contratos y funciones del dominio flota | `./types`, `./mock-vehiculos`, `./disponibilidad`, `./reservas-cliente`, `./repositorio`, `./repositorio-reservas`, `./locales-captacion`, `./liquidacion-cierre` |
| [`liquidacion-cierre.ts`](./liquidacion-cierre.ts) | Dominio Financiero y Zonas Fotográficas | `calcularLiquidacionCierreAlquiler`, `ZONAS_FOTOS_ALQUILER`, `etiquetaZonaEvidencia`, `etiquetaEstadoGarantia`, `etiquetaMetodoPago`, `etiquetaEstadoReservaCorta` | `@/db/schema` |
| [`locales-captacion.ts`](./locales-captacion.ts) | Servicio de Dominio Anti-Fuga | `LocalPublicoContexto`, `COOKIE_LOCAL_CAPTACION`, `obtenerLocalPorSlugOId`, `obtenerLocalCatalogoPorDefecto`, `registrarCaptacionClienteEnLocal`, `actualizarConfigCatalogoLocal` | `@/db/schema`, `drizzle-orm` |
| [`marca-modelo.ts`](./marca-modelo.ts) | TypeScript / JavaScript Module | - | - |
| [`mock-vehiculos.ts`](./mock-vehiculos.ts) | Repositorio y Búsqueda | `FLOTA_CANONICA`, `buscarVehiculos`, `obtenerVehiculoPorId` | `./types` |
| [`numero.ts`](./numero.ts) | TypeScript / JavaScript Module | - | - |
| [`placa.ts`](./placa.ts) | TypeScript / JavaScript Module | - | - |
| [`repositorio-reservas.ts`](./repositorio-reservas.ts) | Repositorio D1 Reservas y Contratos | `listarReservasD1`, `obtenerReservaPorCodigoD1`, `crearReservaD1`, `cambiarEstadoReservaD1`, `registrarEntregaEvaluacionD1`, `registrarCobroWaybillD1` | `@/db/schema`, `@/lib/db`, `./repositorio`, `./reservas-cliente` |
| [`repositorio.ts`](./repositorio.ts) | Repositorio D1 & Memoria | `listarVehiculos`, `obtenerVehiculoAsync`, `guardarVehiculo`, `actualizarEstadoVehiculo`, `darDeBajaVehiculo` | `./mock-vehiculos`, `@/db/schema/vehiculos`, `@/lib/db` |
| [`reservas-cliente.ts`](./reservas-cliente.ts) | Reservas, Calendario Suizo, Waybill, Expediente, Inspección R2 y Evaluación de Entrega | `ReservaClienteItem`, `DatosConductorReserva`, `PuntoInspeccionR2`, `RubroLiquidacionWaybill`, `EvaluacionEntregaServicio`, `ChecklistEntregaCliente`, `hidratarReservasCliente`, `obtenerReservaClientePorCodigo`, `persistirReservaActualizadaEnStorage`, `registrarEntregaClienteConEvaluacion`, `crearReservaMostradorPatio`, `construirCalendarioSuizoReservas`, `actualizarRangoFiltroReservasPorToque`, `obtenerPuntosInspeccionPorVehiculo`, `obtenerRubrosWaybillReserva` | `./types`, `./disponibilidad`, `./mock-vehiculos` |
| [`types.ts`](./types.ts) | Definiciones de Tipos | `VehiculoItem`, `EstadoVehiculo`, `CategoriaVehiculo`, `CotizacionAlquiler`, `DiaCalendarioItem`, `FranjaDisponible` | — |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
