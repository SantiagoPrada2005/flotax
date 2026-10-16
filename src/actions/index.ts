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
} from './flota';
import {
  cambiarEstadoReservaAction,
  registrarCobroWaybillAction,
  registrarEntregaEvaluacionAction,
} from './reservas';
import { actualizarPerfilAction } from './perfil';
import {
  subirFotoDocumentoAction,
  finalizarVerificacionAction,
  obtenerEstadoVerificacionAction,
} from './verificacion';

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
  },
  reservas: {
    cambiarEstado: cambiarEstadoReservaAction,
    registrarCobroWaybill: registrarCobroWaybillAction,
    registrarEntregaEvaluacion: registrarEntregaEvaluacionAction,
  },
};

