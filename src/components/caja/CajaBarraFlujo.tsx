import { useState } from 'react';
import {
  formatearMonedaCompactaCOP,
  type DistribucionCategoriaGasto,
  type DistribucionMetodoPago,
} from '@/lib/caja';

export interface CajaBarraFlujoProps {
  ingresos: number;
  egresos: number;
  flujoNeto: number;
  distribucionGastos?: DistribucionCategoriaGasto[] | undefined;
  distribucionMetodos?: DistribucionMetodoPago[] | undefined;
  periodoLabel?: string | undefined;
  onExplorarDetalle?: ((tipo: 'EGRESOS' | 'BALANCE' | 'METODOS') => void) | undefined;
}

type SegmentoSeleccionado = 'EGRESOS' | 'BALANCE' | 'METODOS' | null;

/**
 * Barra Proporcional de Flujo Operativo
 *
 * Muestra visualmente la eficiencia operativa: cuánto de lo recaudado
 * se destina a gastos operativos vs cuánto se retiene como margen neto.
 *
 * Principios UX:
 * 1. CERO hover preview: se activa ÚNICAMENTE con clic directo.
 * 2. Retorno inmediato y claro con botón "← Volver".
 * 3. Cero duplicidad: no repite los montos totales ya visibles en las tarjetas superiores.
 * 4. Textos mínimos y directos sin sobrecarga cognitiva.
 */
export function CajaBarraFlujo({
  ingresos,
  egresos,
  flujoNeto,
  distribucionGastos = [],
  distribucionMetodos = [],
  periodoLabel = 'Período activo',
  onExplorarDetalle,
}: CajaBarraFlujoProps) {
  const [segmentoActivo, setSegmentoActivo] = useState<SegmentoSeleccionado>(null);

  // Proporciones relativas reales sobre el recaudo base
  const totalBase = Math.max(ingresos, egresos, 1);
  const pctEgresos = Math.min(100, Math.round((egresos / totalBase) * 100));
  const pctNeto = Math.max(0, Math.min(100, Math.round((Math.max(0, flujoNeto) / totalBase) * 100)));
  const esSuperavit = flujoNeto >= 0;

  const handleToggle = (segmento: 'EGRESOS' | 'BALANCE' | 'METODOS') => {
    const nuevo = segmentoActivo === segmento ? null : segmento;
    setSegmentoActivo(nuevo);
    if (nuevo) onExplorarDetalle?.(nuevo);
  };

  return (
    <section className="relative overflow-hidden rounded-[24px] bg-white border border-[#9CA3AF]/30 p-4 sm:p-5 shadow-xs transition-all">
      {/* Encabezado Mínimo */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#9CA3AF]/15">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#111827]" />
          <h3 className="font-display text-xs sm:text-sm font-bold text-[#111827] uppercase tracking-wider">
            Distribución del Flujo · {periodoLabel}
          </h3>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            esSuperavit
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              esSuperavit ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
          {esSuperavit ? `Margen Operativo: ${pctNeto}%` : 'Déficit Operativo'}
        </span>
      </div>

      {/* Track Proporcional Segmentado (Clic Directo para Ver Desglose) */}
      <div className="mt-3 space-y-2.5">
        <div className="relative flex h-8 sm:h-9 w-full overflow-hidden rounded-xl bg-[#EDEDED] p-1 border border-[#9CA3AF]/40">
          {/* Segmento Gastos / Egresos (Carmesí) */}
          <button
            type="button"
            onClick={() => handleToggle('EGRESOS')}
            style={{ width: `${Math.max(12, pctEgresos)}%` }}
            title="Clic para ver desglose de gastos"
            className={`relative flex items-center justify-center rounded-lg transition-all cursor-pointer ${
              segmentoActivo === 'EGRESOS'
                ? 'bg-[#F43F47] shadow-md ring-2 ring-[#F43F47]/60 text-white z-10'
                : 'bg-[#F43F47]/90 text-white hover:opacity-95'
            }`}
          >
            <span className="truncate px-2 text-[10px] sm:text-[11px] font-bold">
              Gastos {pctEgresos}%
            </span>
          </button>

          <div className="w-1 shrink-0" />

          {/* Segmento Margen Neto (Esmeralda) */}
          <button
            type="button"
            onClick={() => handleToggle('BALANCE')}
            style={{ width: `${Math.max(12, pctNeto)}%` }}
            title="Clic para ver desglose de margen"
            className={`relative flex items-center justify-center rounded-lg transition-all cursor-pointer ${
              segmentoActivo === 'BALANCE'
                ? 'bg-[#10B981] shadow-md ring-2 ring-[#10B981]/60 text-white z-10'
                : 'bg-[#10B981]/90 text-white hover:opacity-95'
            }`}
          >
            <span className="truncate px-2 text-[10px] sm:text-[11px] font-bold">
              Margen {pctNeto}%
            </span>
          </button>
        </div>

        {/* Botones Selectores de Desglose (Solo Clic, Cero Hover Preview) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleToggle('EGRESOS')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                segmentoActivo === 'EGRESOS'
                  ? 'bg-rose-50 text-rose-800 border border-rose-300'
                  : 'bg-[#EDEDED]/60 text-[#4B5563] hover:text-[#111827] hover:bg-[#EDEDED]'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#F43F47]" />
              <span>Ver Gastos ({pctEgresos}%)</span>
              <span className="text-[10px] text-[#9CA3AF]">
                {segmentoActivo === 'EGRESOS' ? '▾' : '▸'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleToggle('BALANCE')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                segmentoActivo === 'BALANCE'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-[#EDEDED]/60 text-[#4B5563] hover:text-[#111827] hover:bg-[#EDEDED]'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#10B981]" />
              <span>Ver Margen ({pctNeto}%)</span>
              <span className="text-[10px] text-[#9CA3AF]">
                {segmentoActivo === 'BALANCE' ? '▾' : '▸'}
              </span>
            </button>

            {distribucionMetodos.length > 0 && (
              <button
                type="button"
                onClick={() => handleToggle('METODOS')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                  segmentoActivo === 'METODOS'
                    ? 'bg-blue-50 text-blue-800 border border-blue-300'
                    : 'bg-[#EDEDED]/60 text-[#4B5563] hover:text-[#111827] hover:bg-[#EDEDED]'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[#2D6BFF]" />
                <span>Canales de Entrada</span>
                <span className="text-[10px] text-[#9CA3AF]">
                  {segmentoActivo === 'METODOS' ? '▾' : '▸'}
                </span>
              </button>
            )}
          </div>

          <span className="text-[11px] text-[#9CA3AF] hidden sm:inline">
            Toca una sección para ver composición
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PANEL DE DETALLE ACTIVADO EXCLUSIVAMENTE POR CLIC */}
      {/* ============================================================== */}
      {segmentoActivo && (
        <div className="mt-3 rounded-xl bg-[#EDEDED]/70 p-3 sm:p-4 border border-[#9CA3AF]/30 animate-in fade-in duration-150">
          {/* Barra de Retorno Fácil */}
          <div className="flex items-center justify-between pb-2 border-b border-[#9CA3AF]/20">
            <span className="text-xs font-bold text-[#111827]">
              {segmentoActivo === 'EGRESOS' && 'Composición de Gastos Operativos'}
              {segmentoActivo === 'BALANCE' && 'Rendimiento y Cobertura'}
              {segmentoActivo === 'METODOS' && 'Distribución por Medio de Pago'}
            </span>

            <button
              type="button"
              onClick={() => setSegmentoActivo(null)}
              className="ios-press-bounce inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-bold text-[#111827] border border-[#9CA3AF]/40 hover:bg-[#EDEDED] shadow-2xs cursor-pointer"
            >
              ← Volver
            </button>
          </div>

          {/* Contenido Mínimo y Conciso */}
          <div className="mt-2.5">
            {segmentoActivo === 'EGRESOS' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {distribucionGastos.length === 0 ? (
                  <p className="text-xs text-[#4B5563] py-1">Sin egresos registrados en este período.</p>
                ) : (
                  distribucionGastos.map((g) => (
                    <div
                      key={g.categoria}
                      className="flex items-center justify-between rounded-lg bg-white p-2 border border-[#9CA3AF]/20 text-xs"
                    >
                      <span className="font-medium text-[#111827] truncate pr-2">
                        {g.etiqueta}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono shrink-0">
                        <span className="font-bold text-[#111827]">
                          {formatearMonedaCompactaCOP(g.total)}
                        </span>
                        <span className="rounded bg-rose-50 px-1 text-[10px] font-bold text-rose-700">
                          {g.porcentaje}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {segmentoActivo === 'BALANCE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white p-2.5 border border-[#9CA3AF]/20">
                  <span className="text-[10px] uppercase font-bold text-[#4B5563]">
                    Retención Neta
                  </span>
                  <p className="font-display text-lg font-black text-emerald-700 mt-0.5">
                    {pctNeto}%
                  </p>
                  <p className="text-[10px] text-[#4B5563]">
                    Margen disponible tras cubrir costos del período.
                  </p>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-[#9CA3AF]/20">
                  <span className="text-[10px] uppercase font-bold text-[#4B5563]">
                    Ratio de Cobertura
                  </span>
                  <p className="font-display text-lg font-black text-[#111827] mt-0.5">
                    {egresos > 0 ? `${(ingresos / egresos).toFixed(1)}x` : 'Sin egresos'}
                  </p>
                  <p className="text-[10px] text-[#4B5563]">
                    Multiplicador de ingresos sobre gastos operativos.
                  </p>
                </div>
              </div>
            )}

            {segmentoActivo === 'METODOS' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                {distribucionMetodos.length === 0 ? (
                  <p className="text-[#4B5563] py-1">Sin cobros registrados en este período.</p>
                ) : (
                  distribucionMetodos.map((m) => (
                    <div
                      key={m.metodo}
                      className="flex items-center justify-between rounded-lg bg-white p-2 border border-[#9CA3AF]/20"
                    >
                      <span className="font-medium text-[#111827] truncate pr-2">
                        {m.etiqueta}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono shrink-0">
                        <span className="font-bold text-[#111827]">
                          {formatearMonedaCompactaCOP(m.total)}
                        </span>
                        <span className="rounded bg-blue-50 px-1 text-[10px] font-bold text-blue-700">
                          {m.porcentaje}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
