export const DEFAULT_TIMEZONE = 'America/Bogota';

export interface ClientTimeContext {
  timezone: string;
  dateString: string;
  now: Date;
}

/**
 * Returns a date string (YYYY-MM-DD) formatted in the target timezone (defaults to America/Bogota).
 */
export function toClientISODate(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns time string (HH:mm) formatted in the target timezone.
 */
export function formatTime(date: Date = new Date(), timezone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date);
}

/**
 * Resolves local time context using request headers/cookies with fallback to America/Bogota.
 */
export function resolveClientTimeContext(request?: Request): ClientTimeContext {
  let timezone = DEFAULT_TIMEZONE;

  if (request) {
    const headerTz = request.headers.get('x-timezone');
    if (headerTz && isValidTimeZone(headerTz)) {
      timezone = headerTz;
    }
  }

  const now = new Date();
  const dateString = toClientISODate(now, timezone);

  return {
    timezone,
    dateString,
    now,
  };
}

function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Tiempo relativo en español para listados ("hace 5 min", "hace 2 h", "hace 3 d").
 * A partir de una semana devuelve la fecha corta en la zona horaria objetivo.
 */
export function formatTiempoRelativo(
  fecha: Date,
  ahora: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE
): string {
  const segundos = Math.max(0, Math.floor((ahora.getTime() - fecha.getTime()) / 1000));
  if (segundos < 60) return 'ahora';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `hace ${dias} d`;
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: timezone }).format(fecha);
}

export type GrupoTemporal = 'Hoy' | 'Ayer' | 'Anteriores';

/** Agrupa una fecha en Hoy / Ayer / Anteriores según el día calendario en la zona horaria objetivo. */
export function grupoTemporal(
  fecha: Date,
  ahora: Date = new Date(),
  timezone: string = DEFAULT_TIMEZONE
): GrupoTemporal {
  const diaFecha = toClientISODate(fecha, timezone);
  if (diaFecha === toClientISODate(ahora, timezone)) return 'Hoy';
  const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
  if (diaFecha === toClientISODate(ayer, timezone)) return 'Ayer';
  return 'Anteriores';
}
