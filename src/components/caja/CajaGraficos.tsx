import { useState } from 'react';
import {
  formatearMonedaCOP,
  formatearMonedaCompactaCOP,
  type PuntoGraficoFlujo,
  type DistribucionMetodoPago,
  type DistribucionCategoriaGasto,
} from '@/lib/caja';
import { calcularPathSplineReal } from './CajaKpiCard';

export interface CajaGraficosProps {
  puntosFlujo: PuntoGraficoFlujo[];
  distribucionMetodos: DistribucionMetodoPago[];
  distribucionGastos: DistribucionCategoriaGasto[];
}

type ModoVisualGrafico = 'CURVA_CONTINUA' | 'BARRAS_FLUJO' | 'DONUT_ESTRUCTURA';
type FiltroSerie = 'TODOS' | 'SOLO_INGRESOS' | 'SOLO_EGRESOS';

export function CajaGraficos({
  puntosFlujo,
  distribucionMetodos,
  distribucionGastos,
}: CajaGraficosProps) {
  const [modoVisual, setModoVisual] = useState<ModoVisualGrafico>('CURVA_CONTINUA');
  const [filtroSerie, setFiltroSerie] = useState<FiltroSerie>('TODOS');
  const [puntoHoverIdx, setPuntoHoverIdx] = useState<number | null>(null);

  // Cálculos matemáticos reales de curvas splines SVG (Ancho 600, Alto 180)
  const valoresIngresos = puntosFlujo.map((p) => p.ingresos);
  const valoresEgresos = puntosFlujo.map((p) => p.egresos);

  // Totales para escalas y KPIs del gráfico (reutilizando arreglos ya mapeados)
  const maxIngreso = Math.max(...valoresIngresos, 0);
  const maxEgreso = Math.max(...valoresEgresos, 0);
  const maxAbsoluto = Math.max(maxIngreso, maxEgreso, 1_000_000);

  const totalIngresos = puntosFlujo.reduce((acc, p) => acc + p.ingresos, 0);
  const totalEgresos = puntosFlujo.reduce((acc, p) => acc + p.egresos, 0);
  const totalGastosCategorias = distribucionGastos.reduce((acc, g) => acc + g.total, 0);

  const splineIngresos = calcularPathSplineReal(valoresIngresos, 600, 180, 24, 20);
  const splineEgresos = calcularPathSplineReal(valoresEgresos, 600, 180, 24, 20);

  const puntoActivo =
    puntoHoverIdx !== null && puntosFlujo[puntoHoverIdx]
      ? puntosFlujo[puntoHoverIdx]
      : puntosFlujo[puntosFlujo.length - 1] ?? null;

  // Paleta Canónica FlotaX (Directamente de design/exports/color-system.html)
  // Azul tecnológico: #2D6BFF | Verde: #12B886 | Ámbar: #FFC52E | Rojo: #F43F47 | Ink: #111827 | Slate: #4B5563
  const coloresDonut = [
    '#2D6BFF', // Azul FlotaX canónico
    '#111827', // Obsidian dark
    '#12B886', // Green positivo
    '#FFC52E', // Yellow atención
    '#F43F47', // Red egreso
    '#4B5563', // Slate neutro
    '#9CA3AF', // Cool gray
  ];

  return (
    <div className="space-y-4">
      {/* Contenedor Principal: Tarjeta Oscura Canónica FlotaX (#111827) */}
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[30px] bg-[#111827] p-4 sm:p-6 text-white shadow-xl border border-white/10">
        {/* Encabezado con Selector de Vistas Funcional (Línea Continua, Barras, Donut) */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2D6BFF]" />
              <h3 className="font-display text-sm sm:text-base font-bold text-white tracking-tight">
                Curvas Reales de Rendimiento & Flujo Operativo
              </h3>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              Datos matemáticos exactos calculados a partir de los movimientos confirmados en el período.
            </p>
          </div>

          {/* Botones de Control de Vista con Paleta de Azules Refinada y Menos Vibrante */}
          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setModoVisual('CURVA_CONTINUA')}
              className={`ios-press-bounce rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${modoVisual === 'CURVA_CONTINUA'
                ? 'bg-[#1F2937] text-white border border-[#2D6BFF]/40 shadow-xs'
                : 'bg-white/5 text-[#9CA3AF] hover:text-white border border-transparent'
                }`}
            >
              Curva Continua
            </button>
            <button
              type="button"
              onClick={() => setModoVisual('BARRAS_FLUJO')}
              className={`ios-press-bounce rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${modoVisual === 'BARRAS_FLUJO'
                ? 'bg-[#1F2937] text-white border border-[#2D6BFF]/40 shadow-xs'
                : 'bg-white/5 text-[#9CA3AF] hover:text-white border border-transparent'
                }`}
            >
              Barras de Flujo
            </button>
            <button
              type="button"
              onClick={() => setModoVisual('DONUT_ESTRUCTURA')}
              className={`ios-press-bounce rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${modoVisual === 'DONUT_ESTRUCTURA'
                ? 'bg-[#1F2937] text-white border border-[#2D6BFF]/40 shadow-xs'
                : 'bg-white/5 text-[#9CA3AF] hover:text-white border border-transparent'
                }`}
            >
              Estructura Donut
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* VISTA 1: CURVA CONTINUA REAL (INSPIRADA EN DATA VISUALIZATION FLOTAX) */}
        {/* ============================================================== */}
        {modoVisual === 'CURVA_CONTINUA' && (
          <div className="mt-4 space-y-3">
            {/* Barra de Filtros de Serie y Leyenda Interactiva */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Filtros Funcionales de Curva */}
              <div className="flex items-center gap-1.5 rounded-full bg-[#1F2937] p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setFiltroSerie('TODOS')}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${filtroSerie === 'TODOS'
                    ? 'bg-white/15 text-white shadow-xs'
                    : 'text-[#9CA3AF] hover:text-white'
                    }`}
                >
                  Ambas Curvas
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroSerie('SOLO_INGRESOS')}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${filtroSerie === 'SOLO_INGRESOS'
                    ? 'bg-[#2D6BFF]/25 text-[#93c5fd] border border-[#2D6BFF]/40 shadow-xs'
                    : 'text-[#9CA3AF] hover:text-white'
                    }`}
                >
                  Solo Ingresos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroSerie('SOLO_EGRESOS')}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${filtroSerie === 'SOLO_EGRESOS'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs'
                    : 'text-[#9CA3AF] hover:text-white'
                    }`}
                >
                  Solo Egresos
                </button>
              </div>

              {/* Leyenda con Totales */}
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-blue-300 font-bold">
                  <span className="h-2 w-2 rounded-full bg-[#2D6BFF]" />
                  Ingresos: {formatearMonedaCompactaCOP(totalIngresos)}
                </span>
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <span className="h-2 w-2 rounded-full bg-[#F43F47]" />
                  Egresos: {formatearMonedaCompactaCOP(totalEgresos)}
                </span>
              </div>
            </div>

            {/* Inspección Interactiva en Tiempo Real del Punto Activo */}
            {puntoActivo && (
              <div className="rounded-xl bg-[#1F2937]/90 border border-white/10 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white border border-white/10">
                    Punto: {puntoActivo.etiqueta} ({puntoActivo.fecha})
                  </span>
                  <span className="text-[#9CA3AF] text-[11px] hidden sm:inline">
                    Toca cualquier nodo sobre la curva para inspeccionar
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <span className="text-blue-300 font-bold">
                    + {formatearMonedaCOP(puntoActivo.ingresos)}
                  </span>
                  <span className="text-rose-400 font-bold">
                    - {formatearMonedaCOP(puntoActivo.egresos)}
                  </span>
                  <span
                    className={`font-black rounded px-1.5 py-0.5 ${puntoActivo.flujoNeto >= 0
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                      }`}
                  >
                    Neto: {formatearMonedaCOP(puntoActivo.flujoNeto)}
                  </span>
                </div>
              </div>
            )}

            {/* Lienzo SVG Matemático de Curvas Continuas */}
            <div className="relative h-44 sm:h-52 w-full overflow-hidden rounded-2xl bg-[#1F2937]/50 border border-white/10 p-2">
              <svg
                viewBox="0 0 600 180"
                className="h-full w-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Gradiente azul para área de ingresos */}
                  <linearGradient id="areaIngresoFlotaX" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2D6BFF" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#2D6BFF" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Gradiente carmesí para área de egresos */}
                  <linearGradient id="areaEgresoFlotaX" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F47" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#F43F47" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Líneas de Guía de Eje Y */}
                <line x1="0" y1="45" x2="600" y2="45" stroke="#374151" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="90" x2="600" y2="90" stroke="#374151" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="135" x2="600" y2="135" stroke="#374151" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />

                {/* 1. Curva Real de Egresos */}
                {(filtroSerie === 'TODOS' || filtroSerie === 'SOLO_EGRESOS') && (
                  <>
                    {splineEgresos.areaPath && (
                      <path d={splineEgresos.areaPath} fill="url(#areaEgresoFlotaX)" />
                    )}
                    {splineEgresos.lineaPath && (
                      <path
                        d={splineEgresos.lineaPath}
                        fill="none"
                        stroke="#F43F47"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {splineEgresos.nodos.map((n, i) => (
                      <circle
                        key={`egreso-${i}`}
                        cx={n.x}
                        cy={n.y}
                        r={puntoHoverIdx === i ? '5' : '3'}
                        fill="#F43F47"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setPuntoHoverIdx(i)}
                        onTouchStart={() => setPuntoHoverIdx(i)}
                      >
                        <title>{`${puntosFlujo[i]?.etiqueta ?? ''}: Egreso ${formatearMonedaCOP(n.valor)}`}</title>
                      </circle>
                    ))}
                  </>
                )}

                {/* 2. Curva Real de Ingresos */}
                {(filtroSerie === 'TODOS' || filtroSerie === 'SOLO_INGRESOS') && (
                  <>
                    {splineIngresos.areaPath && (
                      <path d={splineIngresos.areaPath} fill="url(#areaIngresoFlotaX)" />
                    )}
                    {splineIngresos.lineaPath && (
                      <path
                        d={splineIngresos.lineaPath}
                        fill="none"
                        stroke="#2D6BFF"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {splineIngresos.nodos.map((n, i) => (
                      <circle
                        key={`ingreso-${i}`}
                        cx={n.x}
                        cy={n.y}
                        r={puntoHoverIdx === i ? '5.5' : '3.5'}
                        fill="#2D6BFF"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setPuntoHoverIdx(i)}
                        onTouchStart={() => setPuntoHoverIdx(i)}
                      >
                        <title>{`${puntosFlujo[i]?.etiqueta ?? ''}: Ingreso ${formatearMonedaCOP(n.valor)}`}</title>
                      </circle>
                    ))}
                  </>
                )}
              </svg>
            </div>

            {/* Eje X con Etiquetas de Fechas Reales */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#9CA3AF] px-2">
              {puntosFlujo.map((p, idx) => (
                <span
                  key={idx}
                  onClick={() => setPuntoHoverIdx(idx)}
                  className={`cursor-pointer transition ${puntoHoverIdx === idx ? 'text-white font-bold underline' : 'hover:text-white'
                    }`}
                >
                  {p.etiqueta}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VISTA 2: BARRAS DE FLUJO INTERACTIVAS */}
        {/* ============================================================== */}
        {modoVisual === 'BARRAS_FLUJO' && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
              <span>Comparativa diaria de recaudos (azul FlotaX) vs pagos operativos (rojo)</span>
              <span className="font-mono text-[10px] text-white font-bold">
                Tope escala: {formatearMonedaCompactaCOP(maxAbsoluto)}
              </span>
            </div>

            <div className="mt-2 flex h-48 items-end gap-2 sm:gap-4 rounded-2xl bg-[#1F2937]/50 p-3 border border-white/10">
              {puntosFlujo.map((p, idx) => {
                const altIngreso = Math.round((p.ingresos / maxAbsoluto) * 100);
                const altEgreso = Math.round((p.egresos / maxAbsoluto) * 100);
                const esActivo = puntoHoverIdx === idx;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setPuntoHoverIdx(idx)}
                    onTouchStart={() => setPuntoHoverIdx(idx)}
                    className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
                  >
                    <div className="flex w-full items-end justify-center gap-1 sm:gap-1.5">
                      {/* Barra Ingreso (Azul Canónico #2D6BFF) */}
                      <div
                        style={{ height: `${Math.max(altIngreso, 6)}%` }}
                        className={`w-1/2 max-w-[18px] rounded-t-md transition-all ${esActivo
                          ? 'bg-[#2D6BFF] shadow-md'
                          : 'bg-[#2D6BFF]/85 group-hover:bg-[#2D6BFF]'
                          }`}
                      />
                      {/* Barra Egreso (Rojo #F43F47) */}
                      <div
                        style={{ height: `${Math.max(altEgreso, 6)}%` }}
                        className={`w-1/2 max-w-[18px] rounded-t-md transition-all ${esActivo
                          ? 'bg-[#F43F47] shadow-md'
                          : 'bg-[#F43F47]/85 group-hover:bg-[#F43F47]'
                          }`}
                      />
                    </div>
                    <span
                      className={`mt-2 font-mono text-[9px] sm:text-[10px] ${esActivo ? 'text-white font-bold' : 'text-[#9CA3AF]'
                        }`}
                    >
                      {p.etiqueta}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VISTA 3: DONUT & ESTRUCTURA DE GASTOS */}
        {/* ============================================================== */}
        {modoVisual === 'DONUT_ESTRUCTURA' && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 items-center gap-5">
            {/* Donut SVG con Centro Informativo */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
              <div className="relative flex h-40 w-40 sm:h-44 sm:w-44 items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  {/* Anillo base */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#1F2937" strokeWidth="12" />

                  {/* Segmentos de categorías con colores FlotaX */}
                  {distribucionGastos.reduce<{ offset: number; elements: React.JSX.Element[] }>(
                    (acc, g, idx) => {
                      const circum = 2 * Math.PI * 38;
                      const strokeDash = (g.porcentaje / 100) * circum;
                      const color = coloresDonut[idx % coloresDonut.length]!;

                      acc.elements.push(
                        <circle
                          key={g.categoria}
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke={color}
                          strokeWidth="12"
                          strokeDasharray={`${strokeDash} ${circum}`}
                          strokeDashoffset={-acc.offset}
                          className="transition-all duration-500 hover:opacity-90"
                        />
                      );
                      acc.offset += strokeDash;
                      return acc;
                    },
                    { offset: 0, elements: [] }
                  ).elements}
                </svg>

                {/* Texto Central con Monto Total */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="font-display text-base sm:text-lg font-black text-white">
                    {formatearMonedaCompactaCOP(totalGastosCategorias)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-[#9CA3AF]">
                    Total Gastos
                  </span>
                </div>
              </div>
            </div>

            {/* Desglose de Categorías de Gastos */}
            <div className="md:col-span-7 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white pb-1 border-b border-white/10">
                Participación por Categoría Operativa
              </h4>

              {distribucionGastos.length === 0 ? (
                <p className="text-xs text-[#9CA3AF] py-3">Sin gastos en este período.</p>
              ) : (
                distribucionGastos.slice(0, 5).map((g, idx) => {
                  const color = coloresDonut[idx % coloresDonut.length]!;
                  return (
                    <div key={g.categoria} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-white font-medium truncate">{g.etiqueta}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span className="text-white font-bold">
                          {formatearMonedaCOP(g.total)}
                        </span>
                        <span className="rounded bg-white/10 border border-white/10 px-1 text-[10px] text-[#9CA3AF] font-bold">
                          {g.porcentaje}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tarjeta Inferior de Métodos de Pago con Acentos Canónicos FlotaX */}
      <div className="rounded-[24px] bg-white border border-[#9CA3AF]/30 p-4 sm:p-5 text-[#111827] shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#9CA3AF]/20">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#2D6BFF]/10 text-[#111827] text-xs">
              💳
            </span>
            <h4 className="font-display text-xs sm:text-sm font-bold text-[#111827]">
              Recaudos por Método de Pago
            </h4>
          </div>
          <span className="text-[10px] font-mono text-[#4B5563]">Participación</span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {distribucionMetodos.map((m) => (
            <div
              key={m.metodo}
              className="rounded-xl bg-[#EDEDED]/50 p-3 border border-[#9CA3AF]/20 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#111827]">
                  {m.etiqueta} ({m.cantidadMovimientos})
                </span>
                <span className="font-mono font-bold text-[#111827]">
                  {formatearMonedaCOP(m.total)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EDEDED] border border-[#9CA3AF]/30">
                  <div
                    style={{ width: `${m.porcentaje}%` }}
                    className="h-full rounded-full bg-[#111827] transition-all duration-300"
                  />
                </div>
                <span className="font-mono text-[10px] font-bold text-[#4B5563]">
                  {m.porcentaje}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
