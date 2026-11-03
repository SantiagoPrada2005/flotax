import { useState } from 'react';
import {
  formatearMonedaCOP,
  formatearMonedaCompactaCOP,
  type PuntoGraficoFlujo,
  type DistribucionMetodoPago,
  type DistribucionCategoriaGasto,
} from '@/lib/caja';

export interface CajaGraficosProps {
  distribucionMetodos: DistribucionMetodoPago[];
  distribucionGastos: DistribucionCategoriaGasto[];
  puntosFlujo?: PuntoGraficoFlujo[] | undefined;
}

type ModoVisualGrafico = 'DONUT_ESTRUCTURA' | 'METODOS_PAGO';
type DonutSubModo = 'GASTOS' | 'METODOS';

export function CajaGraficos({
  distribucionMetodos,
  distribucionGastos,
}: CajaGraficosProps) {
  const [modoVisual, setModoVisual] = useState<ModoVisualGrafico>('DONUT_ESTRUCTURA');
  const [donutSubModo, setDonutSubModo] = useState<DonutSubModo>('GASTOS');
  const [donutHoverIdx, setDonutHoverIdx] = useState<number | null>(null);

  // ==============================================================
  // PALETA CROMÁTICA CANÓNICA FLOTAX PARA DONUT (SIN #111827)
  // ==============================================================
  const COLORES_DONUT_CANONICOS = [
    '#2D6BFF', // Azul FlotaX canónico
    '#10B981', // Verde esmeralda (Mantenimiento)
    '#F59E0B', // Ámbar cálido (Combustible / Insumos)
    '#F43F47', // Carmesí FlotaX (Seguros / Alistamiento)
    '#8B5CF6', // Púrpura sobrio (Administración)
    '#06B6D4', // Cian brillante (Comisiones / Pasarelas)
    '#9CA3AF', // Gris frío tenue (Otros gastos)
  ];

  // Cálculo exacto del 100% para Donut sin cortes ni huecos
  const itemsDonut = donutSubModo === 'GASTOS'
    ? distribucionGastos.map((g) => ({
        clave: g.categoria,
        etiqueta: g.etiqueta,
        total: g.total,
        porcentaje: g.porcentaje,
      }))
    : distribucionMetodos.map((m) => ({
        clave: m.metodo,
        etiqueta: m.etiqueta,
        total: m.total,
        porcentaje: m.porcentaje,
      }));

  const totalDonut = itemsDonut.reduce((acc, it) => acc + it.total, 0);

  return (
    <div className="space-y-4">
      {/* Contenedor Principal: Tarjeta Oscura Canónica FlotaX (#111827) */}
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[30px] bg-[#111827] p-4 sm:p-6 text-white shadow-xl border border-white/10">
        {/* Encabezado con Selector de Modos Funcional */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2D6BFF] animate-pulse" />
              <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-tight">
                Distribución Financiera de Fondos
              </h3>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              Estructura de gastos operativos por categoría y recaudos por canal de pago.
            </p>
          </div>

          {/* Selector de Modos de Visualización Financiera */}
          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto rounded-full bg-white/5 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setModoVisual('DONUT_ESTRUCTURA')}
              className={`ios-press-bounce rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                modoVisual === 'DONUT_ESTRUCTURA'
                  ? 'bg-[#1F2937] text-white border border-[#2D6BFF]/40 shadow-xs'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Gastos por Categoría
            </button>
            <button
              type="button"
              onClick={() => setModoVisual('METODOS_PAGO')}
              className={`ios-press-bounce rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                modoVisual === 'METODOS_PAGO'
                  ? 'bg-[#1F2937] text-white border border-[#2D6BFF]/40 shadow-xs'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Canales de Pago
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* VISTA 1: DONUT DE GASTOS Y MEDIOS DE PAGO */}
        {/* ============================================================== */}
        {modoVisual === 'DONUT_ESTRUCTURA' && (
          <div className="mt-4 space-y-4">
            {/* Toggle de Modo Donut: Gastos por Categoría vs Medios de Pago */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-1.5 rounded-full bg-[#1F2937] p-1 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setDonutSubModo('GASTOS');
                    setDonutHoverIdx(null);
                  }}
                  className={`rounded-full px-3 py-1 font-bold transition cursor-pointer ${
                    donutSubModo === 'GASTOS'
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  Gastos por Categoría
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDonutSubModo('METODOS');
                    setDonutHoverIdx(null);
                  }}
                  className={`rounded-full px-3 py-1 font-bold transition cursor-pointer ${
                    donutSubModo === 'METODOS'
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  Ingresos por Medio
                </button>
              </div>

              <span className="text-[11px] font-mono text-[#9CA3AF]">
                Total: {formatearMonedaCOP(totalDonut)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
              {/* Donut SVG con Anillo Continuo y Centro Dinámico */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
                <div className="relative flex h-48 w-48 sm:h-52 sm:w-52 items-center justify-center">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    {/* Anillo base de fondo para soporte geométrico */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#1F2937"
                      strokeWidth="11"
                    />

                    {/* Segmentos calculados con proporción exacta al 100% de la circunferencia */}
                    {totalDonut > 0 &&
                      (() => {
                        const circum = 2 * Math.PI * 38;
                        let acumulado = 0;

                        return itemsDonut.map((item, idx) => {
                          const fraccion = item.total / totalDonut;
                          const longitudArco = fraccion * circum;
                          const color = COLORES_DONUT_CANONICOS[idx % COLORES_DONUT_CANONICOS.length]!;
                          const offsetActual = acumulado;
                          acumulado += longitudArco;

                          const esHovered = donutHoverIdx === idx;

                          return (
                            <circle
                              key={item.clave}
                              cx="50"
                              cy="50"
                              r="38"
                              fill="none"
                              stroke={color}
                              strokeWidth={esHovered ? '13' : '11'}
                              strokeDasharray={`${longitudArco} ${circum}`}
                              strokeDashoffset={-offsetActual}
                              className="transition-all duration-300 cursor-pointer"
                              onClick={() => setDonutHoverIdx(donutHoverIdx === idx ? null : idx)}
                            >
                              <title>{`${item.etiqueta}: ${formatearMonedaCOP(item.total)} (${item.porcentaje}%)`}</title>
                            </circle>
                          );
                        });
                      })()}
                  </svg>

                  {/* Centro Dinámico que se Actualiza al Clic o Selección */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                    {donutHoverIdx !== null && itemsDonut[donutHoverIdx] ? (
                      <>
                        <span className="text-[10px] uppercase font-bold text-[#9CA3AF] truncate max-w-[110px]">
                          {itemsDonut[donutHoverIdx]!.etiqueta}
                        </span>
                        <span className="font-display text-sm sm:text-base font-black text-white mt-0.5">
                          {formatearMonedaCompactaCOP(itemsDonut[donutHoverIdx]!.total)}
                        </span>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono font-bold text-white mt-1 border border-white/10">
                          {itemsDonut[donutHoverIdx]!.porcentaje}% del total
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-display text-base sm:text-xl font-black text-white">
                          {formatearMonedaCompactaCOP(totalDonut)}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-[#9CA3AF] mt-0.5">
                          {donutSubModo === 'GASTOS' ? 'Total Gastos' : 'Total Recaudos'}
                        </span>
                        <span className="text-[9px] text-[#9CA3AF] mt-1 font-mono">
                          100 % Consolidado
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Leyenda Interactiva Sincronizada con el Donut */}
              <div className="md:col-span-7 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-white/10">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    {donutSubModo === 'GASTOS'
                      ? 'Participación por Categoría'
                      : 'Distribución por Canal'}
                  </h4>
                  {donutHoverIdx !== null && (
                    <button
                      type="button"
                      onClick={() => setDonutHoverIdx(null)}
                      className="ios-press-bounce text-[10px] text-[#9CA3AF] hover:text-white rounded bg-white/5 px-2 py-0.5 border border-white/10 cursor-pointer"
                    >
                      ← Volver
                    </button>
                  )}
                </div>

                {itemsDonut.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF] py-3">Sin movimientos registrados en este período.</p>
                ) : (
                  itemsDonut.map((item, idx) => {
                    const color = COLORES_DONUT_CANONICOS[idx % COLORES_DONUT_CANONICOS.length]!;
                    const esHovered = donutHoverIdx === idx;

                    return (
                      <div
                        key={item.clave}
                        onClick={() => setDonutHoverIdx(donutHoverIdx === idx ? null : idx)}
                        className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-xl transition-all cursor-pointer ${
                          esHovered
                            ? 'bg-white/15 border border-white/30 shadow-xs'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-white font-medium truncate">{item.etiqueta}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono shrink-0">
                          <span className="text-white font-bold">
                            {formatearMonedaCOP(item.total)}
                          </span>
                          <span className="rounded bg-white/10 border border-white/10 px-1.5 text-[10px] text-white font-bold">
                            {item.porcentaje}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VISTA 2: CANALES DE PAGO CON BARRAS PROPORCIONALES */}
        {/* ============================================================== */}
        {modoVisual === 'METODOS_PAGO' && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-[#9CA3AF]">
              Desglose de recaudos según la vía de pago utilizada por el cliente:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {distribucionMetodos.map((m) => (
                <div
                  key={m.metodo}
                  className="rounded-2xl bg-[#1F2937]/70 p-3.5 border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#2D6BFF]" />
                      {m.etiqueta}
                    </span>
                    <span className="font-mono font-bold text-white">
                      {formatearMonedaCOP(m.total)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        style={{ width: `${m.porcentaje}%` }}
                        className="h-full rounded-full bg-[#2D6BFF] transition-all duration-500"
                      />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-blue-200">
                      {m.porcentaje}% ({m.cantidadMovimientos} ops)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
