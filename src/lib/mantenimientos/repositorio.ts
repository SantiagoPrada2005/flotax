import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import { toClientISODate } from '@/lib/time/client-time';
import {
  mantenimientosVehiculo,
  reservas,
  vehiculos,
  type MantenimientoVehiculoSelect,
  type MantenimientoVehiculoInsert,
  type EstadoMantenimientoVehiculo,
  type EstadoVehiculo,
} from '@/db/schema';
import { and, desc, eq, gte, inArray, lt, lte, or } from 'drizzle-orm';
import type {
  ActualizarEstadoMantenimientoParams,
  AdvertenciaReservaSolapada,
  CrearMantenimientoParams,
  ResultadoActualizarEstadoMantenimiento,
  ResultadoCrearMantenimiento,
} from './types';

/**
 * Lista el historial técnico y órdenes de mantenimiento de un vehículo en D1,
 * ordenadas cronológicamente descendente por fecha de inicio.
 */
export async function listarMantenimientosPorVehiculo(
  db?: AppDb,
  vehiculoId?: string
): Promise<MantenimientoVehiculoSelect[]> {
  if (!db || !vehiculoId) return [];

  try {
    const ordenes = await db
      .select()
      .from(mantenimientosVehiculo)
      .where(eq(mantenimientosVehiculo.vehiculoId, vehiculoId))
      .orderBy(desc(mantenimientosVehiculo.fechaInicio));

    return ordenes;
  } catch (error) {
    logFalloD1('mantenimientos.listar', error, { vehiculoId });
    return [];
  }
}

/**
 * Detecta reservas activas que entran en conflicto o se solapan con la ventana temporal
 * solicitada para la intervención de taller.
 */
export async function detectarReservasSolapadas(
  db?: AppDb,
  vehiculoId?: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<AdvertenciaReservaSolapada[]> {
  if (!db || !vehiculoId || !fechaInicio || !fechaFin) return [];

  try {
    const reservasConflicto = await db
      .select({
        id: reservas.id,
        codigo: reservas.codigo,
        contactoNombre: reservas.contactoNombre,
        fechaInicio: reservas.fechaInicio,
        fechaFin: reservas.fechaFin,
      })
      .from(reservas)
      .where(
        and(
          eq(reservas.vehiculoId, vehiculoId),
          inArray(reservas.estado, ['PENDIENTE', 'CONFIRMADA', 'EN_CURSO']),
          lte(reservas.fechaInicio, fechaFin),
          gte(reservas.fechaFin, fechaInicio)
        )
      )
      .orderBy(reservas.fechaInicio);

    return reservasConflicto.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      clienteNombre: r.contactoNombre,
      fechaInicio: r.fechaInicio,
      fechaFin: r.fechaFin,
    }));
  } catch (error) {
    logFalloD1('mantenimientos.detectarReservasSolapadas', error, {
      vehiculoId,
      fechaInicio,
      fechaFin,
    });
    return [];
  }
}

/**
 * Evalúa y sincroniza el estado físico-operativo real de una unidad en patio (D1):
 * 1. Si está marcado administrativamente como 'FUERA_SERVICIO', se preserva sin mutación.
 * 2. Si tiene una orden técnica en taller ('EN_TALLER') o programada vigente hoy, pasa a 'MANTENIMIENTO'.
 * 3. Si tiene una reserva vigente ('EN_CURSO' o 'CONFIRMADA' para hoy), pasa a 'RESERVADO'.
 * 4. En cualquier otro caso, la unidad se declara 'DISPONIBLE'.
 */
export async function resolverEstadoActualVehiculo(
  db?: AppDb,
  vehiculoId?: string,
  hoyISO: string = toClientISODate()
): Promise<EstadoVehiculo> {
  if (!db || !vehiculoId) return 'DISPONIBLE';

  try {
    const [vehiculo] = await db
      .select({
        id: vehiculos.id,
        estado: vehiculos.estado,
      })
      .from(vehiculos)
      .where(eq(vehiculos.id, vehiculoId))
      .limit(1);

    if (!vehiculo) {
      return 'DISPONIBLE';
    }

    if (vehiculo.estado === 'FUERA_SERVICIO') {
      return 'FUERA_SERVICIO';
    }

    // Evaluar si existe orden técnica en taller o programada vigente hoy
    const [mantenimientoActivo] = await db
      .select({ id: mantenimientosVehiculo.id })
      .from(mantenimientosVehiculo)
      .where(
        and(
          eq(mantenimientosVehiculo.vehiculoId, vehiculoId),
          or(
            eq(mantenimientosVehiculo.estado, 'EN_TALLER'),
            and(
              eq(mantenimientosVehiculo.estado, 'PROGRAMADO'),
              lte(mantenimientosVehiculo.fechaInicio, hoyISO),
              gte(mantenimientosVehiculo.fechaFin, hoyISO)
            )
          )
        )
      )
      .limit(1);

    let nuevoEstado: EstadoVehiculo = 'DISPONIBLE';

    if (mantenimientoActivo) {
      nuevoEstado = 'MANTENIMIENTO';
    } else {
      // Evaluar si existe una reserva en pausa vigente hoy (NO_DISPONIBLE)
      const [reservaPausada] = await db
        .select({ id: reservas.id })
        .from(reservas)
        .where(
          and(
            eq(reservas.vehiculoId, vehiculoId),
            eq(reservas.estado, 'PAUSADA'),
            lte(reservas.fechaInicio, hoyISO),
            gte(reservas.fechaFin, hoyISO)
          )
        )
        .limit(1);

      if (reservaPausada) {
        nuevoEstado = 'NO_DISPONIBLE';
      } else {
        // Evaluar reservas vigentes para hoy (incluyendo PENDIENTE radicadas por clientes)
        const [reservaActiva] = await db
          .select({ id: reservas.id })
          .from(reservas)
          .where(
            and(
              eq(reservas.vehiculoId, vehiculoId),
              or(
                eq(reservas.estado, 'EN_CURSO'),
                and(
                  inArray(reservas.estado, ['CONFIRMADA', 'PENDIENTE']),
                  lte(reservas.fechaInicio, hoyISO),
                  gte(reservas.fechaFin, hoyISO)
                )
              )
            )
          )
          .limit(1);

        if (reservaActiva) {
          nuevoEstado = 'RESERVADO';
        } else {
          nuevoEstado = 'DISPONIBLE';
        }
      }
    }

    if (vehiculo.estado !== nuevoEstado) {
      await db
        .update(vehiculos)
        .set({
          estado: nuevoEstado,
          actualizadoEn: new Date(),
        })
        .where(eq(vehiculos.id, vehiculoId));
    }

    return nuevoEstado;
  } catch (error) {
    logFalloD1('mantenimientos.resolverEstadoActualVehiculo', error, {
      vehiculoId,
      hoyISO,
    });
    return 'DISPONIBLE';
  }
}

/**
 * Registra una nueva orden de mantenimiento o bloqueo técnico en D1.
 * Si las fechas abarcan el día de hoy, transiciona de inmediato el estado del vehículo a 'MANTENIMIENTO'.
 * Detecta y adjunta advertencias de reservas solapadas para alertas UX.
 */
export async function crearOrdenMantenimiento(
  db: AppDb,
  params: CrearMantenimientoParams
): Promise<ResultadoCrearMantenimiento> {
  try {
    const advertenciasReservas = await detectarReservasSolapadas(
      db,
      params.vehiculoId,
      params.fechaInicio,
      params.fechaFin
    );

    const hoyISO = toClientISODate();
    const enVentanaHoy = params.fechaInicio <= hoyISO && hoyISO <= params.fechaFin;
    const estadoInicial: EstadoMantenimientoVehiculo =
      params.estado ?? (enVentanaHoy ? 'EN_TALLER' : 'PROGRAMADO');

    const id = `mant-${crypto.randomUUID().slice(0, 10)}`;
    const ahora = new Date();

    const nuevaOrden: MantenimientoVehiculoInsert = {
      id,
      localId: params.localId,
      vehiculoId: params.vehiculoId,
      tipo: params.tipo,
      estado: estadoInicial,
      etiqueta: params.etiqueta.trim(),
      descripcion: params.descripcion?.trim() || null,
      tallerProveedor: params.tallerProveedor?.trim() || null,
      fechaInicio: params.fechaInicio,
      fechaFin: params.fechaFin,
      kilometrajeRegistro: params.kilometrajeRegistro ?? null,
      costoTotal: params.costoTotal ?? 0,
      creadoPorId: params.creadoPorId,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    await db.insert(mantenimientosVehiculo).values(nuevaOrden);

    if (params.kilometrajeRegistro !== undefined && params.kilometrajeRegistro > 0) {
      await db
        .update(vehiculos)
        .set({
          kilometraje: params.kilometrajeRegistro,
          actualizadoEn: ahora,
        })
        .where(
          and(
            eq(vehiculos.id, params.vehiculoId),
            lt(vehiculos.kilometraje, params.kilometrajeRegistro)
          )
        );
    }

    // Sincronizar estado operativo del vehículo con respecto a la orden activa
    await resolverEstadoActualVehiculo(db, params.vehiculoId, hoyISO);

    const [ordenCreada] = await db
      .select()
      .from(mantenimientosVehiculo)
      .where(eq(mantenimientosVehiculo.id, id))
      .limit(1);

    if (!ordenCreada) {
      throw new Error(`Fallo al recuperar la orden #${id} tras su inserción en D1.`);
    }

    return {
      orden: ordenCreada,
      advertenciasReservas,
    };
  } catch (error) {
    logFalloD1('mantenimientos.crear', error, {
      vehiculoId: params.vehiculoId,
      localId: params.localId,
      tipo: params.tipo,
    });
    throw error;
  }
}

/**
 * Actualiza el estado técnico de una orden (ej. COMPLETADO, CANCELADO, EN_TALLER).
 * Actualiza kilometraje y costos finales si se proporcionan, y conmuta automáticamente
 * el estado operativo del vehículo en D1 invocando `resolverEstadoActualVehiculo`.
 * Aplica aislamiento estricto multi-tenant por localId.
 */
export async function actualizarEstadoOrdenMantenimiento(
  db: AppDb,
  params: ActualizarEstadoMantenimientoParams
): Promise<ResultadoActualizarEstadoMantenimiento> {
  try {
    const [ordenExistente] = await db
      .select()
      .from(mantenimientosVehiculo)
      .where(
        and(
          eq(mantenimientosVehiculo.id, params.id),
          eq(mantenimientosVehiculo.localId, params.localId)
        )
      )
      .limit(1);

    if (!ordenExistente) {
      throw new Error(
        `Orden de mantenimiento #${params.id} no encontrada en D1 para el local activo.`
      );
    }

    const ahora = new Date();
    const updatePayload: Partial<MantenimientoVehiculoInsert> = {
      estado: params.nuevoEstado,
      actualizadoEn: ahora,
    };

    if (params.kilometrajeFinal !== undefined) {
      updatePayload.kilometrajeRegistro = params.kilometrajeFinal;
    }

    if (params.costoFinal !== undefined) {
      updatePayload.costoTotal = params.costoFinal;
    }

    await db
      .update(mantenimientosVehiculo)
      .set(updatePayload)
      .where(
        and(
          eq(mantenimientosVehiculo.id, params.id),
          eq(mantenimientosVehiculo.localId, params.localId)
        )
      );

    // Actualizar odómetro del vehículo si el valor final es superior
    if (params.kilometrajeFinal !== undefined && params.kilometrajeFinal > 0) {
      await db
        .update(vehiculos)
        .set({
          kilometraje: params.kilometrajeFinal,
          actualizadoEn: ahora,
        })
        .where(
          and(
            eq(vehiculos.id, ordenExistente.vehiculoId),
            lt(vehiculos.kilometraje, params.kilometrajeFinal)
          )
        );
    }

    const hoyISO = params.hoyISO || toClientISODate();
    const nuevoEstadoVehiculo = await resolverEstadoActualVehiculo(
      db,
      ordenExistente.vehiculoId,
      hoyISO
    );

    const [ordenActualizada] = await db
      .select()
      .from(mantenimientosVehiculo)
      .where(
        and(
          eq(mantenimientosVehiculo.id, params.id),
          eq(mantenimientosVehiculo.localId, params.localId)
        )
      )
      .limit(1);

    if (!ordenActualizada) {
      throw new Error(
        `Fallo al recuperar la orden #${params.id} tras actualizar su estado en D1.`
      );
    }

    return {
      orden: ordenActualizada,
      nuevoEstadoVehiculo,
    };
  } catch (error) {
    logFalloD1('mantenimientos.actualizarEstado', error, {
      id: params.id,
      localId: params.localId,
      nuevoEstado: params.nuevoEstado,
    });
    throw error;
  }
}
