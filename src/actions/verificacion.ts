import { defineAction, ActionError } from 'astro:actions';
import { z } from 'zod';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import { verificacionesIdentidad, user } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

/**
 * Astro Action para subir una fotografía pericial a Cloudflare R2 (BUCKET_MULTIMEDIA).
 */
export const subirFotoDocumentoAction = defineAction({
  input: z.object({
    documentoTipo: z.enum([
      'DOCUMENTO_FRENTE',
      'DOCUMENTO_DORSO',
      'LICENCIA_FRENTE',
      'LICENCIA_DORSO',
    ]),
    imagenBase64: z.string().min(50, { error: 'Imagen no válida o demasiado pequeña' }),
    mimeType: z.string().default('image/jpeg'),
  }),
  handler: async (input, context) => {
    const usuario = requireAuth(context);

    const bucket = env.BUCKET_MULTIMEDIA;
    if (!bucket) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'El almacenamiento pericial R2 no está disponible.',
      });
    }

    try {
      // 1. Limpiar prefijo data:image/...;base64, si existe
      const base64Limpia = input.imagenBase64.includes(';base64,')
        ? input.imagenBase64.split(';base64,')[1]
        : input.imagenBase64;

      if (!base64Limpia) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'Formato de imagen corrupto o inválido.',
        });
      }

      // 2. Convertir a ArrayBuffer / Uint8Array sin dependencias externas
      const binaryString = atob(base64Limpia);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 3. Generar clave única y determinística en R2
      const timestamp = Date.now();
      const ext = input.mimeType.includes('png') ? 'png' : 'jpg';
      const key = `verificaciones/${usuario.id}/${input.documentoTipo.toLowerCase()}_${timestamp}.${ext}`;

      // 4. Subir a Cloudflare R2
      await bucket.put(key, bytes, {
        httpMetadata: {
          contentType: input.mimeType,
        },
        customMetadata: {
          usuarioId: usuario.id,
          tipo: input.documentoTipo,
          subidoEn: new Date().toISOString(),
        },
      });

      return {
        ok: true,
        key,
        url: `/api/multimedia/${key}`,
        documentoTipo: input.documentoTipo,
      };
    } catch (error) {
      if (error instanceof ActionError) throw error;

      throw new ActionError({
        code: 'BAD_REQUEST',
        message: 'No fue posible procesar y almacenar la imagen en R2.',
      });
    }
  },
});

/**
 * Astro Action para finalizar el proceso de verificación y consolidar el registro KYC en D1.
 */
export const finalizarVerificacionAction = defineAction({
  input: z.object({
    tipoDocumento: z.enum(['CC', 'CE', 'PASAPORTE', 'NIT'], {
      error: 'Tipo de documento no válido',
    }),
    numeroDocumento: z
      .string()
      .trim()
      .min(3, { error: 'El número de documento es obligatorio' }),
    documentoFrenteKey: z
      .string()
      .min(1, { error: 'La fotografía frontal del documento es obligatoria' }),
    documentoDorsoKey: z.string().optional().nullable(),
    licenciaNumero: z
      .string()
      .trim()
      .min(3, { error: 'El número de licencia es obligatorio' }),
    licenciaCategoria: z.string().default('B1'),
    licenciaVencimiento: z
      .string()
      .trim()
      .min(4, { error: 'La fecha de vencimiento de la licencia es obligatoria' }),
    licenciaFrenteKey: z
      .string()
      .min(1, { error: 'La fotografía frontal de la licencia es obligatoria' }),
    licenciaDorsoKey: z.string().optional().nullable(),
  }),
  handler: async (input, context) => {
    const usuario = requireAuth(context);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const ahora = new Date();

    try {
      // 1. Verificar si ya existe una verificación previa del usuario
      const existente = await db
        .select()
        .from(verificacionesIdentidad)
        .where(eq(verificacionesIdentidad.usuarioId, usuario.id))
        .orderBy(desc(verificacionesIdentidad.creadoEn))
        .limit(1);

      let verificacionId: string;

      if (existente.length > 0 && existente[0]) {
        verificacionId = existente[0].id;
        // Actualizar registro existente a estado 'EN_REVISION'
        await db
          .update(verificacionesIdentidad)
          .set({
            tipoDocumento: input.tipoDocumento,
            numeroDocumento: input.numeroDocumento,
            documentoFrenteKey: input.documentoFrenteKey,
            documentoDorsoKey: input.documentoDorsoKey ?? null,
            licenciaNumero: input.licenciaNumero,
            licenciaCategoria: input.licenciaCategoria,
            licenciaVencimiento: input.licenciaVencimiento,
            licenciaFrenteKey: input.licenciaFrenteKey,
            licenciaDorsoKey: input.licenciaDorsoKey ?? null,
            estado: 'EN_REVISION',
            motivoRechazo: null,
            actualizadoEn: ahora,
          })
          .where(eq(verificacionesIdentidad.id, verificacionId));
      } else {
        verificacionId = crypto.randomUUID();
        // Insertar nuevo registro KYC
        await db.insert(verificacionesIdentidad).values({
          id: verificacionId,
          usuarioId: usuario.id,
          tipoDocumento: input.tipoDocumento,
          numeroDocumento: input.numeroDocumento,
          documentoFrenteKey: input.documentoFrenteKey,
          documentoDorsoKey: input.documentoDorsoKey ?? null,
          licenciaNumero: input.licenciaNumero,
          licenciaCategoria: input.licenciaCategoria,
          licenciaVencimiento: input.licenciaVencimiento,
          licenciaFrenteKey: input.licenciaFrenteKey,
          licenciaDorsoKey: input.licenciaDorsoKey ?? null,
          estado: 'EN_REVISION',
          creadoEn: ahora,
          actualizadoEn: ahora,
        });
      }

      // 2. Sincronizar documento en la tabla user para coherencia de perfil
      await db
        .update(user)
        .set({
          tipoDocumento: input.tipoDocumento,
          numeroDocumento: input.numeroDocumento,
          updatedAt: ahora,
        })
        .where(eq(user.id, usuario.id));

      return {
        ok: true,
        id: verificacionId,
        estado: 'EN_REVISION',
        mensaje: 'Tus documentos han sido cargados a Cloudflare R2 y se encuentran en revisión pericial.',
      };
    } catch (error) {
      if (error instanceof ActionError) throw error;

      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'No fue posible registrar la verificación de identidad. Intenta de nuevo.',
      });
    }
  },
});

/**
 * Astro Action para consultar el estado actual de verificación del usuario.
 */
export const obtenerEstadoVerificacionAction = defineAction({
  handler: async (_input, context) => {
    const usuario = requireAuth(context);

    if (!env.DB) {
      return { ok: false, estado: 'PENDIENTE', verificacion: null };
    }

    const db = getDb(env.DB);

    const registros = await db
      .select()
      .from(verificacionesIdentidad)
      .where(eq(verificacionesIdentidad.usuarioId, usuario.id))
      .orderBy(desc(verificacionesIdentidad.creadoEn))
      .limit(1);

    if (registros.length === 0 || !registros[0]) {
      return {
        ok: true,
        estado: 'PENDIENTE',
        verificacion: null,
      };
    }

    const reg = registros[0];

    return {
      ok: true,
      estado: reg.estado,
      verificacion: {
        id: reg.id,
        tipoDocumento: reg.tipoDocumento,
        numeroDocumento: reg.numeroDocumento,
        documentoFrenteKey: reg.documentoFrenteKey,
        documentoDorsoKey: reg.documentoDorsoKey,
        licenciaNumero: reg.licenciaNumero,
        licenciaCategoria: reg.licenciaCategoria,
        licenciaVencimiento: reg.licenciaVencimiento,
        licenciaFrenteKey: reg.licenciaFrenteKey,
        licenciaDorsoKey: reg.licenciaDorsoKey,
        estado: reg.estado,
        motivoRechazo: reg.motivoRechazo,
        creadoEn: reg.creadoEn,
      },
    };
  },
});
