import { defineAction, ActionError } from 'astro:actions';
import { marcarRevisionNavegacion } from '@/lib/pwa/revision';
import { z } from 'zod';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import {
  crearReservaD1,
  cambiarEstadoReservaD1,
  registrarEntregaEvaluacionD1,
  registrarCobroWaybillD1,
} from '@/lib/flota/repositorio-reservas';
import {
  estadosReserva,
  modalidadesEntregaReserva,
  modalidadesPagoInicial,
  metodosAbonoInicial,
  categoriasLicenciaConduccion,
  tiposDocumentoIdentidad,
  nivelesCalificacionServicio,
  nivelesDesempenoVehiculo,
  reservas,
  mantenimientosVehiculo,
} from '@/db/schema';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { crearServicioNotificaciones } from '@/lib/notificaciones';
import { requireAuth, requireLocalAuth, PERMISOS } from '@/lib/auth';

/**
 * Radica una nueva solicitud de reserva comercial de vehículo desde el wizard de alquiler
 * o desde la cabina de atención en patio.
 */
export const crearReservaAction = defineAction({
  input: z.object({
    vehiculoId: z.string().min(1, { error: 'El vehículo es obligatorio' }),
    fechaInicio: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Fecha de inicio no válida (YYYY-MM-DD)' }),
    fechaFin: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Fecha de fin no válida (YYYY-MM-DD)' }),
    diasAlquiler: z.number().int().positive({ error: 'Días de alquiler deben ser mayores a 0' }),
    precioDiaCotizado: z.number().positive(),
    subtotalTarifaCotizado: z.number().positive(),
    coberturaPericialCotizada: z.number().nonnegative(),
    totalCotizado: z.number().positive(),
    modalidadEntrega: z.enum(modalidadesEntregaReserva),
    direccionEntrega: z.string().optional(),
    sedeNombre: z.string().min(1, { error: 'La sede es obligatoria' }),
    localId: z.string().optional(),
    modalidadPagoInicial: z.enum(modalidadesPagoInicial),
    metodoAbonoInicial: z.enum(metodosAbonoInicial),
    montoAbonoReportado: z.number().nonnegative(),
    referenciaAbonoInicial: z.string().optional(),
    contactoNombre: z.string().min(3, { error: 'El nombre completo es obligatorio' }),
    contactoTipoDocumento: z.enum(tiposDocumentoIdentidad),
    contactoNumeroDocumento: z.string().min(4, { error: 'El número de identificación es obligatorio' }),
    contactoCategoriaLicencia: z.enum(categoriasLicenciaConduccion),
    contactoTelefono: z.string().min(7, { error: 'El número de teléfono debe ser válido' }),
    contactoCorreo: z.email({ error: 'Correo electrónico de contacto no válido' }),
    ley1581Aceptada: z.boolean().refine((val) => val === true, {
      error: 'Debes autorizar el tratamiento de datos personales (Ley 1581)',
    }),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const usuario = context.locals.usuario;
    const localId =
      input.localId ||
      context.locals.localCaptacion?.id ||
      usuario?.localActivo?.id ||
      'local-patio-norte';

    // 1. Validar solapamiento con reservas activas (CONFIRMADA, PENDIENTE, EN_CURSO)
    const reservaSolapada = await db
      .select({ id: reservas.id, codigo: reservas.codigo })
      .from(reservas)
      .where(
        and(
          eq(reservas.vehiculoId, input.vehiculoId),
          inArray(reservas.estado, ['CONFIRMADA', 'PENDIENTE', 'EN_CURSO']),
          lte(reservas.fechaInicio, input.fechaFin),
          gte(reservas.fechaFin, input.fechaInicio)
        )
      )
      .limit(1);

    if (reservaSolapada.length > 0) {
      throw new ActionError({
        code: 'CONFLICT',
        message: 'El vehículo ya no se encuentra disponible en las fechas seleccionadas.',
      });
    }

    // 2. Validar solapamiento con mantenimientos programados o en taller
    const mantenimientoSolapado = await db
      .select({ id: mantenimientosVehiculo.id })
      .from(mantenimientosVehiculo)
      .where(
        and(
          eq(mantenimientosVehiculo.vehiculoId, input.vehiculoId),
          inArray(mantenimientosVehiculo.estado, ['PROGRAMADO', 'EN_TALLER']),
          lte(mantenimientosVehiculo.fechaInicio, input.fechaFin),
          gte(mantenimientosVehiculo.fechaFin, input.fechaInicio)
        )
      )
      .limit(1);

    if (mantenimientoSolapado.length > 0) {
      throw new ActionError({
        code: 'CONFLICT',
        message: 'El vehículo tiene programado un alistamiento o mantenimiento en las fechas seleccionadas.',
      });
    }

    const reserva = await crearReservaD1(db, input, localId, usuario?.id);

    // Disparar notificación in-app para el equipo operativo de patio
    try {
      await crearServicioNotificaciones(env, context.locals.logger).notificar({
        tipo: 'SOLICITUD_NUEVA',
        payload: {
          reservaId: reserva.codigo,
          clienteNombre: reserva.conductor.nombreCompleto,
          vehiculo: `${reserva.vehiculo.marca} ${reserva.vehiculo.modelo}`,
        },
        destino: {
          alcance: 'LOCAL_ROLES',
          localId,
          roles: ['DUENO', 'ADMIN', 'ASESOR'],
        },
        localId,
        actorId: usuario?.id,
      });
    } catch {
      // No interrumpir la respuesta si falla el broker de notificaciones
    }

    return {
      ok: true,
      codigo: reserva.codigo,
      rutaDestino: `/reservas/${reserva.codigo}`,
      reserva,
    };
  },
});

/**
 * Actualiza el estado operativo de una reserva desde la cabina de administración,
 * sincronizando el estado de la reserva y del vehículo en D1.
 */
export const cambiarEstadoReservaAction = defineAction({
  input: z.object({
    codigo: z.string().min(1, { error: 'El código de reserva es obligatorio' }),
    vehiculoId: z.string().min(1, { error: 'El ID del vehículo es obligatorio' }),
    vehiculoNombre: z.string().min(1, { error: 'El nombre del vehículo es obligatorio' }),
    rangoFechas: z.string().min(1, { error: 'El rango de fechas es obligatorio' }),
    nuevoEstado: z.enum(estadosReserva),
    motivoRechazo: z.string().optional(),
    requiereMantenimiento: z.boolean().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireAuth(context);
    const localId = usuario.localActivo?.id;

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const ok = await cambiarEstadoReservaD1(db, input.codigo, input.nuevoEstado, {
      motivoRechazo: input.motivoRechazo,
      confirmadoPorId: usuario.id,
      requiereMantenimiento: input.requiereMantenimiento,
    });

    if (!ok) {
      throw new ActionError({
        code: 'NOT_FOUND',
        message: `No se encontró la reserva #${input.codigo} para actualizar`,
      });
    }

    // Emitir notificación in-app si hay local activo
    if (localId) {
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
        // Tolerante en entornos sin notificaciones configuradas
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
 * Asienta el cobro del saldo pendiente o liberación de garantía en el Waybill y caja operativa.
 */
export const registrarCobroWaybillAction = defineAction({
  input: z.object({
    codigo: z.string().min(1, { error: 'El código de reserva es obligatorio' }),
    monto: z.number().min(0, { error: 'El monto debe ser válido' }),
    metodoPago: z.enum(['efectivo', 'transferencia', 'tarjeta']),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.CAJA_ABONOS_REGISTRAR);
    const localId = usuario.localActivo.id;

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const ok = await registrarCobroWaybillD1(db, {
      codigo: input.codigo,
      monto: input.monto,
      metodoPago: input.metodoPago,
      usuarioId: usuario.id,
    });

    if (!ok) {
      throw new ActionError({
        code: 'BAD_REQUEST',
        message: `No fue posible asentar el cobro de la reserva #${input.codigo}. Verifica la cuenta operativa.`,
      });
    }

    if (input.monto > 0) {
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
        // Ignorar si falla notificación
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

/**
 * Registra la entrega/devolución del vehículo desde el Wizard del cliente
 * persistiendo el checklist y la evaluación en Cloudflare D1.
 */
export const registrarEntregaEvaluacionAction = defineAction({
  input: z.object({
    codigo: z.string().min(1, { error: 'El código de reserva es obligatorio' }),
    vehiculoId: z.string().min(1, { error: 'El ID del vehículo es obligatorio' }),
    vehiculoNombre: z.string().min(1, { error: 'El nombre del vehículo es obligatorio' }),
    calificacionGeneral: z.enum(nivelesCalificacionServicio),
    puntajeNumerico: z.number().int().min(2).max(5),
    aspectosDestacados: z.array(z.string()),
    desempenoVehiculo: z.enum(nivelesDesempenoVehiculo),
    comentarioOpcional: z.string().optional(),
    cabinaSinObjetos: z.boolean(),
    telemetriaVerificada: z.boolean(),
    llavesEntregadas: z.boolean(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = context.locals.usuario;

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const ok = await registrarEntregaEvaluacionD1(db, {
      codigo: input.codigo,
      vehiculoId: input.vehiculoId,
      calificacionGeneral: input.calificacionGeneral,
      puntajeNumerico: input.puntajeNumerico as 2 | 3 | 4 | 5,
      aspectosDestacados: input.aspectosDestacados,
      desempenoVehiculo: input.desempenoVehiculo,
      comentarioOpcional: input.comentarioOpcional,
      cabinaSinObjetos: input.cabinaSinObjetos,
      telemetriaVerificada: input.telemetriaVerificada,
      llavesEntregadas: input.llavesEntregadas,
      clienteId: usuario?.id,
    });

    if (!ok) {
      throw new ActionError({
        code: 'BAD_REQUEST',
        message: `No fue posible registrar la evaluación para la reserva #${input.codigo}`,
      });
    }

    const requiereRevision =
      input.calificacionGeneral === 'ATENCION_REQUERIDA' ||
      input.desempenoVehiculo === 'DETALLE_MENOR';

    return {
      ok: true,
      codigo: input.codigo,
      estadoFinal: 'COMPLETADA' as const,
      garantiaLiberada: !requiereRevision,
      mensaje: `Entrega #${input.codigo} completada y evaluación (${input.puntajeNumerico}.0 ★) registrada.`,
    };
  },
});
