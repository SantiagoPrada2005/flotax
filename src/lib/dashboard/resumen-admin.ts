import { and, eq } from 'drizzle-orm';
import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import {
  sesionesCaja,
  movimientosCaja,
  type SesionCajaSelect,
  type MovimientoCajaSelect,
  type EstadoSesionCaja,
} from '@/db/schema';
import type { VehiculoItem } from '@/lib/flota/types';
import { esIngresoOperativo, formatearMonedaCOP } from '@/lib/caja/calculos';
import { toClientISODate, DEFAULT_TIMEZONE } from '@/lib/time/client-time';

export interface MetricasFlotaAdmin {
  totalUnits: number;
  disponiblesCount: number;
  activasCount: number;
  mantenimientoCount: number;
  fueraServicioCount: number;
  occupancyPercentage: number;
}

export interface ResumenCajaTurnoAdmin {
  shiftStatus: EstadoSesionCaja;
  totalValorDia: number;
  revenueFormatted: string;
}

/**
 * Calcula las métricas de estado de la flota para el panel de administración
 * en un solo recorrido.
 */
export function calcularMetricasFlotaAdmin(
  vehiculos: readonly Pick<VehiculoItem, 'estado'>[]
): MetricasFlotaAdmin {
  let disponiblesCount = 0;
  let activasCount = 0;
  let mantenimientoCount = 0;
  let fueraServicioCount = 0;

  for (const v of vehiculos) {
    switch (v.estado) {
      case 'DISPONIBLE':
        disponiblesCount++;
        break;
      case 'RESERVADO':
        activasCount++;
        break;
      case 'MANTENIMIENTO':
        mantenimientoCount++;
        break;
      case 'FUERA_SERVICIO':
        fueraServicioCount++;
        break;
    }
  }

  const totalUnits = vehiculos.length;
  const occupancyPercentage =
    totalUnits > 0 ? Math.round((activasCount / totalUnits) * 100) : 0;

  return {
    totalUnits,
    disponiblesCount,
    activasCount,
    mantenimientoCount,
    fueraServicioCount,
    occupancyPercentage,
  };
}

/**
 * Calcula el resumen de caja del día para el panel de administración:
 * estado del turno (ABIERTA si existe al menos una sesión abierta) y total de
 * ingresos operativos confirmados registrados hoy.
 */
export function calcularResumenCajaTurnoHoy(params: {
  sesiones: readonly Pick<SesionCajaSelect, 'estado'>[];
  movimientos: readonly MovimientoCajaSelect[];
  hoyISO: string;
  timezone?: string;
}): ResumenCajaTurnoAdmin {
  const shiftStatus: EstadoSesionCaja = params.sesiones.some(
    (s) => s.estado === 'ABIERTA'
  )
    ? 'ABIERTA'
    : 'CERRADA';

  const tz = params.timezone ?? DEFAULT_TIMEZONE;
  let totalValorDia = 0;

  for (const mov of params.movimientos) {
    if (mov.estado !== 'CONFIRMADO' || !esIngresoOperativo(mov)) {
      continue;
    }

    const fechaMov =
      mov.fechaMovimiento instanceof Date
        ? mov.fechaMovimiento
        : new Date(mov.fechaMovimiento);

    if (toClientISODate(fechaMov, tz) === params.hoyISO) {
      totalValorDia += mov.monto;
    }
  }

  return {
    shiftStatus,
    totalValorDia,
    revenueFormatted: formatearMonedaCOP(totalValorDia),
  };
}

/**
 * Consulta D1 para obtener las sesiones activas y los movimientos de ingreso
 * confirmados del local, calculando el resumen del turno para la fecha solicitada.
 */
export async function obtenerResumenCajaTurnoD1(
  db: AppDb | undefined,
  localId: string,
  hoyISO: string,
  timezone: string = DEFAULT_TIMEZONE
): Promise<ResumenCajaTurnoAdmin> {
  const fallback: ResumenCajaTurnoAdmin = {
    shiftStatus: 'CERRADA',
    totalValorDia: 0,
    revenueFormatted: formatearMonedaCOP(0),
  };

  if (!db || !localId) {
    return fallback;
  }

  try {
    const [sesiones, movimientos] = await Promise.all([
      db
        .select({ estado: sesionesCaja.estado })
        .from(sesionesCaja)
        .where(
          and(
            eq(sesionesCaja.localId, localId),
            eq(sesionesCaja.estado, 'ABIERTA')
          )
        )
        .all(),
      db
        .select()
        .from(movimientosCaja)
        .where(
          and(
            eq(movimientosCaja.localId, localId),
            eq(movimientosCaja.tipo, 'INGRESO'),
            eq(movimientosCaja.estado, 'CONFIRMADO')
          )
        )
        .all(),
    ]);

    return calcularResumenCajaTurnoHoy({
      sesiones,
      movimientos,
      hoyISO,
      timezone,
    });
  } catch (error) {
    logFalloD1('dashboard.resumenCajaTurno.select', error, { localId });
    return fallback;
  }
}
