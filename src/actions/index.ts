import { registrarAbono } from './caja';
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

export const server = {
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
};
