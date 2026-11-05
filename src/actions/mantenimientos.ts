import { defineAction, ActionError } from 'astro:actions';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { requireLocalAuth, PERMISOS } from '@/lib/auth';
import { marcarRevisionNavegacion } from '@/lib/pwa/revision';
import {
  crearOrdenMantenimiento,
  actualizarEstadoOrdenMantenimiento,
} from '@/lib/mantenimientos/repositorio';
import {
  tiposMantenimientoVehiculo,
  estadosMantenimientoVehiculo,
} from '@/db/schema';

/**
 * Esquema de validación para el registro de una orden técnica o bloqueo operativo.
 * Cumple estrictamente con la convención de Zod 4 ({ error: '...' }).
 */
const crearMantenimientoSchema = z
  .object({
    vehiculoId: z.string().min(1, { error: 'El ID del vehículo es obligatorio' }),
    tipo: z.enum(tiposMantenimientoVehiculo),
    etiqueta: z.string().min(1, { error: 'El concepto o motivo técnico es obligatorio' }),
    descripcion: z.string().optional(),
    tallerProveedor: z.string().optional(),
    fechaInicio: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Fecha de inicio no válida (YYYY-MM-DD)' }),
    fechaFin: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Fecha de fin no válida (YYYY-MM-DD)' }),
    kilometrajeRegistro: z
      .number()
      .int()
      .min(0, { error: 'El kilometraje debe ser mayor o igual a 0' })
      .optional(),
    costoTotal: z
      .number()
      .min(0, { error: 'El costo estimado debe ser mayor o igual a 0' })
      .optional(),
  })
  .refine((data) => data.fechaFin >= data.fechaInicio, {
    error: 'La fecha de fin no puede ser anterior a la fecha de inicio',
    path: ['fechaFin'],
  });

/**
 * Esquema de validación para la transición de estado técnico de una orden de taller.
 */
const cambiarEstadoMantenimientoSchema = z.object({
  id: z.string().min(1, { error: 'ID de la orden de mantenimiento requerido' }),
  nuevoEstado: z.enum(estadosMantenimientoVehiculo),
  kilometrajeFinal: z
    .number()
    .int()
    .min(0, { error: 'El kilometraje final debe ser mayor o igual a 0' })
    .optional(),
  costoFinal: z
    .number()
    .min(0, { error: 'El costo final liquidado debe ser mayor o igual a 0' })
    .optional(),
});

/**
 * Registra una nueva intervención técnica, alistamiento o bloqueo operativo para un vehículo.
 * Invalida caché de navegación PWA, verifica permisos de rol local y detecta conflictos con reservas.
 */
export const crearMantenimiento = defineAction({
  input: crearMantenimientoSchema,
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);

    const usuario = requireLocalAuth(context, PERMISOS.FLOTA_ACTUALIZAR);
    const localId = usuario.localActivo.id;

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const resultado = await crearOrdenMantenimiento(db, {
        vehiculoId: input.vehiculoId,
        localId,
        creadoPorId: usuario.id,
        tipo: input.tipo,
        etiqueta: input.etiqueta,
        descripcion: input.descripcion,
        tallerProveedor: input.tallerProveedor,
        fechaInicio: input.fechaInicio,
        fechaFin: input.fechaFin,
        kilometrajeRegistro: input.kilometrajeRegistro,
        costoTotal: input.costoTotal,
      });

      return {
        ok: true,
        orden: resultado.orden,
        advertenciasReservas: resultado.advertenciasReservas,
      };
    } catch (error) {
      if (error instanceof ActionError) throw error;
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Error interno al registrar la orden de mantenimiento.',
      });
    }
  },
});

export const crearMantenimientoAction = crearMantenimiento;

/**
 * Actualiza el estado técnico de una orden (p. ej. EN_TALLER -> COMPLETADO).
 * Conmuta automáticamente el estado operativo del vehículo en patio (D1) y actualiza odómetro y costos.
 */
export const cambiarEstadoMantenimiento = defineAction({
  input: cambiarEstadoMantenimientoSchema,
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);

    const usuario = requireLocalAuth(context, PERMISOS.FLOTA_ACTUALIZAR);
    const localId = usuario.localActivo.id;

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const resultado = await actualizarEstadoOrdenMantenimiento(db, {
        id: input.id,
        localId,
        nuevoEstado: input.nuevoEstado,
        kilometrajeFinal: input.kilometrajeFinal,
        costoFinal: input.costoFinal,
      });

      return {
        ok: true,
        orden: resultado.orden,
        nuevoEstadoVehiculo: resultado.nuevoEstadoVehiculo,
      };
    } catch (error) {
      if (error instanceof ActionError) throw error;
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Error al actualizar el estado de la orden de mantenimiento.';
      const code = mensaje.includes('no encontrada')
        ? 'NOT_FOUND'
        : 'INTERNAL_SERVER_ERROR';
      throw new ActionError({
        code,
        message: mensaje,
      });
    }
  },
});

export const cambiarEstadoMantenimientoAction = cambiarEstadoMantenimiento;
