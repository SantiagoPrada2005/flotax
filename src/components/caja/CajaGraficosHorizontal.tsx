import { useState } from 'react';
import {
  formatearMonedaCOP,
  PALETA_GASTOS_FLOTAX,
  crearPathSectorAnular,
  calcularSegmentosAngulares,
  type DistribucionMetodoPago,
  type DistribucionCategoriaGasto,
} from '@/lib/caja';

export interface CajaGraficosHorizontalProps {
  readonly distribucionMetodos?: DistribucionMetodoPago[] | undefined;
  readonly distribucionGastos: DistribucionCategoriaGasto[];
  readonly ingresosPeriodo?: number | undefined;
  readonly egresosPeriodo?: number | undefined;
}

interface ItemHorizontal {
  readonly clave: string;
  readonly etiqueta: string;
  readonly total: number;
  readonly porcentaje: number;
  readonly color: string;
}

const CX = 60;
const CY = 60;
const R_IN = 40;
const R_OUT = 56;

/**
 * Tarjeta de Distribución de Gastos Operativos.
 * Mini-donut a la izquierda, cifra principal a la derecha,
 * barra proporcional segmentada y leyenda interactiva.
 */
export function CajaGraficosHorizontal({
  distribucionGastos,
  ingresosPeriodo = 0,
}: CajaGraficosHorizontalProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const items: ItemHorizontal[] = distribucionGastos.map((g, idx) => ({
    clave: g.categoria,
    etiqueta: g.etiqueta,
    total: g.total,
    porcentaje: g.porcentaje,
    color: PALETA_GASTOS_FLOTAX[idx % PALETA_GASTOS_FLOTAX.length] ?? '#1E3A8A',
  }));

  const total = items.reduce((acc, it) => acc + it.total, 0);
  const angulos = calcularSegmentosAngulares(
    items.map((it) => it.total),
    { gapDeg: 5, inicioDeg: -90 }
  );

  const seleccionado = selectedIdx !== null ? items[selectedIdx] ?? null : null;
  const pctSobreRecaudo =
    ingresosPeriodo > 0 ? Math.round((total / ingresosPeriodo) * 100) : null;

  return (
    <article
      aria-label="Distribución de gastos operativos"
      className="col-span-2 rounded-[24px] sm:rounded-[28px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-4 sm:p-5 shadow-xs"
    >
      {/* Cabecera limpia */}
      <div className="flex items-center justify-between pb-2 border-b border-[#9CA3AF]/15 dark:border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#1E3A8A] dark:bg-[#475569]" />
          <h3 className="truncate font-display text-sm font-bold tracking-tight text-[#111827] dark:text-[#EDEDED]">
            Distribución de Gastos Operativos
          </h3>
        </div>
        <span className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
          {items.length} {items.length === 1 ? 'categoría' : 'categorías'}
        </span>
      </div>

      {items.length === 0 || total <= 0 ? (
        <div className="mt-3 rounded-2xl border border-[#9CA3AF]/20 dark:border-white/10 bg-[#EDEDED]/45 dark:bg-[#111827]/40 px-4 py-6 text-center">
          <p className="text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
            Sin gastos operativos registrados en este período
          </p>
          <p className="mt-1 text-xs text-[#4B5563] dark:text-[#9CA3AF]">
            Cambia el período o registra un egreso para visualizar la distribución.
          </p>
        </div>
      ) : (
        <>
          {/* Fila principal horizontal: mini-donut + cifra */}
          <div className="mt-3.5 flex items-center gap-4 sm:gap-6">
            <div className="relative h-[112px] w-[112px] sm:h-[128px] sm:w-[128px] shrink-0">
              <svg
                viewBox="0 0 120 120"
                className="h-full w-full"
                role="img"
                aria-label="Gráfica circular de gastos operativos"
              >
                {items.length === 1 ? (
                  <circle
                    cx={CX}
                    cy={CY}
                    r={(R_IN + R_OUT) / 2}
                    fill="none"
                    stroke={items[0]!.color}
                    strokeWidth={R_OUT - R_IN}
                  />
                ) : (
                  items.map((it, idx) => {
                    const ang = angulos[idx];
                    if (!ang) return null;
                    const isActive = selectedIdx === idx;
                    const isDimmed = selectedIdx !== null && !isActive;
                    return (
                      <path
                        key={it.clave}
                        d={crearPathSectorAnular(
                          CX,
                          CY,
                          R_IN,
                          isActive ? R_OUT + 3 : R_OUT,
                          ang.startDeg,
                          ang.endDeg
                        )}
                        fill={it.color}
                        stroke={it.color}
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        opacity={isDimmed ? 0.35 : 1}
                        className="cursor-pointer transition-all duration-200"
                        onClick={() =>
                          setSelectedIdx(selectedIdx === idx ? null : idx)
                        }
                      >
                        <title>{`${it.etiqueta}: ${formatearMonedaCOP(it.total)} (${it.porcentaje}%)`}</title>
                      </path>
                    );
                  })
                )}
              </svg>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-lg sm:text-xl font-black leading-none text-[#111827] dark:text-white tabular-nums">
                  {seleccionado
                    ? `${seleccionado.porcentaje}%`
                    : pctSobreRecaudo !== null
                      ? `${pctSobreRecaudo}%`
                      : '100%'}
                </span>
                <span className="mt-1 max-w-[64px] truncate text-[10px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                  {seleccionado
                    ? 'del total'
                    : pctSobreRecaudo !== null
                      ? 'del recaudo'
                      : 'consolidado'}
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
                {seleccionado ? seleccionado.etiqueta : 'Total Gastos'}
              </span>
              <p className="mt-0.5 truncate font-display text-2xl sm:text-3xl font-black tracking-tight text-[#111827] dark:text-white tabular-nums">
                {formatearMonedaCOP(seleccionado ? seleccionado.total : total)}
              </p>
              <p className="mt-0.5 truncate text-[11px] sm:text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] tabular-nums">
                {seleccionado
                  ? `de ${formatearMonedaCOP(total)} en egresos`
                  : ingresosPeriodo > 0
                    ? `de ${formatearMonedaCOP(ingresosPeriodo)} recaudados`
                    : 'Gastos consolidados del período'}
              </p>

              {seleccionado && (
                <button
                  type="button"
                  onClick={() => setSelectedIdx(null)}
                  className="mt-1.5 inline-flex min-h-[28px] items-center rounded-full bg-[#111827] dark:bg-[#1E3A8A] px-2.5 py-0.5 text-[10px] font-bold text-[#EDEDED] cursor-pointer"
                >
                  Ver total ✕
                </button>
              )}
            </div>
          </div>

          {/* Barra proporcional segmentada (horizontal) */}
          <div
            className="mt-4 flex h-3 w-full items-center gap-1"
            role="group"
            aria-label="Proporción por categoría de gasto"
          >
            {items.map((it, idx) => {
              const isActive = selectedIdx === idx;
              const isDimmed = selectedIdx !== null && !isActive;
              return (
                <button
                  key={it.clave}
                  type="button"
                  title={`${it.etiqueta}: ${it.porcentaje}%`}
                  aria-label={`${it.etiqueta} ${it.porcentaje}%`}
                  onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
                  style={{
                    flexGrow: it.total,
                    flexBasis: 0,
                    minWidth: 8,
                    backgroundColor: it.color,
                  }}
                  className={`h-full rounded-full transition-all duration-200 cursor-pointer ${
                    isDimmed ? 'opacity-35' : 'opacity-100'
                  } ${isActive ? 'scale-y-125' : ''}`}
                />
              );
            })}
          </div>

          {/* Leyenda interactiva horizontal */}
          <div className="mt-3 grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 gap-1.5">
            {items.map((it, idx) => {
              const isActive = selectedIdx === idx;
              return (
                <button
                  key={it.clave}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
                  className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#1E3A8A] bg-[#1E3A8A]/10 dark:border-white/30 dark:bg-white/10 shadow-xs'
                      : 'border-[#9CA3AF]/25 dark:border-white/10 bg-[#EDEDED]/45 dark:bg-[#111827]/40 hover:bg-[#EDEDED] dark:hover:bg-white/10'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-[4px]"
                      style={{ backgroundColor: it.color }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-[#111827] dark:text-[#EDEDED]">
                        {it.etiqueta}
                      </span>
                      <span className="block truncate font-mono text-[10px] font-bold text-[#4B5563] dark:text-[#9CA3AF] tabular-nums">
                        {formatearMonedaCOP(it.total)}
                      </span>
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums ${
                      isActive
                        ? 'bg-[#1E3A8A] text-white dark:bg-white dark:text-[#111827]'
                        : 'bg-white dark:bg-white/10 text-[#111827] dark:text-[#EDEDED]'
                    }`}
                  >
                    {it.porcentaje}%
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </article>
  );
}

