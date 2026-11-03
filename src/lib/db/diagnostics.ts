/**
 * Diagnóstico de la capa de persistencia D1.
 *
 * Los repositorios de FlotaX operan con un respaldo en memoria para no bloquear
 * la operación cuando D1 no responde (tabla aún no migrada, isolate frío, etc.).
 * Ese respaldo nunca debe ser silencioso: si la escritura o lectura real falla,
 * el operador y el desarrollador tienen que verlo en los logs del Worker.
 */

const PREFIJO = '[FlotaX][D1]';

/**
 * Imprime en consola un fallo de D1 sin interrumpir el flujo que lo originó.
 *
 * @param operacion Identificador estable de la operación (`vehiculos.guardar`).
 * @param error Error original capturado (nunca se serializa a mano: el runtime
 *              de Cloudflare conserva el stack en los Workers Logs).
 * @param contexto Datos de correlación no sensibles (ids, estado, localId).
 *                 Prohibido incluir PII: correo, documento, nombre o teléfono.
 */
export function logFalloD1(
  operacion: string,
  error: unknown,
  contexto?: Record<string, unknown>
): void {
  console.error(`${PREFIJO} ${operacion} falló.`, error, contexto ?? {});
}
