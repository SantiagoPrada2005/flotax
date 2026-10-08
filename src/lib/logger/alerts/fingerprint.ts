import type { LogEntry } from '../types';

/**
 * Normaliza un mensaje de error removiendo identificadores volátiles (UUIDs, timestamps, IDs numéricos)
 * para agrupar errores pertenecientes a la misma causa raíz.
 */
export function normalizeErrorMessage(message: string): string {
  return message
    // UUID v4 / IDs alfanuméricos largos
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    // Timestamps ISO o marcas numéricas
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/gi, '<TIMESTAMP>')
    // IDs numéricos aislados
    .replace(/\b\d{5,}\b/g, '<ID>')
    // Espacios repetidos y normalización de mayúsculas
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Extrae la primera línea relevante del stack trace que no pertenezca a librerías internas
 */
function extractStackAnchor(stack?: string): string {
  if (!stack) return 'unknown';
  const lines = stack.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('at ') &&
      !trimmed.includes('node_modules') &&
      !trimmed.includes('/@astrojs/') &&
      !trimmed.includes('cloudflare:workers')
    ) {
      return trimmed.replace(/:\d+:\d+\)?$/, ')').trim();
    }
  }
  return 'unknown-trace';
}

/**
 * Calcula una huella digital determinista (fingerprint) para deduplicación y alertas tempranas
 */
export async function computeErrorFingerprint(entry: LogEntry): Promise<string> {
  const level = entry.level.toUpperCase();
  const errorName = entry.error?.name || 'Error';
  const normalizedMsg = normalizeErrorMessage(entry.error?.message || entry.message);
  const moduleName = entry.context.module || entry.context.action || 'core';
  const stackAnchor = extractStackAnchor(entry.error?.stack);

  const rawSignature = `${level}::${moduleName}::${errorName}::${normalizedMsg}::${stackAnchor}`;

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(rawSignature);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Tomamos los primeros 12 caracteres hexadecimales para un fingerprint conciso
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  } catch {
    // Fallback síncrono si crypto no estuviese disponible
    let hash = 0;
    for (let i = 0; i < rawSignature.length; i++) {
      hash = ((hash << 5) - hash + rawSignature.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}
