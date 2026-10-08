import type { D1Database } from '@cloudflare/workers-types';
import type { LogEntry, AlertThrottleConfig } from '../types';
import { getDb } from '@/lib/db';
import { incidentesSistema } from '@/db/schema/incidentes';
import { eq } from 'drizzle-orm';

export interface ThrottleDecision {
  shouldDispatch: boolean;
  reason:
    | 'NEW_INCIDENT'
    | 'COOLDOWN_EXPIRED'
    | 'SPIKE_DETECTED'
    | 'COOLDOWN_ACTIVE'
    | 'CIRCUIT_BREAKER_TRIPPED';
  incidentId: string;
  totalOccurrences: number;
  isSpike: boolean;
}

interface InMemoryIncidentState {
  firstSeenAt: number;
  lastSeenAt: number;
  lastAlertedAt: number;
  occurrences: number;
  burstCount: number;
}

// L1 Cache en memoria por Isolate
const l1IncidentCache = new Map<string, InMemoryIncidentState>();
const globalAlertTimestamps: number[] = [];

/**
 * Valida el disyuntor global para asegurar no exceder el límite de correos por hora
 */
function checkCircuitBreaker(maxAlertsPerHour: number, now: number): boolean {
  const oneHourAgo = now - 60 * 60 * 1000;
  // Limpiar marcas de más de 1 hora
  while (globalAlertTimestamps.length > 0 && globalAlertTimestamps[0]! < oneHourAgo) {
    globalAlertTimestamps.shift();
  }
  return globalAlertTimestamps.length >= maxAlertsPerHour;
}

function recordGlobalAlert(now: number): void {
  globalAlertTimestamps.push(now);
}

/**
 * Evalúa si un incidente debe emitir una alerta temprana por correo o suprimirse por enfriamiento
 */
export async function evaluateIncidentThrottle(
  entry: LogEntry,
  fingerprint: string,
  config: AlertThrottleConfig,
  d1?: D1Database | undefined
): Promise<ThrottleDecision> {
  const now = Date.now();
  const cooldownMs = config.cooldownMinutes * 60 * 1000;
  const incidentId = `inc_${fingerprint}`;

  // 1. Verificar Disyuntor Global (Circuit Breaker)
  if (checkCircuitBreaker(config.maxAlertsPerHour, now)) {
    return {
      shouldDispatch: false,
      reason: 'CIRCUIT_BREAKER_TRIPPED',
      incidentId,
      totalOccurrences: (l1IncidentCache.get(fingerprint)?.occurrences || 0) + 1,
      isSpike: false,
    };
  }

  // 2. Consultar o inicializar estado en L1 Cache
  let l1State = l1IncidentCache.get(fingerprint);

  if (!l1State) {
    l1State = {
      firstSeenAt: now,
      lastSeenAt: now,
      lastAlertedAt: 0,
      occurrences: 0,
      burstCount: 0,
    };
    l1IncidentCache.set(fingerprint, l1State);
  }

  l1State.lastSeenAt = now;
  l1State.occurrences += 1;
  l1State.burstCount += 1;

  // 3. Persistencia y sincronización con L2 (Cloudflare D1)
  let d1LastAlertedAt: number | null = null;
  let d1TotalOccurrences = l1State.occurrences;

  if (d1) {
    try {
      const db = getDb(d1);
      const existing = await db
        .select()
        .from(incidentesSistema)
        .where(eq(incidentesSistema.fingerprint, fingerprint))
        .get();

      if (existing) {
        d1LastAlertedAt = existing.ultimoCorreoEn ? existing.ultimoCorreoEn.getTime() : null;
        d1TotalOccurrences = existing.ocurrencias + 1;

        await db
          .update(incidentesSistema)
          .set({
            ocurrencias: d1TotalOccurrences,
            ultimaVez: new Date(now),
            metadata: JSON.stringify({
              context: entry.context,
              error: entry.error,
            }),
            actualizadoEn: new Date(now),
          })
          .where(eq(incidentesSistema.id, existing.id));
      } else {
        // Nuevo registro en D1
        await db.insert(incidentesSistema).values({
          id: incidentId,
          fingerprint,
          nivel: entry.level.toUpperCase(),
          mensaje: entry.error?.message || entry.message,
          modulo: entry.context.module || entry.context.action || 'core',
          ocurrencias: 1,
          primeraVez: new Date(now),
          ultimaVez: new Date(now),
          ultimoCorreoEn: null,
          estado: 'ABIERTO',
          metadata: JSON.stringify({
            context: entry.context,
            error: entry.error,
          }),
          creadoEn: new Date(now),
          actualizadoEn: new Date(now),
        });
      }
    } catch (d1Error) {
      // Si D1 falla, continuamos con el estado L1 para resiliencia absoluta
      console.warn('[Throttle D1 Sync Warn]:', d1Error);
    }
  }

  // Resolver la marca de tiempo de la última alerta enviada (L1 o D1)
  const lastAlertedAt = Math.max(l1State.lastAlertedAt, d1LastAlertedAt || 0);

  // 4. Decisión de despacho:
  // Caso A: Primera vez que se detecta (Alerta Temprana Inmediata)
  if (lastAlertedAt === 0) {
    l1State.lastAlertedAt = now;
    l1State.burstCount = 0;
    recordGlobalAlert(now);
    await updateD1LastAlerted(d1, incidentId, now);

    return {
      shouldDispatch: true,
      reason: 'NEW_INCIDENT',
      incidentId,
      totalOccurrences: d1TotalOccurrences,
      isSpike: false,
    };
  }

  // Caso B: Enfriamiento expiró
  if (now - lastAlertedAt >= cooldownMs) {
    l1State.lastAlertedAt = now;
    l1State.burstCount = 0;
    recordGlobalAlert(now);
    await updateD1LastAlerted(d1, incidentId, now);

    return {
      shouldDispatch: true,
      reason: 'COOLDOWN_EXPIRED',
      incidentId,
      totalOccurrences: d1TotalOccurrences,
      isSpike: false,
    };
  }

  // Caso C: En enfriamiento, pero supera el umbral de ráfaga (Spike Alert)
  if (l1State.burstCount >= config.spikeThreshold) {
    l1State.lastAlertedAt = now;
    l1State.burstCount = 0;
    recordGlobalAlert(now);
    await updateD1LastAlerted(d1, incidentId, now);

    return {
      shouldDispatch: true,
      reason: 'SPIKE_DETECTED',
      incidentId,
      totalOccurrences: d1TotalOccurrences,
      isSpike: true,
    };
  }

  // Caso D: Supresión activa por enfriamiento
  return {
    shouldDispatch: false,
    reason: 'COOLDOWN_ACTIVE',
    incidentId,
    totalOccurrences: d1TotalOccurrences,
    isSpike: false,
  };
}

async function updateD1LastAlerted(
  d1: D1Database | undefined,
  incidentId: string,
  timestamp: number
): Promise<void> {
  if (!d1) return;
  try {
    const db = getDb(d1);
    await db
      .update(incidentesSistema)
      .set({
        ultimoCorreoEn: new Date(timestamp),
        actualizadoEn: new Date(timestamp),
      })
      .where(eq(incidentesSistema.id, incidentId));
  } catch (error) {
    console.warn('[Throttle D1 Update Warn]:', error);
  }
}
