import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import {
  reservas,
  contratosAlquiler,
  movimientosCaja,
  type ReservaSelect,
  type ContratoAlquilerSelect,
  type MovimientoCajaSelect,
} from '@/db/schema';
import { and, desc, eq, gte, ne } from 'drizzle-orm';
import { DEFAULT_TIMEZONE, toClientISODate } from '@/lib/time/client-time';

export interface DatosMetricasLocalD1 {
  readonly reservas: readonly ReservaSelect[];
  readonly contratosVigentes: readonly ContratoAlquilerSelect[];
  readonly movimientosConfirmados: readonly MovimientoCajaSelect[];
}

/**
 * Calcula la fecha de corte de hace 6 meses (el primer día del mes hace 5 meses)
 * tanto en formato ISO 'YYYY-MM-DD' como objeto Date en UTC.
 */
function calcularVentanaSeisMeses(
  hoyISO: string,
  timezone: string = DEFAULT_TIMEZONE
): { haceSeisMesesISO: string; haceSeisMesesDate: Date } {
  const [añoStr, mesStr] = (hoyISO || '').split('-');
  let año = parseInt(añoStr ?? '', 10);
  let mes = parseInt(mesStr ?? '', 10);

  if (!Number.isFinite(año) || !Number.isFinite(mes) || mes < 1 || mes > 12) {
    const fallbackISO = toClientISODate(new Date(), timezone);
    const [fbAño, fbMes] = fallbackISO.split('-');
    año = parseInt(fbAño ?? '', 10);
    mes = parseInt(fbMes ?? '', 10);
  }

  // Primer día del mes hace 5 meses (mes - 1 es 0-indexed, restamos 5).
  // Date.UTC ajusta el año automáticamente cuando el mes resultante es negativo.
  const d = new Date(Date.UTC(año, mes - 1 - 5, 1, 0, 0, 0, 0));
  const anioVentana = d.getUTCFullYear();
  const mesVentana = String(d.getUTCMonth() + 1).padStart(2, '0');
  const haceSeisMesesISO = `${anioVentana}-${mesVentana}-01`;

  return {
    haceSeisMesesISO,
    haceSeisMesesDate: d,
  };
}

/**
 * Consulta en Cloudflare D1 las reservas, contratos vigentes y movimientos de caja
 * confirmados estrictamente aislados por localId para la ventana de métricas de 6 meses.
 */
export async function obtenerDatosMetricasLocalD1(
  db: AppDb | undefined,
  localId: string,
  hoyISO: string,
  timezone?: string
): Promise<DatosMetricasLocalD1> {
  if (!db || !localId) {
    return {
      reservas: [],
      contratosVigentes: [],
      movimientosConfirmados: [],
    };
  }

  try {
    const { haceSeisMesesISO, haceSeisMesesDate } = calcularVentanaSeisMeses(
      hoyISO,
      timezone
    );

    const [filasReservas, filasContratos, filasMovimientos] = await Promise.all([
      db
        .select()
        .from(reservas)
        .where(
          and(
            eq(reservas.localId, localId),
            gte(reservas.fechaFin, haceSeisMesesISO),
            ne(reservas.estado, 'CANCELADA'),
            ne(reservas.estado, 'RECHAZADA')
          )
        ),
      db
        .select()
        .from(contratosAlquiler)
        .where(
          and(
            eq(contratosAlquiler.localId, localId),
            eq(contratosAlquiler.estadoContrato, 'VIGENTE')
          )
        ),
      db
        .select()
        .from(movimientosCaja)
        .where(
          and(
            eq(movimientosCaja.localId, localId),
            eq(movimientosCaja.estado, 'CONFIRMADO'),
            gte(movimientosCaja.fechaMovimiento, haceSeisMesesDate)
          )
        )
        .orderBy(desc(movimientosCaja.fechaMovimiento)),
    ]);

    return {
      reservas: filasReservas,
      contratosVigentes: filasContratos,
      movimientosConfirmados: filasMovimientos,
    };
  } catch (error) {
    logFalloD1('metricas.datosLocal.select', error, { localId });
    return {
      reservas: [],
      contratosVigentes: [],
      movimientosConfirmados: [],
    };
  }
}
