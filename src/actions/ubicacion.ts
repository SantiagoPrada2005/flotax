import { defineAction, ActionError } from 'astro:actions';
import { z } from 'zod';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import { localesAlquiler, politicasLocal } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  buscarDireccionesMapbox,
  evaluarCoberturaDomicilio,
  geocodificarInversaMapbox,
  normalizarPoliticaDomicilio,
  PATIO_COORDENADAS_DEFECTO,
  POLITICA_DOMICILIO_DEFECTO,
  resolverLimiteDiarioGeocode,
  resolverRefererMapbox,
  resolverTokenMapboxServidor,
  sonCoordenadasValidas,
  type CoordenadasGeo,
  type PoliticaDomicilioLocal,
} from '@/lib/ubicacion';

async function resolverContextoPatioYPolitica(
  localId?: string
): Promise<{ patio: CoordenadasGeo; politica: PoliticaDomicilioLocal }> {
  const idEfectivo = localId?.trim() || 'local-patio-norte';

  if (!env.DB) {
    return {
      patio: { ...PATIO_COORDENADAS_DEFECTO },
      politica: { ...POLITICA_DOMICILIO_DEFECTO },
    };
  }

  try {
    const db = getDb(env.DB);
    const [localRows, polRows] = await Promise.all([
      db
        .select({
          latitud: localesAlquiler.latitud,
          longitud: localesAlquiler.longitud,
        })
        .from(localesAlquiler)
        .where(eq(localesAlquiler.id, idEfectivo))
        .limit(1),
      db
        .select()
        .from(politicasLocal)
        .where(eq(politicasLocal.localId, idEfectivo))
        .limit(1),
    ]);

    const loc = localRows[0];
    const patio: CoordenadasGeo =
      loc &&
      typeof loc.latitud === 'number' &&
      typeof loc.longitud === 'number' &&
      sonCoordenadasValidas(loc.latitud, loc.longitud)
        ? { lat: loc.latitud, lng: loc.longitud }
        : { ...PATIO_COORDENADAS_DEFECTO };

    const politica = normalizarPoliticaDomicilio(polRows[0]);
    return { patio, politica };
  } catch {
    return {
      patio: { ...PATIO_COORDENADAS_DEFECTO },
      politica: { ...POLITICA_DOMICILIO_DEFECTO },
    };
  }
}

/**
 * Autocompletado de direcciones vía Mapbox Geocoding v6.
 * Exclusivo para `DOMICILIO_MEDELLIN`: bloquea a nivel de contrato Zod cualquier invocación
 * en modalidad `PATIO_PRINCIPAL` para controlar estrictamente el costo de API.
 */
export const buscarDireccionesAction = defineAction({
  input: z.object({
    consulta: z
      .string()
      .trim()
      .min(3, { error: 'Escribe al menos 3 caracteres para buscar una dirección.' })
      .max(160, { error: 'La búsqueda de dirección es demasiado extensa.' }),
    localId: z.string().trim().min(1).max(80).optional(),
    modalidadEntrega: z.literal('DOMICILIO_MEDELLIN', {
      error: 'El autocompletado de direcciones solo está disponible para entrega a domicilio.',
    }),
  }),
  handler: async (input, context) => {
    const { patio, politica } = await resolverContextoPatioYPolitica(input.localId);
    const token = resolverTokenMapboxServidor(env);
    const limiteDiario = resolverLimiteDiarioGeocode(env.MAPBOX_DAILY_GEOCODE_LIMIT);
    const referer = resolverRefererMapbox(context.request, env.BETTER_AUTH_URL);

    return await buscarDireccionesMapbox({
      consulta: input.consulta,
      patio,
      politica,
      token,
      referer,
      kv: env.SESSION,
      limiteDiario,
    });
  },
});

/**
 * Geocodificación inversa para pin ajustado manualmente o geolocalización actual del usuario.
 * Siempre evalúa cobertura y recargo de domicilio en el servidor.
 */
export const geocodificarInversaAction = defineAction({
  input: z.object({
    latitud: z
      .number({ error: 'Latitud no válida' })
      .min(-90, { error: 'Latitud fuera de rango' })
      .max(90, { error: 'Latitud fuera de rango' }),
    longitud: z
      .number({ error: 'Longitud no válida' })
      .min(-180, { error: 'Longitud fuera de rango' })
      .max(180, { error: 'Longitud fuera de rango' }),
    localId: z.string().trim().min(1).max(80).optional(),
    modalidadEntrega: z.literal('DOMICILIO_MEDELLIN', {
      error: 'La ubicación de entrega solo aplica para entrega a domicilio.',
    }),
  }),
  handler: async (input, context) => {
    if (!sonCoordenadasValidas(input.latitud, input.longitud)) {
      throw new ActionError({
        code: 'BAD_REQUEST',
        message: 'Las coordenadas indicadas no son válidas. Intenta ubicar el pin nuevamente.',
      });
    }

    const { patio, politica } = await resolverContextoPatioYPolitica(input.localId);
    const token = resolverTokenMapboxServidor(env);
    const limiteDiario = resolverLimiteDiarioGeocode(env.MAPBOX_DAILY_GEOCODE_LIMIT);
    const referer = resolverRefererMapbox(context.request, env.BETTER_AUTH_URL);

    return await geocodificarInversaMapbox({
      latitud: input.latitud,
      longitud: input.longitud,
      patio,
      politica,
      token,
      referer,
      kv: env.SESSION,
      limiteDiario,
    });
  },
});

/**
 * Validación pura de cobertura y recargo por distancia sin consumir cuota externa de Mapbox.
 */
export const validarCoberturaDomicilioAction = defineAction({
  input: z.object({
    latitud: z.number().min(-90).max(90),
    longitud: z.number().min(-180).max(180),
    localId: z.string().trim().min(1).max(80).optional(),
  }),
  handler: async (input) => {
    const { patio, politica } = await resolverContextoPatioYPolitica(input.localId);
    return evaluarCoberturaDomicilio(
      { lat: input.latitud, lng: input.longitud },
      patio,
      politica
    );
  },
});
