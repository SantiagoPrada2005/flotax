import type {
  EstadoDepositoGarantia,
  EstadoReserva,
  ZonaEvidenciaVehiculo,
} from '@/db/schema';

export interface ZonaFotoAlquilerDef {
  id: ZonaEvidenciaVehiculo;
  etiqueta: string;
  descripcionCorta: string;
}

/**
 * Las 6 zonas fotográficas obligatorias del ciclo de entrega y devolución.
 */
export const ZONAS_FOTOS_ALQUILER: ReadonlyArray<ZonaFotoAlquilerDef> = [
  {
    id: 'EXTERIOR_FRONTAL',
    etiqueta: 'Frente',
    descripcionCorta: 'Parachoques delantero, faros, capó y parabrisas',
  },
  {
    id: 'EXTERIOR_LATERAL_DER',
    etiqueta: 'Lateral derecho',
    descripcionCorta: 'Puertas derechas, espejo, guardabarros y rines',
  },
  {
    id: 'EXTERIOR_LATERAL_IZQ',
    etiqueta: 'Lateral izquierdo',
    descripcionCorta: 'Puertas izquierdas, espejo, guardabarros y rines',
  },
  {
    id: 'EXTERIOR_TRASERO',
    etiqueta: 'Parte trasera',
    descripcionCorta: 'Baúl, luces traseras, parachoques y placa',
  },
  {
    id: 'INTERIOR_CABINA',
    etiqueta: 'Interior',
    descripcionCorta: 'Cojinería, consola central, tapetes y limpieza',
  },
  {
    id: 'PANTALLA_TABLERO_ODOMETRO',
    etiqueta: 'Tablero y odómetro',
    descripcionCorta: 'Kilometraje legible, nivel de combustible y testigos',
  },
];

const ETIQUETAS_ZONA: Readonly<Record<ZonaEvidenciaVehiculo, string>> = {
  EXTERIOR_FRONTAL: 'Frente',
  EXTERIOR_LATERAL_DER: 'Lateral derecho',
  EXTERIOR_LATERAL_IZQ: 'Lateral izquierdo',
  EXTERIOR_TRASERO: 'Parte trasera',
  EXTERIOR_TECHO: 'Techo',
  LLANTAS_RINES: 'Llantas y rines',
  INTERIOR_CABINA: 'Interior',
  INTERIOR_ASIENTOS: 'Asientos',
  BAUL_EQUIPAJE: 'Baúl',
  PANTALLA_TABLERO_ODOMETRO: 'Tablero y odómetro',
  NIVEL_COMBUSTIBLE_BATERIA: 'Nivel de combustible / batería',
  MOTOR_CAPO: 'Motor y capó',
  KIT_CARRETERA_ACCESORIOS: 'Kit de carretera y accesorios',
  VIDEO_RECORRIDO_360: 'Video 360°',
  DETALLE_NOVEDAD_DANO: 'Detalle de novedad',
  ANGULO_ESTUDIO_360: 'Vista general',
};

const ETIQUETAS_ZONA_LOOKUP: ReadonlyMap<string, string> = new Map(
  Object.entries(ETIQUETAS_ZONA)
);

export function etiquetaZonaEvidencia(zona: string): string {
  return ETIQUETAS_ZONA_LOOKUP.get(zona) ?? zona.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

const ETIQUETAS_GARANTIA: ReadonlyMap<string, string> = new Map([
  ['PENDIENTE_RECIBIR', 'Pendiente por recibir'],
  ['RECIBIDO_CUSTODIA', 'En custodia'],
  ['EN_REVISION', 'En revisión'],
  ['PENDIENTE_DEVOLUCION', 'Pendiente por devolver'],
  ['DEVUELTO_PARCIAL', 'Devuelta parcialmente'],
  ['DEVUELTO_TOTAL', 'Devuelta en su totalidad'],
  ['APLICADO_CARGOS', 'Aplicada a cobros'],
]);

export function etiquetaEstadoGarantia(estado: string): string {
  return ETIQUETAS_GARANTIA.get(estado) ?? estado.replace(/_/g, ' ');
}

const ETIQUETAS_METODO_PAGO: ReadonlyMap<string, string> = new Map([
  ['efectivo', 'Efectivo'],
  ['transferencia', 'Transferencia / PSE'],
  ['tarjeta', 'Tarjeta / Datáfono'],
  ['especie', 'En especie'],
  ['otro', 'Otro método'],
  ['TRANSFERENCIA_PSE', 'Transferencia / PSE'],
  ['NEQUI_BREB', 'Nequi / Bre-B'],
  ['CAJA_PATIO', 'Caja en patio'],
  ['EFECTIVO', 'Efectivo'],
  ['TARJETA', 'Tarjeta'],
]);

export function etiquetaMetodoPago(metodo: string): string {
  return ETIQUETAS_METODO_PAGO.get(metodo) ?? metodo;
}

export function etiquetaEstadoReservaCorta(estado: EstadoReserva): string {
  switch (estado) {
    case 'PENDIENTE':
      return 'Reservado (Pendiente)';
    case 'CONFIRMADA':
      return 'Confirmada';
    case 'EN_CURSO':
      return 'En curso';
    case 'PAUSADA':
      return 'En pausa';
    case 'COMPLETADA':
      return 'Finalizado';
    case 'CANCELADA':
      return 'Cancelada';
    case 'RECHAZADA':
      return 'Rechazada';
  }
}

export interface LiquidacionCierreInput {
  totalAlquilerBase: number;
  totalPagadoPrevio: number;
  totalCobrosAdicionales: number;
  sobrecostoLocal?: number | undefined;
  descuentoAjusteLocal?: number | undefined;
  garantiaDisponible: number;
}

export interface ResultadoLiquidacionCierre {
  totalAlquilerBase: number;
  totalCobrosAdicionales: number;
  sobrecostoLocal: number;
  descuentoAjusteLocal: number;
  totalFacturaFinal: number;
  totalPagadoPrevio: number;
  garantiaDisponible: number;
  /** Monto descontado de la garantía retenida para cubrir cobros adicionales / sobrecostos. */
  garantiaRetenidaPorCobros: number;
  /** Diferencia de la garantía que se devuelve al cliente si el cobro es menor que la garantía. */
  garantiaADevolver: number;
  /** Excedente de cobros adicionales que supera la garantía y pasa a saldo por cobrar al cliente. */
  excedenteCobrosPorCobrar: number;
  /** Saldo pendiente correspondiente al canon base del alquiler (antes de cobros adicionales). */
  saldoPendienteBase: number;
  /** Saldo total pendiente por cobrar al cliente (saldo base + excedente de cobros sobre garantía). */
  saldoPendientePorCobrar: number;
  /** Saldo a favor del cliente por reembolso de alquiler (si hubo descuento mayor al saldo). */
  excedentePagadoAReembolsar: number;
  /** Estado final sugerido para el depósito de garantía tras aplicar cobros y devolver diferencia. */
  estadoFinalGarantiaSugerido: EstadoDepositoGarantia;
}

/**
 * Calcula de forma determinista y compartida (frontend + backend) la liquidación de cierre
 * del alquiler descontando cobros adicionales sobre la garantía retenida:
 * - Si los cobros son menores o iguales que la garantía disponible, se retiene el monto exacto
 *   del cobro y se devuelve la diferencia al cliente.
 * - Si los cobros superan la garantía disponible, se retiene el 100% de la garantía y la
 *   diferencia excedente se suma al saldo pendiente por cobrar al cliente.
 */
export function calcularLiquidacionCierreAlquiler(
  input: LiquidacionCierreInput
): ResultadoLiquidacionCierre {
  const totalAlquilerBase = Math.max(0, Math.round(input.totalAlquilerBase || 0));
  const totalPagadoPrevio = Math.max(0, Math.round(input.totalPagadoPrevio || 0));
  const totalCobrosAdicionales = Math.max(0, Math.round(input.totalCobrosAdicionales || 0));
  const sobrecostoLocal = Math.max(0, Math.round(input.sobrecostoLocal || 0));
  const descuentoAjusteLocal = Math.max(0, Math.round(input.descuentoAjusteLocal || 0));
  const garantiaDisponible = Math.max(0, Math.round(input.garantiaDisponible || 0));

  const totalCargosCierre = totalCobrosAdicionales + sobrecostoLocal;
  const totalFacturaFinal = Math.max(
    0,
    totalAlquilerBase + totalCargosCierre - descuentoAjusteLocal
  );

  const subtotalBaseAjustado = Math.max(0, totalAlquilerBase - descuentoAjusteLocal);
  const saldoPendienteBase = Math.max(0, subtotalBaseAjustado - totalPagadoPrevio);

  const excedentePagadoAReembolsar = Math.max(0, totalPagadoPrevio - totalFacturaFinal);
  const montoPorCubrirTotal = Math.max(0, totalFacturaFinal - totalPagadoPrevio);

  // Solo se descuenta de la garantía la porción de cargos que realmente falta por cubrir
  const cobrosCubriblesPorGarantia = Math.min(totalCargosCierre, montoPorCubrirTotal);
  const garantiaRetenidaPorCobros = Math.min(garantiaDisponible, cobrosCubriblesPorGarantia);
  const garantiaADevolver = Math.max(0, garantiaDisponible - garantiaRetenidaPorCobros);
  const excedenteCobrosPorCobrar = Math.max(
    0,
    cobrosCubriblesPorGarantia - garantiaRetenidaPorCobros
  );
  const saldoPendientePorCobrar = Math.max(
    0,
    montoPorCubrirTotal - garantiaRetenidaPorCobros
  );

  let estadoFinalGarantiaSugerido: EstadoDepositoGarantia = 'DEVUELTO_TOTAL';
  if (garantiaDisponible <= 0) {
    estadoFinalGarantiaSugerido = 'PENDIENTE_RECIBIR';
  } else if (garantiaRetenidaPorCobros === 0) {
    estadoFinalGarantiaSugerido = 'DEVUELTO_TOTAL';
  } else if (garantiaADevolver > 0) {
    estadoFinalGarantiaSugerido = 'DEVUELTO_PARCIAL';
  } else {
    estadoFinalGarantiaSugerido = 'APLICADO_CARGOS';
  }

  return {
    totalAlquilerBase,
    totalCobrosAdicionales,
    sobrecostoLocal,
    descuentoAjusteLocal,
    totalFacturaFinal,
    totalPagadoPrevio,
    garantiaDisponible,
    garantiaRetenidaPorCobros,
    garantiaADevolver,
    excedenteCobrosPorCobrar,
    saldoPendienteBase,
    saldoPendientePorCobrar,
    excedentePagadoAReembolsar,
    estadoFinalGarantiaSugerido,
  };
}
