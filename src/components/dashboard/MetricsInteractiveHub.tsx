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
  readonly id: Exclude<MetricsFocusView, 'OVERVIEW' | 'EARNINGS_FLEET' | 'DAILY_MOVEMENTS'>;
  readonly label: string;
}[] = [
  { id: 'DAILY_EARNINGS', label: 'Ganancia diaria' },
  { id: 'RENTED_AUTOS', label: 'Autos alquilados' },
  { id: 'DAILY_BALANCE', label: 'Balance de hoy' },
  { id: 'MONTHLY_OCCUPANCY', label: 'Ocupación mensual' },
  { id: 'MOVEMENTS_CURVE', label: 'Curva analítica' },
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

  // Normalización del tab seleccionado en detalle
  const activeFocusTab =
    activeFocus === 'EARNINGS_FLEET'
      ? 'DAILY_EARNINGS'
      : activeFocus === 'DAILY_MOVEMENTS'
        ? 'DAILY_BALANCE'
        : activeFocus;

  return (
    <div className="space-y-4 pb-8">
      {/* =====================================================================
          NIVEL 1 (PROGRESSIVE DISCLOSURE): RESUMEN EJECUTIVO BENTO GRID FINTECH
          - Fila 1 (12 cols): [Ganancia Diaria (7)] + [Autos Alquilados (5)]
          - Fila 2 (12 cols): [Ocupación Mensual (4)] + [Balance de Hoy (4)] + [Movimientos Recientes (4)]
          - Fila 3 (12 cols): [Curva Analítica de Movimientos Diarios (12)]
         ===================================================================== */}
      {activeFocus === 'OVERVIEW' ? (
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
          {/* TARJETA 1 (Hero Azul Oscuro: Ganancia Diaria con Vehículos) */}
          <article
            aria-label="Ganancia diaria con vehículos"
            className="col-span-2 lg:col-span-7 relative overflow-hidden rounded-[28px] bg-[#111827] p-5 sm:p-6 text-white shadow-xl border border-white/10 flex flex-col justify-between gap-5"
          >
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/5 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col justify-between space-y-4 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
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
                  {dailyEarnings.contributingVehiclesCount} unidades activas hoy
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-white/10">
                <span className="text-xs text-[#9CA3AF] font-medium">
                  {dailyEarnings.byCategory.length} categorías operativas
                </span>
                <button
                  type="button"
                  onClick={() => openFocus('DAILY_EARNINGS')}
                  className="ios-press-bounce group inline-flex min-h-[44px] items-center gap-2.5 rounded-full bg-white/12 pl-4 pr-2 py-1.5 text-sm font-bold text-white border border-white/15 transition hover:bg-white/20 cursor-pointer"
                >
                  <span>Desglosar ganancia</span>
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-[#111827] transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </button>
              </div>
            </div>
          </article>

          {/* TARJETA 2 (Blanca: Automóviles Alquilados y Ocupación de Flota) */}
          <article
            aria-label="Automóviles alquilados y flota activa"
            className="col-span-2 lg:col-span-5 flex flex-col justify-between rounded-[28px] bg-white dark:bg-[#1F2937] p-5 sm:p-6 text-[#111827] dark:text-[#EDEDED] border border-[#9CA3AF]/40 dark:border-white/10 shadow-xs space-y-4"
          >
            <div className="space-y-3.5 w-full">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] dark:bg-white text-white dark:text-[#111827] shadow-2xs">
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
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                      <circle cx="7" cy="17" r="2" />
                      <path d="M9 17h6" />
                      <circle cx="17" cy="17" r="2" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
                      Flota activa
                    </span>
                    <h2 className="font-display text-base font-bold text-[#111827] dark:text-[#EDEDED]">
                      Autos alquilados
                    </h2>
                  </div>
                </div>

                {/* Mini medidor circular de ocupación de autos */}
                <div
                  className="relative flex h-12 w-12 shrink-0 items-center justify-center"
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
                      className="dark:stroke-white/10"
                      strokeWidth="4.5"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r={miniRingRadius}
                      fill="none"
                      stroke="#111827"
                      className="dark:stroke-white"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeDasharray={miniRingCircumference}
                      strokeDashoffset={miniRingOffset}
                    />
                  </svg>
                  <span className="absolute font-mono text-xs font-extrabold text-[#111827] dark:text-[#EDEDED]">
                    {rentedFleet.automobilesOccupancyPct}%
                  </span>
                </div>
              </div>

              <div className="flex items-baseline gap-2 tabular-nums">
                <span className="font-display text-3xl font-black tracking-tight text-[#111827] dark:text-white">
                  {rentedFleet.rentedAutomobilesCount}
                </span>
                <span className="text-sm font-bold text-[#4B5563] dark:text-[#9CA3AF]">
                  de {rentedFleet.totalAutomobilesCount} automóviles
                </span>
              </div>

              {/* Matriz visual de bloques de unidades */}
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
                          ? 'bg-[#111827] dark:bg-white'
                          : 'bg-[#EDEDED] dark:bg-white/10 border border-[#9CA3AF]/45 dark:border-white/10'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] tabular-nums pt-1">
                <span>{rentedFleet.availableAutomobilesCount} libres en patio</span>
                <span>Tarifa: {rentedFleet.activeDailyRunRateFormatted}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#9CA3AF]/25 dark:border-white/10 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
                {rentedFleet.rentedAutomobiles.length} contratos activos
              </span>
              <button
                type="button"
                onClick={() => openFocus('RENTED_AUTOS')}
                className="ios-press-bounce group inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#111827] dark:bg-white px-4 py-1.5 text-xs font-bold text-white dark:text-[#111827] shadow-xs transition hover:bg-[#1F2937] dark:hover:bg-[#EDEDED] cursor-pointer"
              >
                <span>Ver flota activa</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>

          {/* TARJETA 3 (Blanca: Ocupación Mensual y Reservas) */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-4">
            <InteractiveSplineCard
              occupancy={monthlyOccupancy}
              mode="BENTO_TILE"
              onOpenDetail={() => openFocus('MONTHLY_OCCUPANCY')}
            />
          </div>

          {/* TARJETA 4 (Azul Oscuro: Balance de Hoy y Flujo Operativo) */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-4">
            <TelemetryBentoGrid
              viewMode="OVERVIEW_PULSE_TILE"
              dailyEarnings={dailyEarnings}
              rentedFleet={rentedFleet}
              dailyMovements={dailyMovements}
              onOpenMovementsDetail={() => openFocus('DAILY_BALANCE')}
              onSelectAutomobile={(auto) =>
                setDetailSelection({ kind: 'AUTOMOBILE', item: auto })
              }
              onSelectMovement={(mov) =>
                setDetailSelection({ kind: 'MOVEMENT', item: mov })
              }
            />
          </div>

          {/* TARJETA 5 (Blanca: Movimientos Recientes de Patio) */}
          <div className="col-span-2 lg:col-span-4">
            <TelemetryBentoGrid
              viewMode="OVERVIEW_RECENT_STRIP"
              dailyEarnings={dailyEarnings}
              rentedFleet={rentedFleet}
              dailyMovements={dailyMovements}
              onOpenMovementsDetail={() => openFocus('DAILY_BALANCE')}
              onSelectAutomobile={(auto) =>
                setDetailSelection({ kind: 'AUTOMOBILE', item: auto })
              }
              onSelectMovement={(mov) =>
                setDetailSelection({ kind: 'MOVEMENT', item: mov })
              }
            />
          </div>

          {/* TARJETA 6 (Hero Azul Oscuro Ancho: Curva Analítica de Movimientos Diarios) */}
          <div className="col-span-2 lg:col-span-12">
            <TelemetryBentoGrid
              viewMode="OVERVIEW_CURVE_CARD"
              dailyEarnings={dailyEarnings}
              rentedFleet={rentedFleet}
              dailyMovements={dailyMovements}
              onOpenMovementsDetail={() => openFocus('MOVEMENTS_CURVE')}
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
           NIVEL 2 (PROGRESSIVE DISCLOSURE): VISTAS ESPECIALIZADAS DE DETALLE
           =================================================================== */
        <div className="space-y-4">
          <nav
            aria-label="Navegación de detalle de métricas"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[24px] bg-white dark:bg-[#1F2937] p-3 border border-[#9CA3AF]/40 dark:border-white/10 shadow-xs"
          >
            <button
              type="button"
              onClick={() => openFocus('OVERVIEW')}
              className="ios-press-bounce inline-flex min-h-[44px] items-center justify-center sm:justify-start gap-2 rounded-xl bg-[#EDEDED] dark:bg-white/10 px-4 py-2 text-sm font-bold text-[#111827] dark:text-[#EDEDED] border border-[#9CA3AF]/35 dark:border-white/10 transition hover:bg-[#9CA3AF]/25 dark:hover:bg-white/20 cursor-pointer"
            >
              <span aria-hidden="true">←</span>
              <span>Volver al resumen</span>
            </button>

            <div
              role="tablist"
              aria-label="Cambiar vista detallada"
              className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 rounded-xl bg-[#EDEDED] dark:bg-white/10 p-1"
            >
              {FOCUS_TABS.map((tab) => {
                const isSelected = activeFocusTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => openFocus(tab.id)}
                    className={`ios-press-bounce min-h-[42px] flex-1 sm:flex-initial rounded-lg px-3.5 py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#111827] dark:bg-white text-white dark:text-[#111827] shadow-xs'
                        : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* VISTA 1: GANANCIA DIARIA */}
          {activeFocus === 'DAILY_EARNINGS' && (
            <TelemetryBentoGrid
              viewMode="DAILY_EARNINGS_DETAIL"
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

          {/* VISTA 2: AUTOS ALQUILADOS */}
          {activeFocus === 'RENTED_AUTOS' && (
            <TelemetryBentoGrid
              viewMode="RENTED_AUTOS_DETAIL"
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

          {/* VISTA 3: BALANCE DE HOY */}
          {activeFocus === 'DAILY_BALANCE' && (
            <TelemetryBentoGrid
              viewMode="DAILY_BALANCE_DETAIL"
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

          {/* VISTA 4: OCUPACIÓN MENSUAL */}
          {activeFocus === 'MONTHLY_OCCUPANCY' && (
            <InteractiveSplineCard
              occupancy={monthlyOccupancy}
              mode="FOCUSED_DETAIL"
            />
          )}

          {/* VISTA 5: CURVA ANALÍTICA DE MOVIMIENTOS */}
          {activeFocus === 'MOVEMENTS_CURVE' && (
            <TelemetryBentoGrid
              viewMode="MOVEMENTS_CURVE_DETAIL"
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

          {/* COMPATIBILIDAD CON VISTAS COMBINADAS ANTERIORES */}
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
