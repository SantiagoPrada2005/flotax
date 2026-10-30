import { useState } from 'react';
import {
  formatearMonedaCOP,
  formatearMonedaCompactaCOP,
  type PuntoGraficoFlujo,
  type DistribucionMetodoPago,
  type DistribucionCategoriaGasto,
} from '@/lib/caja';

export interface CajaGraficosProps {
  puntosFlujo: PuntoGraficoFlujo[];
  distribucionMetodos: DistribucionMetodoPago[];
  distribucionGastos: DistribucionCategoriaGasto[];
}

type ModoVisualGrafico = 'CURVA_CONTINUA' | 'DONUT_ESTRUCTURA' | 'METODOS_PAGO';
type FiltroSerie = 'TODOS' | 'SOLO_INGRESOS' | 'SOLO_EGRESOS';
type DonutSubModo = 'GASTOS' | 'METODOS';

export function CajaGraficos({
  puntosFlujo,
  distribucionMetodos,
  distribucionGastos,
}: CajaGraficosProps) {
  const [modoVisual, setModoVisual] = useState<ModoVisualGrafico>('CURVA_CONTINUA');
  const [filtroSerie, setFiltroSerie] = useState<FiltroSerie>('TODOS');
  const [donutSubModo, setDonutSubModo] = useState<DonutSubModo>('GASTOS');
  const [puntoHoverIdx, setPuntoHoverIdx] = useState<number | null>(null);
  const [donutHoverIdx, setDonutHoverIdx] = useState<number | null>(null);

  // Serie de puntos sincronizada con el período activo
  const puntosFiltrados = puntosFlujo;

  // Cálculos matemáticos de escalas (Ancho 640, Alto 190, Padding 45px izquierdo para escala Y)
  const valoresIngresos = puntosFiltrados.map((p) => p.ingresos);
  const valoresEgresos = puntosFiltrados.map((p) => p.egresos);

  const maxIngreso = valoresIngresos.length > 0 ? Math.max(...valoresIngresos, 0) : 0;
  const maxEgreso = valoresEgresos.length > 0 ? Math.max(...valoresEgresos, 0) : 0;
  const maxPico = Math.max(maxIngreso, maxEgreso, 100_000);

  // Redondear escala superior para ticks limpios
  const escalaTecho = Math.ceil(maxPico / 500_000) * 500_000 || maxPico;


  // Splines SVG con espacio reservado para escala Y en 48px
  const ANCHO_SVG = 640;
  const ALTO_SVG = 190;
  const PADDING_IZQ = 55;
  const PADDING_DER = 18;
  const PADDING_TOP = 22;
  const PADDING_BOT = 26;

  // Función adaptada para normalizar ambas series en la misma escala matemática
  const normalizarY = (valor: number) => {
    const altoUtil = ALTO_SVG - PADDING_TOP - PADDING_BOT;
    const ratio = Math.min(1, Math.max(0, valor / escalaTecho));
    return ALTO_SVG - PADDING_BOT - ratio * altoUtil;
  };

  const normalizarX = (index: number, total: number) => {
    if (total <= 1) return (ANCHO_SVG + PADDING_IZQ) / 2;
    const anchoUtil = ANCHO_SVG - PADDING_IZQ - PADDING_DER;
    return PADDING_IZQ + (index / (total - 1)) * anchoUtil;
  };

  // Nodos calculados en la misma escala
  const nodosIngresos = valoresIngresos.map((v, i) => ({
    x: Math.round(normalizarX(i, valoresIngresos.length) * 10) / 10,
    y: Math.round(normalizarY(v) * 10) / 10,
    valor: v,
  }));

  const nodosEgresos = valoresEgresos.map((v, i) => ({
    x: Math.round(normalizarX(i, valoresEgresos.length) * 10) / 10,
    y: Math.round(normalizarY(v) * 10) / 10,
    valor: v,
  }));

  // Generación de rutas Bézier cúbicas suaves para ambas series
  const generarSpline = (nodos: { x: number; y: number; valor: number }[]) => {
    if (nodos.length === 0) return { linea: '', area: '' };
    if (nodos.length === 1) {
      const p = nodos[0]!;
      return {
        linea: `M ${PADDING_IZQ} ${p.y} L ${ANCHO_SVG - PADDING_DER} ${p.y}`,
        area: `M ${PADDING_IZQ} ${p.y} L ${ANCHO_SVG - PADDING_DER} ${p.y} L ${ANCHO_SVG - PADDING_DER} ${ALTO_SVG - PADDING_BOT} L ${PADDING_IZQ} ${ALTO_SVG - PADDING_BOT} Z`,
      };
    }

    let d = `M ${nodos[0]!.x} ${nodos[0]!.y}`;
    for (let i = 0; i < nodos.length - 1; i++) {
      const p0 = nodos[Math.max(0, i - 1)]!;
      const p1 = nodos[i]!;
      const p2 = nodos[i + 1]!;
      const p3 = nodos[Math.min(nodos.length - 1, i + 2)]!;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const ultimo = nodos[nodos.length - 1]!;
    const primero = nodos[0]!;
    const area = `${d} L ${ultimo.x} ${ALTO_SVG - PADDING_BOT} L ${primero.x} ${ALTO_SVG - PADDING_BOT} Z`;
    return { linea: d, area };
  };

  const splineIng = generarSpline(nodosIngresos);
  const splineEgr = generarSpline(nodosEgresos);

  // Punto activo para HUD
  const idxActivo = puntoHoverIdx !== null ? puntoHoverIdx : puntosFiltrados.length - 1;
  const puntoActivo = puntosFiltrados[idxActivo] ?? null;

  // ==============================================================
  // PALETA CROMÁTICA CANÓNICA FLOTAX PARA DONUT (SIN #111827)
  // ==============================================================
  // Ningún color coincide con el fondo oscuro #111827 para evitar huecos en el donut.
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

  // Ticks para el Eje Y
  const ticksY = [
    { valor: escalaTecho, y: normalizarY(escalaTecho) },
    { valor: Math.round(escalaTecho * 0.66), y: normalizarY(escalaTecho * 0.66) },
    { valor: Math.round(escalaTecho * 0.33), y: normalizarY(escalaTecho * 0.33) },
    { valor: 0, y: normalizarY(0) },
  ];

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
                Análisis Visual & Curvas de Rendimiento
              </h3>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              Evolución temporal, estructura de costos y canales de pago.
            </p>
          </div>

          {/* Selector de Modos de Visualización (Apple Segmented Style) */}
          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto rounded-full bg-white/5 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setModoVisual('CURVA_CONTINUA')}
              className={`ios-press-bounce rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                modoVisual === 'CURVA_CONTINUA'
                  ? 'bg-[#1F2937] text-white border border-[#2D6BFF]/40 shadow-xs'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Curvas Temporales
            </button>
            <button
              type="button"
              onClick={() => setModoVisual('DONUT_ESTRUCTURA')}
              className={`ios-press-bounce rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                modoVisual === 'DONUT_ESTRUCTURA'
                  ? 'bg-[#1F2937] text-white border border-[#2D6BFF]/40 shadow-xs'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Estructura Donut
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
        {/* VISTA 1: CURVAS DE RENDIMIENTO REDISEÑADAS CON ESCALAS E INTERACCIÓN */}
        {/* ============================================================== */}
        {modoVisual === 'CURVA_CONTINUA' && (
          <div className="mt-4 space-y-3.5">
            {/* Controles de Filtros Funcionales de la Gráfica */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Filtro de Series */}
              <div className="flex items-center gap-1 rounded-full bg-[#1F2937] p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => setFiltroSerie('TODOS')}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                    filtroSerie === 'TODOS'
                      ? 'bg-white/15 text-white shadow-xs'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  Ambas Series
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroSerie('SOLO_INGRESOS')}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                    filtroSerie === 'SOLO_INGRESOS'
                      ? 'bg-[#2D6BFF]/25 text-[#93c5fd] border border-[#2D6BFF]/40 shadow-xs'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  Solo Ingresos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroSerie('SOLO_EGRESOS')}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                    filtroSerie === 'SOLO_EGRESOS'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  Solo Egresos
                </button>
              </div>

              {/* Leyenda de Series (Sin Duplicar Cifras de Arriba) */}
              <div className="flex items-center gap-3 text-[11px] font-medium">
                <span className="flex items-center gap-1.5 text-blue-300">
                  <span className="h-2 w-2 rounded-full bg-[#2D6BFF]" />
                  Ingresos
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="h-2 w-2 rounded-full bg-[#F43F47]" />
                  Egresos
                </span>
              </div>
            </div>

            {/* Inspección de Punto al Clic */}
            {puntoHoverIdx !== null && puntoActivo && (
              <div className="rounded-xl bg-[#1F2937]/90 border border-white/10 p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-mono font-bold text-white border border-white/10">
                    {puntoActivo.etiqueta} ({puntoActivo.fecha})
                  </span>
                  <button
                    type="button"
                    onClick={() => setPuntoHoverIdx(null)}
                    className="ios-press-bounce text-[10px] text-[#9CA3AF] hover:text-white rounded bg-white/5 px-2 py-0.5 border border-white/10 cursor-pointer"
                  >
                    ← Volver
                  </button>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <span className="text-blue-300 font-bold">
                    + {formatearMonedaCOP(puntoActivo.ingresos)}
                  </span>
                  <span className="text-rose-400 font-bold">
                    - {formatearMonedaCOP(puntoActivo.egresos)}
                  </span>
                  <span
                    className={`font-black rounded px-2 py-0.5 ${
                      puntoActivo.flujoNeto >= 0
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    Neto: {formatearMonedaCOP(puntoActivo.flujoNeto)}
                  </span>
                </div>
              </div>
            )}

            {/* Lienzo SVG con Escala de Ejes Y & X Calibrados */}
            <div className="relative h-48 sm:h-56 w-full overflow-hidden rounded-2xl bg-[#1F2937]/50 border border-white/10 p-2">
              <svg
                viewBox={`0 0 ${ANCHO_SVG} ${ALTO_SVG}`}
                className="h-full w-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Gradiente azul para área de ingresos */}
                  <linearGradient id="areaIngresoFlotaX" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2D6BFF" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#2D6BFF" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Gradiente carmesí para área de egresos */}
                  <linearGradient id="areaEgresoFlotaX" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F47" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#F43F47" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Líneas de Guía de Eje Y con Valores Numéricos Reales */}
                {ticksY.map((tick, i) => (
                  <g key={`tick-${i}`}>
                    <line
                      x1={PADDING_IZQ}
                      y1={tick.y}
                      x2={ANCHO_SVG - PADDING_DER}
                      y2={tick.y}
                      stroke="#4B5563"
                      strokeOpacity="0.35"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={PADDING_IZQ - 6}
                      y={tick.y + 3.5}
                      textAnchor="end"
                      fill="#9CA3AF"
                      fontSize="9.5"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {formatearMonedaCompactaCOP(tick.valor)}
                    </text>
                  </g>
                ))}

                {/* Línea Vertical Crosshair en el Punto Activo */}
                {puntoActivo && nodosIngresos[idxActivo] && (
                  <line
                    x1={nodosIngresos[idxActivo]!.x}
                    y1={PADDING_TOP}
                    x2={nodosIngresos[idxActivo]!.x}
                    y2={ALTO_SVG - PADDING_BOT}
                    stroke="#2D6BFF"
                    strokeOpacity="0.5"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}

                {/* 1. Curva Real de Egresos */}
                {(filtroSerie === 'TODOS' || filtroSerie === 'SOLO_EGRESOS') && (
                  <>
                    {splineEgr.area && (
                      <path d={splineEgr.area} fill="url(#areaEgresoFlotaX)" />
                    )}
                    {splineEgr.linea && (
                      <path
                        d={splineEgr.linea}
                        fill="none"
                        stroke="#F43F47"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {nodosEgresos.map((n, i) => (
                      <circle
                        key={`egreso-${i}`}
                        cx={n.x}
                        cy={n.y}
                        r={idxActivo === i ? '5.5' : '3.5'}
                        fill="#F43F47"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="cursor-pointer transition-all"
                        onClick={() => setPuntoHoverIdx(puntoHoverIdx === i ? null : i)}
                      >
                        <title>{`${puntosFiltrados[i]?.etiqueta ?? ''}: Egreso ${formatearMonedaCOP(n.valor)}`}</title>
                      </circle>
                    ))}
                  </>
                )}

                {/* 2. Curva Real de Ingresos */}
                {(filtroSerie === 'TODOS' || filtroSerie === 'SOLO_INGRESOS') && (
                  <>
                    {splineIng.area && (
                      <path d={splineIng.area} fill="url(#areaIngresoFlotaX)" />
                    )}
                    {splineIng.linea && (
                      <path
                        d={splineIng.linea}
                        fill="none"
                        stroke="#2D6BFF"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                    {nodosIngresos.map((n, i) => (
                      <circle
                        key={`ingreso-${i}`}
                        cx={n.x}
                        cy={n.y}
                        r={idxActivo === i ? '6' : '4'}
                        fill="#2D6BFF"
                        stroke="#ffffff"
                        strokeWidth="1.8"
                        className="cursor-pointer transition-all"
                        onClick={() => setPuntoHoverIdx(puntoHoverIdx === i ? null : i)}
                      >
                        <title>{`${puntosFiltrados[i]?.etiqueta ?? ''}: Ingreso ${formatearMonedaCOP(n.valor)}`}</title>
                      </circle>
                    ))}
                  </>
                )}
              </svg>
            </div>

            {/* Eje X con Fechas Reales y Sincronizadas (Clic para Inspeccionar) */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#9CA3AF] px-2 pl-14">
              {puntosFiltrados.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPuntoHoverIdx(puntoHoverIdx === idx ? null : idx)}
                  className={`cursor-pointer transition px-1.5 py-0.5 rounded ${
                    puntoHoverIdx === idx
                      ? 'text-white font-bold bg-white/15'
                      : 'hover:text-white'
                  }`}
                >
                  {p.etiqueta}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VISTA 2: DONUT 100% CERRADO SIN CORTES NI COLORES DEFECTUOSOS */}
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
        {/* VISTA 3: CANALES DE PAGO CON BARRAS PROPORCIONALES */}
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
