/**
 * Formatea y valida progresivamente la placa vehicular colombiana (formato ABC-123).
 * - Primeros 3 caracteres: solo letras (convertidas automáticamente a mayúsculas).
 * - Inserta automáticamente '-' después de la 3.ª letra.
 * - Sección numérica: solo dígitos (máximo 3 dígitos).
 * - Maneja borrado del guion final sin atrapar el cursor ni duplicar guiones.
 */

export interface ResultadoFormatoPlaca {
  value: string;
  cursor: number;
}

export function formatearPlacaVehiculo(
  rawValue: string,
  previousValue = '',
  cursorPos: number | null = null
): ResultadoFormatoPlaca {
  const upper = rawValue.toUpperCase();

  // Caso especial: el usuario estaba en "ABC-" y presionó Backspace sobre el guion final
  if (
    previousValue.length === 4 &&
    previousValue.endsWith('-') &&
    upper === previousValue.slice(0, 3)
  ) {
    const trimmed = upper.slice(0, 2);
    return { value: trimmed, cursor: trimmed.length };
  }

  const effectiveCursor = cursorPos ?? upper.length;
  let letters = '';
  let digits = '';
  let logicalCharsBeforeCursor = 0;

  for (let i = 0; i < upper.length; i++) {
    const ch = upper.charAt(i);
    if (letters.length < 3) {
      if (/[A-Z]/.test(ch)) {
        letters += ch;
        if (i < effectiveCursor) {
          logicalCharsBeforeCursor += 1;
        }
      }
    } else if (digits.length < 3) {
      if (/[0-9]/.test(ch)) {
        digits += ch;
        if (i < effectiveCursor) {
          logicalCharsBeforeCursor += 1;
        }
      }
    }
  }

  let formatted = letters;
  if (letters.length === 3) {
    formatted += `-${digits}`;
  }

  // Calcular la posición exacta del cursor considerando el guion automático
  let nextCursor = logicalCharsBeforeCursor;
  if (letters.length === 3 && logicalCharsBeforeCursor >= 3) {
    nextCursor += 1;
  }
  nextCursor = Math.max(0, Math.min(formatted.length, nextCursor));

  return {
    value: formatted,
    cursor: nextCursor,
  };
}
