import { useState } from 'react';
import { navigate } from 'astro:transitions/client';
import type {
  ActiveLensMode,
  FleetCategoryFilter,
  MetricTimeRange,
  PrimaryMetricMode,
  ShiftMovementItem,
  YardMetricsSnapshot,
} from '@/lib/metricas';
import InteractiveSplineCard from './InteractiveSplineCard';
import TelemetryBentoGrid, { type BentoDetailModalKind } from './TelemetryBentoGrid';
import TelemetryVisualModals from './TelemetryVisualModals';

export interface MetricsInteractiveHubProps {
  readonly snapshot: YardMetricsSnapshot;
  readonly initialLens?: ActiveLensMode | undefined;
}

const R2_CAMERA_ANGLES = [
  { id: 'FRONT', label: 'Frontal', status: 'OK' },
  { id: 'SIDE_L', label: 'Lat. Izq', status: 'OK' },
  { id: 'SIDE_R', label: 'Lat. Der', status: 'OK' },
  { id: 'DASH', label: 'Odómetro', status: 'R2' },
] as const;

export default function MetricsInteractiveHub({
  snapshot,
  initialLens = 'BENTO',
}: MetricsInteractiveHubProps) {
  const [selectedCategory, setSelectedCategory] = useState<FleetCategoryFilter>('ALL');
  const [selectedRange, setSelectedRange] = useState<MetricTimeRange>('5D');
  const [isChartExpanded, setIsChartExpanded] = useState<boolean>(false);
  const [isLiveIslandExpanded, setIsLiveIslandExpanded] = useState<boolean>(false);
  const [activeLens, setActiveLens] = useState<ActiveLensMode>(initialLens);
  const [primaryMetricMode, setPrimaryMetricMode] = useState<PrimaryMetricMode>('REVENUE');
  const [movementDayFilter, setMovementDayFilter] = useState<'HOY' | 'TODOS'>('HOY');
  const [activeDetailModal, setActiveDetailModal] = useState<BentoDetailModalKind | null>(null);
  const [initialSelectedUnitIdx, setInitialSelectedUnitIdx] = useState<number>(0);
  const [selectedMovement, setSelectedMovement] = useState<ShiftMovementItem | null>(null);

  const triggerHaptic = (ms: number = 8) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignorar
      }
    }
  };

  const currentCategory =
    snapshot.categories.find((c) => c.id === selectedCategory) ?? snapshot.categories[0]!;

  const filteredUnits =
    selectedCategory === 'ALL'
      ? snapshot.unitsMatrix
      : snapshot.unitsMatrix.filter((u) => u.category === selectedCategory);

  const filteredMovements = snapshot.movements.filter((mov) => {
    const matchesCat = selectedCategory === 'ALL' || mov.category === selectedCategory;
    const matchesDay = movementDayFilter === 'TODOS' || mov.dayBucket === 'HOY';
    return matchesCat && matchesDay;
  });

  const categoryScaleFactor = currentCategory.totalUnits / 22;

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Top Live Activity Pill (Dynamic Island In-Place Expansion) + Primary Hero Metric */}
      <section aria-label="Indicador principal de patio" className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* iOS Live Activity Telemetry Pill -> Expands In-Place like Dynamic Island (Ref 2) */}
          <button
            type="button"
            aria-expanded={isLiveIslandExpanded}
            onClick={() => {
              triggerHaptic(8);
              setIsLiveIslandExpanded((prev) => !prev);
            }}
            className={`ios-press-bounce inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
              isLiveIslandExpanded
                ? 'bg-[#1F2937] text-[#EDEDED] ring-2 ring-[#111827]'
                : 'bg-[#111827] text-[#EDEDED] shadow-xs'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Próximo retorno {snapshot.livePulse.nextReturnPlate}</span>
            <span className="font-mono text-[10px] text-[#9CA3AF]">
              • {snapshot.livePulse.nextReturnEtaLabel}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              className={`h-3 w-3 text-[#9CA3AF] transition-transform duration-300 ${
                isLiveIslandExpanded ? 'rotate-180' : ''
              }`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* Toggle Primary Metric Mode ($ Balance vs % Ocupación) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(6);
              setPrimaryMetricMode((prev) => (prev === 'REVENUE' ? 'OCCUPANCY' : 'REVENUE'));
            }}
            className="ios-press-bounce inline-flex min-h-[34px] items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#111827] border border-[#9CA3AF]/40 shadow-2xs cursor-pointer"
          >
            <span>{primaryMetricMode === 'REVENUE' ? 'Ver % Ocupación' : 'Ver $ Balance'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3 w-3 text-[#4B5563]">
              <path d="m7 15 5 5 5-5" />
              <path d="m7 9 5-5 5 5" />
            </svg>
          </button>
        </div>

        {/* Dynamic Island In-Place Expanded Widget (Ref 2.3 Mini-Map + Ref 2.4 Ring + Ref 2.8 Route) */}
        {isLiveIslandExpanded && (
          <div className="animate-fade-up overflow-hidden rounded-[28px] bg-[#111827] p-4 text-[#EDEDED] shadow-xl border border-white/10 space-y-3.5">
            <div className="grid grid-cols-12 items-center gap-3">
              {/* Left 7 Cols: Ref 2.3 S-Curve Grid Mini-Map */}
              <div className="col-span-7 relative overflow-hidden rounded-2xl bg-[#1F2937] p-3 border border-white/10">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#9CA3AF]">
                  <span>TELEMETRÍA GPS PATIO</span>
                  <span className="text-emerald-400 font-bold">A 1.8 KM</span>
                </div>
                <svg viewBox="0 0 200 84" className="mt-1.5 h-20 w-full">
                  {/* Subtle Map Street Grid (Ref 2 Top-Right) */}
                  <line x1="0" y1="20" x2="200" y2="20" stroke="#4B5563" strokeOpacity="0.25" strokeWidth="1" />
                  <line x1="0" y1="45" x2="200" y2="45" stroke="#4B5563" strokeOpacity="0.25" strokeWidth="1" />
                  <line x1="0" y1="70" x2="200" y2="70" stroke="#4B5563" strokeOpacity="0.25" strokeWidth="1" />
                  <line x1="45" y1="0" x2="45" y2="84" stroke="#4B5563" strokeOpacity="0.25" strokeWidth="1" />
                  <line x1="105" y1="0" x2="105" y2="84" stroke="#4B5563" strokeOpacity="0.25" strokeWidth="1" />
                  <line x1="160" y1="0" x2="160" y2="84" stroke="#4B5563" strokeOpacity="0.25" strokeWidth="1" />

                  {/* S-Curve Delivery/Return Trajectory */}
                  <path
                    d="M 18 68 C 58 68, 68 22, 112 24 C 148 26, 152 54, 182 32"
                    fill="none"
                    stroke="#4B5563"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 18 68 C 58 68, 68 22, 112 24 C 148 26, 152 54, 182 32"
                    fill="none"
                    stroke="#EDEDED"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="135 200"
                  />
                  {/* Moving Vehicle Node */}
                  <circle cx="142" cy="36" r="10" fill="#EDEDED" fillOpacity="0.2" />
                  <circle cx="142" cy="36" r="5.5" fill="#EDEDED" stroke="#111827" strokeWidth="2" />
                  {/* Yard Destination Pin */}
                  <circle cx="182" cy="32" r="4.5" fill="#111827" stroke="#EDEDED" strokeWidth="2" />
                </svg>
              </div>

              {/* Right 5 Cols: Ref 2.4 "Meter Remaining" Circular Countdown Ring */}
              <div className="col-span-5 flex flex-col items-center justify-between rounded-2xl bg-[#1F2937] p-3 border border-white/10 text-center">
                <span className="font-mono text-[9px] uppercase text-[#9CA3AF]">
                  RETORNO ESTIMADO
                </span>
                <div className="relative my-1 flex h-16 w-16 items-center justify-center">
                  <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                    <circle cx="40" cy="40" r="30" fill="none" stroke="#111827" strokeWidth="7" />
                    <circle
                      cx="40"
                      cy="40"
                      r="30"
                      fill="none"
                      stroke="#EDEDED"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray="155 188.4"
                    />
                  </svg>
                  <span className="absolute font-mono text-xs font-black text-[#EDEDED]">
                    18m
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold text-[#EDEDED]">
                  ETA {snapshot.livePulse.nextReturnEtaLabel}
                </span>
              </div>
            </div>

            {/* Ref 2.8: Horizontal Route Progress Bar ("En Ruta -> Recepción R2") */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#1F2937]/80 px-3.5 py-2.5 border border-white/10">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>Unidad {snapshot.livePulse.nextReturnPlate} aproximándose a patio</span>
                  <span className="font-mono text-[#9CA3AF]">82% recorrido</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#111827]">
                  <div style={{ width: '82%' }} className="h-full rounded-full bg-[#EDEDED]" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  navigate('/admin/operaciones');
                }}
                className="ios-press-bounce shrink-0 rounded-xl bg-[#EDEDED] px-3 py-2 text-[11px] font-extrabold text-[#111827] cursor-pointer"
              >
                Recibir ➔
              </button>
            </div>
          </div>
        )}

        {/* Hero Number Row (Matching "$ 13,553.00 Balance" from Ref 1) */}
        <div className="flex items-baseline justify-between pt-0.5">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111827]">
              {primaryMetricMode === 'REVENUE'
                ? currentCategory.totalBalanceFormatted
                : `${currentCategory.occupancyPct}%`}
            </h2>
            <span className="text-xs font-semibold text-[#4B5563]">
              {primaryMetricMode === 'REVENUE' ? 'Balance' : 'Ocupación'}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#111827] border border-[#9CA3AF]/35 shadow-2xs">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 text-emerald-600">
              <path d="m18 15-6-6-6 6" />
            </svg>
            {currentCategory.trendFormatted}
          </span>
        </div>
      </section>

      {/* 2. Interactive Spline Chart Card (Level 1 Compact Dark Card <-> Level 2 Expanded Explorer) */}
      <InteractiveSplineCard
        seriesByRange={snapshot.seriesByRange}
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
        isExpanded={isChartExpanded}
        onToggleExpand={() => setIsChartExpanded((prev) => !prev)}
        categoryScaleFactor={categoryScaleFactor}
        categoryLabel={currentCategory.label}
      />

      {/* 3. Circular Fleet Filter Bubbles (Adapted from "Recipients" in Ref 1 Screen 1) */}
      <section aria-label="Filtro interactivo por categoría de vehículo" className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#111827]">
            Unidades por Categoría
          </span>
          <span className="font-mono text-[11px] font-medium text-[#4B5563]">
            {currentCategory.activeUnits}/{currentCategory.totalUnits} activas
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
          {snapshot.categories.map((cat) => {
            const isSelected = cat.id === selectedCategory;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setSelectedCategory(cat.id);
                }}
                aria-pressed={isSelected}
                className="ios-press-bounce group flex flex-col items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <div
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-200 ${
                    isSelected
                      ? 'bg-[#111827] text-[#EDEDED] border-[#111827] shadow-[0_8px_20px_-4px_rgba(17,24,39,0.35)] scale-105'
                      : 'bg-white text-[#111827] border-[#9CA3AF]/50 hover:border-[#111827]'
                  }`}
                >
                  <span className="font-display text-sm font-extrabold tracking-tight">
                    {cat.shortBadge}
                  </span>
                  {/* Status Indicator Micro-Dot (Ref 1 Avatar Badge) */}
                  <span
                    className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${
                      isSelected ? 'bg-emerald-500' : 'bg-[#4B5563]'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] font-semibold transition-colors ${
                    isSelected ? 'text-[#111827] font-bold' : 'text-[#4B5563]'
                  }`}
                >
                  {cat.id === 'ALL' ? 'Todos' : cat.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Progressive Disclosure Lens Switcher (Prevents Clutter: Either Bento OR Movements) */}
      {!isChartExpanded && (
        <div
          role="tablist"
          aria-label="Modo de visualización detallada"
          className="flex items-center rounded-2xl bg-white p-1 border border-[#9CA3AF]/35 shadow-2xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeLens === 'BENTO'}
            onClick={() => {
              triggerHaptic(6);
              setActiveLens('BENTO');
            }}
            className={`ios-press-bounce flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeLens === 'BENTO'
                ? 'bg-[#111827] text-[#EDEDED] shadow-xs'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
            <span>Pulso Bento</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeLens === 'MOVEMENTS'}
            onClick={() => {
              triggerHaptic(6);
              setActiveLens('MOVEMENTS');
            }}
            className={`ios-press-bounce flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeLens === 'MOVEMENTS'
                ? 'bg-[#111827] text-[#EDEDED] shadow-xs'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>Movimientos ({filteredMovements.length})</span>
          </button>
        </div>
      )}

      {/* 5A. Lente A: Bento de Telemetría y Onda Líquida (Ref 1 Screen 3 + Refs 3, 4, 5) */}
      {!isChartExpanded && activeLens === 'BENTO' && (
        <TelemetryBentoGrid
          category={currentCategory}
          units={filteredUnits}
          livePulse={snapshot.livePulse}
          onSelectDetail={(kind, unitIdx) => {
            if (typeof unitIdx === 'number') {
              setInitialSelectedUnitIdx(unitIdx);
            }
            setActiveDetailModal(kind);
          }}
        />
      )}

      {/* 5B. Lente B (o Modo Curva Expandida): Historial de Movimientos (Ref 1 Screens 1 & 2) */}
      {(isChartExpanded || activeLens === 'MOVEMENTS') && (
        <section aria-label="Historial de movimientos operativos" className="animate-fade-up space-y-2.5">
          <div className="flex items-center justify-between pt-1">
            <h3 className="font-display text-sm font-bold text-[#111827]">
              Movimientos del Turno
            </h3>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(6);
                setMovementDayFilter((prev) => (prev === 'HOY' ? 'TODOS' : 'HOY'));
              }}
              className="ios-press-bounce inline-flex min-h-[36px] items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#111827] border border-[#9CA3AF]/40 cursor-pointer"
            >
              <span>{movementDayFilter === 'HOY' ? 'Hoy' : 'Todo el mes'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5 text-[#4B5563]">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            {filteredMovements.map((mov) => (
              <button
                key={mov.id}
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setSelectedMovement(mov);
                }}
                className="ios-press-bounce flex w-full items-center justify-between gap-3 rounded-[20px] bg-white p-3.5 text-left border border-[#9CA3AF]/30 shadow-2xs transition-all hover:border-[#111827]/40 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Dark Squircle Icon (Matching Ref 1 Transactions History) */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#EDEDED]">
                    {mov.kind === 'INGRESO' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-bold text-[#111827]">
                      {mov.title}
                    </p>
                    <p className="truncate text-xs text-[#4B5563]">
                      {mov.subtitle} • {mov.timeLabel}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 font-mono text-sm font-extrabold ${
                    mov.kind === 'GASTO' ? 'text-[#4B5563]' : 'text-[#111827]'
                  }`}
                >
                  {mov.amountFormatted}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 6. Nivel 3: 5 Instrumentos Visuales Diferenciados (Reemplaza al modal genérico) */}
      {activeDetailModal && (
        <TelemetryVisualModals
          activeKind={activeDetailModal}
          category={currentCategory}
          units={filteredUnits}
          livePulse={snapshot.livePulse}
          initialSelectedUnitIndex={initialSelectedUnitIdx}
          onClose={() => setActiveDetailModal(null)}
        />
      )}

      {/* 7. Instrumento Visual de Expediente Individual (Movimientos) */}
      {selectedMovement && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Detalle visual de liquidación o movimiento"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/65 backdrop-blur-xs p-3 sm:items-center"
          onClick={() => setSelectedMovement(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-up w-full max-w-md rounded-[32px] bg-white p-6 text-[#111827] shadow-2xl border border-[#9CA3AF]/40 space-y-4"
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-[#9CA3AF]/60" />
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                  EXPEDIENTE {selectedMovement.contractCode} • {selectedMovement.unitPlate}
                </span>
                <h3 className="mt-0.5 font-display text-lg font-black text-[#111827]">
                  {selectedMovement.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMovement(null)}
                className="ios-press-bounce flex h-9 w-9 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Visual Proportional Impact Gauge (Ref 5.2 Pill + Needle style) */}
            <div className="rounded-[24px] bg-[#111827] p-4 text-[#EDEDED] space-y-2.5">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase text-[#9CA3AF]">
                  IMPACTO EN CAJA DE TURNO
                </span>
                <span className="font-display text-2xl font-black text-[#EDEDED]">
                  {selectedMovement.amountFormatted}
                </span>
              </div>
              <div className="flex h-5 w-full overflow-hidden rounded-full bg-[#1F2937] p-0.5 border border-white/10">
                <div
                  style={{ width: selectedMovement.kind === 'GASTO' ? '24%' : '74%' }}
                  className={`h-full rounded-full ${
                    selectedMovement.kind === 'GASTO'
                      ? 'bg-hatch-diagonal-dark bg-[#9CA3AF]'
                      : 'bg-[#EDEDED]'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] text-[#9CA3AF]">
                <span>{selectedMovement.subtitle}</span>
                <span>Hora {selectedMovement.timeLabel}</span>
              </div>
            </div>

            {/* Visual 4-Frame R2 Inspection Strip */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#111827]">
                  Anillo de Evidencia Pericial R2
                </span>
                <span className="font-mono text-[11px] font-bold text-[#4B5563]">
                  {selectedMovement.r2EvidenceCount} capturas
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {R2_CAMERA_ANGLES.map((cam, idx) => {
                  const isCaptured = idx < selectedMovement.r2EvidenceCount;
                  return (
                    <div
                      key={cam.id}
                      className={`flex flex-col items-center justify-between rounded-2xl p-2.5 border ${
                        isCaptured
                          ? 'bg-[#EDEDED] border-[#111827] text-[#111827]'
                          : 'bg-white bg-hatch-diagonal border-[#9CA3AF]/50 text-[#4B5563]'
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                      <span className="mt-1.5 font-mono text-[9px] font-bold">{cam.label}</span>
                      <span className="text-[9px] font-extrabold">
                        {isCaptured ? '● OK' : '⊘ N/A'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setSelectedMovement(null);
                navigate('/admin/caja');
              }}
              className="ios-press-bounce flex min-h-[46px] w-full items-center justify-center rounded-2xl bg-[#111827] px-4 py-3 text-xs font-bold text-[#EDEDED] cursor-pointer"
            >
              Ver en Caja y Liquidaciones
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
