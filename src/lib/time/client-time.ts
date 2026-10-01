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
