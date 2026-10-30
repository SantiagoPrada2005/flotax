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
  const SVG_HEIGHT = 215;
  const PAD_LEFT = 64;
  const PAD_RIGHT = 20;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 28;
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

  return (
    <article
      aria-label="Gráfica de curvas de movimientos diarios: ingresos y egresos"
      className="flex h-full flex-col justify-between rounded-[28px] bg-[#111827] p-5 sm:p-6 text-white shadow-xl border border-white/10 space-y-4"
    >
      {/* Cabecera de la gráfica */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2D6BFF]" aria-hidden="true" />
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
              Curva de movimientos diarios
            </h2>
          </div>
          <p className="mt-0.5 text-sm text-[#9CA3AF]">
            {isInteractive
              ? 'Toca cualquier nodo o fecha para inspeccionar ingresos y egresos del día'
              : 'Comparativa visual de ingresos frente a egresos operativos por jornada'}
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
            className="ios-press-bounce inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-white border border-white/15 transition hover:bg-white/20 cursor-pointer"
          >
            <span>Ampliar curva</span>
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>

      {/* Leyenda clara + HUD del día inspeccionado en modo interactivo */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#1F2937] px-4 py-3 border border-white/10 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-4 font-semibold">
          <span className="inline-flex items-center gap-2 text-white">
            <span className="h-3 w-3 rounded-full bg-[#2D6BFF]" aria-hidden="true" />
            Ingresos
          </span>
          <span className="inline-flex items-center gap-2 text-[#EDEDED]">
            <span className="h-3 w-3 rounded-full bg-[#F43F47]" aria-hidden="true" />
            Egresos
          </span>
        </div>

        {activePoint && (
          <div className="flex flex-wrap items-center gap-3 font-mono font-bold tabular-nums">
            <span className="rounded-lg bg-[#111827] px-2.5 py-1 text-white">
              {activePoint.label}
            </span>
            <span className="text-[#93C5FD]">+ {activePoint.incomeCompactFormatted}</span>
            <span className="text-[#FCA5A5]">- {activePoint.expenseCompactFormatted}</span>
            {isInteractive && (
              <span className="rounded-lg bg-white/12 px-2.5 py-1 text-white">
                Neto: {activePoint.netBalanceFormatted}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Lienzo SVG proporcional con curvas Bézier cúbicas suaves */}
      <div className="rounded-2xl bg-[#1F2937]/65 p-2.5 sm:p-3.5 border border-white/10">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto block overflow-visible"
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
              <stop offset="0%" stopColor="#2D6BFF" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#2D6BFF" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient
              id={`${gradientPrefix}-expense`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#F43F47" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#F43F47" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Guías horizontales y escala Y en formato moneda compacta legible */}
          {ticksY.map((tick, idx) => (
            <g key={`ytick-${idx}`}>
              <line
                x1={PAD_LEFT}
                y1={tick.y}
                x2={SVG_WIDTH - PAD_RIGHT}
                y2={tick.y}
                stroke="#9CA3AF"
                strokeOpacity="0.22"
                strokeWidth="1"
                strokeDasharray="4 4"
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

          {/* Guía vertical del día activo */}
          {incomeNodes[safeIdx] && (
            <line
              x1={incomeNodes[safeIdx]!.x}
              y1={PAD_TOP}
              x2={incomeNodes[safeIdx]!.x}
              y2={BASELINE_Y}
              stroke="#EDEDED"
              strokeOpacity="0.35"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Serie 1: Egresos diarios */}
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
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {expenseNodes.map((node, idx) => {
                const isSelected = idx === safeIdx;
                return (
                  <circle
                    key={`exp-node-${idx}`}
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? '6.5' : '4.5'}
                    fill="#F43F47"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="cursor-pointer transition-all"
                    onClick={() => {
                      if (isInteractive) {
                        setSelectedIdx(idx);
                      } else {
                        onOpenDetail?.();
                      }
                    }}
                  >
                    <title>
                      {`${points[idx]?.label ?? ''}: Egresos ${points[idx]?.expenseFormatted ?? ''}`}
                    </title>
                  </circle>
                );
              })}
            </>
          )}

          {/* Serie 2: Ingresos diarios */}
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
                  stroke="#2D6BFF"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {incomeNodes.map((node, idx) => {
                const isSelected = idx === safeIdx;
                return (
                  <circle
                    key={`inc-node-${idx}`}
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? '7' : '4.8'}
                    fill="#2D6BFF"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="cursor-pointer transition-all"
                    onClick={() => {
                      if (isInteractive) {
                        setSelectedIdx(idx);
                      } else {
                        onOpenDetail?.();
                      }
                    }}
                  >
                    <title>
                      {`${points[idx]?.label ?? ''}: Ingresos ${points[idx]?.incomeFormatted ?? ''}`}
                    </title>
                  </circle>
                );
              })}
            </>
          )}
        </svg>

        {/* Eje X con fechas legibles e interactivas */}
        <div className="mt-2 grid grid-cols-7 gap-1 pl-10 sm:pl-14 text-center">
          {points.map((point, idx) => {
            const isSelected = idx === safeIdx;
            return (
              <button
                key={point.id}
                type="button"
                onClick={() => {
                  if (isInteractive) {
                    setSelectedIdx(idx);
                  } else {
                    onOpenDetail?.();
                  }
                }}
                className={`min-h-[36px] rounded-lg px-1 py-1 font-mono text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#111827] shadow-2xs'
                    : 'text-[#EDEDED]/80 hover:bg-white/10 hover:text-white'
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
    return (
      <button
        type="button"
        onClick={() => {
          triggerHaptic(8);
          onOpenMovementsDetail?.();
        }}
        aria-label="Abrir detalle de movimientos diarios de ingresos y egresos"
        className="ios-press-bounce group flex h-full w-full flex-col justify-between rounded-[26px] bg-[#1F2937] p-4 sm:p-5 text-left text-white border border-white/10 shadow-md transition hover:bg-[#111827] hover:shadow-lg cursor-pointer"
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

        <div className="mt-4 w-full space-y-2.5">
          <div className="space-y-1.5 rounded-2xl bg-[#111827]/70 px-3 py-2.5">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                style={{ width: `${dailyMovements.incomeSharePct}%` }}
                className="h-full rounded-full bg-white transition-all duration-300"
              />
            </div>
            <div className="flex items-center justify-between text-xs font-semibold tabular-nums text-[#EDEDED]/90">
              <span>{dailyMovements.incomeSharePct}% ing.</span>
              <span>{100 - dailyMovements.incomeSharePct}% egr.</span>
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
     MODO 4 (NIVEL 2): GANANCIA DIARIA + AUTOMÓVILES ALQUILADOS (2 Columnas)
     ========================================================================= */
  if (viewMode === 'EARNINGS_FLEET_DETAIL') {
    const safeHourIdx = Math.min(
      selectedHourIdx,
      Math.max(0, dailyEarnings.hourlySlots.length - 1)
    );
    const activeHourSlot = dailyEarnings.hourlySlots[safeHourIdx];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <section
          aria-label="Desglose de ganancia diaria obtenida con los vehículos"
          className="lg:col-span-6 rounded-[28px] bg-white p-5 sm:p-6 text-[#111827] border border-[#9CA3AF]/40 shadow-xs space-y-5"
        >
          <div className="rounded-2xl bg-[#111827] p-4 sm:p-5 text-white space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                Ganancia diaria con vehículos
              </span>
              <span className="rounded-full bg-white/15 px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-white">
                {dailyEarnings.variationPct >= 0
                  ? `+${dailyEarnings.variationPct}%`
                  : `${dailyEarnings.variationPct}%`}
              </span>
            </div>

            <p className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-white">
              {dailyEarnings.todayEarningsFormatted}
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1 text-sm tabular-nums">
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
            <div className="space-y-3">
              {dailyEarnings.byCategory.map((slice) => (
                <div
                  key={slice.id}
                  className="rounded-2xl bg-[#EDEDED]/60 p-4 border border-[#9CA3AF]/30 space-y-2.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm sm:text-base font-bold text-[#111827]">
                      {slice.label}
                    </span>
                    <span className="font-mono text-sm sm:text-base font-extrabold tabular-nums text-[#111827]">
                      {slice.amountFormatted}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white border border-[#9CA3AF]/35">
                    <div
                      style={{ width: `${slice.sharePct}%` }}
                      className="h-full rounded-full bg-[#1F2937] transition-all duration-300"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-[#4B5563] tabular-nums">
                    <span>{slice.rentedCount} unidad(es) activas hoy</span>
                    <span>{slice.sharePct}% del total</span>
                  </div>
                </div>
              ))}
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

              <div
                role="group"
                aria-label="Seleccionar franja horaria de ganancia diaria"
                className="grid grid-cols-5 gap-2.5 items-end h-40 rounded-2xl bg-[#EDEDED]/55 p-4 border border-[#9CA3AF]/30"
              >
                {dailyEarnings.hourlySlots.map((slot, idx) => {
                  const isSelected = idx === safeHourIdx;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        triggerHaptic(6);
                        setSelectedHourIdx(idx);
                      }}
                      className="ios-press-bounce flex h-full min-h-[44px] flex-col items-center justify-end gap-2 cursor-pointer"
                    >
                      <div className="flex w-full max-w-[36px] flex-1 items-end rounded-full bg-white p-1 border border-[#9CA3AF]/35">
                        <div
                          style={{ height: `${Math.max(24, slot.heightPct)}%` }}
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
          )}
        </section>

        <section
          aria-label="Automóviles que la empresa tiene alquilados"
          className="lg:col-span-6 rounded-[28px] bg-white p-5 sm:p-6 text-[#111827] border border-[#9CA3AF]/40 shadow-xs space-y-4"
        >
          <div className="rounded-2xl bg-[#1F2937] p-4 sm:p-5 text-white space-y-3">
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

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#111827]">
              <div
                style={{ width: `${rentedFleet.automobilesOccupancyPct}%` }}
                className="h-full rounded-full bg-white transition-all duration-300"
              />
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
              <span className="h-2 w-2 rounded-full bg-status-success" />
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
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
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
