import { useState } from 'react';
import type {
  MetricsFocusView,
  YardMetricsSnapshot,
} from '@/lib/metricas';
import InteractiveSplineCard from './InteractiveSplineCard';
import TelemetryBentoGrid from './TelemetryBentoGrid';
import TelemetryVisualModals, {
  type TelemetryDetailSelection,
} from './TelemetryVisualModals';

export interface MetricsInteractiveHubProps {
  readonly snapshot: YardMetricsSnapshot;
}

const FOCUS_TABS: readonly {
  readonly id: Exclude<MetricsFocusView, 'OVERVIEW'>;
  readonly label: string;
}[] = [
  { id: 'EARNINGS_FLEET', label: 'Ganancia y Autos' },
  { id: 'MONTHLY_OCCUPANCY', label: 'Ocupación Mensual' },
  { id: 'DAILY_MOVEMENTS', label: 'Movimientos de Hoy' },
];

export default function MetricsInteractiveHub({
  snapshot,
}: MetricsInteractiveHubProps) {
  const [activeFocus, setActiveFocus] = useState<MetricsFocusView>('OVERVIEW');
  const [detailSelection, setDetailSelection] =
    useState<TelemetryDetailSelection | null>(null);

  const triggerHaptic = (ms: number = 6) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Sin vibración disponible
      }
    }
  };

  const openFocus = (focus: MetricsFocusView) => {
    triggerHaptic(8);
    setActiveFocus(focus);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const { dailyEarnings, monthlyOccupancy, rentedFleet, dailyMovements } =
    snapshot;

  const unitBlocksCount = Math.max(
    1,
    Math.min(8, rentedFleet.totalAutomobilesCount)
  );
  const miniRingRadius = 18;
  const miniRingCircumference = 2 * Math.PI * miniRingRadius;
  const miniRingOffset =
    miniRingCircumference -
    (Math.min(100, Math.max(0, rentedFleet.automobilesOccupancyPct)) / 100) *
      miniRingCircumference;

  return (
    <div className="space-y-4 pb-8">
      {/* =====================================================================
          NIVEL 1 (PROGRESSIVE DISCLOSURE): MOSAICO BENTO ASIMÉTRICO NO LINEAL
          - Fila 1: [Hero Azul Oscuro + Autos Incrustados (7)] + [Ocupación Blanca + Pulso Azul Pizarra (5)]
          - Fila 2: [Movimientos Recientes Blanca (5)] + [Gráfica de Curvas Azul Oscuro (7)]
         ===================================================================== */}
      {activeFocus === 'OVERVIEW' ? (
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
          {/* BLOQUE A (Hero Azul Oscuro + Sub-bloque Blanco con Anillo y Matriz) */}
          <article
            aria-label="Ganancia diaria y automóviles alquilados"
            className="col-span-2 lg:col-span-7 relative overflow-hidden rounded-[28px] bg-[#111827] p-5 sm:p-6 text-white shadow-xl border border-white/10 flex flex-col justify-between gap-5"
          >
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/5 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-stretch justify-between gap-4 sm:gap-5">
              {/* Lado principal: Ganancia diaria obtenida con los vehículos */}
              <div className="flex flex-col justify-between space-y-4 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white border border-white/10">
                    <span className="h-2 w-2 rounded-full bg-status-success" />
                    Ganancia diaria con vehículos
                  </span>

                  <span className="rounded-full bg-[#1F2937] px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-white border border-white/10">
                    {dailyEarnings.variationPct >= 0
                      ? `+${dailyEarnings.variationPct}%`
                      : `${dailyEarnings.variationPct}%`}
                  </span>
                </div>

                <div>
                  <p className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-white">
                    {dailyEarnings.todayEarningsFormatted}
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-[#EDEDED]/85 tabular-nums">
                    Promedio {dailyEarnings.dailyAverageFormatted} •{' '}
                    {dailyEarnings.contributingVehiclesCount} unidades activas
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => openFocus('EARNINGS_FLEET')}
                    className="ios-press-bounce group inline-flex min-h-[44px] items-center gap-2.5 rounded-full bg-white/12 pl-4 pr-2 py-1.5 text-sm font-bold text-white border border-white/15 transition hover:bg-white/20 cursor-pointer"
                  >
                    <span>Desglosar ganancia y flota</span>
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-[#111827] transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </button>
                </div>
              </div>

              {/* Subsección complementaria integrada: Tarjeta Blanca con Anillo Radial + Matriz */}
              <button
                type="button"
                onClick={() => openFocus('EARNINGS_FLEET')}
                aria-label={`Ver ${rentedFleet.rentedAutomobilesCount} de ${rentedFleet.totalAutomobilesCount} automóviles alquilados`}
                className="ios-press-bounce group flex sm:w-[222px] shrink-0 flex-col justify-between rounded-[22px] bg-white p-4 text-left text-[#111827] shadow-lg transition hover:bg-[#EDEDED] cursor-pointer"
              >
                <div className="space-y-3 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                      Autos alquilados
                    </span>

                    {/* Mini medidor circular de ocupación de autos */}
                    <div
                      className="relative flex h-11 w-11 shrink-0 items-center justify-center"
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 44 44"
                        className="h-full w-full -rotate-90"
                      >
                        <circle
                          cx="22"
                          cy="22"
                          r={miniRingRadius}
                          fill="none"
                          stroke="#EDEDED"
                          strokeWidth="4.5"
                        />
                        <circle
                          cx="22"
                          cy="22"
                          r={miniRingRadius}
                          fill="none"
                          stroke="#111827"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          strokeDasharray={miniRingCircumference}
                          strokeDashoffset={miniRingOffset}
                        />
                      </svg>
                      <span className="absolute font-mono text-xs font-extrabold text-[#111827]">
                        {rentedFleet.automobilesOccupancyPct}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1.5 tabular-nums">
                    <span className="font-display text-3xl font-black tracking-tight text-[#111827]">
                      {rentedFleet.rentedAutomobilesCount}
                    </span>
                    <span className="text-sm font-bold text-[#4B5563]">
                      de {rentedFleet.totalAutomobilesCount} autos
                    </span>
                  </div>

                  {/* Bloques visuales por cada unidad del parque automotor */}
                  <div
                    className="grid gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${unitBlocksCount}, minmax(0, 1fr))`,
                    }}
                    aria-hidden="true"
                  >
                    {Array.from({ length: unitBlocksCount }).map((_, idx) => {
                      const active = idx < rentedFleet.rentedAutomobilesCount;
                      return (
                        <div
                          key={`hero-auto-${idx}`}
                          className={`h-3 rounded-md transition-all ${
                            active
                              ? 'bg-[#111827]'
                              : 'bg-[#EDEDED] border border-[#9CA3AF]/45'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#9CA3AF]/25 pt-2.5 text-xs font-bold text-[#1F2937] tabular-nums">
                  <span>{rentedFleet.availableAutomobilesCount} libres hoy</span>
                  <span className="inline-flex items-center gap-1 font-extrabold text-[#111827] group-hover:translate-x-0.5 transition-transform">
                    Ver autos →
                  </span>
                </div>
              </button>
            </div>
          </article>

          {/* BLOQUES B y C (Par Bento Lateral de 2 Columnas: Blanca + Azul Oscuro) */}
          <div className="col-span-2 lg:col-span-5 grid grid-cols-2 gap-3.5 sm:gap-4">
            <InteractiveSplineCard
              occupancy={monthlyOccupancy}
              mode="BENTO_TILE"
              onOpenDetail={() => openFocus('MONTHLY_OCCUPANCY')}
            />

            <TelemetryBentoGrid
              viewMode="OVERVIEW_PULSE_TILE"
              dailyEarnings={dailyEarnings}
              rentedFleet={rentedFleet}
              dailyMovements={dailyMovements}
              onOpenMovementsDetail={() => openFocus('DAILY_MOVEMENTS')}
              onSelectAutomobile={(auto) =>
                setDetailSelection({ kind: 'AUTOMOBILE', item: auto })
              }
              onSelectMovement={(mov) =>
                setDetailSelection({ kind: 'MOVEMENT', item: mov })
              }
            />
          </div>

          {/* BLOQUE D (Gráfica Visual de Curvas de Movimientos Diarios en Azul Oscuro — 7 cols derecha en desktop) */}
          <div className="col-span-2 lg:col-span-7 lg:order-2">
            <TelemetryBentoGrid
              viewMode="OVERVIEW_CURVE_CARD"
              dailyEarnings={dailyEarnings}
              rentedFleet={rentedFleet}
              dailyMovements={dailyMovements}
              onOpenMovementsDetail={() => openFocus('DAILY_MOVEMENTS')}
              onSelectAutomobile={(auto) =>
                setDetailSelection({ kind: 'AUTOMOBILE', item: auto })
              }
              onSelectMovement={(mov) =>
                setDetailSelection({ kind: 'MOVEMENT', item: mov })
              }
            />
          </div>

          {/* BLOQUE E (Últimos Movimientos de Hoy en Blanca — 5 cols izquierda en desktop) */}
          <div className="col-span-2 lg:col-span-5 lg:order-1">
            <TelemetryBentoGrid
              viewMode="OVERVIEW_RECENT_STRIP"
              dailyEarnings={dailyEarnings}
              rentedFleet={rentedFleet}
              dailyMovements={dailyMovements}
              onOpenMovementsDetail={() => openFocus('DAILY_MOVEMENTS')}
              onSelectAutomobile={(auto) =>
                setDetailSelection({ kind: 'AUTOMOBILE', item: auto })
              }
              onSelectMovement={(mov) =>
                setDetailSelection({ kind: 'MOVEMENT', item: mov })
              }
            />
          </div>
        </div>
      ) : (
        /* ===================================================================
           NIVEL 2 (PROGRESSIVE DISCLOSURE): VISTA FOCALIZADA DE DETALLE
           =================================================================== */
        <div className="space-y-4">
          <nav
            aria-label="Navegación de detalle de métricas"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[24px] bg-white p-3 border border-[#9CA3AF]/40 shadow-xs"
          >
            <button
              type="button"
              onClick={() => openFocus('OVERVIEW')}
              className="ios-press-bounce inline-flex min-h-[44px] items-center justify-center sm:justify-start gap-2 rounded-xl bg-[#EDEDED] px-4 py-2 text-sm font-bold text-[#111827] border border-[#9CA3AF]/35 transition hover:bg-[#9CA3AF]/25 cursor-pointer"
            >
              <span aria-hidden="true">←</span>
              <span>Volver al resumen</span>
            </button>

            <div
              role="tablist"
              aria-label="Cambiar vista detallada"
              className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 rounded-xl bg-[#EDEDED] p-1"
            >
              {FOCUS_TABS.map((tab) => {
                const isSelected = activeFocus === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => openFocus(tab.id)}
                    className={`ios-press-bounce min-h-[42px] flex-1 sm:flex-initial rounded-lg px-3.5 py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#111827] text-white shadow-xs'
                        : 'text-[#4B5563] hover:text-[#111827]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {activeFocus === 'MONTHLY_OCCUPANCY' && (
            <InteractiveSplineCard
              occupancy={monthlyOccupancy}
              mode="FOCUSED_DETAIL"
            />
          )}

          {activeFocus === 'EARNINGS_FLEET' && (
            <TelemetryBentoGrid
              viewMode="EARNINGS_FLEET_DETAIL"
              dailyEarnings={dailyEarnings}
              rentedFleet={rentedFleet}
              dailyMovements={dailyMovements}
              onSelectAutomobile={(auto) =>
                setDetailSelection({ kind: 'AUTOMOBILE', item: auto })
              }
              onSelectMovement={(mov) =>
                setDetailSelection({ kind: 'MOVEMENT', item: mov })
              }
            />
          )}

          {activeFocus === 'DAILY_MOVEMENTS' && (
            <TelemetryBentoGrid
              viewMode="MOVEMENTS_DETAIL"
              dailyEarnings={dailyEarnings}
              rentedFleet={rentedFleet}
              dailyMovements={dailyMovements}
              onSelectAutomobile={(auto) =>
                setDetailSelection({ kind: 'AUTOMOBILE', item: auto })
              }
              onSelectMovement={(mov) =>
                setDetailSelection({ kind: 'MOVEMENT', item: mov })
              }
            />
          )}
        </div>
      )}

      {/* =====================================================================
          NIVEL 3 (PROGRESSIVE DISCLOSURE): FICHA PUNTUAL EN MODAL / SHEET
         ===================================================================== */}
      {detailSelection && (
        <TelemetryVisualModals
          selection={detailSelection}
          onClose={() => setDetailSelection(null)}
        />
      )}
    </div>
  );
}
