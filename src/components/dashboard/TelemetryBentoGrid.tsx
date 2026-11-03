import { useState } from 'react';
import { formatearMonedaCompactaCOP } from '@/lib/caja';
import type {
  DailyCompanyMovementItem,
  DailyCurveSeriesFilter,
  DailyMovementCurvePoint,
  DailyMovementFilter,
  DailyMovementsSummary,
  DailyVehicleEarningsSummary,
  RentedAutomobileItem,
  RentedFleetComplement,
} from '@/lib/metricas';

export type TelemetryBentoViewMode =
  | 'OVERVIEW_PULSE_TILE'
  | 'OVERVIEW_CURVE_CARD'
  | 'OVERVIEW_RECENT_STRIP'
  | 'EARNINGS_FLEET_DETAIL'
  | 'MOVEMENTS_DETAIL';

export interface TelemetryBentoGridProps {
  readonly viewMode: TelemetryBentoViewMode;
  readonly dailyEarnings: DailyVehicleEarningsSummary;
  readonly rentedFleet: RentedFleetComplement;
  readonly dailyMovements: DailyMovementsSummary;
  readonly onOpenMovementsDetail?: (() => void) | undefined;
  readonly onSelectAutomobile: (item: RentedAutomobileItem) => void;
  readonly onSelectMovement: (item: DailyCompanyMovementItem) => void;
}

type DailyBreakdownMode = 'CATEGORY' | 'HOURLY';

const MOVEMENT_FILTERS: readonly { id: DailyMovementFilter; label: string }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'INGRESO', label: 'Ingresos' },
  { id: 'EGRESO', label: 'Egresos' },
];

const SERIES_FILTERS: readonly {
  readonly id: DailyCurveSeriesFilter;
  readonly label: string;
}[] = [
  { id: 'AMBAS', label: 'Ambas series' },
  { id: 'SOLO_INGRESOS', label: 'Solo ingresos' },
  { id: 'SOLO_EGRESOS', label: 'Solo egresos' },
];

const CATEGORY_RING_COLORS: readonly string[] = [
  '#111827',
  '#4B5563',
  '#9CA3AF',
];

interface CurveNode {
  readonly x: number;
  readonly y: number;
  readonly value: number;
}

function buildCatmullRomSpline(
  nodes: readonly CurveNode[],
  baselineY: number,
  leftX: number,
  rightX: number
): { readonly line: string; readonly area: string } {
  if (nodes.length === 0) return { line: '', area: '' };
  if (nodes.length === 1) {
    const single = nodes[0]!;
    return {
      line: `M ${leftX} ${single.y} L ${rightX} ${single.y}`,
      area: `M ${leftX} ${single.y} L ${rightX} ${single.y} L ${rightX} ${baselineY} L ${leftX} ${baselineY} Z`,
    };
  }

  let d = `M ${nodes[0]!.x} ${nodes[0]!.y}`;
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[Math.max(0, i - 1)]!;
    const p1 = nodes[i]!;
    const p2 = nodes[i + 1]!;
    const p3 = nodes[Math.min(nodes.length - 1, i + 2)]!;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  const last = nodes[nodes.length - 1]!;
  const first = nodes[0]!;
  const area = `${d} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
  return { line: d, area };
}

interface DailyMovementsCurveChartProps {
  readonly points: readonly DailyMovementCurvePoint[];
  readonly variant: 'COMPACT_OVERVIEW' | 'FULL_INTERACTIVE';
  readonly onOpenDetail?: (() => void) | undefined;
}

function DailyMovementsCurveChart({
  points,
  variant,
  onOpenDetail,
}: DailyMovementsCurveChartProps) {
  const defaultIdx = Math.max(0, points.length - 1);
  const [seriesFilter, setSeriesFilter] =
    useState<DailyCurveSeriesFilter>('AMBAS');
  const [selectedIdx, setSelectedIdx] = useState<number>(defaultIdx);

  const safeIdx = Math.min(selectedIdx, Math.max(0, points.length - 1));
  const activePoint = points[safeIdx] ?? points[defaultIdx];

  const maxPeak = Math.max(
    100_000,
    ...points.map((p) => Math.max(p.income, p.expense))
  );
  const scaleTop = Math.ceil(maxPeak / 500_000) * 500_000 || maxPeak;

  const SVG_WIDTH = 620;
  const SVG_HEIGHT = 225;
  const PAD_LEFT = 64;
  const PAD_RIGHT = 22;
  const PAD_TOP = 28;
  const PAD_BOTTOM = 26;
  const BASELINE_Y = SVG_HEIGHT - PAD_BOTTOM;

  const normalizeY = (val: number) => {
    const usableH = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const ratio = Math.min(1, Math.max(0, val / scaleTop));
    return Math.round((BASELINE_Y - ratio * usableH) * 10) / 10;
  };

  const normalizeX = (index: number, total: number) => {
    if (total <= 1) return (SVG_WIDTH + PAD_LEFT) / 2;
    const usableW = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
    return Math.round((PAD_LEFT + (index / (total - 1)) * usableW) * 10) / 10;
  };

  const incomeNodes: CurveNode[] = points.map((p, i) => ({
    x: normalizeX(i, points.length),
    y: normalizeY(p.income),
    value: p.income,
  }));

  const expenseNodes: CurveNode[] = points.map((p, i) => ({
    x: normalizeX(i, points.length),
    y: normalizeY(p.expense),
    value: p.expense,
  }));

  const incomeSpline = buildCatmullRomSpline(
    incomeNodes,
    BASELINE_Y,
    PAD_LEFT,
    SVG_WIDTH - PAD_RIGHT
  );
  const expenseSpline = buildCatmullRomSpline(
    expenseNodes,
    BASELINE_Y,
    PAD_LEFT,
    SVG_WIDTH - PAD_RIGHT
  );

  const ticksY = [
    { value: scaleTop, y: normalizeY(scaleTop) },
    { value: Math.round(scaleTop * 0.66), y: normalizeY(scaleTop * 0.66) },
    { value: Math.round(scaleTop * 0.33), y: normalizeY(scaleTop * 0.33) },
    { value: 0, y: normalizeY(0) },
  ];

  const isInteractive = variant === 'FULL_INTERACTIVE';
  const showIncome =
    !isInteractive || seriesFilter === 'AMBAS' || seriesFilter === 'SOLO_INGRESOS';
  const showExpense =
    !isInteractive || seriesFilter === 'AMBAS' || seriesFilter === 'SOLO_EGRESOS';

  const gradientPrefix = isInteractive ? 'full-mov' : 'ov-mov';
  const colStep =
    points.length > 1
      ? (SVG_WIDTH - PAD_LEFT - PAD_RIGHT) / (points.length - 1)
      : SVG_WIDTH - PAD_LEFT - PAD_RIGHT;

  const activeIncNode = incomeNodes[safeIdx];
  const activeExpNode = expenseNodes[safeIdx];

  return (
    <article
      aria-label="Gráfica de curvas de movimientos diarios: ingresos y egresos"
      className="relative overflow-hidden flex h-full flex-col justify-between rounded-[28px] bg-[#111827] p-5 sm:p-6 text-white shadow-xl border border-white/10 space-y-4"
    >
      {/* Luz ambiental difusa superior para profundidad visual */}
      <div
        className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-[#2D6BFF]/16 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-16 -bottom-16 h-44 w-44 rounded-full bg-white/5 blur-2xl"
        aria-hidden="true"
      />

      {/* Cabecera de la gráfica */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full bg-[#2D6BFF] ring-4 ring-[#2D6BFF]/20"
              aria-hidden="true"
            />
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
              Curva de movimientos diarios
            </h2>
          </div>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            {isInteractive
              ? 'Desliza o toca cualquier fecha para inspeccionar ingresos, egresos y neto'
              : 'Pulso visual comparativo de ingresos frente a egresos operativos'}
          </p>
        </div>

        {isInteractive ? (
          <div
            role="tablist"
            aria-label="Filtrar series de la gráfica de curvas"
            className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-[#1F2937] p-1 border border-white/10"
          >
            {SERIES_FILTERS.map((item) => {
              const active = seriesFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSeriesFilter(item.id)}
                  className={`ios-press-bounce min-h-[40px] rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                    active
                      ? 'bg-white text-[#111827] shadow-xs'
                      : 'text-[#EDEDED]/85 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenDetail}
            className="ios-press-bounce group inline-flex min-h-[44px] items-center gap-2.5 rounded-full bg-white/12 pl-4 pr-2 py-1.5 text-sm font-bold text-white border border-white/15 transition hover:bg-white/20 cursor-pointer"
          >
            <span>Ampliar curva</span>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-[#111827] transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              →
            </span>
          </button>
        )}
      </div>

      {/* Barra HUD interactiva con formas diferenciadas (círculo sólido vs anillo hueco) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#1F2937]/90 px-4 py-3 border border-white/10 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-4 font-semibold">
          <span className="inline-flex items-center gap-2 text-white">
            <span
              className="h-3 w-3 rounded-full bg-[#2D6BFF] ring-2 ring-white/80"
              aria-hidden="true"
            />
            Ingresos
          </span>
          <span className="inline-flex items-center gap-2 text-[#EDEDED]">
            <span
              className="h-3 w-3 rounded-full bg-[#111827] ring-2 ring-[#F43F47]"
              aria-hidden="true"
            />
            Egresos
          </span>
        </div>

        {activePoint && (
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 font-mono font-bold tabular-nums">
            <span className="rounded-lg bg-white px-2.5 py-0.5 text-xs font-extrabold text-[#111827]">
              {activePoint.label}
            </span>
            <span className="text-[#93C5FD]">
              +{activePoint.incomeCompactFormatted}
            </span>
            <span className="text-[#FCA5A5]">
              -{activePoint.expenseCompactFormatted}
            </span>
            {isInteractive && (
              <span className="rounded-lg bg-[#111827] px-2.5 py-0.5 text-white border border-white/10">
                Neto: {activePoint.netBalanceFormatted}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bandeja interior esculpida (Double-Bezel) con curvas luminosas y spotlight */}
      <div className="relative z-10 rounded-[22px] bg-[#1F2937]/75 p-2.5 sm:p-3.5 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto block overflow-visible select-none"
          role="img"
          aria-label="Curvas comparativas de ingresos y egresos diarios"
        >
          <defs>
            <linearGradient
              id={`${gradientPrefix}-income`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#2D6BFF" stopOpacity="0.42" />
              <stop offset="58%" stopColor="#2D6BFF" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#2D6BFF" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient
              id={`${gradientPrefix}-expense`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#F43F47" stopOpacity="0.28" />
              <stop offset="65%" stopColor="#F43F47" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#F43F47" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient
              id={`${gradientPrefix}-spotlight`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.01" />
            </linearGradient>

            <filter
              id={`${gradientPrefix}-glow`}
              x="-15%"
              y="-20%"
              width="130%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="4"
                stdDeviation="5"
                floodColor="#2D6BFF"
                floodOpacity="0.45"
              />
            </filter>
          </defs>

          {/* Guías horizontales sutiles y escala Y en formato moneda compacta legible */}
          {ticksY.map((tick, idx) => (
            <g key={`ytick-${idx}`} aria-hidden="true">
              <line
                x1={PAD_LEFT}
                y1={tick.y}
                x2={SVG_WIDTH - PAD_RIGHT}
                y2={tick.y}
                stroke="#9CA3AF"
                strokeOpacity={idx === ticksY.length - 1 ? '0.35' : '0.18'}
                strokeWidth="1"
                strokeDasharray={idx === ticksY.length - 1 ? undefined : '4 5'}
              />
              <text
                x={PAD_LEFT - 10}
                y={tick.y + 4}
                textAnchor="end"
                fill="#EDEDED"
                fontSize="12"
                fontWeight="600"
                fontFamily="JetBrains Mono, monospace"
              >
                {formatearMonedaCompactaCOP(tick.value)}
              </text>
            </g>
          ))}

          {/* Columna Spotlight iluminada sobre el día seleccionado */}
          {activeIncNode && (
            <g aria-hidden="true">
              <rect
                x={Math.max(PAD_LEFT - 8, activeIncNode.x - colStep * 0.42)}
                y={PAD_TOP - 8}
                width={Math.min(colStep * 0.84, 68)}
                height={BASELINE_Y - PAD_TOP + 8}
                rx={12}
                fill={`url(#${gradientPrefix}-spotlight)`}
              />
              <line
                x1={activeIncNode.x}
                y1={PAD_TOP - 4}
                x2={activeIncNode.x}
                y2={BASELINE_Y}
                stroke="#FFFFFF"
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            </g>
          )}

          {/* Serie 1: Egresos diarios (curva coral + nodos en anillo hueco) */}
          {showExpense && (
            <>
              {expenseSpline.area && (
                <path
                  d={expenseSpline.area}
                  fill={`url(#${gradientPrefix}-expense)`}
                />
              )}
              {expenseSpline.line && (
                <path
                  d={expenseSpline.line}
                  fill="none"
                  stroke="#F43F47"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {expenseNodes.map((node, idx) => {
                const isSelected = idx === safeIdx;
                return (
                  <g key={`exp-node-${idx}`}>
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="10"
                        fill="#F43F47"
                        fillOpacity="0.22"
                      />
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? '5.8' : '4.2'}
                      fill="#111827"
                      stroke="#F43F47"
                      strokeWidth="2.6"
                    />
                  </g>
                );
              })}
            </>
          )}

          {/* Serie 2: Ingresos diarios (curva azul con resplandor + nodos sólidos) */}
          {showIncome && (
            <>
              {incomeSpline.area && (
                <path
                  d={incomeSpline.area}
                  fill={`url(#${gradientPrefix}-income)`}
                />
              )}
              {incomeSpline.line && (
                <path
                  d={incomeSpline.line}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={`url(#${gradientPrefix}-glow)`}
                />
              )}
              {incomeNodes.map((node, idx) => {
                const isSelected = idx === safeIdx;
                return (
                  <g key={`inc-node-${idx}`}>
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="11.5"
                        fill="#2D6BFF"
                        fillOpacity="0.28"
                      />
                    )}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? '6.4' : '4.5'}
                      fill="#2D6BFF"
                      stroke="#FFFFFF"
                      strokeWidth="2.2"
                    />
                  </g>
                );
              })}
            </>
          )}

          {/* Etiqueta flotante sobre el punto activo de mayor altura */}
          {activePoint && (activeIncNode || activeExpNode) && (() => {
            const anchorX = activeIncNode?.x ?? activeExpNode?.x ?? PAD_LEFT;
            const rawTopY =
              showIncome && activeIncNode
                ? activeIncNode.y
                : activeExpNode?.y ?? PAD_TOP + 20;
            const pillW = 94;
            const pillH = 24;
            const clampedX = Math.min(
              SVG_WIDTH - PAD_RIGHT - pillW / 2,
              Math.max(PAD_LEFT + pillW / 2, anchorX)
            );
            const pillY = Math.max(2, rawTopY - 34);
            const displayVal =
              seriesFilter === 'SOLO_EGRESOS'
                ? `-${activePoint.expenseCompactFormatted}`
                : `+${activePoint.incomeCompactFormatted}`;

            return (
              <g pointerEvents="none" aria-hidden="true">
                <rect
                  x={clampedX - pillW / 2}
                  y={pillY}
                  width={pillW}
                  height={pillH}
                  rx={12}
                  fill="#FFFFFF"
                />
                <text
                  x={clampedX}
                  y={pillY + 16}
                  textAnchor="middle"
                  fill="#111827"
                  fontSize="12"
                  fontWeight="800"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {displayVal}
                </text>
              </g>
            );
          })()}

          {/* Zonas interactivas de ancho de columna completo (fáciles de tocar/explorar) */}
          {points.map((pt, idx) => {
            const centerX = incomeNodes[idx]?.x ?? PAD_LEFT;
            return (
              <rect
                key={`hit-${pt.id}`}
                x={centerX - colStep / 2}
                y={0}
                width={colStep}
                height={SVG_HEIGHT}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => {
                  setSelectedIdx(idx);
                  if (!isInteractive) {
                    onOpenDetail?.();
                  }
                }}
              >
                <title>
                  {`${pt.label}: Ingresos ${pt.incomeFormatted} · Egresos ${pt.expenseFormatted}`}
                </title>
              </rect>
            );
          })}
        </svg>

        {/* Eje X con fechas separadas, sin cortes ni colisiones */}
        <div className="mt-3 flex items-center justify-between gap-2 sm:gap-4 pl-7 sm:pl-14 pr-1 overflow-x-auto no-scrollbar">
          {points.map((point, idx) => {
            const isSelected = idx === safeIdx;
            return (
              <button
                key={point.id}
                type="button"
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => {
                  setSelectedIdx(idx);
                  if (!isInteractive) {
                    onOpenDetail?.();
                  }
                }}
                className={`shrink-0 whitespace-nowrap min-h-[36px] rounded-xl px-2.5 sm:px-3.5 py-1.5 font-mono text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#EDEDED]/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                {point.label}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export default function TelemetryBentoGrid({
  viewMode,
  dailyEarnings,
  rentedFleet,
  dailyMovements,
  onOpenMovementsDetail,
  onSelectAutomobile,
  onSelectMovement,
}: TelemetryBentoGridProps) {
  const [movementFilter, setMovementFilter] =
    useState<DailyMovementFilter>('TODOS');
  const [dailyBreakdownMode, setDailyBreakdownMode] =
    useState<DailyBreakdownMode>('CATEGORY');
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<number>(0);
  const [selectedHourIdx, setSelectedHourIdx] = useState<number>(3);

  const triggerHaptic = (ms: number = 6) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Sin vibración disponible
      }
    }
  };

  /* =========================================================================
     MODO 1 (OVERVIEW): Tarjeta Bento en Azul Oscuro Pizarra (#1F2937)
     ========================================================================= */
  if (viewMode === 'OVERVIEW_PULSE_TILE') {
    const expenseSharePct = Math.max(0, 100 - dailyMovements.incomeSharePct);

    return (
      <button
        type="button"
        onClick={() => {
          triggerHaptic(8);
          onOpenMovementsDetail?.();
        }}
        aria-label="Abrir detalle de movimientos diarios de ingresos y egresos"
        className="ios-press-bounce group relative overflow-hidden flex h-full w-full flex-col justify-between rounded-[26px] bg-[#1F2937] p-4 sm:p-5 text-left text-white border border-white/10 shadow-md transition hover:bg-[#111827] hover:shadow-lg cursor-pointer"
      >
        <div className="space-y-3 w-full">
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 2v20" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>

            <span className="rounded-full bg-white/15 px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-white">
              {dailyMovements.items.length} mov.
            </span>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#EDEDED]/90">
              Balance de hoy
            </p>
            <p className="mt-0.5 font-display text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-white truncate">
              {dailyMovements.netDailyBalanceCompactFormatted}
            </p>
            <p className="mt-0.5 text-sm font-medium tabular-nums text-[#9CA3AF]">
              ↑ {dailyMovements.incomeCount} ing. • ↓ {dailyMovements.expenseCount} egr.
            </p>
          </div>
        </div>

        {/* Barra limpia de proporción ingresos vs egresos */}
        <div className="mt-4 w-full space-y-2.5">
          <div className="space-y-1.5" aria-hidden="true">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                style={{ width: `${dailyMovements.incomeSharePct}%` }}
                className="h-full rounded-full bg-white transition-all duration-300"
              />
            </div>
            <div className="flex items-center justify-between font-mono text-xs text-[#EDEDED]/85 tabular-nums">
              <span>{dailyMovements.incomeSharePct}% ing.</span>
              <span>{expenseSharePct}% egr.</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/15 pt-2 text-xs sm:text-sm font-bold text-white">
            <span>Ver gráfica</span>
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </div>
      </button>
    );
  }

  /* =========================================================================
     MODO 2 (OVERVIEW): Gráfica de Curvas Compacta en Azul Oscuro (#111827)
     ========================================================================= */
  if (viewMode === 'OVERVIEW_CURVE_CARD') {
    return (
      <DailyMovementsCurveChart
        points={dailyMovements.curvePoints}
        variant="COMPACT_OVERVIEW"
        onOpenDetail={() => {
          triggerHaptic(8);
          onOpenMovementsDetail?.();
        }}
      />
    );
  }

  /* =========================================================================
     MODO 3 (OVERVIEW): Tarjeta Blanca de Últimos Movimientos (Complemento)
     ========================================================================= */
  if (viewMode === 'OVERVIEW_RECENT_STRIP') {
    const recentItems = dailyMovements.items.slice(0, 3);

    return (
      <section
        aria-label="Resumen rápido de movimientos diarios"
        className="flex h-full flex-col justify-between rounded-[28px] bg-white p-5 text-[#111827] border border-[#9CA3AF]/40 shadow-xs space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-[#111827]">
              Movimientos de hoy
            </h2>
            <p className="mt-0.5 text-sm text-[#4B5563]">
              Últimas entradas y salidas en patio
            </p>
          </div>

          <span className="rounded-full bg-[#EDEDED] px-3 py-1 font-mono text-xs font-bold text-[#1F2937] border border-[#9CA3AF]/35">
            Hoy
          </span>
        </div>

        <div className="space-y-2.5 flex-1">
          {recentItems.map((mov) => {
            const isIncome = mov.kind === 'INGRESO';
            return (
              <button
                key={mov.id}
                type="button"
                onClick={() => {
                  triggerHaptic(6);
                  onSelectMovement(mov);
                }}
                className="ios-press-bounce flex min-h-[62px] w-full items-center justify-between gap-3 rounded-2xl bg-[#EDEDED]/60 px-3.5 py-3 text-left border border-[#9CA3AF]/30 transition hover:border-[#111827]/40 hover:bg-[#EDEDED] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      isIncome
                        ? 'bg-[#111827] text-white'
                        : 'bg-white text-[#1F2937] border border-[#9CA3AF]/45'
                    }`}
                    aria-hidden="true"
                  >
                    {isIncome ? '↑' : '↓'}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate font-display text-sm sm:text-base font-bold text-[#111827]">
                      {mov.title}
                    </p>
                    <p className="truncate text-xs font-medium text-[#4B5563]">
                      {mov.categoryLabel} • {mov.timeLabel}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 font-mono text-sm font-extrabold tabular-nums ${
                    isIncome ? 'text-[#111827]' : 'text-[#4B5563]'
                  }`}
                >
                  {mov.amountFormatted}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(8);
            onOpenMovementsDetail?.();
          }}
          className="ios-press-bounce flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#1F2937] cursor-pointer"
        >
          <span>Ver todos los movimientos ({dailyMovements.items.length})</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>
    );
  }

  /* =========================================================================
     MODO 4 (NIVEL 2): GANANCIA DIARIA (Donut + Cápsulas por Franja) + AUTOS ALQUILADOS
     ========================================================================= */
  if (viewMode === 'EARNINGS_FLEET_DETAIL') {
    const safeHourIdx = Math.min(
      selectedHourIdx,
      Math.max(0, dailyEarnings.hourlySlots.length - 1)
    );
    const activeHourSlot = dailyEarnings.hourlySlots[safeHourIdx];

    const safeCatIdx = Math.min(
      selectedCategoryIdx,
      Math.max(0, dailyEarnings.byCategory.length - 1)
    );
    const activeCategory = dailyEarnings.byCategory[safeCatIdx];

    // Geometría Donut SVG para participación por categoría
    const donutRadius = 38;
    const donutCircumference = 2 * Math.PI * donutRadius;
    let cumulativeOffset = 0;

    const totalUnitSlots = Math.max(1, Math.min(10, rentedFleet.totalAutomobilesCount));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <section
          aria-label="Desglose de ganancia diaria obtenida con los vehículos"
          className="lg:col-span-6 rounded-[28px] bg-white p-5 sm:p-6 text-[#111827] border border-[#9CA3AF]/40 shadow-xs space-y-5"
        >
          <div className="relative overflow-hidden rounded-2xl bg-[#111827] p-4 sm:p-5 text-white space-y-3">
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/5 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                Ganancia diaria con vehículos
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-white">
                {dailyEarnings.variationPct >= 0
                  ? `+${dailyEarnings.variationPct}%`
                  : `${dailyEarnings.variationPct}%`}
              </span>
            </div>

            <p className="relative z-10 font-display text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-white">
              {dailyEarnings.todayEarningsFormatted}
            </p>

            <div className="relative z-10 grid grid-cols-2 gap-2.5 pt-1 text-sm tabular-nums">
              <div className="rounded-xl bg-[#1F2937] px-3 py-2.5 border border-white/10">
                <span className="block text-xs text-[#9CA3AF]">
                  Promedio diario
                </span>
                <span className="font-display text-base font-bold text-white">
                  {dailyEarnings.dailyAverageFormatted}
                </span>
              </div>
              <div className="rounded-xl bg-[#1F2937] px-3 py-2.5 border border-white/10">
                <span className="block text-xs text-[#9CA3AF]">
                  Prom. por unidad
                </span>
                <span className="font-display text-base font-bold text-white">
                  {dailyEarnings.averagePerVehicleFormatted}
                </span>
              </div>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Modo de análisis de ganancia diaria"
            className="flex items-center gap-1.5 rounded-2xl bg-[#EDEDED] p-1.5 border border-[#9CA3AF]/30"
          >
            <button
              type="button"
              role="tab"
              aria-selected={dailyBreakdownMode === 'CATEGORY'}
              onClick={() => {
                triggerHaptic(6);
                setDailyBreakdownMode('CATEGORY');
              }}
              className={`ios-press-bounce min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-bold transition cursor-pointer ${
                dailyBreakdownMode === 'CATEGORY'
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Por categoría
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dailyBreakdownMode === 'HOURLY'}
              onClick={() => {
                triggerHaptic(6);
                setDailyBreakdownMode('HOURLY');
              }}
              className={`ios-press-bounce min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-bold transition cursor-pointer ${
                dailyBreakdownMode === 'HOURLY'
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Por franja horaria
            </button>
          </div>

          {dailyBreakdownMode === 'CATEGORY' ? (
            <div className="space-y-4">
              {/* Gráfico de Anillo (Donut) Interactivo + Resumen central */}
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl bg-[#EDEDED]/65 p-4 border border-[#9CA3AF]/30">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="12"
                    />
                    {dailyEarnings.byCategory.map((slice, idx) => {
                      const arcLen = Math.max(
                        0,
                        (slice.sharePct / 100) * donutCircumference - 2.5
                      );
                      const offset = cumulativeOffset;
                      cumulativeOffset += (slice.sharePct / 100) * donutCircumference;
                      const color =
                        CATEGORY_RING_COLORS[idx % CATEGORY_RING_COLORS.length]!;
                      const isActive = idx === safeCatIdx;

                      return (
                        <circle
                          key={slice.id}
                          cx="50"
                          cy="50"
                          r={donutRadius}
                          fill="none"
                          stroke={color}
                          strokeWidth={isActive ? '14' : '11.5'}
                          strokeDasharray={`${arcLen} ${donutCircumference}`}
                          strokeDashoffset={-offset}
                          className="cursor-pointer transition-all duration-300"
                          onClick={() => setSelectedCategoryIdx(idx)}
                        >
                          <title>{`${slice.label}: ${slice.amountFormatted} (${slice.sharePct}%)`}</title>
                        </circle>
                      );
                    })}
                  </svg>

                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-display text-xl font-black tabular-nums text-[#111827]">
                      {activeCategory?.sharePct ?? 100}%
                    </span>
                    <span className="text-xs font-bold text-[#4B5563]">
                      aporte
                    </span>
                  </div>
                </div>

                {activeCategory && (
                  <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left tabular-nums">
                    <span className="inline-block rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-[#1F2937] border border-[#9CA3AF]/35">
                      Categoría seleccionada
                    </span>
                    <p className="font-display text-base font-bold text-[#111827]">
                      {activeCategory.label}
                    </p>
                    <p className="font-mono text-xl font-extrabold text-[#111827]">
                      {activeCategory.amountFormatted}
                    </p>
                    <p className="text-xs font-semibold text-[#4B5563]">
                      {activeCategory.rentedCount} unidad(es) activas hoy
                    </p>
                  </div>
                )}
              </div>

              {/* Tarjetas selectoras de cada categoría */}
              <div className="space-y-2.5">
                {dailyEarnings.byCategory.map((slice, idx) => {
                  const isActive = idx === safeCatIdx;
                  const dotColor =
                    CATEGORY_RING_COLORS[idx % CATEGORY_RING_COLORS.length]!;

                  return (
                    <button
                      key={slice.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(6);
                        setSelectedCategoryIdx(idx);
                      }}
                      className={`ios-press-bounce w-full rounded-2xl p-3.5 text-left border transition cursor-pointer space-y-2 ${
                        isActive
                          ? 'bg-white border-[#111827] shadow-xs'
                          : 'bg-[#EDEDED]/55 border-[#9CA3AF]/30 hover:bg-[#EDEDED]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-[#111827]">
                          <span
                            style={{ backgroundColor: dotColor }}
                            className="h-3 w-3 rounded-full shrink-0"
                            aria-hidden="true"
                          />
                          {slice.label}
                        </span>
                        <span className="font-mono text-sm sm:text-base font-extrabold tabular-nums text-[#111827]">
                          {slice.amountFormatted}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#EDEDED]">
                        <div
                          style={{
                            width: `${slice.sharePct}%`,
                            backgroundColor: dotColor,
                          }}
                          className="h-full rounded-full transition-all duration-300"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {activeHourSlot && (
                <div className="flex items-center justify-between rounded-2xl bg-[#1F2937] px-4 py-3.5 text-white tabular-nums">
                  <div>
                    <span className="block text-xs font-semibold text-[#9CA3AF]">
                      Franja seleccionada ({activeHourSlot.hourLabel})
                    </span>
                    <span className="font-display text-xl font-extrabold text-white">
                      {activeHourSlot.amountFormatted}
                    </span>
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-xs font-bold text-white">
                    {activeHourSlot.operationsCount} operación(es)
                  </span>
                </div>
              )}

              {/* Cápsulas limpias por franja horaria (diseño original sin líneas azules ni tramado) */}
              <div className="rounded-2xl bg-[#EDEDED]/65 px-3 pt-10 pb-3.5 border border-[#9CA3AF]/30">
                <div
                  role="group"
                  aria-label="Seleccionar franja horaria de ganancia diaria"
                  className="grid grid-cols-5 gap-2.5 items-end h-44"
                >
                  {dailyEarnings.hourlySlots.map((slot, idx) => {
                    const isSelected = idx === safeHourIdx;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        aria-pressed={isSelected}
                        onMouseEnter={() => setSelectedHourIdx(idx)}
                        onClick={() => {
                          triggerHaptic(6);
                          setSelectedHourIdx(idx);
                        }}
                        className="ios-press-bounce relative flex h-full min-h-[44px] flex-col items-center justify-end gap-2 cursor-pointer"
                      >
                        {isSelected && (
                          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#111827] px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums text-white shadow-sm">
                            {slot.compactFormatted}
                          </span>
                        )}

                        <div className="flex w-full max-w-[36px] flex-1 items-end rounded-full bg-white p-1 border border-[#9CA3AF]/35 shadow-2xs">
                          <div
                            style={{
                              height: `${Math.max(24, slot.heightPct)}%`,
                            }}
                            className={`w-full rounded-full transition-all duration-300 ${
                              isSelected
                                ? 'bg-[#111827]'
                                : 'bg-[#1F2937]/25 hover:bg-[#1F2937]/45'
                            }`}
                          />
                        </div>
                        <span
                          className={`font-mono text-xs sm:text-sm tabular-nums ${
                            isSelected
                              ? 'font-extrabold text-[#111827]'
                              : 'font-semibold text-[#4B5563]'
                          }`}
                        >
                          {slot.hourLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Columna Derecha: Automóviles Alquilados con Matriz Visual de Unidades */}
        <section
          aria-label="Automóviles que la empresa tiene alquilados"
          className="lg:col-span-6 rounded-[28px] bg-white p-5 sm:p-6 text-[#111827] border border-[#9CA3AF]/40 shadow-xs space-y-4"
        >
          <div className="rounded-2xl bg-[#1F2937] p-4 sm:p-5 text-white space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold text-white">
                  Complemento de flota
                </span>
                <h2 className="mt-1.5 font-display text-xl font-bold tracking-tight text-white">
                  Automóviles alquilados
                </h2>
              </div>

              <div className="text-right tabular-nums">
                <span className="font-display text-3xl font-extrabold text-white">
                  {rentedFleet.rentedAutomobilesCount}
                </span>
                <span className="text-sm font-semibold text-[#9CA3AF]">
                  /{rentedFleet.totalAutomobilesCount}
                </span>
              </div>
            </div>

            {/* Matriz gráfica de bloques por cada automóvil del parque */}
            <div
              className="grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${totalUnitSlots}, minmax(0, 1fr))`,
              }}
              aria-hidden="true"
            >
              {Array.from({ length: totalUnitSlots }).map((_, idx) => {
                const isRentedSlot = idx < rentedFleet.rentedAutomobilesCount;
                return (
                  <div
                    key={`slot-${idx}`}
                    className={`h-3.5 rounded-md transition-all ${
                      isRentedSlot
                        ? 'bg-white'
                        : 'bg-[#111827] border border-white/15'
                    }`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-medium text-[#EDEDED]/90 tabular-nums">
              <span>{rentedFleet.availableAutomobilesCount} autos libres en patio</span>
              <span>Tarifa activa: {rentedFleet.activeDailyRunRateFormatted}</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-semibold text-[#4B5563]">
              Toca un automóvil para abrir su contrato y retorno previsto:
            </p>

            {rentedFleet.rentedAutomobiles.map((auto) => (
              <button
                key={auto.id}
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  onSelectAutomobile(auto);
                }}
                className="ios-press-bounce flex min-h-[64px] w-full items-center justify-between gap-3 rounded-2xl bg-[#EDEDED]/60 p-4 text-left border border-[#9CA3AF]/35 transition hover:border-[#111827]/45 hover:bg-[#EDEDED] cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-display text-base font-bold text-[#111827]">
                      {auto.brandModel}
                    </p>
                    <span className="shrink-0 rounded-lg bg-[#111827] px-2.5 py-0.5 font-mono text-xs font-bold text-white">
                      {auto.plate}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-[#4B5563]">
                    {auto.clientName} • {auto.returnLabel}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-sm font-extrabold tabular-nums text-[#111827]">
                    {auto.dailyRateFormatted}
                  </span>
                  <span className="text-base font-bold text-[#4B5563]" aria-hidden="true">
                    →
                  </span>
                </div>
              </button>
            ))}

            {rentedFleet.otherRentedUnitsCount > 0 && (
              <p className="px-1 pt-1 text-xs sm:text-sm text-[#4B5563]">
                Además hay {rentedFleet.otherRentedUnitsCount} unidad(es) de movilidad ligera activas hoy.
              </p>
            )}
          </div>
        </section>
      </div>
    );
  }

  /* =========================================================================
     MODO 5 (NIVEL 2): MOVIMIENTOS DIARIOS COMPLETOS + GRÁFICA INTERACTIVA DE CURVAS
     ========================================================================= */
  const filteredMovements = dailyMovements.items.filter((item) => {
    if (movementFilter === 'TODOS') return true;
    return item.kind === movementFilter;
  });

  return (
    <section
      aria-label="Movimientos diarios de ingresos y egresos de la empresa"
      className="space-y-4"
    >
      {/* Par Bento de alto contraste: Blanca (Ingresos) + Azul Oscuro (Egresos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 tabular-nums">
        <article className="rounded-[26px] bg-white p-5 text-[#111827] border border-[#9CA3AF]/40 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#4B5563]">
              Ingresos de hoy ({dailyMovements.incomeCount})
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDEDED] px-3 py-1 text-xs font-bold text-[#111827]">
              <span className="h-2 w-2 rounded-full bg-[#2D6BFF]" />
              Entradas
            </span>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-extrabold text-[#111827]">
            + {dailyMovements.totalIncomeFormatted}
          </p>
          <p className="text-sm text-[#4B5563]">
            Cobros de reservas, entregas y extensiones del día
          </p>
        </article>

        <article className="rounded-[26px] bg-[#1F2937] p-5 text-white border border-white/10 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#EDEDED]/90">
              Egresos de hoy ({dailyMovements.expenseCount})
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-[#F43F47]" />
              Salidas
            </span>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            - {dailyMovements.totalExpenseFormatted}
          </p>
          <p className="text-sm text-[#9CA3AF]">
            Alistamiento, lavado, combustible e insumos operativos
          </p>
        </article>
      </div>

      {/* Gráfica Interactiva de Curvas Continuas (Ingresos vs Egresos Diarios) */}
      <DailyMovementsCurveChart
        points={dailyMovements.curvePoints}
        variant="FULL_INTERACTIVE"
      />

      {/* Contenedor de filtros y tarjetas en 2 columnas */}
      <div className="rounded-[28px] bg-white p-4 sm:p-6 text-[#111827] border border-[#9CA3AF]/40 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#111827]">
              Registro operativo del día
            </h2>
            <p className="text-sm text-[#4B5563]">
              Balance neto hoy:{' '}
              <strong className="font-mono font-bold text-[#111827] tabular-nums">
                {dailyMovements.netDailyBalanceFormatted}
              </strong>
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filtrar movimientos diarios por tipo"
            className="flex items-center gap-1.5 rounded-2xl bg-[#EDEDED] p-1.5 border border-[#9CA3AF]/30 w-full sm:w-auto"
          >
            {MOVEMENT_FILTERS.map((tab) => {
              const isSelected = movementFilter === tab.id;
              const count =
                tab.id === 'TODOS'
                  ? dailyMovements.items.length
                  : tab.id === 'INGRESO'
                    ? dailyMovements.incomeCount
                    : dailyMovements.expenseCount;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    triggerHaptic(6);
                    setMovementFilter(tab.id);
                  }}
                  className={`ios-press-bounce min-h-[44px] flex-1 sm:flex-initial rounded-xl px-3.5 py-2 text-sm font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#111827] text-white shadow-xs'
                      : 'text-[#4B5563] hover:text-[#111827]'
                  }`}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMovements.map((mov) => {
            const isIncome = mov.kind === 'INGRESO';
            return (
              <button
                key={mov.id}
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  onSelectMovement(mov);
                }}
                className="ios-press-bounce flex min-h-[68px] w-full items-center justify-between gap-3 rounded-2xl bg-[#EDEDED]/55 p-4 text-left border border-[#9CA3AF]/35 transition hover:border-[#111827]/45 hover:bg-[#EDEDED] cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold text-base ${
                      isIncome
                        ? 'bg-[#111827] text-white'
                        : 'bg-white text-[#1F2937] border border-[#9CA3AF]/45'
                    }`}
                    aria-hidden="true"
                  >
                    {isIncome ? '↑' : '↓'}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold text-[#111827]">
                      {mov.title}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-[#4B5563]">
                      {mov.categoryLabel} • {mov.timeLabel}
                      {mov.vehiclePlate ? ` • ${mov.vehiclePlate}` : ''}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 font-mono text-sm sm:text-base font-extrabold tabular-nums ${
                    isIncome ? 'text-[#111827]' : 'text-[#4B5563]'
                  }`}
                >
                  {mov.amountFormatted}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
