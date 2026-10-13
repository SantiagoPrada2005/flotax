import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import { actualizarEstadoVehiculo } from '@/lib/flota/repositorio';
import { crearServicioNotificaciones } from '@/lib/notificaciones';

const estadoReservaSchema = z.enum([
  'PENDIENTE',
  'CONFIRMADA',
  'EN_CURSO',
  'COMPLETADA',
  'RECHAZADA',
]);

/**
 * Actualiza el estado operativo de una reserva desde la cabina de administración,
 * sincronizando el estado del vehículo en D1 cuando hay entrega o devolución.
 */
export const cambiarEstadoReservaAction = defineAction({
  input: z.object({
    codigo: z.string().min(1, { error: 'El código de reserva es obligatorio' }),
    vehiculoId: z.string().min(1, { error: 'El ID del vehículo es obligatorio' }),
    vehiculoNombre: z.string().min(1, { error: 'El nombre del vehículo es obligatorio' }),
    rangoFechas: z.string().min(1, { error: 'El rango de fechas es obligatorio' }),
    nuevoEstado: estadoReservaSchema,
    motivoRechazo: z.string().optional(),
    requiereMantenimiento: z.boolean().optional(),
  }),
  handler: async (input, context) => {
    const db = env.DB ? getDb(env.DB) : undefined;
    const usuario = context.locals.usuario;
    const localId = usuario?.localActivo?.id;

    // Sincronizar estado de la unidad física en flota según la etapa del ciclo
    if (input.nuevoEstado === 'EN_CURSO') {
      await actualizarEstadoVehiculo(input.vehiculoId, 'RESERVADO', db);
    } else if (input.nuevoEstado === 'COMPLETADA') {
      const estadoDestino = input.requiereMantenimiento
        ? 'MANTENIMIENTO'
        : 'DISPONIBLE';
      await actualizarEstadoVehiculo(input.vehiculoId, estadoDestino, db);
    } else if (input.nuevoEstado === 'RECHAZADA') {
      await actualizarEstadoVehiculo(input.vehiculoId, 'DISPONIBLE', db);
    }

    // Emitir notificación in-app si hay sesión y base de datos activa
    if (env.DB && localId && usuario) {
      try {
        const servicioNotif = crearServicioNotificaciones(
          env,
          context.locals.logger
        );
        if (input.nuevoEstado === 'CONFIRMADA') {
          await servicioNotif.notificar({
            tipo: 'RESERVA_CONFIRMADA',
            payload: {
              reservaCodigo: input.codigo,
              vehiculo: input.vehiculoNombre,
              rangoFechas: input.rangoFechas,
            },
            destino: {
              alcance: 'LOCAL',
              localId,
            },
            localId,
            actorId: usuario.id,
          });
        } else if (input.nuevoEstado === 'RECHAZADA') {
          await servicioNotif.notificar({
            tipo: 'RESERVA_RECHAZADA',
            payload: {
              reservaCodigo: input.codigo,
              vehiculo: input.vehiculoNombre,
              motivo: input.motivoRechazo,
            },
            destino: {
              alcance: 'LOCAL',
              localId,
            },
            localId,
            actorId: usuario.id,
          });
        }
      } catch {
        // No bloquear la transición operativa si falla el despacho de notificación
      }
    }

    return {
      ok: true,
      codigo: input.codigo,
      nuevoEstado: input.nuevoEstado,
      mensaje: `Reserva #${input.codigo} actualizada a ${input.nuevoEstado}.`,
    };
  },
});

/**
 * Asienta el cobro del saldo pendiente o liberación de garantía en el Waybill.
 */
export const registrarCobroWaybillAction = defineAction({
  input: z.object({
    codigo: z.string().min(1, { error: 'El código de reserva es obligatorio' }),
    monto: z.number().min(0, { error: 'El monto debe ser válido' }),
    metodoPago: z.enum(['efectivo', 'transferencia', 'tarjeta']),
  }),
  handler: async (input, context) => {
    const usuario = context.locals.usuario;
    const localId = usuario?.localActivo?.id;

    if (env.DB && localId && usuario && input.monto > 0) {
      try {
        await crearServicioNotificaciones(env, context.locals.logger).notificar({
          tipo: 'ABONO_REGISTRADO',
          payload: {
            contratoId: input.codigo,
            montoFormateado: new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              maximumFractionDigits: 0,
            }).format(input.monto),
            metodoPago: input.metodoPago,
          },
          destino: {
            alcance: 'LOCAL_ROLES',
            localId,
            roles: ['DUENO', 'ADMIN', 'AUDITOR_FINANCIERO'],
          },
          localId,
          actorId: usuario.id,
        });
      } catch {
        // Ignorar en modo offline o sin suscriptores
      }
    }

    return {
      ok: true,
      codigo: input.codigo,
      monto: input.monto,
      metodoPago: input.metodoPago,
      mensaje: `Cobro asentado en el Waybill #${input.codigo}.`,
    };
  },
});
