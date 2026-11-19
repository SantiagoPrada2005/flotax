/**
 * Utilidades de formato numérico automático con separador de miles por punto (.)
 * manteniendo el valor numérico limpio para el backend y preservando la posición del cursor.
 */

export interface ResultadoFormatoMiles {
  formatted: string;
  numericValue: number | '';
  cursor: number;
}

export function formatearValorMiles(value: number | ''): string {
  if (value === '' || Number.isNaN(Number(value))) return '';
  const digits = String(Math.max(0, Math.trunc(Number(value))));
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatearNumeroConMiles(
  rawValue: string,
  cursorPos: number | null = null
): ResultadoFormatoMiles {
  const effectiveCursor = cursorPos ?? rawValue.length;
  let digitsBeforeCursor = 0;
  let allDigits = '';

  for (let i = 0; i < rawValue.length; i++) {
    const ch = rawValue.charAt(i);
    if (/[0-9]/.test(ch)) {
      allDigits += ch;
      if (i < effectiveCursor) {
        digitsBeforeCursor += 1;
      }
    }
  }

  if (allDigits.length === 0) {
    return {
      formatted: '',
      numericValue: '',
      cursor: 0,
    };
  }

  // Eliminar ceros a la izquierda salvo que sea únicamente "0"
  const normalizedDigits = allDigits.replace(/^0+(?=\d)/, '');
  const leadingZerosRemoved = allDigits.length - normalizedDigits.length;
  const adjustedDigitsBefore = Math.max(0, digitsBeforeCursor - leadingZerosRemoved);

  const formatted = normalizedDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  let nextCursor = 0;
  if (adjustedDigitsBefore > 0) {
    let seenDigits = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/[0-9]/.test(formatted.charAt(i))) {
        seenDigits += 1;
      }
      if (seenDigits === adjustedDigitsBefore) {
        nextCursor = i + 1;
        break;
      }
    }
    if (seenDigits < adjustedDigitsBefore) {
      nextCursor = formatted.length;
    }
  }

  return {
    formatted,
    numericValue: Number(normalizedDigits),
    cursor: nextCursor,
  };
}
