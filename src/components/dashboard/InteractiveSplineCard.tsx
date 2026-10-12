import { useState, useRef, type PointerEvent } from 'react';
import type {
  MetricDrilldownPeriod,
  MetricDrilldownSubDay,
  MetricTimeRange,
  SplineDataPoint,
} from '@/lib/metricas';

export interface InteractiveSplineCardProps {
  readonly seriesByRange: Readonly<Record<MetricTimeRange, readonly SplineDataPoint[]>>;
  readonly selectedRange: MetricTimeRange;
  readonly onRangeChange: (range: MetricTimeRange) => void;
  readonly isExpanded: boolean;
  readonly onToggleExpand: () => void;
  readonly categoryScaleFactor: number;
  readonly categoryLabel: string;
}

const TIME_RANGES: readonly MetricTimeRange[] = ['1D', '5D', '1M', '3M', '6M', '1A'];

const DRILLDOWN_PERIODS: readonly { id: MetricDrilldownPeriod; label: string; range: MetricTimeRange }[] = [
  { id: 'main', label: 'Principal', range: '5D' },
  { id: 'weekly', label: 'Semanal', range: '1D' },
  { id: 'monthly', label: 'Mensual', range: '1M' },
  { id: 'yearly', label: 'Anual', range: '1A' },
];

const SUB_DAYS: readonly MetricDrilldownSubDay[] = ['2D', '4D', '5D', '6D', '7D'];

interface ComputedCoord {
  readonly x: number;
  readonly y: number;
  readonly point: SplineDataPoint;
}

function buildSmoothCubicPath(coords: readonly ComputedCoord[]): string {
  if (coords.length === 0) return '';
  const first = coords[0];
  if (!first) return '';
  if (coords.length === 1) return `M ${first.x} ${first.y}`;

  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    if (!curr || !next) continue;
    const prev = coords[i - 1] ?? curr;
    const after = coords[i + 2] ?? next;

    const tension = 0.22;
    const cp1x = curr.x + (next.x - prev.x) * tension;
    const cp1y = curr.y + (next.y - prev.y) * tension;
    const cp2x = next.x - (after.x - curr.x) * tension;
    const cp2y = next.y - (after.y - curr.y) * tension;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }
  return d;
}

export default function InteractiveSplineCard({
  seriesByRange,
  selectedRange,
  onRangeChange,
  isExpanded,
  onToggleExpand,
  categoryScaleFactor,
  categoryLabel,
}: InteractiveSplineCardProps) {
  const points = seriesByRange[selectedRange];
  const defaultIdx = Math.max(0, points.length - 2);
  const [activeIndex, setActiveIndex] = useState<number>(defaultIdx);
  const [activePeriodTab, setActivePeriodTab] = useState<MetricDrilldownPeriod>('main');
  const [activeSubDay, setActiveSubDay] = useState<MetricDrilldownSubDay>('5D');
  const [isScrubbing, setIsScrubbing] = useState(false);

  const svgContainerRef = useRef<HTMLDivElement>(null);

  const safeIndex = Math.min(activeIndex, Math.max(0, points.length - 1));

  const triggerHaptic = (ms: number = 5) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignorar en entornos sin soporte de vibración
      }
    }
  };

  // Compute SVG coordinates inside a 320 x 124 viewBox
  const chartWidth = 320;
  const chartHeight = 124;
  const padX = 16;
  const padTop = 26;
  const padBottom = 16;
  const usableW = chartWidth - padX * 2;
  const usableH = chartHeight - padTop - padBottom;

  const coords: ComputedCoord[] = points.map((pt, idx) => {
    const ratio = points.length > 1 ? idx / (points.length - 1) : 0.5;
    const x = padX + ratio * usableW;
    const scaledNorm = Math.min(96, Math.max(14, pt.normalizedY * (0.85 + categoryScaleFactor * 0.15)));
    const y = padTop + usableH * (1 - scaledNorm / 100);
    return { x, y, point: pt };
  });

  const linePath = buildSmoothCubicPath(coords);
  const firstCoord = coords[0];
  const lastCoord = coords[coords.length - 1];
  const areaPath =
    firstCoord && lastCoord
      ? `${linePath} L ${lastCoord.x.toFixed(1)} ${(chartHeight - 4).toFixed(1)} L ${firstCoord.x.toFixed(1)} ${(chartHeight - 4).toFixed(1)} Z`
      : '';

  const activeCoord = coords[safeIndex] ?? coords[0];

  const updatePointFromClientX = (clientX: number) => {
    const el = svgContainerRef.current;
    if (!el || coords.length === 0) return;
    const rect = el.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const nextIdx = Math.round(relX * (coords.length - 1));
    if (nextIdx !== safeIndex) {
      setActiveIndex(nextIdx);
      triggerHaptic(4);
    }
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePointFromClientX(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    updatePointFromClientX(e.clientX);
  };

  const handlePointerUp = () => {
    setIsScrubbing(false);
  };

  if (isExpanded) {
    // Nivel 2: Modo Explorador de Tendencia Expandido (Inspirado en Referencia 1 Pantalla Central)
    return (
      <section
        aria-label="Explorador detallado de curva operativa"
        className="animate-fade-up rounded-[30px] bg-white p-5 text-[#111827] shadow-lg border border-[#9CA3AF]/35 space-y-4"
      >
        {/* Top Navigation Row inside Expanded Explorer */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#111827]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              Explorador de Curva • {categoryLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              onToggleExpand();
            }}
            className="ios-press-bounce inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-[#EDEDED] px-3.5 py-1.5 text-xs font-bold text-[#111827] border border-[#9CA3AF]/40 cursor-pointer"
          >
            <span>Compactar</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
              <path d="m18 15-6-6-6 6" />
            </svg>
          </button>
        </div>

        {/* Period Tabs: Principal | Semanal | Mensual | Anual (Ref 1 Screen 2) */}
        <div role="tablist" aria-label="Periodo de análisis" className="flex items-center justify-between gap-1.5">
          {DRILLDOWN_PERIODS.map((tab) => {
            const isSelected = activePeriodTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  triggerHaptic(8);
                  setActivePeriodTab(tab.id);
                  onRangeChange(tab.range);
                  setActiveIndex(Math.max(0, seriesByRange[tab.range].length - 2));
                }}
                className={`ios-press-bounce min-h-[42px] flex-1 rounded-full px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#111827] text-[#EDEDED] shadow-sm'
                    : 'bg-transparent text-[#4B5563] hover:bg-[#EDEDED]/70 hover:text-[#111827]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Selected Node Live Summary Strip */}
        {activeCoord && (
          <div className="flex items-center justify-between rounded-2xl bg-[#EDEDED] px-4 py-2.5 border border-[#9CA3AF]/30">
            <div>
              <p className="text-[11px] font-semibold text-[#4B5563]">{activeCoord.point.label}</p>
              <p className="font-display text-lg font-extrabold text-[#111827]">
                {activeCoord.point.amountFormatted}
              </p>
            </div>
            <div className="flex items-center gap-4 text-right font-mono text-xs">
              <div>
                <span className="block text-[10px] text-[#4B5563]">ALQUILERES</span>
                <span className="font-bold text-[#111827]">{activeCoord.point.contractsCount} act.</span>
              </div>
              <div>
                <span className="block text-[10px] text-[#4B5563]">OCUPACIÓN</span>
                <span className="font-bold text-[#111827]">{activeCoord.point.occupancyPct}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Full-Width Interactive Spline on Light Canvas (Ref 1 Screen 2 + Ref 5 Hatching) */}
        <div
          ref={svgContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
          className="relative h-48 w-full select-none rounded-[22px] bg-[#EDEDED]/75 p-2 border border-[#9CA3AF]/30 cursor-ew-resize"
        >
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern
                id="spline-light-hatch"
                width="8"
                height="8"
                patternTransform="rotate(-62.3 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="0" y2="8" stroke="#111827" strokeWidth="1.4" strokeOpacity="0.14" />
              </pattern>
            </defs>

            {/* Horizontal subtle reference lines */}
            {[0.25, 0.55, 0.85].map((ratio) => (
              <line
                key={ratio}
                x1={padX}
                x2={chartWidth - padX}
                y1={chartHeight * ratio}
                y2={chartHeight * ratio}
                stroke="#9CA3AF"
                strokeOpacity="0.35"
                strokeWidth="1"
              />
            ))}

            {/* Hatched area under spline */}
            {areaPath && <path d={areaPath} fill="url(#spline-light-hatch)" />}

            {/* Main spline curve */}
            <path
              d={linePath}
              fill="none"
              stroke="#111827"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Active interactive node + vertical cursor guide */}
            {activeCoord && (
              <g>
                <line
                  x1={activeCoord.x}
                  x2={activeCoord.x}
                  y1={activeCoord.y}
                  y2={chartHeight - 6}
                  stroke="#4B5563"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="6"
                  fill="#FFFFFF"
                  stroke="#111827"
                  strokeWidth="3"
                />
              </g>
            )}
          </svg>

          {/* Floating Badge over Active Point (Ref 1 "$409" Pill) */}
          {activeCoord && (
            <div
              style={{
                left: `${Math.min(84, Math.max(16, (activeCoord.x / chartWidth) * 100))}%`,
                top: `${Math.max(6, (activeCoord.y / chartHeight) * 100 - 22)}%`,
              }}
              className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-[#111827] px-2.5 py-1 font-mono text-[11px] font-bold text-[#EDEDED] shadow-md ring-1 ring-white/20 transition-all duration-150"
            >
              {activeCoord.point.badgeLabel}
            </div>
          )}
        </div>

        {/* Sub-interval Selector: 2D | 4D | 5D | 6D | 7D (Ref 1 Screen 2) */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          {SUB_DAYS.map((sub) => {
            const isSubActive = activeSubDay === sub;
            return (
              <button
                key={sub}
                type="button"
                onClick={() => {
                  triggerHaptic(6);
                  setActiveSubDay(sub);
                  const targetIdx = SUB_DAYS.indexOf(sub) % Math.max(1, points.length);
                  setActiveIndex(targetIdx);
                }}
                className={`ios-press-bounce min-h-[40px] flex-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSubActive
                    ? 'bg-[#EDEDED] text-[#111827] shadow-2xs border border-[#9CA3AF]/50'
                    : 'text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  // Nivel 1: Vista Inicial "Glance" — Tarjeta Oscura Interactiva (Ref 1 Screen 1 + Ref 5 Top-Left)
  return (
    <section
      aria-label="Tendencia de ingresos y ocupación"
      className="relative overflow-hidden rounded-[28px] bg-[#111827] p-4 sm:p-5 text-[#EDEDED] shadow-[0_18px_36px_-10px_rgba(17,24,39,0.42)] ring-1 ring-white/10"
    >
      {/* Top Row inside Dark Card: Active Point Context + Expand Trigger */}
      <div className="flex items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold text-[#9CA3AF]">
            {activeCoord ? activeCoord.point.label : 'Pulso en vivo'}
          </span>
          {activeCoord && (
            <span className="rounded-md bg-[#1F2937] px-2 py-0.5 font-mono text-[10px] font-bold text-[#EDEDED] border border-[#4B5563]/50">
              {activeCoord.point.occupancyPct}% ocup.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(8);
            onToggleExpand();
          }}
          aria-label="Expandir análisis de curva"
          className="ios-press-bounce inline-flex min-h-[36px] items-center gap-1 rounded-full bg-[#1F2937] px-3 py-1 text-[11px] font-semibold text-[#EDEDED] border border-[#4B5563]/50 hover:bg-[#4B5563]/40 cursor-pointer"
        >
          <span>Detallar curva</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
      </div>

      {/* Interactive Touch-Scrubbing Spline Canvas */}
      <div className="relative mt-1 flex items-center">
        {/* Left Y-Axis Scale Labels (500 / 100 / 50 / 0 as in Ref 1 Screen 1) */}
        <div className="pointer-events-none flex h-36 w-8 shrink-0 flex-col justify-between py-3 font-mono text-[10px] font-medium text-[#9CA3AF]">
          <span>500</span>
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>

        {/* Scrubbable SVG Area */}
        <div
          ref={svgContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ touchAction: 'none' }}
          className="relative h-36 flex-1 select-none cursor-ew-resize"
        >
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Diagonal Architectural Hatching (+62.3 deg, matching Ref 5 Top-Left & FlotaX Isotype) */}
              <pattern
                id="flotax-dark-spline-hatch"
                width="7.5"
                height="7.5"
                patternTransform="rotate(-62.3 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="7.5"
                  stroke="#9CA3AF"
                  strokeWidth="1.35"
                  strokeOpacity="0.28"
                />
              </pattern>
            </defs>

            {/* Horizontal subtle reference rules */}
            {[0.24, 0.52, 0.8].map((ratio) => (
              <line
                key={ratio}
                x1={padX}
                x2={chartWidth - padX}
                y1={chartHeight * ratio}
                y2={chartHeight * ratio}
                stroke="#1F2937"
                strokeWidth="1"
              />
            ))}

            {/* Hatched Fill Area under Spline */}
            {areaPath && <path d={areaPath} fill="url(#flotax-dark-spline-hatch)" />}

            {/* Crisp White Spline Curve */}
            <path
              d={linePath}
              fill="none"
              stroke="#EDEDED"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Plotted Interactive Node */}
            {activeCoord && (
              <g>
                <line
                  x1={activeCoord.x}
                  x2={activeCoord.x}
                  y1={activeCoord.y}
                  y2={chartHeight - 4}
                  stroke="#9CA3AF"
                  strokeOpacity="0.45"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="8"
                  fill="#EDEDED"
                  fillOpacity="0.18"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="4.5"
                  fill="#111827"
                  stroke="#EDEDED"
                  strokeWidth="2.5"
                />
              </g>
            )}
          </svg>

          {/* Floating Value Pill over Plotted Node (Ref 1 Screen 1 "$409") */}
          {activeCoord && (
            <div
              style={{
                left: `${Math.min(86, Math.max(14, (activeCoord.x / chartWidth) * 100))}%`,
                top: `${Math.max(2, (activeCoord.y / chartHeight) * 100 - 25)}%`,
              }}
              className="pointer-events-none absolute -translate-x-1/2 rounded-lg bg-[#EDEDED] px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-[#111827] shadow-md transition-all duration-150"
            >
              {activeCoord.point.badgeLabel}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Timeframe Selector: 1D | 5D | 1M | 3M | 6M | 1A (Ref 1 Screen 1) */}
      <div
        role="tablist"
        aria-label="Rango de tiempo"
        className="mt-2 flex items-center justify-between gap-1 border-t border-[#1F2937] pt-2.5"
      >
        {TIME_RANGES.map((range) => {
          const isSelected = selectedRange === range;
          return (
            <button
              key={range}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => {
                triggerHaptic(6);
                onRangeChange(range);
                const nextSeries = seriesByRange[range];
                setActiveIndex(Math.max(0, nextSeries.length - 2));
              }}
              className={`ios-press-bounce min-h-[38px] flex-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#1F2937] text-[#EDEDED] shadow-xs ring-1 ring-[#4B5563]/60'
                  : 'text-[#9CA3AF] hover:text-[#EDEDED]'
              }`}
            >
              {range}
            </button>
          );
        })}
      </div>
    </section>
  );
}
