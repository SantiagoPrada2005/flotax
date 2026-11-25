import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import { documentosVehiculo, mantenimientosVehiculo, reservas, vehiculos } from '@/db/schema';
import { and, desc, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import { toClientISODate } from '@/lib/time/client-time';
import {
  esCategoriaExentaDocumentosLegales,
  evaluarResumenDocumentalVehiculo,
} from '@/lib/documentos-vehiculo';
import type {
  BloqueNoDisponible,
  CotizacionAlquiler,
  DiaCalendarioItem,
  EstadoDocumentalVehiculo,
  FranjaDisponible,
  TramoFechasSeleccionadas,
  VehiculoItem,
} from './types';

export type { EstadoDocumentalVehiculo } from './types';

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
 * 1. Reservas activas ('CONFIRMADA', 'PENDIENTE', 'EN_CURSO', 'PAUSADA') dentro del horizonte temporal.
 * 2. Mantenimientos u órdenes de taller activas ('PROGRAMADO', 'EN_TALLER') dentro del horizonte temporal.
 *
 * Mapea cada registro al tipo canónico `BloqueNoDisponible`:
 * - Reservas CONFIRMADA/PENDIENTE/EN_CURSO: motivo = 'RESERVADO', etiqueta = 'Reserva confirmada en patio'
 * - Reservas PAUSADA: motivo = 'NO_DISPONIBLE', etiqueta = 'Vehículo no disponible (alquiler en pausa)'
 * - Mantenimientos: motivo = 'MANTENIMIENTO', etiqueta = mantenimiento.etiqueta
 */
export async function obtenerBloquesNoDisponiblesD1(
  db: DrizzleD1Database | AppDb,
  vehiculoId: string,
  hoyISO: string = toClientISODate(),
  horizonteDias: number = 180
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
          estado: reservas.estado,
        })
        .from(reservas)
        .where(
          and(
            eq(reservas.vehiculoId, vehiculoId),
            inArray(reservas.estado, ['CONFIRMADA', 'PENDIENTE', 'EN_CURSO', 'PAUSADA']),
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

    const bloquesReservas: BloqueNoDisponible[] = reservasRows.map((r) => {
      const esPausada = r.estado === 'PAUSADA';
      return {
        id: r.id,
        vehiculoId,
        fechaInicio: r.fechaInicio,
        fechaFin: r.fechaFin,
        motivo: esPausada ? 'NO_DISPONIBLE' : 'RESERVADO',
        etiqueta: esPausada
          ? 'Vehículo no disponible (alquiler en pausa)'
          : 'Reserva confirmada en patio',
      };
    });

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
 * Acepta opcionalmente `bloquesPrecalculados` (ej. obtenidos desde D1 con `obtenerBloquesNoDisponiblesD1`).
 * De no proveerse, asume disponibilidad completa (`[]`) para reflejar el estado real de la base de datos.
 */
export function construirCalendarioMes(
  _vehiculoId: string,
  anio: number,
  mesIndexCero: number,
  hoyISO: string = toClientISODate(),
  bloquesPrecalculados?: BloqueNoDisponible[]
): CalendarioMesResultado {
  const bloques = bloquesPrecalculados ?? [];

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
 * Acepta opcionalmente `bloquesPrecalculados` (ej. obtenidos desde D1 con `obtenerBloquesNoDisponiblesD1`).
 * De no proveerse, asume disponibilidad completa (`[]`).
 */
export function esRangoDisponibleValido(
  _vehiculoId: string,
  fechaInicio: string,
  fechaFin: string,
  hoyISO: string = toClientISODate(),
  bloquesPrecalculados?: BloqueNoDisponible[]
): boolean {
  if (fechaInicio > fechaFin || fechaInicio < hoyISO) {
    return false;
  }
  const bloques = bloquesPrecalculados ?? [];
  return !bloques.some(
    (b) => b.fechaInicio <= fechaFin && b.fechaFin >= fechaInicio
  );
}

/**
 * Calcula la fecha de fin mínima permitida dada una fecha de inicio.
 * Por defecto excluye el mismo día y el día siguiente inmediato (ej. inicio 27 -> fin mínimo 29).
 * Cuando `permitirAlquilerUnDia` está habilitado explícitamente, permite finalizar desde el mismo día.
 */
export function obtenerFechaFinMinimaAlquiler(
  fechaInicio: string,
  permitirAlquilerUnDia: boolean = false
): string {
  return permitirAlquilerUnDia ? fechaInicio : sumarDiasISO(fechaInicio, 2);
}

/**
 * Determina el último día contiguo libre a partir de `fechaInicio` antes del próximo bloque ocupado.
 * Retorna `null` si no existe ningún bloque posterior a `fechaInicio`.
 */
export function obtenerUltimoDiaContiguoLibre(
  fechaInicio: string,
  bloques: readonly BloqueNoDisponible[] = []
): string | null {
  let masTemprano: string | null = null;
  for (const b of bloques) {
    if (b.fechaInicio > fechaInicio) {
      if (!masTemprano || b.fechaInicio < masTemprano) {
        masTemprano = b.fechaInicio;
      }
    }
  }
  return masTemprano ? sumarDiasISO(masTemprano, -1) : null;
}

/**
 * Calcula el nuevo rango continuo al tocar `fechaTocada` sobre una selección existente:
 * - Sin selección: inicia en `[fechaTocada, fechaTocada]` (1 día).
 * - Con 1 día `[A, A]`: tocar `A` limpia; tocar otra fecha `B` libre contigua amplía `[min(A,B), max(A,B)]`.
 * - Con rango múltiple `[A, B]` (ej. `20-21-22`):
 *   - Tocar el extremo final `B` recorta a `[A, B - 1]`.
 *   - Tocar el extremo inicial `A` recorta a `[A + 1, B]`.
 *   - Tocar un día intermedio `T` (`A < T < B`, ej. `21`) recorta hasta `T` -> `[A, T]` (`20-21`), eliminando solo los días posteriores (`22`).
 *   - Tocar un día inmediatamente adyacente libre (`B + 1` o `A - 1`) amplía el rango en 1 día.
 *   - Tocar un día lejano inicia una nueva selección `[T, T]`.
 */
export function actualizarRangoAlquilerPorToque(params: {
  fechaInicio: string | null;
  fechaFin: string | null;
  fechaTocada: string;
  vehiculoId: string;
  hoyISO: string;
  bloques?: readonly BloqueNoDisponible[] | undefined;
}): {
  fechaInicio: string | null;
  fechaFin: string | null;
  aviso?: string;
} {
  const { fechaInicio, fechaFin, fechaTocada, vehiculoId, hoyISO, bloques } = params;
  const bloquesLista = bloques ? [...bloques] : undefined;

  if (!fechaInicio) {
    return { fechaInicio: fechaTocada, fechaFin: fechaTocada };
  }

  const finActual = fechaFin && fechaFin >= fechaInicio ? fechaFin : fechaInicio;

  // 1. Toque dentro del rango seleccionado -> recorte sin borrar todo el tramo
  if (fechaTocada >= fechaInicio && fechaTocada <= finActual) {
    if (fechaInicio === finActual) {
      return { fechaInicio: null, fechaFin: null };
    }
    if (fechaTocada === finActual) {
      return { fechaInicio, fechaFin: sumarDiasISO(finActual, -1) };
    }
    if (fechaTocada === fechaInicio) {
      return { fechaInicio: sumarDiasISO(fechaInicio, 1), fechaFin: finActual };
    }
    return { fechaInicio, fechaFin: fechaTocada };
  }

  // 2. Si solo hay 1 día elegido, permitir expandir a varios días a la vez si es contiguo y libre
  if (fechaInicio === finActual) {
    const nuevoInicio = fechaTocada < fechaInicio ? fechaTocada : fechaInicio;
    const nuevoFin = fechaTocada < fechaInicio ? fechaInicio : fechaTocada;

    if (esRangoDisponibleValido(vehiculoId, nuevoInicio, nuevoFin, hoyISO, bloquesLista)) {
      return { fechaInicio: nuevoInicio, fechaFin: nuevoFin };
    }
    return {
      fechaInicio: fechaTocada,
      fechaFin: fechaTocada,
      aviso: 'Nueva franja iniciada (había días reservados en medio).',
    };
  }

  // 3. Con rango múltiple, permitir ampliar día por día en los extremos
  if (fechaTocada === sumarDiasISO(finActual, 1)) {
    if (esRangoDisponibleValido(vehiculoId, fechaInicio, fechaTocada, hoyISO, bloquesLista)) {
      return { fechaInicio, fechaFin: fechaTocada };
    }
  }
  if (fechaTocada === sumarDiasISO(fechaInicio, -1)) {
    if (esRangoDisponibleValido(vehiculoId, fechaTocada, finActual, hoyISO, bloquesLista)) {
      return { fechaInicio: fechaTocada, fechaFin: finActual };
    }
  }

  // 4. Toque fuera de los extremos adyacentes -> iniciar nueva franja desde ese día
  return { fechaInicio: fechaTocada, fechaFin: fechaTocada };
}

/**
 * Valida las reglas de negocio del rango de fechas de un alquiler:
 * 1. `fechaInicio` <= `fechaFin`.
 * 2. Si se envían `fechasSeleccionadas`, deben formar un único rango continuo sin huecos.
 * 3. Por defecto (`permitirAlquilerUnDia = true`) acepta rangos continuos desde 1 día en adelante;
 *    si `permitirAlquilerUnDia = false`, exige devolución mínima desde `sumarDiasISO(fechaInicio, 2)`.
 */
export function validarReglasRangoAlquiler(params: {
  fechaInicio: string;
  fechaFin: string;
  fechasSeleccionadas?: readonly string[] | null | undefined;
  permitirAlquilerUnDia?: boolean | undefined;
}): { valido: boolean; mensaje?: string } {
  const { fechaInicio, fechaFin, fechasSeleccionadas, permitirAlquilerUnDia = true } = params;

  if (!REGEX_FECHA_ISO.test(fechaInicio) || !REGEX_FECHA_ISO.test(fechaFin)) {
    return {
      valido: false,
      mensaje: 'Las fechas de inicio y devolución deben tener un formato válido (YYYY-MM-DD).',
    };
  }

  if (fechaInicio > fechaFin) {
    return {
      valido: false,
      mensaje: 'La fecha de inicio debe ser anterior o igual a la fecha de fin.',
    };
  }

  if (fechasSeleccionadas && fechasSeleccionadas.length > 0) {
    const tramos = agruparFechasEnTramos(fechasSeleccionadas);
    if (tramos.length !== 1) {
      return {
        valido: false,
        mensaje: 'Debes seleccionar un rango continuo de fechas consecutivas sin días intermedios vacíos.',
      };
    }
  }

  const fechaFinMinima = obtenerFechaFinMinimaAlquiler(fechaInicio, permitirAlquilerUnDia);
  if (fechaFin < fechaFinMinima) {
    return {
      valido: false,
      mensaje: `El día siguiente inmediato (${formatearFechaCorta(sumarDiasISO(fechaInicio, 1))}) no está disponible como fecha de devolución. Selecciona desde el ${formatearFechaCorta(fechaFinMinima)}.`,
    };
  }

  return { valido: true };
}

/**
 * Encuentra la primera ventana de `duracionDias` consecutivos libres a partir de `hoyISO`,
 * considerando los bloques reales de indisponibilidad (reservas y mantenimientos en D1).
 */
export function encontrarPrimerRangoDisponible(
  vehiculoId: string,
  hoyISO: string = toClientISODate(),
  bloques: BloqueNoDisponible[] = [],
  duracionDias: number = 3
): { fechaInicio: string; fechaFin: string } {
  const diasEfectivos = Math.max(1, duracionDias);
  let cursor = hoyISO;

  // 1. Intentar encontrar un bloque contiguo libre de la duración solicitada en los próximos 90 días
  for (let i = 0; i < 90; i++) {
    const finCandidato = sumarDiasISO(cursor, diasEfectivos - 1);
    if (esRangoDisponibleValido(vehiculoId, cursor, finCandidato, hoyISO, bloques)) {
      return { fechaInicio: cursor, fechaFin: finCandidato };
    }
    cursor = sumarDiasISO(cursor, 1);
  }

  // 2. Si no hay ventana contigua completa de N días, buscar al menos el primer día libre individual
  cursor = hoyISO;
  for (let i = 0; i < 90; i++) {
    if (esRangoDisponibleValido(vehiculoId, cursor, cursor, hoyISO, bloques)) {
      return { fechaInicio: cursor, fechaFin: cursor };
    }
    cursor = sumarDiasISO(cursor, 1);
  }

  // 3. Fallback de resguardo si todo el horizonte estuviera ocupado
  return { fechaInicio: hoyISO, fechaFin: sumarDiasISO(hoyISO, diasEfectivos - 1) };
}

const REGEX_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normaliza, deduplica y ordena ascendentemente una colección de fechas ISO (YYYY-MM-DD).
 */
export function normalizarFechasSeleccionadas(fechas: readonly string[]): string[] {
  const unicas = new Set<string>();
  for (const f of fechas) {
    const limpia = f.trim();
    if (REGEX_FECHA_ISO.test(limpia)) {
      unicas.add(limpia);
    }
  }
  return Array.from(unicas).sort((a, b) => a.localeCompare(b));
}

/**
 * Expande un rango inclusivo [fechaInicio, fechaFin] en una lista ordenada de fechas ISO.
 */
export function expandirRangoAFechas(fechaInicio: string, fechaFin: string): string[] {
  if (!REGEX_FECHA_ISO.test(fechaInicio) || !REGEX_FECHA_ISO.test(fechaFin) || fechaInicio > fechaFin) {
    return [];
  }
  const resultado: string[] = [];
  let cursor = fechaInicio;
  for (let i = 0; i < 366 && cursor <= fechaFin; i++) {
    resultado.push(cursor);
    cursor = sumarDiasISO(cursor, 1);
  }
  return resultado;
}

/**
 * Agrega o quita una fecha individual sin afectar ni reiniciar el resto de días seleccionados.
 */
export function alternarFechaEnSeleccion(
  fechasActuales: readonly string[],
  fechaISO: string
): string[] {
  const normalizadas = normalizarFechasSeleccionadas(fechasActuales);
  if (!REGEX_FECHA_ISO.test(fechaISO)) {
    return normalizadas;
  }
  if (normalizadas.includes(fechaISO)) {
    return normalizadas.filter((f) => f !== fechaISO);
  }
  return normalizarFechasSeleccionadas([...normalizadas, fechaISO]);
}

/**
 * Agrupa una colección de fechas ordenadas en tramos contiguos para presentación o validación en D1.
 */
export function agruparFechasEnTramos(
  fechas: readonly string[]
): TramoFechasSeleccionadas[] {
  const ordenadas = normalizarFechasSeleccionadas(fechas);
  if (ordenadas.length === 0) return [];

  const tramos: TramoFechasSeleccionadas[] = [];
  let inicio = ordenadas[0]!;
  let fin = ordenadas[0]!;
  let dias = 1;

  for (let i = 1; i < ordenadas.length; i++) {
    const actual = ordenadas[i]!;
    if (sumarDiasISO(fin, 1) === actual) {
      fin = actual;
      dias += 1;
    } else {
      tramos.push({ inicio, fin, dias });
      inicio = actual;
      fin = actual;
      dias = 1;
    }
  }
  tramos.push({ inicio, fin, dias });
  return tramos;
}

/**
 * Formatea una colección de fechas seleccionadas en una etiqueta legible y compacta.
 */
export function formatearResumenFechasSeleccionadas(fechas: readonly string[]): string {
  const tramos = agruparFechasEnTramos(fechas);
  if (tramos.length === 0) return '';
  return tramos
    .map((t) =>
      t.inicio === t.fin
        ? formatearFechaCorta(t.inicio)
        : `${formatearFechaCorta(t.inicio)} → ${formatearFechaCorta(t.fin)}`
    )
    .join(', ');
}

/**
 * Verifica que cada fecha individual en la colección sea >= hoyISO y no pertenezca a ningún bloque ocupado.
 */
export function sonFechasDisponiblesValidas(
  _vehiculoId: string,
  fechas: readonly string[],
  hoyISO: string = toClientISODate(),
  bloquesPrecalculados?: BloqueNoDisponible[]
): boolean {
  const normalizadas = normalizarFechasSeleccionadas(fechas);
  if (normalizadas.length === 0) return false;

  const bloques = bloquesPrecalculados ?? [];
  return normalizadas.every((fecha) => {
    if (fecha < hoyISO) return false;
    return !bloques.some((b) => fecha >= b.fechaInicio && fecha <= b.fechaFin);
  });
}

/**
 * Calcula la liquidación transparente de costos para una colección de fechas seleccionadas individualmente.
 */
export function calcularCotizacionPorFechas(
  vehiculo: VehiculoItem,
  fechas: readonly string[],
  recargoDomicilio: number = 0
): CotizacionAlquiler {
  const normalizadas = normalizarFechasSeleccionadas(fechas);
  const diasAlquiler = normalizadas.length;
  const fechaInicio = normalizadas[0] ?? '';
  const fechaFin = normalizadas[normalizadas.length - 1] ?? fechaInicio;
  const subtotalTarifa = diasAlquiler * vehiculo.precioDia;
  const coberturaPericial = diasAlquiler > 0 ? Math.round(subtotalTarifa * 0.08) : 0;
  const recargoSeguro = diasAlquiler > 0 ? Math.max(0, Math.round(recargoDomicilio)) : 0;
  const totalAlquiler = subtotalTarifa + coberturaPericial + recargoSeguro;
  const abonoMinimoReserva = diasAlquiler > 0 ? Math.round(totalAlquiler * 0.3) : 0;

  return {
    vehiculoId: vehiculo.id,
    fechaInicio,
    fechaFin,
    fechasSeleccionadas: normalizadas,
    diasAlquiler,
    precioDia: vehiculo.precioDia,
    subtotalTarifa,
    coberturaPericial,
    recargoDomicilio: recargoSeguro,
    depositoGarantia: vehiculo.depositoGarantia,
    totalAlquiler,
    abonoMinimoReserva,
  };
}

/**
 * Calcula la liquidación transparente de costos para un rango seleccionado.
 */
export function calcularCotizacionAlquiler(
  vehiculo: VehiculoItem,
  fechaInicio: string,
  fechaFin: string,
  recargoDomicilio: number = 0
): CotizacionAlquiler {
  const diasAlquiler = calcularDiasInclusivos(fechaInicio, fechaFin);
  const subtotalTarifa = diasAlquiler * vehiculo.precioDia;
  const coberturaPericial = Math.round(subtotalTarifa * 0.08);
  const recargoSeguro = Math.max(0, Math.round(recargoDomicilio));
  const totalAlquiler = subtotalTarifa + coberturaPericial + recargoSeguro;
  const abonoMinimoReserva = Math.round(totalAlquiler * 0.3);

  return {
    vehiculoId: vehiculo.id,
    fechaInicio,
    fechaFin,
    diasAlquiler,
    precioDia: vehiculo.precioDia,
    subtotalTarifa,
    coberturaPericial,
    recargoDomicilio: recargoSeguro,
    depositoGarantia: vehiculo.depositoGarantia,
    totalAlquiler,
    abonoMinimoReserva,
  };
}

/**
 * Evalúa el estado documental legal de un vehículo en Cloudflare D1:
 * - Las patinetas eléctricas livianas (`PATINETA`) están exentas de SOAT y Tecnomecánica (Ley 2486 de 2025).
 * - Para el resto de categorías, tanto el estado `SIN_REALIZAR` (vencido/inactivo) como `SIN_REGISTRAR`
 *   bloquean la disponibilidad, reserva y entrega del vehículo.
 */
export async function obtenerEstadoDocumentalVehiculoD1(
  db: DrizzleD1Database | AppDb,
  vehiculoId: string,
  categoria?: string,
  fechaReferenciaISO: string = toClientISODate()
): Promise<EstadoDocumentalVehiculo> {
  if (esCategoriaExentaDocumentosLegales(categoria)) {
    return {
      tieneVencidos: false,
      faltantesSinCarga: [],
      vencidos: [],
      requiereRtm: false,
      exentoPorLey2486: true,
      bloqueadoPorDocumentos: false,
      motivoBloqueo: null,
    };
  }

  if (!db || !vehiculoId) {
    return {
      tieneVencidos: false,
      faltantesSinCarga: ['SOAT', 'TECNICO_MECANICA'],
      vencidos: [],
      requiereRtm: true,
      exentoPorLey2486: false,
      bloqueadoPorDocumentos: true,
      motivoBloqueo: 'SOAT sin registrar · Tecnomecánica sin registrar',
    };
  }

  try {
    const rawRows = await db
      .select({
        id: documentosVehiculo.id,
        tipoDocumento: documentosVehiculo.tipoDocumento,
        numeroReferencia: documentosVehiculo.numeroReferencia,
        fechaExpedicion: documentosVehiculo.fechaExpedicion,
        fechaVencimiento: documentosVehiculo.fechaVencimiento,
        vigente: documentosVehiculo.vigente,
        archivoR2Key: documentosVehiculo.archivoR2Key,
        archivoReversoR2Key: documentosVehiculo.archivoReversoR2Key,
        actualizadoEn: documentosVehiculo.actualizadoEn,
      })
      .from(documentosVehiculo)
      .where(eq(documentosVehiculo.vehiculoId, vehiculoId))
      .orderBy(desc(documentosVehiculo.fechaVencimiento));

    const resumen = evaluarResumenDocumentalVehiculo({
      categoria,
      documentos: rawRows ?? [],
      hoyISO: fechaReferenciaISO,
    });

    const faltantesSinCarga: Array<'SOAT' | 'TECNICO_MECANICA'> = [];
    const vencidos: Array<{ tipo: string; fechaVencimiento: string }> = [];

    if (resumen.soat) {
      if (resumen.soat.estado === 'SIN_REGISTRAR') {
        faltantesSinCarga.push('SOAT');
      } else if (resumen.soat.estado === 'SIN_REALIZAR') {
        vencidos.push({
          tipo: 'SOAT',
          fechaVencimiento: resumen.soat.fechaVencimiento ?? '',
        });
      }
    }

    if (resumen.tecnomecanica) {
      if (resumen.tecnomecanica.estado === 'SIN_REGISTRAR') {
        faltantesSinCarga.push('TECNICO_MECANICA');
      } else if (resumen.tecnomecanica.estado === 'SIN_REALIZAR') {
        vencidos.push({
          tipo: 'TECNICO_MECANICA',
          fechaVencimiento: resumen.tecnomecanica.fechaVencimiento ?? '',
        });
      }
    }

    return {
      tieneVencidos: vencidos.length > 0,
      faltantesSinCarga,
      vencidos,
      requiereRtm: true,
      exentoPorLey2486: false,
      bloqueadoPorDocumentos: resumen.bloqueadoPorDocumentos,
      motivoBloqueo: resumen.motivoBloqueo,
    };
  } catch (error) {
    logFalloD1('disponibilidad.obtenerEstadoDocumentalVehiculoD1', error, {
      vehiculoId,
      categoria,
      fechaReferenciaISO,
    });
    return {
      tieneVencidos: false,
      faltantesSinCarga: ['SOAT', 'TECNICO_MECANICA'],
      vencidos: [],
      requiereRtm: true,
      exentoPorLey2486: false,
      bloqueadoPorDocumentos: true,
      motivoBloqueo: 'SOAT sin registrar · Tecnomecánica sin registrar',
    };
  }
}

export interface DictamenDisponibilidadVehiculo {
  disponible: boolean;        // true si es usable Y no está ocupado en el rango
  usable: boolean;            // true si activo y estado != 'FUERA_SERVICIO' y sin docs vencidos
  ocupado: boolean;           // true si tiene reserva o mantenimiento solapado
  estadoSugerido: 'DISPONIBLE' | 'RESERVADO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO' | 'NO_DISPONIBLE';
  motivoBloqueo?: 'FUERA_SERVICIO' | 'MANTENIMIENTO' | 'RESERVADO' | 'NO_DISPONIBLE' | undefined;
  etiqueta: string;
  fechaInicioEvaluada: string;
  fechaFinEvaluada: string;
  ocupadoHasta?: string | undefined;
  reservaActivaId?: string | undefined;
  reservaCodigo?: string | undefined;
  mantenimientoActivoId?: string | undefined;
  estadoDocumental?: EstadoDocumentalVehiculo | undefined;
}

/**
 * Evalúa holísticamente si un vehículo está realmente DISPONIBLE para un rango de fechas (o para hoy):
 * 1. Valida Usabilidad: el vehículo debe existir, estar activo en D1 y su estado no ser 'FUERA_SERVICIO'.
 * 2. Valida Documentación Legal: SOAT y RTM vigentes (si están vencidos, marca NO_DISPONIBLE).
 * 3. Valida Taller: no debe tener órdenes en 'EN_TALLER' ni 'PROGRAMADO' que solapen con las fechas.
 * 4. Valida Ocupación: no debe tener reservas en 'CONFIRMADA', 'PENDIENTE', 'EN_CURSO' ni 'PAUSADA' que solapen.
 */
export async function verificarDisponibilidadVehiculo(
  db: DrizzleD1Database | AppDb,
  vehiculoId: string,
  fechaInicio?: string,
  fechaFin?: string,
  hoyISO: string = toClientISODate(),
  reservaExcluirId?: string
): Promise<DictamenDisponibilidadVehiculo> {
  const inicio = fechaInicio ?? hoyISO;
  const fin = fechaFin ?? inicio;

  if (!db || !vehiculoId) {
    return {
      disponible: false,
      usable: false,
      ocupado: false,
      estadoSugerido: 'FUERA_SERVICIO',
      motivoBloqueo: 'FUERA_SERVICIO',
      etiqueta: 'Base de datos o identificador no disponible',
      fechaInicioEvaluada: inicio,
      fechaFinEvaluada: fin,
    };
  }

  try {
    // 1. Validar registro de vehículo y usabilidad operativa
    const vehRows = await db
      .select({
        id: vehiculos.id,
        estado: vehiculos.estado,
        activo: vehiculos.activo,
        categoria: vehiculos.categoria,
      })
      .from(vehiculos)
      .where(eq(vehiculos.id, vehiculoId))
      .limit(1);

    const veh = vehRows[0];
    if (!veh || !veh.activo || veh.estado === 'FUERA_SERVICIO') {
      return {
        disponible: false,
        usable: false,
        ocupado: false,
        estadoSugerido: 'FUERA_SERVICIO',
        motivoBloqueo: 'FUERA_SERVICIO',
        etiqueta: 'Vehículo fuera de servicio o inactivo',
        fechaInicioEvaluada: inicio,
        fechaFinEvaluada: fin,
      };
    }

    // 2. Validar estado documental legal (bloquea por vencidos o sin registrar)
    const estadoDocumental = await obtenerEstadoDocumentalVehiculoD1(
      db,
      vehiculoId,
      veh.categoria,
      hoyISO
    );

    if (
      estadoDocumental.bloqueadoPorDocumentos ||
      estadoDocumental.tieneVencidos ||
      estadoDocumental.faltantesSinCarga.length > 0
    ) {
      return {
        disponible: false,
        usable: false,
        ocupado: false,
        estadoSugerido: 'NO_DISPONIBLE',
        motivoBloqueo: 'NO_DISPONIBLE',
        etiqueta: estadoDocumental.motivoBloqueo
          ? `Documentos pendientes (${estadoDocumental.motivoBloqueo})`
          : 'Documentación legal vencida o sin registrar',
        fechaInicioEvaluada: inicio,
        fechaFinEvaluada: fin,
        estadoDocumental,
      };
    }

    // 3. Validar mantenimientos técnicos solapados
    const mantRows = await db
      .select({
        id: mantenimientosVehiculo.id,
        fechaInicio: mantenimientosVehiculo.fechaInicio,
        fechaFin: mantenimientosVehiculo.fechaFin,
        etiqueta: mantenimientosVehiculo.etiqueta,
        estado: mantenimientosVehiculo.estado,
      })
      .from(mantenimientosVehiculo)
      .where(
        and(
          eq(mantenimientosVehiculo.vehiculoId, vehiculoId),
          inArray(mantenimientosVehiculo.estado, ['PROGRAMADO', 'EN_TALLER']),
          lte(mantenimientosVehiculo.fechaInicio, fin),
          gte(mantenimientosVehiculo.fechaFin, inicio)
        )
      )
      .limit(1);

    if (mantRows.length > 0) {
      const mant = mantRows[0]!;
      return {
        disponible: false,
        usable: false,
        ocupado: true,
        estadoSugerido: 'MANTENIMIENTO',
        motivoBloqueo: 'MANTENIMIENTO',
        etiqueta: mant.etiqueta || 'Mantenimiento o alistamiento en taller',
        fechaInicioEvaluada: inicio,
        fechaFinEvaluada: fin,
        ocupadoHasta: mant.fechaFin,
        mantenimientoActivoId: mant.id,
        estadoDocumental,
      };
    }

    // 4. Validar reservas solapadas (incluyendo PENDIENTE y PAUSADA)
    const condicionesReserva = [
      eq(reservas.vehiculoId, vehiculoId),
      inArray(reservas.estado, ['CONFIRMADA', 'PENDIENTE', 'EN_CURSO', 'PAUSADA']),
      lte(reservas.fechaInicio, fin),
      gte(reservas.fechaFin, inicio),
    ];
    if (reservaExcluirId) {
      condicionesReserva.push(ne(reservas.id, reservaExcluirId));
    }

    const resRows = await db
      .select({
        id: reservas.id,
        codigo: reservas.codigo,
        fechaInicio: reservas.fechaInicio,
        fechaFin: reservas.fechaFin,
        estado: reservas.estado,
      })
      .from(reservas)
      .where(and(...condicionesReserva))
      .orderBy(desc(reservas.fechaFin))
      .limit(1);

    if (resRows.length > 0) {
      const res = resRows[0]!;
      const esPausada = res.estado === 'PAUSADA';
      return {
        disponible: false,
        usable: !esPausada,
        ocupado: true,
        estadoSugerido: esPausada ? 'NO_DISPONIBLE' : 'RESERVADO',
        motivoBloqueo: esPausada ? 'NO_DISPONIBLE' : 'RESERVADO',
        etiqueta: esPausada
          ? `Vehículo no disponible (alquiler en pausa - ${res.codigo})`
          : `Reservado por cliente (${res.codigo})`,
        fechaInicioEvaluada: inicio,
        fechaFinEvaluada: fin,
        ocupadoHasta: res.fechaFin,
        reservaActivaId: res.id,
        reservaCodigo: res.codigo,
        estadoDocumental,
      };
    }

    // 5. Completamente DISPONIBLE
    return {
      disponible: true,
      usable: true,
      ocupado: false,
      estadoSugerido: 'DISPONIBLE',
      etiqueta: 'Disponible para alquiler',
      fechaInicioEvaluada: inicio,
      fechaFinEvaluada: fin,
      estadoDocumental,
    };
  } catch (error) {
    logFalloD1('disponibilidad.verificarDisponibilidadVehiculo', error, {
      vehiculoId,
      inicio,
      fin,
    });
    return {
      disponible: false,
      usable: false,
      ocupado: false,
      estadoSugerido: 'FUERA_SERVICIO',
      motivoBloqueo: 'FUERA_SERVICIO',
      etiqueta: 'Error al consultar disponibilidad en base de datos',
      fechaInicioEvaluada: inicio,
      fechaFinEvaluada: fin,
    };
  }
}
