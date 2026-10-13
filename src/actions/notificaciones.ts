import { defineAction, ActionError } from 'astro:actions';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { requireAuth, type ContextWithLocals } from '@/lib/auth';
import {
  crearServicioNotificaciones,
  type AmbitoNotificaciones,
  type ServicioNotificaciones,
} from '@/lib/notificaciones';

interface ContextoAccion extends ContextWithLocals {
  cookies: { get(nombre: string): { value: string } | undefined };
}

/**
 * Aísla la bandeja según el modo de portal activo (cookie `movix_portal_modo`):
 * cliente => solo avisos personales; operador => avisos personales + los del patio activo.
 */
function resolverServicio(context: ContextoAccion): {
  servicio: ServicioNotificaciones;
  ambito: AmbitoNotificaciones;
  usuarioId: string;
} {
  const usuario = requireAuth(context);
  if (!env.DB) {
    throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Base de datos no disponible.' });
  }
  const modoOperador = context.cookies.get('movix_portal_modo')?.value === 'ADMIN';
  return {
    servicio: crearServicioNotificaciones(env),
    ambito: { usuarioId: usuario.id, localId: modoOperador ? (usuario.localActivo?.id ?? null) : null },
    usuarioId: usuario.id,
  };
}

const idsSchema = z.array(z.string().min(1)).min(1).max(500);

export const listarNotificaciones = defineAction({
  input: z.object({
    soloNoLeidas: z.boolean().default(false),
    cursor: z.string().optional(),
    limite: z.number().int().min(1).max(50).default(20),
  }),
  handler: async (input, context) => {
    const { servicio, ambito } = resolverServicio(context);
    return servicio.listar(ambito, input);
  },
});

export const contarNotificacionesNoLeidas = defineAction({
  handler: async (_input, context) => {
    const { servicio, ambito } = resolverServicio(context);
    return { total: await servicio.contarNoLeidas(ambito) };
  },
});

export const marcarNotificacionesLeidas = defineAction({
  input: z.object({ ids: idsSchema }),
  handler: async (input, context) => {
    const { servicio, ambito } = resolverServicio(context);
    await servicio.marcarLeida(ambito, input.ids);
    return { ok: true };
  },
});

export const marcarTodasNotificacionesLeidas = defineAction({
  handler: async (_input, context) => {
    const { servicio, ambito } = resolverServicio(context);
    return { ids: await servicio.marcarTodasLeidas(ambito) };
  },
});

export const deshacerNotificacionesLeidas = defineAction({
  input: z.object({ ids: idsSchema }),
  handler: async (input, context) => {
    const { servicio, ambito } = resolverServicio(context);
    await servicio.marcarNoLeidas(ambito, input.ids);
    return { ok: true };
  },
});

export const suscribirPush = defineAction({
  input: z.object({
    endpoint: z.url({ error: 'Suscripción no válida' }),
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  handler: async (input, context) => {
    const { servicio, usuarioId } = resolverServicio(context);
    await servicio.guardarSuscripcionPush({
      usuarioId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      agente: context.request.headers.get('user-agent')?.slice(0, 200) ?? null,
    });
    return { ok: true };
  },
});

export const cancelarPush = defineAction({
  input: z.object({ endpoint: z.url({ error: 'Suscripción no válida' }) }),
  handler: async (input, context) => {
    const { servicio, usuarioId } = resolverServicio(context);
    await servicio.eliminarSuscripcionPush(usuarioId, input.endpoint);
    return { ok: true };
  },
});
