import { useState } from 'react';
import type {
  FleetCategorySummary,
  LiveTelemetryPulse,
  WaffleUnitNode,
} from '@/lib/metricas';

export type BentoDetailModalKind =
  | 'OCCUPANCY'
  | 'WAFFLE_MATRIX'
  | 'RADIAL_HEALTH'
  | 'CONTRACTS'
  | 'CASH';

export interface TelemetryBentoGridProps {
  readonly category: FleetCategorySummary;
  readonly units: readonly WaffleUnitNode[];
  readonly livePulse: LiveTelemetryPulse;
  readonly onSelectDetail: (kind: BentoDetailModalKind, unitIdx?: number) => void;
}

const RADIAL_TICK_ANGLES = Array.from({ length: 24 }, (_, idx) => -135 + idx * (270 / 23));

export default function TelemetryBentoGrid({
  category,
  units,
  livePulse,
  onSelectDetail,
}: TelemetryBentoGridProps) {
  const [hoveredDotIdx, setHoveredDotIdx] = useState<number | null>(null);
  const [liquidPreviewBoost, setLiquidPreviewBoost] = useState<boolean>(false);

  const triggerHaptic = (ms: number = 8) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignorar
      }
    }
  };

  // Show up to 20 circles in a 4x5 Waffle Grid (matching Ref 5 Bottom-Left)
  const displayDots = Array.from({ length: 20 }, (_, idx) => {
    const unit = units[idx % Math.max(1, units.length)] ?? units[0]!;
    const isHatched =
      unit.status === 'MANTENIMIENTO' ||
      idx >= Math.round((category.availabilityPct / 100) * 20);
    return { idx, unit, isHatched };
  });

  const activePreviewDot =
    hoveredDotIdx !== null ? displayDots[hoveredDotIdx] : undefined;

  const displayedWavePct = liquidPreviewBoost
    ? Math.min(98, category.occupancyPct + 12)
    : category.occupancyPct;

  const activeTicksCount = Math.round(
    (category.occupancyPct / 100) * RADIAL_TICK_ANGLES.length
  );

  return (
    <div className="animate-fade-up space-y-3.5">
      {/* Row 1: Two Side-by-Side Interactive Pill Cards with Visual Micro-Previews */}
      <div className="grid grid-cols-2 gap-3">
        {/* PILL 1: EN ALQUILER -> Opens Closed-Circuit Track Radar (Ref 2.1) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(8);
            onSelectDetail('CONTRACTS');
          }}
          className="ios-press-bounce group flex flex-col justify-between rounded-[22px] bg-[#EDEDED] p-4 text-left border border-[#9CA3AF]/45 shadow-2xs transition-all hover:bg-white cursor-pointer"
        >
          <div className="flex w-full items-center justify-between text-xs font-semibold text-[#4B5563]">
            <span>En Alquiler</span>
            {/* Mini Closed-Circuit Loop Preview Icon */}
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#111827] text-[#EDEDED] transition-transform group-hover:scale-110">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
                <path d="M5 12c0-3.8 3.1-7 7-7s7 3.2 7 7-3.1 7-7 7-7-3.2-7-7Z" />
                <circle cx="17" cy="8" r="2" fill="currentColor" />
              </svg>
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-extrabold tracking-tight text-[#111827]">
            {category.activeContractsFormatted}
          </p>
          {/* Visual Mini Route Progress Strip */}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white border border-[#9CA3AF]/40">
              <div
                style={{ width: `${category.occupancyPct}%` }}
                className="h-full rounded-full bg-[#111827]"
              />
            </div>
            <span className="font-mono text-[10px] font-bold text-[#111827]">
              {category.activeUnits} ruta
            </span>
          </div>
        </button>

        {/* PILL 2: CAJA TURNO -> Opens Swiss Hatched Polar Wheel (Ref 5.4) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(8);
            onSelectDetail('CASH');
          }}
          className="ios-press-bounce group flex flex-col justify-between rounded-[22px] bg-[#EDEDED] p-4 text-left border border-[#9CA3AF]/45 shadow-2xs transition-all hover:bg-white cursor-pointer"
        >
          <div className="flex w-full items-center justify-between text-xs font-semibold text-[#4B5563]">
            <span>Caja Turno</span>
            {/* Mini Hatched Polar Wheel Preview Icon */}
            <span className="h-6 w-6 rounded-full bg-hatch-diagonal border-2 border-[#111827] transition-transform group-hover:rotate-45" />
          </div>
          <p className="mt-2 font-display text-xl font-extrabold tracking-tight text-[#111827]">
            {category.cashShiftFormatted}
          </p>
          {/* Visual Dual-Tone Share Bar (Solid vs Hatched) */}
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white border border-[#9CA3AF]/45">
              <div style={{ width: '62%' }} className="h-full bg-[#111827]" />
              <div style={{ width: '38%' }} className="h-full bg-hatch-diagonal" />
            </div>
            <span className="font-mono text-[10px] font-bold text-[#4B5563]">Polar</span>
          </div>
        </button>
      </div>

      {/* Section Header with Live Pill Badge */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-bold text-[#111827]">
            Instrumentos de Flota
          </h3>
          <span className="rounded-lg bg-[#111827] px-2 py-0.5 font-mono text-[10px] font-bold text-[#EDEDED]">
            Interactivo
          </span>
        </div>
        <span className="text-[11px] font-medium text-[#4B5563]">
          Cada tarjeta abre su propio dial visual
        </span>
      </div>

      {/* Asymmetric Bento Grid: 1 Tall Left Card + 2 Stacked Right Cards (Ref 1 Screen 3) */}
      <div className="grid grid-cols-12 gap-3">
        {/* LEFT TALL CARD: Bessonov Liquid Wave Occupancy + Radial Ring (Ref 4 + Ref 1.3) */}
        <div className="relative col-span-6 flex min-h-[304px] flex-col justify-between overflow-hidden rounded-[26px] bg-[#111827] p-4 text-left text-[#EDEDED] shadow-lg ring-1 ring-white/10">
          {/* Animated Liquid Wave Background Layer (Ref 4 Charging UI System) */}
          <div
            aria-hidden="true"
            style={{ height: `${Math.min(94, Math.max(24, displayedWavePct))}%` }}
            className="pointer-events-none absolute inset-x-0 bottom-0 transition-all duration-700"
          >
            {/* Back Wave Crest with Diagonal Hatching */}
            <svg
              viewBox="0 0 400 40"
              preserveAspectRatio="none"
              className="animate-liquid-wave-back absolute -top-6 left-0 h-8 w-[200%]"
            >
              <path
                d="M0 20 Q 50 4, 100 20 T 200 20 T 300 20 T 400 20 L 400 40 L 0 40 Z"
                fill="#1F2937"
              />
            </svg>
            <div className="h-full w-full bg-[#1F2937] bg-hatch-diagonal-dark opacity-90" />

            {/* Front Wave Crest */}
            <svg
              viewBox="0 0 400 40"
              preserveAspectRatio="none"
              className="animate-liquid-wave-front absolute -top-4 left-0 h-7 w-[200%]"
            >
              <path
                d="M0 18 Q 50 32, 100 18 T 200 18 T 300 18 T 400 18 L 400 40 L 0 40 Z"
                fill="#4B5563"
                fillOpacity="0.65"
              />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/90 via-[#1F2937]/65 to-transparent" />
          </div>

          {/* Top Label Row + In-Place Wave Surge Button */}
          <div className="relative z-10 flex w-full items-center justify-between">
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">
                Cámara Líquida
              </span>
              <span className="text-xs font-bold text-[#EDEDED]">{category.label}</span>
            </div>
            <button
              type="button"
              aria-label="Simular pulso de marea en tarjeta"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic(6);
                setLiquidPreviewBoost((prev) => !prev);
              }}
              className={`ios-press-bounce flex h-7 items-center gap-1 rounded-full px-2 text-[10px] font-mono font-bold backdrop-blur-md transition-all cursor-pointer ${
                liquidPreviewBoost
                  ? 'bg-[#EDEDED] text-[#111827]'
                  : 'bg-white/10 text-[#EDEDED] hover:bg-white/20'
              }`}
            >
              <span>⚡</span>
              <span>{liquidPreviewBoost ? 'Pico' : 'Marea'}</span>
            </button>
          </div>

          {/* Center Radial Gauge + Tappable Trigger to Open 4-Chamber Bessonov Instrument */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              onSelectDetail('OCCUPANCY');
            }}
            className="ios-press-bounce relative z-10 my-2 flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="relative flex h-28 w-28 items-center justify-center">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#1F2937"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#EDEDED"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(displayedWavePct / 100) * 251.2} 251.2`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-extrabold tracking-tight text-[#EDEDED]">
                  {displayedWavePct}%
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#9CA3AF]">
                  {liquidPreviewBoost ? 'SIMULADO' : 'EN RUTA'}
                </span>
              </div>
            </div>
          </button>

          {/* Bottom Metric Summary Button inside Tall Card */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              onSelectDetail('OCCUPANCY');
            }}
            className="ios-press-bounce relative z-10 w-full rounded-2xl bg-[#111827]/85 p-2.5 backdrop-blur-md border border-white/10 text-center cursor-pointer hover:border-white/30"
          >
            <p className="text-[10px] font-medium text-[#9CA3AF]">
              Abrir 4 Cámaras Líquidas
            </p>
            <p className="mt-0.5 font-mono text-xs font-extrabold tracking-tight text-[#EDEDED]">
              {category.activeUnits} de {category.totalUnits} UNDS ➔
            </p>
          </button>
        </div>

        {/* RIGHT STACKED COLUMN: 2 Cards (Waffle Matrix + Radial Tick Tachometer) */}
        <div className="col-span-6 flex flex-col gap-3">
          {/* TOP-RIGHT CARD: Interactive Waffle Dot Matrix with Diagonal Hatching (Ref 5.3) */}
          <div className="flex flex-1 flex-col justify-between rounded-[26px] bg-white p-4 text-left text-[#111827] shadow-md border border-[#9CA3AF]/35">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                onSelectDetail('WAFFLE_MATRIX', hoveredDotIdx ?? 0);
              }}
              className="ios-press-bounce flex w-full items-start justify-between text-left cursor-pointer"
            >
              <div>
                <p className="font-display text-2xl font-extrabold leading-none text-[#111827]">
                  {activePreviewDot ? `${activePreviewDot.unit.energyPct}%` : `${category.availabilityPct}%`}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#4B5563]">
                  {activePreviewDot
                    ? `${activePreviewDot.unit.plate} • ${activePreviewDot.unit.rangeKm} km`
                    : 'Disponibilidad real'}
                </p>
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] border border-[#9CA3AF]/30">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
              </span>
            </button>

            {/* Interactive 4x5 Dot Matrix: Tapping any dot opens the Automotive C-Arc Cluster on that unit! */}
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {displayDots.map((dot) => {
                const isDotSelected = hoveredDotIdx === dot.idx;
                return (
                  <button
                    key={dot.idx}
                    type="button"
                    aria-label={`Ver telemetría de ${dot.unit.plate}`}
                    onMouseEnter={() => setHoveredDotIdx(dot.idx)}
                    onMouseLeave={() => setHoveredDotIdx(null)}
                    onClick={() => {
                      triggerHaptic(8);
                      setHoveredDotIdx(dot.idx);
                      onSelectDetail('WAFFLE_MATRIX', dot.idx);
                    }}
                    className={`h-4 w-full rounded-full transition-all duration-150 cursor-pointer ${
                      dot.isHatched
                        ? 'bg-[#EDEDED] bg-hatch-diagonal border border-[#9CA3AF]'
                        : 'bg-[#111827]'
                    } ${isDotSelected ? 'scale-125 ring-2 ring-[#111827] ring-offset-1' : 'hover:scale-110'}`}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                onSelectDetail('WAFFLE_MATRIX', hoveredDotIdx ?? 0);
              }}
              className="mt-2.5 flex w-full items-center justify-between font-mono text-[10px] font-semibold text-[#4B5563] cursor-pointer hover:text-[#111827]"
            >
              <span>● {category.availableUnits} listas</span>
              <span>⊘ {category.maintenanceUnits} taller ➔</span>
            </button>
          </div>

          {/* BOTTOM-RIGHT CARD: Automotive Radial Tick Dial & R2 Gyroscope (Ref 3.4 + Ref 2) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              onSelectDetail('RADIAL_HEALTH');
            }}
            className="ios-press-bounce group flex flex-1 flex-col justify-between rounded-[26px] bg-[#111827] p-4 text-left text-[#EDEDED] shadow-md ring-1 ring-white/10 cursor-pointer"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-[11px] font-bold text-[#9CA3AF]">Giroscopio R2</span>
              <span className="rounded-md bg-[#1F2937] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#EDEDED] border border-white/10">
                {livePulse.inspectionCompliancePct}% L➔H
              </span>
            </div>

            {/* Radial Tick-Mark Tachometer Gauge (Ref 3 Bottom-Right) */}
            <div className="my-1 flex items-center justify-between gap-2">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                <svg viewBox="0 0 80 80" className="h-full w-full">
                  {RADIAL_TICK_ANGLES.map((angle, idx) => {
                    const isFilled = idx < activeTicksCount;
                    return (
                      <line
                        key={angle}
                        x1="40"
                        y1="6"
                        x2="40"
                        y2="14"
                        stroke={isFilled ? '#EDEDED' : '#4B5563'}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        transform={`rotate(${angle} 40 40)`}
                      />
                    );
                  })}
                </svg>
                {/* Vehicle Front Silhouette inside Dial that tilts on hover */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute h-5 w-5 text-[#EDEDED] transition-transform duration-300 group-hover:-rotate-6"
                >
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>

              <div className="flex flex-col text-right">
                <span className="text-[10px] font-medium text-[#9CA3AF]">Inclinómetro</span>
                <span className="font-display text-lg font-extrabold text-[#EDEDED]">
                  {category.bonusEfficiencyFormatted}
                </span>
                <span className="font-mono text-[10px] text-[#9CA3AF]">
                  4 subsistemas ➔
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
