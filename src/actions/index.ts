import {
  registrarAbonoAction,
  registrarMovimientoAction,
  anularMovimientoAction,
  registrarTransferenciaAction,
  aperturaCajaAction,
  cierreCajaAction,
  gestionarGarantiaAction,
  crearCuentaAction,
} from './caja';
import {
  listarNotificaciones,
  contarNotificacionesNoLeidas,
  marcarNotificacionesLeidas,
  marcarTodasNotificacionesLeidas,
  deshacerNotificacionesLeidas,
  suscribirPush,
  cancelarPush,
  enviarPruebaPush,
} from './notificaciones';
import {
  cambiarModoPortal,
  conmutarLocalActivo,
  finalizarOnboardingOperativo,
  crearPatioOperativo,
  actualizarPerfilCatalogoLocal,
} from './portal';
import {
  guardarVehiculoAction,
  cambiarEstadoVehiculoAction,
  eliminarVehiculoAction,
  obtenerVehiculoDetalleAction,
  consultarDisponibilidadVehiculoAction,
} from './flota';
import {
  crearReservaAction,
  confirmarReservaAction,
  rechazarReservaAction,
  guardarInspeccionR2Action,
  entregarVehiculoAction,
  pausarAlquilerAction,
  reanudarAlquilerAction,
  prorrogarAlquilerAction,
  devolverYCerrarAlquilerAction,
  cancelarReservaAction,
  anularContratoAction,
  reabrirReservaAction,
  registrarCobroWaybillAction,
  registrarEntregaEvaluacionAction,
  registrarOActualizarDocumentosRapidoAction,
  buscarClientesLocalAction,
  cambiarEstadoReservaAction,
} from './reservas';
import { actualizarPerfilAction } from './perfil';
import {
  subirFotoDocumentoAction,
  finalizarVerificacionAction,
  obtenerEstadoVerificacionAction,
} from './verificacion';
import {
  crearMantenimiento,
  cambiarEstadoMantenimiento,
} from './mantenimientos';

export const server = {
  perfil: {
    actualizar: actualizarPerfilAction,
  },
  verificacion: {
    subirFoto: subirFotoDocumentoAction,
    finalizar: finalizarVerificacionAction,
    obtenerEstado: obtenerEstadoVerificacionAction,
  },
  notificaciones: {
    listar: listarNotificaciones,
    contarNoLeidas: contarNotificacionesNoLeidas,
    marcarLeidas: marcarNotificacionesLeidas,
    marcarTodasLeidas: marcarTodasNotificacionesLeidas,
    deshacerLeidas: deshacerNotificacionesLeidas,
    suscribirPush,
    cancelarPush,
    enviarPrueba: enviarPruebaPush,
  },
  caja: {
    registrarAbono: registrarAbonoAction,
    registrarMovimiento: registrarMovimientoAction,
    anularMovimiento: anularMovimientoAction,
    registrarTransferencia: registrarTransferenciaAction,
    aperturaCaja: aperturaCajaAction,
    cierreCaja: cierreCajaAction,
    gestionarGarantia: gestionarGarantiaAction,
    crearCuenta: crearCuentaAction,
  },
  portal: {
    cambiarModoPortal,
    conmutarLocalActivo,
    finalizarOnboardingOperativo,
    crearPatioOperativo,
    actualizarPerfilCatalogoLocal,
  },
  flota: {
    guardarVehiculo: guardarVehiculoAction,
    cambiarEstadoVehiculo: cambiarEstadoVehiculoAction,
    eliminarVehiculo: eliminarVehiculoAction,
    obtenerVehiculoDetalle: obtenerVehiculoDetalleAction,
    consultarDisponibilidad: consultarDisponibilidadVehiculoAction,
  },
  reservas: {
    crearReserva: crearReservaAction,
    confirmarReserva: confirmarReservaAction,
    rechazarReserva: rechazarReservaAction,
    guardarInspeccionR2: guardarInspeccionR2Action,
    entregarVehiculo: entregarVehiculoAction,
    pausarAlquiler: pausarAlquilerAction,
    reanudarAlquiler: reanudarAlquilerAction,
    prorrogarAlquiler: prorrogarAlquilerAction,
    devolverYCerrarAlquiler: devolverYCerrarAlquilerAction,
    cancelarReserva: cancelarReservaAction,
    anularContrato: anularContratoAction,
    reabrirReserva: reabrirReservaAction,
    registrarCobroWaybill: registrarCobroWaybillAction,
    registrarEntregaEvaluacion: registrarEntregaEvaluacionAction,
    registrarOActualizarDocumentosRapido:
      registrarOActualizarDocumentosRapidoAction,
    buscarClientesLocal: buscarClientesLocalAction,
    cambiarEstado: cambiarEstadoReservaAction,
  },
  mantenimientos: {
    crearMantenimiento,
    cambiarEstadoMantenimiento,
  },
};

