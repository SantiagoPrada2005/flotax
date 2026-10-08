import type { SerializedError, LogContext } from './types';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'authorization',
  'cookie',
  'cookies',
  'set-cookie',
  'otp',
  'code',
  'pin',
  'credencial',
  'credenciales',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'apikey',
  'api_key',
  'privatekey',
  'private_key',
]);

const MAX_STRING_LENGTH = 1024;
const MAX_DEPTH = 5;

/**
 * Sanitiza recursivamente valores de contexto para evitar fuga de credenciales o PII
 */
export function sanitizeContext(data: unknown, depth = 0, seen = new WeakSet()): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    if (data.length > MAX_STRING_LENGTH) {
      return `${data.slice(0, MAX_STRING_LENGTH)}... [TRUNCATED]`;
    }
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (depth > MAX_DEPTH) {
    return '[MAX_DEPTH_REACHED]';
  }

  if (seen.has(data as object)) {
    return '[CIRCULAR]';
  }
  seen.add(data as object);

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeContext(item, depth + 1, seen));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeContext(val, depth + 1, seen);
    }
  }

  return sanitized;
}

/**
 * Normaliza y extrae información diagnóstica de cualquier excepción
 */
export function serializeError(error: unknown): SerializedError {
  if (!error) {
    return {
      name: 'UnknownError',
      message: 'Error no especificado',
    };
  }

  if (error instanceof Error) {
    const serialized: SerializedError = {
      name: error.name || 'Error',
      message: error.message || 'Error sin mensaje',
      stack: error.stack,
    };

    if ('cause' in error && error.cause) {
      serialized.cause = serializeError(error.cause);
    }

    if ('code' in error && (typeof error.code === 'string' || typeof error.code === 'number')) {
      serialized.code = error.code;
    }

    // Compatibilidad con Zod 4 Issues si es un ZodError
    if ('issues' in error && Array.isArray((error as { issues: unknown[] }).issues)) {
      serialized.details = (error as { issues: unknown[] }).issues;
    }

    return serialized;
  }

  if (typeof error === 'object') {
    const rawObj = error as Record<string, unknown>;
    return {
      name: typeof rawObj.name === 'string' ? rawObj.name : 'ObjectError',
      message: typeof rawObj.message === 'string' ? rawObj.message : JSON.stringify(sanitizeContext(rawObj)),
      code: typeof rawObj.code === 'string' || typeof rawObj.code === 'number' ? rawObj.code : undefined,
      details: sanitizeContext(rawObj),
    };
  }

  return {
    name: 'PrimitiveError',
    message: String(error),
  };
}

/**
 * Limpia y prepara el contexto del log asegurando que los campos requeridos estén protegidos
 */
export function cleanLogContext(context?: LogContext): LogContext {
  if (!context) return {};
  return sanitizeContext(context) as LogContext;
}
