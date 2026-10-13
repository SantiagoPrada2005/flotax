import type { D1Database, SendEmail } from '@cloudflare/workers-types';
import { getDb } from '@/lib/db';
import { getEmailService } from '@/lib/email';
import type { ILogger } from '@/lib/logger';
import { CanalEmail, CanalPush, type CanalNotificacion } from './canales';
import { ServicioNotificaciones } from './servicio';
import type { ClavesVapid } from './webpush';

export interface NotificacionesEnv {
  DB: D1Database;
  EMAIL?: SendEmail | undefined;
  EMAIL_DEFAULT_FROM?: string | undefined;
  EMAIL_AUTH_FROM?: string | undefined;
  BETTER_AUTH_URL?: string | undefined;
  VAPID_PUBLIC_KEY?: string | undefined;
  VAPID_PRIVATE_KEY?: string | undefined;
  VAPID_SUBJECT?: string | undefined;
  [key: string]: unknown;
}

const URL_BASE_POR_DEFECTO = 'https://flotax.innovaweb.pro';

/**
 * Fábrica del servicio con sus adaptadores. El push solo se activa si están
 * configuradas las llaves VAPID (secreto `VAPID_PRIVATE_KEY`).
 */
export function crearServicioNotificaciones(
  env: NotificacionesEnv,
  logger?: ILogger | undefined
): ServicioNotificaciones {
  const db = getDb(env.DB);

  const claves: ClavesVapid | null =
    env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
      ? {
          publicKey: env.VAPID_PUBLIC_KEY,
          privateKey: env.VAPID_PRIVATE_KEY,
          subject: env.VAPID_SUBJECT ?? 'mailto:notificaciones@flotax.innovaweb.pro',
        }
      : null;

  const canales: CanalNotificacion[] = [
    new CanalPush(db, claves, logger),
    new CanalEmail(db, getEmailService(env), env.BETTER_AUTH_URL ?? URL_BASE_POR_DEFECTO, logger),
  ];

  return new ServicioNotificaciones(db, canales, logger);
}

export { ServicioNotificaciones } from './servicio';
export type {
  AmbitoNotificaciones,
  ConsultaNotificaciones,
  EmisionNotificacion,
  PaginaNotificaciones,
} from './servicio';
export * from './tipos';
export { renderizarNotificacion } from './plantillas';
