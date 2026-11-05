/**
 * Geometría y paletas compartidas por las gráficas de distribución financiera
 * (Donut completa y Tarjeta Horizontal). Funciones puras, sin dependencias de UI.
 */

export const PALETA_GASTOS_FLOTAX = [
  '#2D6BFF', // Azul FlotaX (Principal)
  '#10B981', // Esmeralda Operativo
  '#F59E0B', // Ámbar Cálido
  '#F43F47', // Carmesí Operativo
  '#0EA5E9', // Celeste Técnico
  '#9CA3AF', // Gris Canónico Movix
] as const;

export const PALETA_CANALES_FLOTAX = [
  '#10B981', // Esmeralda (Recaudo Principal)
  '#2D6BFF', // Azul FlotaX (Transferencias / Bancos)
  '#1F2937', // Carbón Canónico Movix
  '#F59E0B', // Ámbar Cálido
  '#9CA3AF', // Gris Canónico Movix
] as const;

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

