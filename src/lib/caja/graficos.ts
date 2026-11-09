/**
 * Geometría y paletas compartidas por las gráficas de distribución financiera
 * (Donut completa y Tarjeta Horizontal). Funciones puras, sin dependencias de UI.
 */

/**
 * Paleta Canónica Azul FlotaX compartida por las gráficas de Finanzas.
 * Escala sobria y no vibrante de azules institucionales y marinos de FlotaX:
 * - Azul marino profundo: #0F172A
 * - Azul marino institucional: #1E3A8A
 * - Azul corporativo sobrio: #1E40AF
 * - Azul medianoche: #172554
 * - Azul pizarra oscuro: #1E293B
 * - Azul pizarra medio: #334155
 * - Azul pizarra templado: #475569
 */
export const PALETA_CIRCULAR_FLOTAX = [
  '#1E3A8A', // Azul marino institucional FlotaX
  '#0F172A', // Azul marino profundo (Base abisal)
  '#1E40AF', // Azul corporativo sobrio
  '#172554', // Azul medianoche
  '#1E293B', // Azul pizarra oscuro
  '#334155', // Azul pizarra medio
  '#475569', // Azul pizarra templado
] as const;

export const PALETA_GASTOS_FLOTAX = PALETA_CIRCULAR_FLOTAX;
export const PALETA_CANALES_FLOTAX = PALETA_CIRCULAR_FLOTAX;

export function polarACartesiano(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export function crearPathSectorAnular(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  startDeg: number,
  endDeg: number
): string {
  const sweep = Math.max(0.5, endDeg - startDeg);
  const largeArc = sweep > 180 ? 1 : 0;

  const pOutStart = polarACartesiano(cx, cy, rOut, startDeg);
  const pOutEnd = polarACartesiano(cx, cy, rOut, endDeg);
  const pInEnd = polarACartesiano(cx, cy, rIn, endDeg);
  const pInStart = polarACartesiano(cx, cy, rIn, startDeg);

  return [
    `M ${pOutStart.x.toFixed(2)} ${pOutStart.y.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 ${largeArc} 1 ${pOutEnd.x.toFixed(2)} ${pOutEnd.y.toFixed(2)}`,
    `L ${pInEnd.x.toFixed(2)} ${pInEnd.y.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 ${largeArc} 0 ${pInStart.x.toFixed(2)} ${pInStart.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export interface SegmentoAngular {
  readonly startDeg: number;
  readonly endDeg: number;
  readonly midDeg: number;
}

/**
 * Reparte 360° entre los totales dados, con separación angular fija entre arcos.
 * Devuelve un arreglo paralelo a `totales`.
 */
export function calcularSegmentosAngulares(
  totales: readonly number[],
  opciones: { gapDeg?: number; inicioDeg?: number; minSweepDeg?: number } = {}
): SegmentoAngular[] {
  const { gapDeg = 4.8, inicioDeg = -90, minSweepDeg = 6.5 } = opciones;
  const suma = totales.reduce((acc, t) => acc + t, 0);
  if (totales.length === 0 || suma <= 0) return [];

  const disponibleDeg = Math.max(120, 360 - totales.length * gapDeg);
  const crudos = totales.map((t) =>
    Math.max(minSweepDeg, (t / suma) * disponibleDeg)
  );
  const sumaCrudos = crudos.reduce((acc, s) => acc + s, 0) || 1;
  const factor = disponibleDeg / sumaCrudos;

  let cursor = inicioDeg;
  return crudos.map((crudo) => {
    const sweep = crudo * factor;
    const startDeg = cursor;
    const endDeg = cursor + sweep;
    cursor = endDeg + gapDeg;
    return { startDeg, endDeg, midDeg: (startDeg + endDeg) / 2 };
  });
}

