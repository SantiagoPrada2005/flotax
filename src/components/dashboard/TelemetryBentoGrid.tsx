import type {
  FleetCategorySummary,
  LiveTelemetryPulse,
  WaffleUnitNode,
} from '@/lib/metricas';

export type BentoDetailModalKind = 'OCCUPANCY' | 'WAFFLE_MATRIX' | 'RADIAL_HEALTH' | 'CONTRACTS' | 'CASH';

export interface TelemetryBentoGridProps {
  readonly category: FleetCategorySummary;
  readonly units: readonly WaffleUnitNode[];
  readonly livePulse: LiveTelemetryPulse;
  readonly onSelectDetail: (kind: BentoDetailModalKind) => void;
}

const RADIAL_TICK_ANGLES = Array.from({ length: 24 }, (_, idx) => -135 + idx * (270 / 23));

export default function TelemetryBentoGrid({
  category,
  units,
  livePulse,
  onSelectDetail,
}: TelemetryBentoGridProps) {
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
    const unit = units[idx % Math.max(1, units.length)];
    const isHatched = unit ? unit.status === 'MANTENIMIENTO' || idx >= Math.round((category.availabilityPct / 100) * 20) : false;
    return { idx, unit, isHatched };
  });

  const activeTicksCount = Math.round((category.occupancyPct / 100) * RADIAL_TICK_ANGLES.length);

  return (
    <div className="animate-fade-up space-y-3.5">
      {/* Row 1: Two Side-by-Side Interactive Pill Cards (Ref 1 Screen 3: Positions > / Cash >) */}
      <div className="grid grid-cols-2 gap-3">
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
          <p className="mt-2.5 font-display text-xl font-extrabold tracking-tight text-[#111827]">
            {category.activeContractsFormatted}
          </p>
          <span className="mt-0.5 text-[10px] font-medium text-[#4B5563]">
            {category.activeUnits} contratos vigentes
          </span>
        </button>

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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
          <p className="mt-2.5 font-display text-xl font-extrabold tracking-tight text-[#111827]">
            {category.cashShiftFormatted}
          </p>
          <span className="mt-0.5 text-[10px] font-medium text-[#4B5563]">
            Efectivo + garantías hoy
          </span>
        </button>
      </div>

      {/* Section Header with Live Pill Badge (Ref 1 Screen 3: "Token Bonus [Today]") */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-bold text-[#111827]">
            Telemetría de Flota
          </h3>
          <span className="rounded-lg bg-[#111827] px-2 py-0.5 font-mono text-[10px] font-bold text-[#EDEDED]">
            En vivo
          </span>
        </div>
        <span className="text-[11px] font-medium text-[#4B5563]">
          Toca una tarjeta para inspeccionar
        </span>
      </div>

      {/* Asymmetric Bento Grid: 1 Tall Left Card + 2 Stacked Right Cards (Ref 1 Screen 3) */}
      <div className="grid grid-cols-12 gap-3">
        {/* LEFT TALL CARD: Bessonov Liquid Wave Occupancy + Radial Ring (Ref 4 + Ref 1.3) */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            onSelectDetail('OCCUPANCY');
          }}
          className="ios-press-bounce group relative col-span-6 flex min-h-[296px] flex-col justify-between overflow-hidden rounded-[26px] bg-[#111827] p-4 text-left text-[#EDEDED] shadow-lg ring-1 ring-white/10 cursor-pointer"
        >
          {/* Animated Liquid Wave Background Layer (Ref 4 Charging UI System) */}
          <div
            aria-hidden="true"
            style={{ height: `${Math.min(92, Math.max(24, category.occupancyPct))}%` }}
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

          {/* Top Label Row */}
          <div className="relative z-10 flex w-full items-center justify-between">
            <div>
              <span className="block text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF]">
                Ocupación Activa
              </span>
              <span className="text-xs font-bold text-[#EDEDED]">{category.label}</span>
            </div>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[#EDEDED] backdrop-blur-md">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
          </div>

          {/* Center Radial Gauge + Floating Bessonov Pill (Ref 1.3 + Ref 4) */}
          <div className="relative z-10 my-2 flex flex-col items-center justify-center">
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
                  strokeDasharray={`${(category.occupancyPct / 100) * 251.2} 251.2`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-extrabold tracking-tight text-[#EDEDED]">
                  {category.occupancyPct}%
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#9CA3AF]">
                  EN RUTA
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Metric Summary inside Tall Card */}
          <div className="relative z-10 w-full rounded-2xl bg-[#111827]/80 p-2.5 backdrop-blur-md border border-white/10 text-center">
            <p className="text-[10px] font-medium text-[#9CA3AF]">
              Unidades produciendo hoy
            </p>
            <p className="mt-0.5 font-mono text-sm font-extrabold tracking-tight text-[#EDEDED]">
              {category.activeUnits} de {category.totalUnits} UNDS
            </p>
          </div>
        </button>

        {/* RIGHT STACKED COLUMN: 2 Cards (Waffle Matrix + Radial Tick Tachometer) */}
        <div className="col-span-6 flex flex-col gap-3">
          {/* TOP-RIGHT CARD: Waffle Dot Matrix with Diagonal Hatching (Ref 5 Bottom-Left) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              onSelectDetail('WAFFLE_MATRIX');
            }}
            className="ios-press-bounce group flex flex-1 flex-col justify-between rounded-[26px] bg-white p-4 text-left text-[#111827] shadow-md border border-[#9CA3AF]/35 cursor-pointer"
          >
            <div className="flex w-full items-start justify-between">
              <div>
                <p className="font-display text-2xl font-extrabold leading-none text-[#111827]">
                  {category.availabilityPct}%
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#4B5563]">
                  Disponibilidad real
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
            </div>

            {/* 4x5 Dot Matrix with Architectural Hatching (Ref 5 Bottom-Left) */}
            <div className="mt-3 grid grid-cols-5 gap-1.5" aria-hidden="true">
              {displayDots.map((dot) => (
                <span
                  key={dot.idx}
                  className={`h-4 w-full rounded-full transition-transform duration-200 group-hover:scale-105 ${
                    dot.isHatched
                      ? 'bg-[#EDEDED] bg-hatch-diagonal border border-[#9CA3AF]'
                      : 'bg-[#111827]'
                  }`}
                />
              ))}
            </div>

            <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] font-semibold text-[#4B5563]">
              <span>● {category.availableUnits} listas</span>
              <span>⊘ {category.maintenanceUnits} taller</span>
            </div>
          </button>

          {/* BOTTOM-RIGHT CARD: Automotive Radial Tick Dial & R2 Telemetry (Ref 3 Bottom-Right + Ref 2) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              onSelectDetail('RADIAL_HEALTH');
            }}
            className="ios-press-bounce group flex flex-1 flex-col justify-between rounded-[26px] bg-[#111827] p-4 text-left text-[#EDEDED] shadow-md ring-1 ring-white/10 cursor-pointer"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-[11px] font-bold text-[#9CA3AF]">Salud & Peritaje</span>
              <span className="font-mono text-[11px] font-bold text-[#EDEDED]">
                {livePulse.inspectionCompliancePct}% R2
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
                {/* Vehicle Front Silhouette inside Dial (Ref 3 Bottom-Right) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute h-5 w-5 text-[#EDEDED]"
                >
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>

              <div className="flex flex-col text-right">
                <span className="text-[10px] font-medium text-[#9CA3AF]">Eficiencia hoy</span>
                <span className="font-display text-lg font-extrabold text-[#EDEDED]">
                  {category.bonusEfficiencyFormatted}
                </span>
                <span className="font-mono text-[10px] text-[#9CA3AF]">
                  ETA {livePulse.nextReturnEtaLabel}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
