import type { DocumentoVehiculoSelect } from '@/db/schema';
import { toClientISODate } from '@/lib/time/client-time';

export const TIPOS_DOCUMENTO_LEGAL_OBLIGATORIO = ['SOAT', 'TECNICO_MECANICA'] as const;
export type TipoDocumentoLegalObligatorio = (typeof TIPOS_DOCUMENTO_LEGAL_OBLIGATORIO)[number];

export type EstadoRecordatorioDocumento =
  | 'VIGENTE'
  | 'PROXIMO_A_VENCER'
  | 'CUENTA_REGRESIVA'
  | 'HOY_FECHA_PAGO'
  | 'SIN_REALIZAR'
  | 'SIN_REGISTRAR';

export interface DocumentoLegalEntrada {
  id: string;
  numeroReferencia: string | null;
  fechaExpedicion: string | null;
  fechaVencimiento: string | null;
  vigente: boolean;
}

export interface EvaluacionDocumentoLegal {
  tipoDocumento: TipoDocumentoLegalObligatorio;
  documentoId: string | null;
  numeroReferencia: string | null;
  fechaExpedicion: string | null;
  fechaVencimiento: string | null;
  fechaPago: string | null;
  diasParaPago: number | null;
  diasParaVencimiento: number | null;
  estado: EstadoRecordatorioDocumento;
  etiquetaEstado: string;
  mensajeDetalle: string;
  bloqueaOperacion: boolean;
  requiereNotificacion: boolean;
}

export interface EstadoLicenciaTransito {
  documentoId: string | null;
  tieneFrente: boolean;
  tieneReverso: boolean;
  completa: boolean;
  actualizadoEnMs: number | null;
}

export interface ResumenDocumentalVehiculo {
  exentoPorLey2486: boolean;
  bloqueadoPorDocumentos: boolean;
  motivoBloqueo: string | null;
  alertasBloqueo: string[];
  soat: EvaluacionDocumentoLegal | null;
  tecnomecanica: EvaluacionDocumentoLegal | null;
  licenciaTransito: EstadoLicenciaTransito;
}

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

const PATRON_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Determina si la categoría vehicular está exenta de SOAT, Tecnomecánica
 * y Licencia de tránsito (Ley 2486 de 2025 para patinetas eléctricas livianas).
 */
export function esCategoriaExentaDocumentosLegales(categoria?: string | null): boolean {
  return categoria?.trim().toUpperCase() === 'PATINETA';
}

export function esFechaISOValida(fechaISO?: string | null): fechaISO is string {
  if (!fechaISO || !PATRON_FECHA_ISO.test(fechaISO)) return false;
  const [y = 0, m = 0, d = 0] = fechaISO.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function parsearUtcMediodia(fechaISO: string): Date {
  const [y = 2026, m = 1, d = 1] = fechaISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function sumarDiasISODoc(fechaISO: string, dias: number): string {
  const dt = parsearUtcMediodia(fechaISO);
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

export function diffDiasISO(desdeISO: string, hastaISO: string): number {
  const t1 = parsearUtcMediodia(desdeISO).getTime();
  const t2 = parsearUtcMediodia(hastaISO).getTime();
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

export function formatearFechaDocumento(fechaISO: string): string {
  if (!esFechaISOValida(fechaISO)) return fechaISO;
  const [y = 2026, m = 1, d = 1] = fechaISO.split('-').map(Number);
  const mes = MESES_CORTOS[(m - 1) % 12] ?? 'Ene';
  return `${d} ${mes} ${y}`;
}

function esAnioBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

/**
 * Sugiere la fecha de vencimiento exactamente un año después de la expedición.
 * Ajusta el 29 de febrero al 28 de febrero cuando el año siguiente no es bisiesto.
 */
export function sugerirFechaVencimientoAnual(fechaExpedicionISO: string): string {
  if (!esFechaISOValida(fechaExpedicionISO)) return '';
  const [y = 2026, m = 1, d = 1] = fechaExpedicionISO.split('-').map(Number);
  const anioSiguiente = y + 1;
  const diaAjustado =
    m === 2 && d === 29 && !esAnioBisiesto(anioSiguiente) ? 28 : d;
  const mm = String(m).padStart(2, '0');
  const dd = String(diaAjustado).padStart(2, '0');
  return `${anioSiguiente}-${mm}-${dd}`;
}

/**
 * Calcula la fecha límite de pago según la regla de negocio:
 * - SOAT: mismo día del vencimiento.
 * - Tecnomecánica: 2 días antes del vencimiento.
 */
export function calcularFechaPagoDocumento(
  tipoDocumento: TipoDocumentoLegalObligatorio,
  fechaVencimientoISO: string
): string {
  if (!esFechaISOValida(fechaVencimientoISO)) return fechaVencimientoISO;
  return tipoDocumento === 'SOAT'
    ? fechaVencimientoISO
    : sumarDiasISODoc(fechaVencimientoISO, -2);
}

/**
 * Evalúa el estado de recordatorio de un documento legal (SOAT o Tecnomecánica)
 * contra la fecha calendario de referencia (`hoyISO`).
 */
export function evaluarDocumentoLegal(params: {
  tipoDocumento: TipoDocumentoLegalObligatorio;
  documento?: DocumentoLegalEntrada | null | undefined;
  hoyISO?: string | undefined;
}): EvaluacionDocumentoLegal {
  const hoyISO = params.hoyISO ?? toClientISODate();
  const { tipoDocumento, documento } = params;
  const nombreDoc = tipoDocumento === 'SOAT' ? 'SOAT' : 'Tecnomecánica';

  if (!documento || !esFechaISOValida(documento.fechaVencimiento)) {
    return {
      tipoDocumento,
      documentoId: documento?.id ?? null,
      numeroReferencia: documento?.numeroReferencia ?? null,
      fechaExpedicion: documento?.fechaExpedicion ?? null,
      fechaVencimiento: null,
      fechaPago: null,
      diasParaPago: null,
      diasParaVencimiento: null,
      estado: 'SIN_REGISTRAR',
      etiquetaEstado: 'Sin registrar',
      mensajeDetalle: `Falta registrar ${nombreDoc} del vehículo.`,
      bloqueaOperacion: true,
      requiereNotificacion: false,
    };
  }

  const fechaVencimiento = documento.fechaVencimiento;
  const fechaPago = calcularFechaPagoDocumento(tipoDocumento, fechaVencimiento);
  const diasParaPago = diffDiasISO(hoyISO, fechaPago);
  const diasParaVencimiento = diffDiasISO(hoyISO, fechaVencimiento);

  if (documento.vigente === false || hoyISO > fechaVencimiento) {
    return {
      tipoDocumento,
      documentoId: documento.id,
      numeroReferencia: documento.numeroReferencia,
      fechaExpedicion: documento.fechaExpedicion,
      fechaVencimiento,
      fechaPago,
      diasParaPago,
      diasParaVencimiento,
      estado: 'SIN_REALIZAR',
      etiquetaEstado:
        tipoDocumento === 'SOAT' ? 'Sin SOAT vigente' : 'Sin realizar tecnomecánica',
      mensajeDetalle:
        documento.vigente === false
          ? `${nombreDoc} inactivo. Registra el documento renovado.`
          : `Venció el ${formatearFechaDocumento(fechaVencimiento)}.`,
      bloqueaOperacion: true,
      requiereNotificacion: false,
    };
  }

  if (hoyISO >= fechaPago && hoyISO <= fechaVencimiento) {
    const detalleRtm =
      tipoDocumento === 'TECNICO_MECANICA' && hoyISO > fechaPago
        ? `Fecha límite de pago alcanzada · Vence el ${formatearFechaDocumento(fechaVencimiento)}`
        : `Fecha de pago: ${formatearFechaDocumento(fechaPago)}`;

    return {
      tipoDocumento,
      documentoId: documento.id,
      numeroReferencia: documento.numeroReferencia,
      fechaExpedicion: documento.fechaExpedicion,
      fechaVencimiento,
      fechaPago,
      diasParaPago,
      diasParaVencimiento,
      estado: 'HOY_FECHA_PAGO',
      etiquetaEstado: 'Hoy es la fecha de pago',
      mensajeDetalle: detalleRtm,
      bloqueaOperacion: false,
      requiereNotificacion: true,
    };
  }

  if (diasParaPago >= 1 && diasParaPago <= 7) {
    const etiquetaDias =
      diasParaPago === 1
        ? 'Falta 1 día para la fecha de pago'
        : `Faltan ${diasParaPago} días para la fecha de pago`;

    return {
      tipoDocumento,
      documentoId: documento.id,
      numeroReferencia: documento.numeroReferencia,
      fechaExpedicion: documento.fechaExpedicion,
      fechaVencimiento,
      fechaPago,
      diasParaPago,
      diasParaVencimiento,
      estado: 'CUENTA_REGRESIVA',
      etiquetaEstado: etiquetaDias,
      mensajeDetalle: `Fecha de pago: ${formatearFechaDocumento(fechaPago)}`,
      bloqueaOperacion: false,
      requiereNotificacion: true,
    };
  }

  if (diasParaPago >= 8 && diasParaPago <= 20) {
    return {
      tipoDocumento,
      documentoId: documento.id,
      numeroReferencia: documento.numeroReferencia,
      fechaExpedicion: documento.fechaExpedicion,
      fechaVencimiento,
      fechaPago,
      diasParaPago,
      diasParaVencimiento,
      estado: 'PROXIMO_A_VENCER',
      etiquetaEstado: 'Próximo a vencer',
      mensajeDetalle: `Fecha de pago: ${formatearFechaDocumento(fechaPago)}`,
      bloqueaOperacion: false,
      requiereNotificacion: true,
    };
  }

  return {
    tipoDocumento,
    documentoId: documento.id,
    numeroReferencia: documento.numeroReferencia,
    fechaExpedicion: documento.fechaExpedicion,
    fechaVencimiento,
    fechaPago,
    diasParaPago,
    diasParaVencimiento,
    estado: 'VIGENTE',
    etiquetaEstado: 'Vigente',
    mensajeDetalle: `Al día · Vence el ${formatearFechaDocumento(fechaVencimiento)}`,
    bloqueaOperacion: false,
    requiereNotificacion: false,
  };
}

function seleccionarDocumentoActual<T extends { vigente: boolean; fechaVencimiento: string | null }>(
  filas: readonly T[]
): T | null {
  if (filas.length === 0) return null;
  const ordenadas = [...filas].sort((a, b) => {
    if (a.vigente !== b.vigente) {
      return a.vigente ? -1 : 1;
    }
    const fa = a.fechaVencimiento ?? '';
    const fb = b.fechaVencimiento ?? '';
    return fb.localeCompare(fa);
  });
  return ordenadas[0] ?? null;
}

/**
 * Consolida la evaluación documental completa de un vehículo a partir de sus filas en `documentos_vehiculo`.
 */
export function evaluarResumenDocumentalVehiculo(params: {
  categoria?: string | null | undefined;
  documentos: ReadonlyArray<
    Pick<
      DocumentoVehiculoSelect,
      | 'id'
      | 'tipoDocumento'
      | 'numeroReferencia'
      | 'fechaExpedicion'
      | 'fechaVencimiento'
      | 'vigente'
      | 'archivoR2Key'
      | 'archivoReversoR2Key'
      | 'actualizadoEn'
    >
  >;
  hoyISO?: string | undefined;
}): ResumenDocumentalVehiculo {
  const hoyISO = params.hoyISO ?? toClientISODate();

  if (esCategoriaExentaDocumentosLegales(params.categoria)) {
    return {
      exentoPorLey2486: true,
      bloqueadoPorDocumentos: false,
      motivoBloqueo: null,
      alertasBloqueo: [],
      soat: null,
      tecnomecanica: null,
      licenciaTransito: {
        documentoId: null,
        tieneFrente: false,
        tieneReverso: false,
        completa: false,
        actualizadoEnMs: null,
      },
    };
  }

  const soatRow = seleccionarDocumentoActual(
    params.documentos.filter((d) => d.tipoDocumento === 'SOAT')
  );
  const rtmRow = seleccionarDocumentoActual(
    params.documentos.filter((d) => d.tipoDocumento === 'TECNICO_MECANICA')
  );
  const licenciaRows = params.documentos.filter(
    (d) => d.tipoDocumento === 'TARJETA_PROPIEDAD'
  );
  const licenciaRow =
    licenciaRows.find((d) => d.vigente) ?? licenciaRows[0] ?? null;

  const soat = evaluarDocumentoLegal({
    tipoDocumento: 'SOAT',
    documento: soatRow,
    hoyISO,
  });

  const tecnomecanica = evaluarDocumentoLegal({
    tipoDocumento: 'TECNICO_MECANICA',
    documento: rtmRow,
    hoyISO,
  });

  const alertasBloqueo: string[] = [];
  if (soat.bloqueaOperacion) {
    alertasBloqueo.push(
      soat.estado === 'SIN_REGISTRAR' ? 'SOAT sin registrar' : soat.etiquetaEstado
    );
  }
  if (tecnomecanica.bloqueaOperacion) {
    alertasBloqueo.push(
      tecnomecanica.estado === 'SIN_REGISTRAR'
        ? 'Tecnomecánica sin registrar'
        : tecnomecanica.etiquetaEstado
    );
  }

  const tieneFrente = Boolean(licenciaRow?.archivoR2Key);
  const tieneReverso = Boolean(licenciaRow?.archivoReversoR2Key);

  return {
    exentoPorLey2486: false,
    bloqueadoPorDocumentos: alertasBloqueo.length > 0,
    motivoBloqueo: alertasBloqueo.length > 0 ? alertasBloqueo.join(' · ') : null,
    alertasBloqueo,
    soat,
    tecnomecanica,
    licenciaTransito: {
      documentoId: licenciaRow?.id ?? null,
      tieneFrente,
      tieneReverso,
      completa: tieneFrente && tieneReverso,
      actualizadoEnMs: licenciaRow?.actualizadoEn
        ? licenciaRow.actualizadoEn.getTime()
        : null,
    },
  };
}
