import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import { mantenimientosVehiculo, reservas } from '@/db/schema';
import { and, eq, gte, inArray, lte } from 'drizzle-orm';
import { toClientISODate } from '@/lib/time/client-time';
import type {
  BloqueNoDisponible,
  CotizacionAlquiler,
  DiaCalendarioItem,
  FranjaDisponible,
  VehiculoItem,
} from './types';

const NOMBRES_MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
] as const;

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const;

const DIAS_SEMANA_CORTOS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'] as const;

export const ENCABEZADOS_SEMANA_EDITORIAL = [
  { corto: 'Lun', largo: 'Lunes' },
  { corto: 'Mar', largo: 'Martes' },
  { corto: 'Mié', largo: 'Miércoles' },
  { corto: 'Jue', largo: 'Jueves' },
  { corto: 'Vie', largo: 'Viernes' },
  { corto: 'Sáb', largo: 'Sábado' },
  { corto: 'Dom', largo: 'Domingo' },
] as const;

/**
 * Suma `dias` a una fecha ISO (YYYY-MM-DD) de forma determinista en UTC mediodía.
 */
export function sumarDiasISO(fechaISO: string, dias: number): string {
  const [y = 2026, m = 1, d = 1] = fechaISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

/**
 * Calcula la cantidad de días inclusivos entre dos fechas ISO (ej. 10 Oct a 12 Oct = 3 días).
 */
export function calcularDiasInclusivos(fechaInicio: string, fechaFin: string): number {
  const [y1 = 2026, m1 = 1, d1 = 1] = fechaInicio.split('-').map(Number);
  const [y2 = 2026, m2 = 1, d2 = 1] = fechaFin.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1, 12, 0, 0);
  const t2 = Date.UTC(y2, m2 - 1, d2, 12, 0, 0);
  const diff = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

/**
 * Formatea una fecha ISO (YYYY-MM-DD) a etiqueta humana corta (ej. "10 Oct").
 */
export function formatearFechaCorta(fechaISO: string): string {
  const [, m = 1, d = 1] = fechaISO.split('-').map(Number);
  const mesCorto = MESES_CORTOS[(m - 1) % 12] ?? 'Oct';
  return `${d} ${mesCorto}`;
}

/**
 * Obtiene el código de día de la semana estilo editorial ("LUN", "VIE", etc.) para una fecha ISO.
 */
export function obtenerDiaSemanaEditorial(fechaISO: string): string {
  const [y = 2026, m = 1, d = 1] = fechaISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const idxLunesCero = (dt.getUTCDay() + 6) % 7;
  return DIAS_SEMANA_CORTOS[idxLunesCero] ?? 'VIE';
}

export function obtenerNombreMesEditorial(mesIndexCero: number): string {
  return NOMBRES_MESES[mesIndexCero % 12] ?? 'OCTUBRE';
}

/**
 * Genera los bloques ocupados (reservas confirmadas y mantenimientos programados)
 * para un vehículo específico, relativos a la fecha actual del cliente.
 */
export function obtenerBloquesNoDisponibles(
  vehiculoId: string,
  hoyISO: string = toClientISODate()
): BloqueNoDisponible[] {
  // Semilla determinista por vehículo para variar las ventanas de disponibilidad
  const seed = vehiculoId
    .split('')
    .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0);
  const offset = seed % 3; // 0, 1 o 2 días de desplazamiento

  return [
    {
      id: `blq-${vehiculoId}-1`,
      vehiculoId,
      fechaInicio: sumarDiasISO(hoyISO, 5 + offset),
      fechaFin: sumarDiasISO(hoyISO, 7 + offset),
      motivo: 'RESERVADO',
      etiqueta: 'Reserva confirmada en patio',
    },
    {
      id: `blq-${vehiculoId}-2`,
      vehiculoId,
      fechaInicio: sumarDiasISO(hoyISO, 15 + offset),
      fechaFin: sumarDiasISO(hoyISO, 16 + offset),
      motivo: 'MANTENIMIENTO',
      etiqueta: 'Inspección y alistamiento técnico',
    },
    {
      id: `blq-${vehiculoId}-3`,
      vehiculoId,
      fechaInicio: sumarDiasISO(hoyISO, 25 + offset),
      fechaFin: sumarDiasISO(hoyISO, 28 + offset),
      motivo: 'RESERVADO',
      etiqueta: 'Reserva corporativa',
    },
    {
      id: `blq-${vehiculoId}-4`,
      vehiculoId,
      fechaInicio: sumarDiasISO(hoyISO, 38 + offset),
      fechaFin: sumarDiasISO(hoyISO, 41 + offset),
      motivo: 'RESERVADO',
      etiqueta: 'Reserva confirmada en patio',
    },
  ];
}

/**
 * Consulta en Cloudflare D1 los bloques reales de indisponibilidad para un vehículo:
 * 1. Reservas activas ('CONFIRMADA', 'PENDIENTE', 'EN_CURSO') dentro del horizonte temporal.
 * 2. Mantenimientos u órdenes de taller activas ('PROGRAMADO', 'EN_TALLER') dentro del horizonte temporal.
 *
 * Mapea cada registro al tipo canónico `BloqueNoDisponible`:
 * - Reservas: motivo = 'RESERVADO', etiqueta = 'Reserva confirmada en patio'
 * - Mantenimientos: motivo = 'MANTENIMIENTO', etiqueta = mantenimiento.etiqueta
 */
export async function obtenerBloquesNoDisponiblesD1(
  db: DrizzleD1Database | AppDb,
  vehiculoId: string,
  hoyISO: string = toClientISODate(),
  horizonteDias: number = 120
): Promise<BloqueNoDisponible[]> {
  if (!db || !vehiculoId) {
    return [];
  }

  const fechaLimite = sumarDiasISO(hoyISO, horizonteDias);

  try {
    const [reservasRows, mantenimientosRows] = await Promise.all([
      db
        .select({
          id: reservas.id,
          fechaInicio: reservas.fechaInicio,
          fechaFin: reservas.fechaFin,
        })
        .from(reservas)
        .where(
          and(
            eq(reservas.vehiculoId, vehiculoId),
            inArray(reservas.estado, ['CONFIRMADA', 'PENDIENTE', 'EN_CURSO']),
            gte(reservas.fechaFin, hoyISO),
            lte(reservas.fechaInicio, fechaLimite)
          )
        )
        .orderBy(reservas.fechaInicio),

      db
        .select({
          id: mantenimientosVehiculo.id,
          fechaInicio: mantenimientosVehiculo.fechaInicio,
          fechaFin: mantenimientosVehiculo.fechaFin,
          etiqueta: mantenimientosVehiculo.etiqueta,
        })
        .from(mantenimientosVehiculo)
        .where(
          and(
            eq(mantenimientosVehiculo.vehiculoId, vehiculoId),
            inArray(mantenimientosVehiculo.estado, ['PROGRAMADO', 'EN_TALLER']),
            gte(mantenimientosVehiculo.fechaFin, hoyISO),
            lte(mantenimientosVehiculo.fechaInicio, fechaLimite)
          )
        )
        .orderBy(mantenimientosVehiculo.fechaInicio),
    ]);

    const bloquesReservas: BloqueNoDisponible[] = reservasRows.map((r) => ({
      id: r.id,
      vehiculoId,
      fechaInicio: r.fechaInicio,
      fechaFin: r.fechaFin,
      motivo: 'RESERVADO',
      etiqueta: 'Reserva confirmada en patio',
    }));

    const bloquesMantenimientos: BloqueNoDisponible[] = mantenimientosRows.map((m) => ({
      id: m.id,
      vehiculoId,
      fechaInicio: m.fechaInicio,
      fechaFin: m.fechaFin,
      motivo: 'MANTENIMIENTO',
      etiqueta: m.etiqueta,
    }));

    return [...bloquesReservas, ...bloquesMantenimientos].sort((a, b) =>
      a.fechaInicio.localeCompare(b.fechaInicio)
    );
  } catch (error) {
    logFalloD1('disponibilidad.obtenerBloquesNoDisponiblesD1', error, {
      vehiculoId,
      hoyISO,
      horizonteDias,
    });
    return [];
  }
}

export interface CalendarioMesResultado {
  anio: number;
  mesIndexCero: number; // 0 = Enero .. 11 = Diciembre
  nombreMes: string;
  celdasVaciasInicio: number; // Offset Lunes = 0
  dias: DiaCalendarioItem[];
  franjasMes: FranjaDisponible[];
}

/**
 * Construye la matriz del mes solicitado junto con sus franjas contiguas de disponibilidad.
 * Asigna un `franjaId` global (sobre un horizonte de 90 días) para que las franjas que
 * cruzan fin de mes sigan siendo contiguas.
 * Acepta opcionalmente `bloquesPrecalculados` (ej. obtenidos desde D1 con `obtenerBloquesNoDisponiblesD1`);
 * de no proveerse, recurre a `obtenerBloquesNoDisponibles(vehiculoId, hoyISO)` para retrocompatibilidad síncrona.
 */
export function construirCalendarioMes(
  vehiculoId: string,
  anio: number,
  mesIndexCero: number,
  hoyISO: string = toClientISODate(),
  bloquesPrecalculados?: BloqueNoDisponible[]
): CalendarioMesResultado {
  const bloques = bloquesPrecalculados ?? obtenerBloquesNoDisponibles(vehiculoId, hoyISO);

  // Construimos un mapa de franjas contiguas desde hoy hasta +90 días
  const mapaFranjaPorFecha = new Map<string, string>();
  let indiceFranjaActual = 1;
  let enFranja = false;

  for (let i = 0; i <= 90; i++) {
    const fechaCursor = sumarDiasISO(hoyISO, i);
    const bloque = bloques.find(
      (b) => fechaCursor >= b.fechaInicio && fechaCursor <= b.fechaFin
    );

    if (!bloque) {
      enFranja = true;
      mapaFranjaPorFecha.set(fechaCursor, `franja-${indiceFranjaActual}`);
    } else if (enFranja) {
      enFranja = false;
      indiceFranjaActual += 1;
    }
  }

  const primerDiaUTC = new Date(Date.UTC(anio, mesIndexCero, 1, 12, 0, 0));
  const totalDiasMes = new Date(Date.UTC(anio, mesIndexCero + 1, 0, 12, 0, 0)).getUTCDate();
  const celdasVaciasInicio = (primerDiaUTC.getUTCDay() + 6) % 7; // Lunes = 0 .. Domingo = 6

  const dias: DiaCalendarioItem[] = [];

  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const mm = String(mesIndexCero + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    const fechaISO = `${anio}-${mm}-${dd}`;
    const dt = new Date(Date.UTC(anio, mesIndexCero, dia, 12, 0, 0));
    const diaSemanaIndice = (dt.getUTCDay() + 6) % 7;
    const diaSemanaCorto = DIAS_SEMANA_CORTOS[diaSemanaIndice] ?? 'LUN';

    if (fechaISO < hoyISO) {
      dias.push({
        fechaISO,
        numeroDia: dia,
        diaSemanaIndice,
        diaSemanaCorto,
        estado: 'PASADO',
      });
      continue;
    }

    const bloqueActivo = bloques.find(
      (b) => fechaISO >= b.fechaInicio && fechaISO <= b.fechaFin
    );

    if (bloqueActivo) {
      dias.push({
        fechaISO,
        numeroDia: dia,
        diaSemanaIndice,
        diaSemanaCorto,
        estado: bloqueActivo.motivo,
        etiquetaBloqueo: bloqueActivo.etiqueta,
      });
    } else {
      dias.push({
        fechaISO,
        numeroDia: dia,
        diaSemanaIndice,
        diaSemanaCorto,
        estado: 'DISPONIBLE',
        franjaId: mapaFranjaPorFecha.get(fechaISO) ?? 'franja-general',
      });
    }
  }

  // Extraer las franjas disponibles visibles en este mes para los chips rápidos
  const franjasMes: FranjaDisponible[] = [];
  let inicioActual: string | null = null;
  let finActual: string | null = null;
  let franjaIdActual: string | undefined;

  for (const item of dias) {
    if (item.estado === 'DISPONIBLE') {
      if (!inicioActual) {
        inicioActual = item.fechaISO;
        franjaIdActual = item.franjaId;
      }
      finActual = item.fechaISO;
    } else if (inicioActual && finActual) {
      const diasDisponibles = calcularDiasInclusivos(inicioActual, finActual);
      franjasMes.push({
        id: franjaIdActual ?? `franja-${inicioActual}`,
        fechaInicio: inicioActual,
        fechaFin: finActual,
        diasDisponibles,
        etiquetaCorta:
          inicioActual === finActual
            ? formatearFechaCorta(inicioActual)
            : `${formatearFechaCorta(inicioActual)} – ${formatearFechaCorta(finActual)}`,
      });
      inicioActual = null;
      finActual = null;
      franjaIdActual = undefined;
    }
  }

  if (inicioActual && finActual) {
    const diasDisponibles = calcularDiasInclusivos(inicioActual, finActual);
    franjasMes.push({
      id: franjaIdActual ?? `franja-${inicioActual}`,
      fechaInicio: inicioActual,
      fechaFin: finActual,
      diasDisponibles,
      etiquetaCorta:
        inicioActual === finActual
          ? formatearFechaCorta(inicioActual)
          : `${formatearFechaCorta(inicioActual)} – ${formatearFechaCorta(finActual)}`,
    });
  }

  return {
    anio,
    mesIndexCero,
    nombreMes: obtenerNombreMesEditorial(mesIndexCero),
    celdasVaciasInicio,
    dias,
    franjasMes,
  };
}

/**
 * Verifica que todas las fechas en [fechaInicio, fechaFin] estén libres de bloques ocupados.
 * Acepta opcionalmente `bloquesPrecalculados` (ej. obtenidos desde D1 con `obtenerBloquesNoDisponiblesD1`);
 * de no proveerse, recurre a `obtenerBloquesNoDisponibles(vehiculoId, hoyISO)`.
 */
export function esRangoDisponibleValido(
  vehiculoId: string,
  fechaInicio: string,
  fechaFin: string,
  hoyISO: string = toClientISODate(),
  bloquesPrecalculados?: BloqueNoDisponible[]
): boolean {
  if (fechaInicio > fechaFin || fechaInicio < hoyISO) {
    return false;
  }
  const bloques = bloquesPrecalculados ?? obtenerBloquesNoDisponibles(vehiculoId, hoyISO);
  return !bloques.some(
    (b) => b.fechaInicio <= fechaFin && b.fechaFin >= fechaInicio
  );
}

/**
 * Calcula la liquidación transparente de costos para un rango seleccionado.
 */
export function calcularCotizacionAlquiler(
  vehiculo: VehiculoItem,
  fechaInicio: string,
  fechaFin: string
): CotizacionAlquiler {
  const diasAlquiler = calcularDiasInclusivos(fechaInicio, fechaFin);
  const subtotalTarifa = diasAlquiler * vehiculo.precioDia;
  const coberturaPericial = Math.round(subtotalTarifa * 0.08);
  const totalAlquiler = subtotalTarifa + coberturaPericial;
  const abonoMinimoReserva = Math.round(totalAlquiler * 0.3);

  return {
    vehiculoId: vehiculo.id,
    fechaInicio,
    fechaFin,
    diasAlquiler,
    precioDia: vehiculo.precioDia,
    subtotalTarifa,
    coberturaPericial,
    depositoGarantia: vehiculo.depositoGarantia,
    totalAlquiler,
    abonoMinimoReserva,
  };
}
