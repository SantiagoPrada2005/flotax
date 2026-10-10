import { registrarAbono } from './caja';
import {
  cambiarModoPortal,
  conmutarLocalActivo,
  finalizarOnboardingOperativo,
  crearPatioOperativo,
} from './portal';

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
};
