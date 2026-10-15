import { defineAction, ActionError } from 'astro:actions';
import { z } from 'zod';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

/**
 * Esquema de validación estricto para actualización de perfil de usuario (Zod 4).
 */
const actualizarPerfilSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { error: 'El nombre debe tener al menos 2 caracteres' })
    .max(100, { error: 'El nombre no puede exceder los 100 caracteres' }),
  telefono: z
    .string()
    .trim()
    .max(25, { error: 'El teléfono no puede exceder los 25 caracteres' })
    .nullable()
    .optional(),
  tipoDocumento: z
    .enum(['CC', 'CE', 'PASAPORTE', 'NIT'], {
      error: 'Tipo de documento no válido',
    })
    .nullable()
    .optional(),
  numeroDocumento: z
    .string()
    .trim()
    .max(30, { error: 'El número de documento no puede exceder los 30 caracteres' })
    .nullable()
    .optional(),
});

/**
 * Astro Action para actualizar la información personal del usuario autenticado en Cloudflare D1.
 */
export const actualizarPerfilAction = defineAction({
  input: actualizarPerfilSchema,
  handler: async (input, context) => {
    // 1. Validar que la petición provenga de un usuario con sesión activa
    const usuario = requireAuth(context);

    // 2. Obtener binding D1 desde cloudflare:workers
    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'El almacenamiento de datos no está disponible en este momento.',
      });
    }

    const db = getDb(env.DB);

    try {
      // 3. Normalizar valores vacíos a null para limpieza de datos
      const telefonoNormalizado = input.telefono?.trim() ? input.telefono.trim() : null;
      const tipoDocNormalizado = input.tipoDocumento ?? null;
      const numDocNormalizado = input.numeroDocumento?.trim() ? input.numeroDocumento.trim() : null;

      // 4. Actualizar registro en la tabla user de D1
      await db
        .update(user)
        .set({
          name: input.nombre,
          telefono: telefonoNormalizado,
          tipoDocumento: tipoDocNormalizado,
          numeroDocumento: numDocNormalizado,
          updatedAt: new Date(),
        })
        .where(eq(user.id, usuario.id));

      return {
        ok: true,
        mensaje: 'Tu información ha sido actualizada correctamente.',
        perfil: {
          id: usuario.id,
          nombre: input.nombre,
          telefono: telefonoNormalizado,
          tipoDocumento: tipoDocNormalizado,
          numeroDocumento: numDocNormalizado,
        },
      };
    } catch (error) {
      if (error instanceof ActionError) throw error;

      throw new ActionError({
        code: 'BAD_REQUEST',
        message: 'No fue posible actualizar tu información personal. Intenta nuevamente.',
      });
    }
  },
});
