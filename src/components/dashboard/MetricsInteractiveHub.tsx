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

export interface MetricsInteractiveHubProps {
  readonly snapshot: YardMetricsSnapshot;
  readonly initialLens?: ActiveLensMode | undefined;
}

export default function MetricsInteractiveHub({
  snapshot,
  initialLens = 'BENTO',
}: MetricsInteractiveHubProps) {
  const [selectedCategory, setSelectedCategory] = useState<FleetCategoryFilter>('ALL');
  const [selectedRange, setSelectedRange] = useState<MetricTimeRange>('5D');
  const [isChartExpanded, setIsChartExpanded] = useState<boolean>(false);
  const [activeLens, setActiveLens] = useState<ActiveLensMode>(initialLens);
  const [primaryMetricMode, setPrimaryMetricMode] = useState<PrimaryMetricMode>('REVENUE');
  const [movementDayFilter, setMovementDayFilter] = useState<'HOY' | 'TODOS'>('HOY');
  const [activeDetailModal, setActiveDetailModal] = useState<BentoDetailModalKind | null>(null);
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
      {/* 1. Top Live Activity Pill + Primary Hero Metric (Ref 1 Top + Ref 2 Live Activity) */}
      <section aria-label="Indicador principal de patio" className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* iOS Live Activity Telemetry Pill (Ref 2) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(6);
              setActiveDetailModal('RADIAL_HEALTH');
            }}
            className="ios-press-bounce inline-flex items-center gap-2 rounded-full bg-[#111827] px-3 py-1 text-[11px] font-semibold text-[#EDEDED] shadow-xs cursor-pointer"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Próximo retorno {snapshot.livePulse.nextReturnPlate}</span>
            <span className="font-mono text-[10px] text-[#9CA3AF]">
              • {snapshot.livePulse.nextReturnEtaLabel}
            </span>
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
          onSelectDetail={(kind) => setActiveDetailModal(kind)}
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

      {/* 6. Nivel 3: Bottom Sheet iOS de Detalle Interactivo Bajo Demanda */}
      {activeDetailModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de telemetría operativa"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/60 backdrop-blur-xs p-3 sm:items-center"
          onClick={() => setActiveDetailModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-up w-full max-w-md rounded-[32px] bg-white p-6 text-[#111827] shadow-2xl border border-[#9CA3AF]/40 space-y-4 max-h-[82vh] overflow-y-auto"
          >
            {/* Sheet Grab Handle */}
            <div className="mx-auto h-1.5 w-12 rounded-full bg-[#9CA3AF]/60" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                  INSPECCIÓN PROFUNDA • {currentCategory.label}
                </span>
                <h3 className="font-display text-xl font-black text-[#111827]">
                  {activeDetailModal === 'OCCUPANCY' && 'Nivel de Ocupación y Autonomía'}
                  {activeDetailModal === 'WAFFLE_MATRIX' && 'Matriz de Unidades en Patio'}
                  {activeDetailModal === 'RADIAL_HEALTH' && 'Ritmo Horario & Distribución Polar'}
                  {activeDetailModal === 'CONTRACTS' && 'Desglose de Contratos Activos'}
                  {activeDetailModal === 'CASH' && 'Arqueo Rápido de Caja en Turno'}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Cerrar panel de detalle"
                onClick={() => setActiveDetailModal(null)}
                className="ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Variant 1: WAFFLE_MATRIX or OCCUPANCY (Ref 3 Top-Left Range Bars) */}
            {(activeDetailModal === 'WAFFLE_MATRIX' || activeDetailModal === 'OCCUPANCY') && (
              <div className="space-y-2.5">
                <p className="text-xs text-[#4B5563]">
                  Estado individual por unidad con nivel de energía/combustible y autonomía estimada:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {filteredUnits.slice(0, 8).map((u) => (
                    <div
                      key={u.id}
                      className="rounded-2xl bg-[#EDEDED] p-3 border border-[#9CA3AF]/35 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-xs font-extrabold text-[#111827]">
                            {u.plate}
                          </span>
                          <span className="ml-2 text-xs font-semibold text-[#4B5563]">
                            {u.model}
                          </span>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                            u.status === 'MANTENIMIENTO'
                              ? 'bg-white text-[#4B5563] border border-[#9CA3AF]'
                              : 'bg-[#111827] text-[#EDEDED]'
                          }`}
                        >
                          {u.status === 'EN_ALQUILER'
                            ? 'En ruta'
                            : u.status === 'DISPONIBLE'
                              ? 'Disponible'
                              : 'Taller'}
                        </span>
                      </div>

                      {/* Automotive Range Progress Bar with Target Marker (Ref 3 Top-Left: "320 km / 80%") */}
                      <div className="space-y-1">
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white border border-[#9CA3AF]/40">
                          <div
                            style={{ width: `${u.energyPct}%` }}
                            className={`h-full rounded-full ${
                              u.status === 'MANTENIMIENTO' ? 'bg-hatch-diagonal bg-[#9CA3AF]' : 'bg-[#111827]'
                            }`}
                          />
                        </div>
                        <div className="flex items-center justify-between font-mono text-[10px] text-[#4B5563]">
                          <span>
                            {u.energyPct}% nivel • {u.rangeKm} km autonomía
                          </span>
                          <span>{u.dailyRateFormatted}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Content Variant 2: RADIAL_HEALTH / CONTRACTS / CASH (Ref 2 Equalizer + Ref 5 Polar Chart) */}
            {(activeDetailModal === 'RADIAL_HEALTH' ||
              activeDetailModal === 'CONTRACTS' ||
              activeDetailModal === 'CASH') && (
              <div className="space-y-4">
                {/* Hourly Cadence Equalizer Waveform (Ref 2 Bottom-Right & Center-Left) */}
                <div className="rounded-2xl bg-[#111827] p-4 text-[#EDEDED] space-y-2.5">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-[#9CA3AF]">CADENCIA HORARIA DE PATIO</span>
                    <span className="font-bold text-[#EDEDED]">
                      {snapshot.livePulse.r2PhotosToday} fotos R2
                    </span>
                  </div>
                  <div className="flex h-16 items-end justify-between gap-1.5 pt-2">
                    {snapshot.livePulse.cadenceBars.map((barVal, idx) => (
                      <div
                        key={idx}
                        style={{ height: `${barVal}%` }}
                        className={`flex-1 rounded-full transition-all ${
                          idx >= 4 && idx <= 9 ? 'bg-[#EDEDED]' : 'bg-[#4B5563]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#9CA3AF]">
                    <span>07:00</span>
                    <span>Pico 14:00–17:00</span>
                    <span>20:00</span>
                  </div>
                </div>

                {/* Architectural Hatched Share Breakdown (Ref 5 Bottom-Right) */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#111827]">
                    Participación por Segmento Operativo
                  </span>
                  {snapshot.livePulse.polarSectors.map((sec) => (
                    <div
                      key={sec.id}
                      className="flex items-center justify-between rounded-2xl bg-[#EDEDED] p-3 border border-[#9CA3AF]/35"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`h-4 w-4 rounded-full border border-[#111827] ${
                            sec.hatched ? 'bg-hatch-diagonal bg-white' : 'bg-[#111827]'
                          }`}
                        />
                        <span className="text-xs font-bold text-[#111827]">{sec.label}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-[#4B5563]">{sec.sharePct}%</span>
                        <span className="font-extrabold text-[#111827]">{sec.amountFormatted}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Action CTA in Thumb Zone */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(10);
                  const targetRoute =
                    activeDetailModal === 'CASH'
                      ? '/admin/caja'
                      : activeDetailModal === 'CONTRACTS'
                        ? '/admin/reservas'
                        : activeDetailModal === 'RADIAL_HEALTH'
                          ? '/admin/operaciones'
                          : '/admin/flota';
                  setActiveDetailModal(null);
                  navigate(targetRoute);
                }}
                className="ios-press-bounce flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#111827] px-4 py-3 text-xs font-bold text-[#EDEDED] shadow-md cursor-pointer"
              >
                <span>Ir al módulo operativo</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Bottom Sheet para Detalle de un Movimiento Individual */}
      {selectedMovement && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de liquidación o movimiento"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/60 backdrop-blur-xs p-3 sm:items-center"
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

            <div className="rounded-2xl bg-[#EDEDED] p-4 space-y-2 border border-[#9CA3AF]/30">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#4B5563]">Monto liquidado</span>
                <span className="font-mono text-base font-extrabold text-[#111827]">
                  {selectedMovement.amountFormatted}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#4B5563]">Evidencia fotográfica R2</span>
                <span className="font-mono font-bold text-[#111827]">
                  {selectedMovement.r2EvidenceCount} capturas verificadas
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#4B5563]">Registro horario</span>
                <span className="font-mono font-semibold text-[#4B5563]">
                  {selectedMovement.timeLabel}
                </span>
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
