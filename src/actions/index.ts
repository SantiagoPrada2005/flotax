import { registrarAbono } from './caja';
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

export const server = {
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
    registrarAbono,
  },
  portal: {
    cambiarModoPortal,
    conmutarLocalActivo,
    finalizarOnboardingOperativo,
    crearPatioOperativo,
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

