/**
 * Geometría paramétrica y trazador SVG para la muesca cóncava dinámica
 * de la barra de navegación líquida de FlotaX.
 *
 * Modela un contenedor tipo píldora (esquinas redondeadas con radio H/2)
 * con una cuna cóncava circular concéntrica alrededor del indicador activo,
 * unida tangencialmente (continuidad G1) tanto al borde superior plano como
 * a las tapas semicirculares laterales cuando el indicador está en los extremos.
 */

export const LIQUID_DOCK_GEOMETRY = {
  /** Diámetro del indicador circular activo (px). */
  circleDiameter: 40,
  /** Radio del indicador circular activo (px). */
  circleRadius: 20,
  /** Coordenada Y del centro del círculo respecto al borde superior de la barra (px). */
  circleCenterY: 19,
  /** Separación uniforme entre el círculo activo y el borde cóncavo de la muesca (px). */
  notchGap: 4,
  /** Radio de curvatura del hombro suave al salir del borde superior plano (px). */
  shoulderRadius: 10,
  /** Radio mínimo del hombro al integrarse con las tapas laterales en los extremos (px). */
  edgeShoulderRadius: 2,
} as const;

interface ShoulderSolution {
  readonly mode: 'flat' | 'cap';
  readonly radius: number;
  readonly capX: number;
  readonly capY: number;
  readonly notchX: number;
  readonly notchY: number;
}

export interface LiquidNotchOptions {
  readonly circleCenterY?: number;
  readonly notchRadius?: number;
  readonly shoulderRadius?: number;
  readonly edgeShoulderRadius?: number;
}

function solveLeftShoulder(
  capRadius: number,
  cy: number,
  notchRadius: number,
  shoulderRadius: number,
  edgeShoulderRadius: number,
  cxFromLeft: number,
): ShoulderSolution {
  const dyFlat = cy - shoulderRadius;
  const maxSpanSq = Math.max(0, (shoulderRadius + notchRadius) ** 2 - dyFlat ** 2);
  const dxFlat = Math.sqrt(maxSpanSq);
  const flatStartX = cxFromLeft - dxFlat;

  if (flatStartX >= capRadius) {
    const sx = flatStartX;
    const sy = shoulderRadius;
    const dn = Math.hypot(cxFromLeft - sx, cy - sy) || 1;
    return {
      mode: 'flat',
      radius: shoulderRadius,
      capX: sx,
      capY: 0,
      notchX: sx + ((cxFromLeft - sx) * shoulderRadius) / dn,
      notchY: sy + ((cy - sy) * shoulderRadius) / dn,
    };
  }

  const t = dxFlat > 0 ? Math.max(0, Math.min(1, (cxFromLeft - capRadius) / dxFlat)) : 0;
  const smooth = t * t * (3 - 2 * t);
  const rf = edgeShoulderRadius + (shoulderRadius - edgeShoulderRadius) * smooth;

  const r1 = capRadius - rf;
  const r2 = notchRadius + rf;
  const dx = cxFromLeft - capRadius;
  const dy = cy - capRadius;
  const d = Math.hypot(dx, dy) || 1;

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const ux = dx / d;
  const uy = dy / d;
  const px = capRadius + a * ux;
  const py = capRadius + a * uy;

  const sx1 = px + h * uy;
  const sy1 = py - h * ux;
  const sx2 = px - h * uy;
  const sy2 = py + h * ux;

  // Seleccionar la solución en el flanco izquierdo del indicador
  const useFirst = sx1 < sx2;
  const sx = useFirst ? sx1 : sx2;
  const sy = useFirst ? sy1 : sy2;

  const dl = Math.hypot(sx - capRadius, sy - capRadius) || 1;
  const capX = capRadius + ((sx - capRadius) * capRadius) / dl;
  const capY = capRadius + ((sy - capRadius) * capRadius) / dl;

  const dn = Math.hypot(cxFromLeft - sx, cy - sy) || 1;
  const notchX = sx + ((cxFromLeft - sx) * rf) / dn;
  const notchY = sy + ((cy - sy) * rf) / dn;

  return {
    mode: 'cap',
    radius: rf,
    capX,
    capY,
    notchX,
    notchY,
  };
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

/**
 * Construye el atributo `d` SVG cerrado de la barra tipo píldora con muesca
 * cóncava sincronizada al centro `cx` del indicador circular.
 */
export function buildLiquidNotchPath(
  width: number,
  height: number,
  cx: number,
  options: LiquidNotchOptions = {},
): string {
  const safeWidth = Math.max(height + 2, width);
  const safeHeight = Math.max(24, height);
  const capRadius = safeHeight / 2;

  const cy = options.circleCenterY ?? LIQUID_DOCK_GEOMETRY.circleCenterY;
  const notchRadius =
    options.notchRadius ??
    LIQUID_DOCK_GEOMETRY.circleRadius + LIQUID_DOCK_GEOMETRY.notchGap;
  const shoulderRadius = options.shoulderRadius ?? LIQUID_DOCK_GEOMETRY.shoulderRadius;
  const edgeShoulderRadius =
    options.edgeShoulderRadius ?? LIQUID_DOCK_GEOMETRY.edgeShoulderRadius;

  // Limitar excursión extrema para preservar continuidad geométrica durante rubber-band
  const clampedCx = Math.max(capRadius * 0.65, Math.min(safeWidth - capRadius * 0.65, cx));

  const left = solveLeftShoulder(
    capRadius,
    cy,
    notchRadius,
    shoulderRadius,
    edgeShoulderRadius,
    clampedCx,
  );
  const rightMirrored = solveLeftShoulder(
    capRadius,
    cy,
    notchRadius,
    shoulderRadius,
    edgeShoulderRadius,
    safeWidth - clampedCx,
  );
  const right: ShoulderSolution = {
    mode: rightMirrored.mode,
    radius: rightMirrored.radius,
    capX: safeWidth - rightMirrored.capX,
    capY: rightMirrored.capY,
    notchX: safeWidth - rightMirrored.notchX,
    notchY: rightMirrored.notchY,
  };

  // Calcular ángulo barrido en sentido antihorario para el arco cóncavo inferior
  const a1 = Math.atan2(left.notchY - cy, left.notchX - clampedCx);
  const a2 = Math.atan2(right.notchY - cy, right.notchX - clampedCx);
  const twoPi = Math.PI * 2;
  const ccwDelta = (((a1 - a2) % twoPi) + twoPi) % twoPi;
  const largeArc = ccwDelta > Math.PI ? 1 : 0;

  const parts: string[] = [
    `M ${fmt(capRadius)} ${fmt(safeHeight)}`,
  ];

  if (left.mode === 'flat') {
    parts.push(`A ${fmt(capRadius)} ${fmt(capRadius)} 0 0 1 ${fmt(capRadius)} 0`);
    parts.push(`L ${fmt(left.capX)} 0`);
  } else {
    parts.push(
      `A ${fmt(capRadius)} ${fmt(capRadius)} 0 0 1 ${fmt(left.capX)} ${fmt(left.capY)}`,
    );
  }

  parts.push(
    `A ${fmt(left.radius)} ${fmt(left.radius)} 0 0 1 ${fmt(left.notchX)} ${fmt(left.notchY)}`,
  );
  parts.push(
    `A ${fmt(notchRadius)} ${fmt(notchRadius)} 0 ${largeArc} 0 ${fmt(right.notchX)} ${fmt(right.notchY)}`,
  );
  parts.push(
    `A ${fmt(right.radius)} ${fmt(right.radius)} 0 0 1 ${fmt(right.capX)} ${fmt(right.capY)}`,
  );

  if (right.mode === 'flat') {
    parts.push(`L ${fmt(safeWidth - capRadius)} 0`);
  }

  parts.push(
    `A ${fmt(capRadius)} ${fmt(capRadius)} 0 0 1 ${fmt(safeWidth - capRadius)} ${fmt(safeHeight)}`,
  );
  parts.push('Z');

  return parts.join(' ');
}

/**
 * Calcula un factor suave [0..1] de superposición entre el indicador circular
 * en `cx` y el centro de una pestaña `tabX`.
 */
export function computeIconProximity(
  cx: number,
  tabX: number,
  reach: number = LIQUID_DOCK_GEOMETRY.circleRadius * 1.15,
): number {
  const linear = Math.max(0, Math.min(1, 1 - Math.abs(cx - tabX) / reach));
  return linear * linear * (3 - 2 * linear);
}
