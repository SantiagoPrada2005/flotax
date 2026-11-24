import { ActionError, defineAction } from 'astro:actions';
import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { vehiculos } from '@/db/schema';
import { PERMISOS, requireLocalAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import {
  TIPOS_DOCUMENTO_LEGAL_OBLIGATORIO,
  esCategoriaExentaDocumentosLegales,
  esFechaISOValida,
  guardarDocumentoLegalD1,
  obtenerResumenDocumentalVehiculoD1,
} from '@/lib/documentos-vehiculo';
import { resolveClientTimeContext } from '@/lib/time/client-time';

const FechaISOSchema = z
  .string()
  .trim()
  .refine((val) => esFechaISOValida(val), {
    error: 'La fecha debe tener formato válido YYYY-MM-DD.',
  });

const GuardarDocumentoLegalSchema = z
  .object({
    vehiculoId: z.string().trim().min(1, { error: 'El vehículo es obligatorio.' }),
    tipoDocumento: z.enum(TIPOS_DOCUMENTO_LEGAL_OBLIGATORIO, {
      error: 'El tipo de documento debe ser SOAT o TECNICO_MECANICA.',
    }),
    numeroReferencia: z
      .string()
      .trim()
      .min(3, { error: 'Ingresa el número o referencia del documento.' })
      .max(60, { error: 'El número o referencia no puede superar 60 caracteres.' }),
    fechaExpedicion: FechaISOSchema,
    fechaVencimiento: FechaISOSchema,
    modo: z.enum(['RENOVAR', 'EDITAR']).default('RENOVAR'),
  })
  .refine((data) => data.fechaVencimiento >= data.fechaExpedicion, {
    path: ['fechaVencimiento'],
    error: 'La fecha de vencimiento no puede ser anterior a la fecha de expedición.',
  });

export const guardarDocumentoLegalAction = defineAction({
  input: GuardarDocumentoLegalSchema,
  handler: async (input, context) => {
    const usuario = requireLocalAuth(context, PERMISOS.FLOTA_DOCUMENTOS_GESTIONAR);
    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'La base de datos no se encuentra disponible.',
      });
    }

    const db = getDb(env.DB);
    const vehRows = await db
      .select({
        id: vehiculos.id,
        localId: vehiculos.localId,
        categoria: vehiculos.categoria,
      })
      .from(vehiculos)
      .where(eq(vehiculos.id, input.vehiculoId))
      .limit(1);

    const vehiculo = vehRows[0];
    if (!vehiculo) {
      throw new ActionError({
        code: 'NOT_FOUND',
        message: 'Vehículo no encontrado.',
      });
    }

    if (!usuario.esSuperAdmin && vehiculo.localId !== usuario.localActivo.id) {
      throw new ActionError({
        code: 'FORBIDDEN',
        message: 'No tienes permisos para gestionar documentos de este vehículo.',
      });
    }

    if (esCategoriaExentaDocumentosLegales(vehiculo.categoria)) {
      throw new ActionError({
        code: 'BAD_REQUEST',
        message:
          'Las patinetas eléctricas livianas están exentas de SOAT y Tecnomecánica (Ley 2486 de 2025).',
      });
    }

    const { dateString: hoyISO } = resolveClientTimeContext(context.request);
    const resumen = await guardarDocumentoLegalD1(db, {
      localId: vehiculo.localId ?? usuario.localActivo.id,
      vehiculoId: vehiculo.id,
      categoriaVehiculo: vehiculo.categoria,
      tipoDocumento: input.tipoDocumento,
      numeroReferencia: input.numeroReferencia,
      fechaExpedicion: input.fechaExpedicion,
      fechaVencimiento: input.fechaVencimiento,
      verificadoPorId: usuario.id,
      modo: input.modo,
      hoyISO,
    });

    return { ok: true, resumen };
  },
});

export const obtenerResumenDocumentosAction = defineAction({
  input: z.object({
    vehiculoId: z.string().trim().min(1, { error: 'El vehículo es obligatorio.' }),
  }),
  handler: async (input, context) => {
    const usuario = requireLocalAuth(context, PERMISOS.FLOTA_DOCUMENTOS_LEER);
    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'La base de datos no se encuentra disponible.',
      });
    }

    const db = getDb(env.DB);
    const vehRows = await db
      .select({
        id: vehiculos.id,
        localId: vehiculos.localId,
        categoria: vehiculos.categoria,
      })
      .from(vehiculos)
      .where(eq(vehiculos.id, input.vehiculoId))
      .limit(1);

    const vehiculo = vehRows[0];
    if (!vehiculo) {
      throw new ActionError({
        code: 'NOT_FOUND',
        message: 'Vehículo no encontrado.',
      });
    }

    if (!usuario.esSuperAdmin && vehiculo.localId !== usuario.localActivo.id) {
      throw new ActionError({
        code: 'FORBIDDEN',
        message: 'No tienes permisos para consultar los documentos de este vehículo.',
      });
    }

    const { dateString: hoyISO } = resolveClientTimeContext(context.request);
    const resumen = await obtenerResumenDocumentalVehiculoD1(
      db,
      vehiculo.id,
      vehiculo.categoria,
      hoyISO
    );

    return { ok: true, resumen };
  },
});
