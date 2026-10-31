import { useState } from 'react';
import type { MonthlyFleetOccupancySummary } from '@/lib/metricas';

export interface InteractiveSplineCardProps {
  readonly occupancy: MonthlyFleetOccupancySummary;
  readonly mode: 'BENTO_TILE' | 'FOCUSED_DETAIL';
  readonly onOpenDetail?: (() => void) | undefined;
}

export default function InteractiveSplineCard({
  occupancy,
  mode,
  onOpenDetail,
}: InteractiveSplineCardProps) {
  const defaultIndex = Math.max(0, occupancy.months.length - 1);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(defaultIndex);

  const safeIdx = Math.min(
    selectedMonthIdx,
    Math.max(0, occupancy.months.length - 1)
  );
  const activeMonth = occupancy.months[safeIdx] ?? occupancy.months[defaultIndex];
  const currentMonthPoint = occupancy.months[defaultIndex];

  const maxEarnings = Math.max(
    1,
    ...occupancy.months.map((m) => m.earnings)
  );

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
     NIVEL 1 (BENTO TILE): Mini gráfica limpia de 6 cápsulas mensuales
     ========================================================================= */
  if (mode === 'BENTO_TILE') {
    return (
      <button
        type="button"
        onClick={() => {
          triggerHaptic(8);
          onOpenDetail?.();
        }}
        aria-label="Abrir detalle de ocupación mensual, reservas y ganancias por mes"
        className="ios-press-bounce group flex h-full w-full flex-col justify-between rounded-[26px] bg-white p-4 sm:p-5 text-left text-[#111827] border border-[#9CA3AF]/40 shadow-xs transition hover:border-[#111827]/45 hover:shadow-md cursor-pointer"
      >
        <div className="space-y-3 w-full">
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-white shadow-2xs">
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
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </div>

            <span className="rounded-full bg-[#111827] px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-white shadow-2xs">
              {occupancy.currentOccupancyPct}%
            </span>
          </div>

          <div>
            <p className="text-sm font-bold text-[#4B5563]">
              Ocupación mensual
            </p>
            <p className="mt-0.5 font-display text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#111827]">
              {occupancy.currentMonthReservations}{' '}
              <span className="text-sm font-bold text-[#4B5563]">res.</span>
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#1F2937]">
              {currentMonthPoint?.earningsCompactFormatted ??
                occupancy.currentMonthEarningsFormatted}{' '}
              <span className="font-medium text-[#4B5563]">en el mes</span>
            </p>
          </div>
        </div>

        {/* Mini gráfico limpio de 6 cápsulas mensuales (sin línea superpuesta) */}
        <div className="mt-4 w-full space-y-2.5">
          <div
            className="grid h-10 grid-cols-6 items-end gap-1.5 rounded-2xl bg-[#EDEDED]/75 px-2.5 py-2"
            aria-hidden="true"
          >
            {occupancy.months.map((mes) => {
              const heightPct = Math.max(
                24,
                Math.round((mes.earnings / maxEarnings) * 100)
              );
              return (
                <div
                  key={mes.id}
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-full transition-all ${
                    mes.isCurrentMonth
                      ? 'bg-[#111827]'
                      : 'bg-[#1F2937]/30 group-hover:bg-[#1F2937]/45'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-[#9CA3AF]/25 pt-2 text-xs sm:text-sm font-bold text-[#111827]">
            <span>Reservas por mes</span>
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </div>
      </button>
    );
  }

  /* =========================================================================
     NIVEL 2 (FOCUSED DETAIL): Ficha Protagonista + Cápsulas limpias de 6 meses
     ========================================================================= */
  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const activeOccupancyPct = activeMonth?.occupancyPct ?? occupancy.currentOccupancyPct;
  const ringOffset =
    ringCircumference -
    (Math.min(100, Math.max(0, activeOccupancyPct)) / 100) * ringCircumference;

  return (
    <section
      aria-label="Analítica detallada de ocupación mensual, reservas y ganancias"
      className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch"
    >
      {/* Columna Izquierda (Azul Oscuro): Ficha protagonista con Anillo Radial */}
      {activeMonth && (
        <article className="lg:col-span-5 relative overflow-hidden flex flex-col justify-between rounded-[28px] bg-[#111827] p-5 sm:p-6 text-white shadow-xl border border-white/10 space-y-5">
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/5 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-bold text-white border border-white/10">
                <span className="h-2 w-2 rounded-full bg-status-success" />
                {activeMonth.monthFull}
              </span>

              {activeMonth.isCurrentMonth && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#111827]">
                  Mes actual
                </span>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-[#9CA3AF]">
                Ganancia generada por reservas
              </p>
              <p className="mt-1 font-display text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-white">
                {activeMonth.earningsFormatted}
              </p>
            </div>

            {/* Medidor Radial de Ocupación frente a Meta */}
            <div className="flex items-center gap-4 rounded-2xl bg-[#1F2937] p-4 border border-white/10">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                <svg
                  viewBox="0 0 84 84"
                  className="h-full w-full -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="42"
                    cy="42"
                    r={ringRadius}
                    fill="none"
                    stroke="#111827"
                    strokeWidth="8"
                  />
                  <circle
                    cx="42"
                    cy="42"
                    r={ringRadius}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute font-mono text-sm font-extrabold tabular-nums text-white">
                  {activeMonth.occupancyPct}%
                </span>
              </div>

              <div className="min-w-0 space-y-1">
                <p className="text-sm font-bold text-white">
                  Ocupación de flota del mes
                </p>
                <p className="text-xs font-medium text-[#9CA3AF]">
                  Meta recomendada: {occupancy.targetOccupancyPct}%
                </p>
                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-xs font-bold text-[#EDEDED]">
                  {activeMonth.occupancyPct >= occupancy.targetOccupancyPct
                    ? 'Meta cumplida'
                    : `A ${occupancy.targetOccupancyPct - activeMonth.occupancyPct} pts de meta`}
                </span>
              </div>
            </div>

            {/* Mini tarjetas de alto contraste para Reservas y Ticket Promedio */}
            <div className="grid grid-cols-2 gap-3 tabular-nums">
              <div className="rounded-2xl bg-white p-3.5 text-[#111827] shadow-xs">
                <span className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                  Reservas
                </span>
                <span className="mt-1 block font-display text-2xl font-black text-[#111827]">
                  {activeMonth.reservationsCount}
                </span>
                <span className="text-xs font-medium text-[#4B5563]">
                  contratos cerrados
                </span>
              </div>

              <div className="rounded-2xl bg-[#1F2937] p-3.5 text-white border border-white/10">
                <span className="block text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                  Prom. reserva
                </span>
                <span className="mt-1 block font-display text-lg sm:text-xl font-extrabold text-white truncate">
                  {activeMonth.avgReservationFormatted}
                </span>
                <span className="text-xs font-medium text-[#9CA3AF]">
                  ingreso medio
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-white/12 pt-4 text-sm text-[#EDEDED]/90 tabular-nums">
            <span>
              6 meses:{' '}
              <strong className="font-bold text-white">
                {occupancy.sixMonthTotalReservations} reservas
              </strong>
            </span>
            <span className="font-mono font-bold text-white">
              {occupancy.sixMonthTotalEarningsFormatted}
            </span>
          </div>
        </article>
      )}

      {/* Columna Derecha (Blanca): Cápsulas limpias de 6 meses (diseño original sin líneas traseras) */}
      <article className="lg:col-span-7 flex flex-col justify-between rounded-[28px] bg-white p-5 sm:p-6 text-[#111827] border border-[#9CA3AF]/40 shadow-xs space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#111827]">
              Evolución de reservas y ganancias (6 meses)
            </h2>
            <p className="mt-0.5 text-sm text-[#4B5563]">
              Toca cualquier mes para comparar volumen de reservas y recaudo
            </p>
          </div>

          <span className="rounded-full bg-[#111827] px-3 py-1.5 text-xs font-bold text-white shadow-2xs">
            Pico: {occupancy.bestMonthLabel}
          </span>
        </div>

        <div className="rounded-[22px] bg-[#EDEDED]/65 px-3 sm:px-5 pt-11 pb-4 border border-[#9CA3AF]/30">
          <div
            role="group"
            aria-label="Seleccionar mes para inspeccionar reservas y ganancias"
            className="grid grid-cols-6 gap-2.5 sm:gap-4 items-end h-52 sm:h-56"
          >
            {occupancy.months.map((mes, idx) => {
              const isSelected = idx === safeIdx;
              const heightPct = Math.max(
                24,
                Math.round((mes.earnings / maxEarnings) * 100)
              );

              return (
                <button
                  key={mes.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${mes.monthFull}: ${mes.reservationsCount} reservas, ganancia ${mes.earningsFormatted}`}
                  onMouseEnter={() => setSelectedMonthIdx(idx)}
                  onClick={() => {
                    triggerHaptic(6);
                    setSelectedMonthIdx(idx);
                  }}
                  className="ios-press-bounce group relative flex h-full min-h-[44px] flex-col items-center justify-end gap-2.5 focus:outline-none cursor-pointer"
                >
                  {isSelected && (
                    <span className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#111827] px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-white shadow-sm">
                      {mes.earningsCompactFormatted}
                    </span>
                  )}

                  <div className="flex w-full max-w-[40px] flex-1 items-end justify-center rounded-full bg-white p-1 border border-[#9CA3AF]/35 shadow-2xs">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-full transition-all duration-300 ${
                        isSelected
                          ? 'bg-[#111827] shadow-xs'
                          : 'bg-[#1F2937]/25 group-hover:bg-[#1F2937]/45'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col items-center leading-snug">
                    <span
                      className={`text-sm transition-colors ${
                        isSelected
                          ? 'font-extrabold text-[#111827]'
                          : 'font-semibold text-[#4B5563]'
                      }`}
                    >
                      {mes.monthShort}
                    </span>
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        isSelected
                          ? 'font-bold text-[#1F2937]'
                          : 'font-medium text-[#4B5563]'
                      }`}
                    >
                      {mes.reservationsCount} res.
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumen rápido en grilla de 3 tarjetas de apoyo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 tabular-nums">
          <div className="rounded-2xl bg-[#EDEDED]/65 px-3.5 py-3 border border-[#9CA3AF]/25">
            <span className="block text-xs font-semibold text-[#4B5563]">
              Mes actual ({currentMonthPoint?.monthShort})
            </span>
            <span className="mt-0.5 block font-display text-base font-extrabold text-[#111827]">
              {occupancy.currentMonthEarningsFormatted}
            </span>
          </div>

          <div className="rounded-2xl bg-[#EDEDED]/65 px-3.5 py-3 border border-[#9CA3AF]/25">
            <span className="block text-xs font-semibold text-[#4B5563]">
              Reservas mes actual
            </span>
            <span className="mt-0.5 block font-display text-base font-extrabold text-[#111827]">
              {occupancy.currentMonthReservations} reservas
            </span>
          </div>

          <div className="rounded-2xl bg-[#1F2937] px-3.5 py-3 text-white">
            <span className="block text-xs font-semibold text-[#9CA3AF]">
              Meta operativa
            </span>
            <span className="mt-0.5 block font-display text-base font-extrabold text-white">
              {occupancy.targetOccupancyPct}% ocupación
            </span>
          </div>
        </div>
      </article>
    </section>
  );
}
