import { useState } from 'react';
import {
  formatearMonedaCOP,
  formatearMonedaCompactaCOP,
  type PuntoGraficoFlujo,
  type RangoPeriodoFinanciero,
  type MovimientoCajaSelect,
  type DistribucionCategoriaGasto,
  type DistribucionMetodoPago,
} from '@/lib/caja';

export interface CajaBarraFlujoProps {
  ingresos: number;
  egresos: number;
  flujoNeto: number;
  periodo?: RangoPeriodoFinanciero | undefined;
  movimientos?: MovimientoCajaSelect[] | undefined;
  puntosHistoricos?: PuntoGraficoFlujo[] | undefined;
  distribucionGastos?: DistribucionCategoriaGasto[] | undefined;
  distribucionMetodos?: DistribucionMetodoPago[] | undefined;
  periodoLabel?: string | undefined;
  onExplorarDetalle?: ((tipo: 'EGRESOS' | 'BALANCE' | 'METODOS') => void) | undefined;
  onExportarReporte?: (() => void) | undefined;
}

/**
 * Genera un path SVG con esquinas superiores redondeadas y base plana.
 */
function generarPathBarraTopRedondeada(x: number, y: number, w: number, h: number, r: number = 8): string {
  const radio = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M ${x} ${y + h} L ${x} ${y + radio} Q ${x} ${y} ${x + radio} ${y} L ${x + w - radio} ${y} Q ${x + w} ${y} ${x + w} ${y + radio} L ${x + w} ${y + h} Z`;
}

/**
 * Redondea un valor hacia arriba a una escala monetaria limpia para el eje Y.
 */
function redondearEscalaSuperior(val: number): number {
  if (val <= 0) return 100000;
  const magnitud = Math.pow(10, Math.floor(Math.log10(val)));
  const factor = val / magnitud;
  let factorRedondeado = 1;
  if (factor > 5) factorRedondeado = 10;
  else if (factor > 2) factorRedondeado = 5;
  else if (factor > 1) factorRedondeado = 2;
  return factorRedondeado * magnitud;
}

/**
 * Gráfica de Barras de Distribución de Flujo (Margen vs. Gastos)
 *
 * Estructura fija de DOS BARRAS ÚNICAS:
 * 1. Margen: Margen financiero neto del período seleccionado (ingresos - egresos).
 * 2. Gastos: Total de egresos operativos del mismo período seleccionado.
 *
 * Se actualiza dinámicamente según el filtro temporal activo (Hoy, 7 días, Mes, etc.)
 * compartiendo la misma escala vertical para una comparación directa y visualmente rigurosa.
 */
export function CajaBarraFlujo({
  ingresos: _ingresos,
  egresos,
  flujoNeto,
  periodo: _periodo,
  movimientos: _movimientos,
  puntosHistoricos: _puntosHistoricos,
  distribucionGastos: _distribucionGastos,
  distribucionMetodos: _distribucionMetodos,
  periodoLabel = 'Período activo',
  onExplorarDetalle: _onExplorarDetalle,
  onExportarReporte,
}: CajaBarraFlujoProps) {
  // Estado para tooltip o barra seleccionada ('MARGEN' | 'GASTOS' | null)
  const [barraActiva, setBarraActiva] = useState<'MARGEN' | 'GASTOS' | null>(null);

  // Valores reales correspondientes al período activo
  const valorMargenBruto = flujoNeto;
  const valorMargenVisual = Math.max(0, valorMargenBruto);
  const valorGastos = Math.max(0, egresos);

  const totalVolumen = valorMargenVisual + valorGastos;
  const pctMargen = totalVolumen > 0 ? Math.round((valorMargenVisual / totalVolumen) * 100) : 0;
  const pctGastos = totalVolumen > 0 ? 100 - pctMargen : 0;

  // Escala monetaria compartida para el eje Y
  const maxValor = Math.max(valorMargenVisual, valorGastos, 10000);
  const escalaMax = redondearEscalaSuperior(maxValor);

  // Geometría y dimensiones centradas y compactas
  const svgWidth = 520;
  const svgHeight = 210;
  const padLeft = 68; // Margen para etiquetas legibles del eje Y
  const padRight = 24;
  const padTop = 32; // Espacio superior para etiquetas monetarias sobre las barras
  const padBottom = 42; // Espacio inferior para nombres del eje X
  const chartHeight = svgHeight - padTop - padBottom; // 136px útiles
  const chartWidth = svgWidth - padLeft - padRight; // 428px
  const baselineY = padTop + chartHeight; // 168px

  // Dos barras anchas, protagonistas y centradas lado a lado
  const barWidth = 84;
  const barGap = 32;
  const totalBarsWidth = barWidth * 2 + barGap;
  const chartCenterX = padLeft + chartWidth / 2;
  const xMargen = chartCenterX - totalBarsWidth / 2;
  const xGastos = xMargen + barWidth + barGap;

  // Altura proporcional de cada barra (mínimo 6px para indicar presencia en caso de valores muy bajos)
  const hMargen = valorMargenVisual > 0
    ? Math.max(8, (valorMargenVisual / escalaMax) * chartHeight)
    : 6;
  const yMargen = baselineY - hMargen;

  const hGastos = valorGastos > 0
    ? Math.max(8, (valorGastos / escalaMax) * chartHeight)
    : 6;
  const yGastos = baselineY - hGastos;

  // Niveles del eje Y (100%, 50%, 0%)
  const nivelesY = [
    { ratio: 1.0, valor: escalaMax },
    { ratio: 0.5, valor: escalaMax * 0.5 },
    { ratio: 0.0, valor: 0 },
  ];

  return (
    <section className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/30 dark:border-white/10 p-4 sm:p-5 shadow-xs transition-all space-y-3">
      {/* ============================================================== */}
      {/* 1. ENCABEZADO PEQUEÑO Y DESCRIPTIVO */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#9CA3AF]/15 dark:border-white/10">
        <div>
          <h3 className="font-display text-base sm:text-lg font-bold tracking-tight text-[#111827] dark:text-[#EDEDED]">
            Distribución de flujo
          </h3>
          <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
            Margen financiero vs. Gastos del período ({periodoLabel})
          </p>
        </div>

        {/* Resumen rápido / Estado del margen */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono">
          <span className="text-[#4B5563] dark:text-[#9CA3AF]">Margen neto:</span>
          <span
            className={`font-bold px-2 py-0.5 rounded-full text-xs ${
              valorMargenBruto >= 0
                ? 'bg-[#1E3A8A]/10 text-[#1E3A8A] dark:text-[#EDEDED] border border-[#1E3A8A]/25'
                : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
            }`}
          >
            {valorMargenBruto >= 0 ? '+' : ''}{formatearMonedaCOP(valorMargenBruto)}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. GRÁFICA DE DOS BARRAS PROTAGONISTAS Y CENTRADAS */}
      {/* ============================================================== */}
      <div className="relative flex justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[560px] h-auto select-none overflow-visible"
          aria-label="Gráfica de dos barras: Margen financiero y Gastos"
        >
          {/* EJE Y: Líneas de guía discretas y referencias monetarias */}
          {nivelesY.map(({ ratio, valor }) => {
            const y = baselineY - chartHeight * ratio;
            return (
              <g key={ratio}>
                <text
                  x={padLeft - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="font-mono text-[10px] font-medium fill-[#9CA3AF] select-none"
                >
                  {formatearMonedaCompactaCOP(valor)}
                </text>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={ratio === 0 ? 0.25 : 0.08}
                  strokeDasharray={ratio === 0 ? undefined : '3 3'}
                  className="text-[#9CA3AF]"
                />
              </g>
            );
          })}

          {/* ============================================================ */}
          {/* BARRA 1: MARGEN FINANCIERO (Azul Corporativo Sobrio FlotaX) */}
          {/* ============================================================ */}
          <g
            className="cursor-pointer group"
            onMouseEnter={() => setBarraActiva('MARGEN')}
            onMouseLeave={() => setBarraActiva((curr) => (curr === 'MARGEN' ? null : curr))}
            onClick={() => setBarraActiva('MARGEN')}
          >
            {/* Valor monetario flotante directamente sobre la barra */}
            <text
              x={xMargen + barWidth / 2}
              y={yMargen - 10}
              textAnchor="middle"
              className={`font-mono text-[11px] font-bold transition-all ${
                barraActiva === 'MARGEN'
                  ? 'fill-[#1E3A8A] dark:fill-white text-[12px]'
                  : 'fill-[#111827] dark:fill-white'
              }`}
            >
              {formatearMonedaCompactaCOP(valorMargenBruto)}
            </text>

            {/* Trazo de la barra con bordes superiores suavemente redondeados */}
            <path
              d={generarPathBarraTopRedondeada(xMargen, yMargen, barWidth, hMargen, 8)}
              className={`transition-all duration-200 fill-[#1E40AF] dark:fill-[#385A94] ${
                barraActiva === 'MARGEN'
                  ? 'opacity-100 filter drop-shadow-sm'
                  : 'opacity-90 hover:opacity-100'
              }`}
            />

            {/* Eje X: Nombre de la categoría «Margen» */}
            <text
              x={xMargen + barWidth / 2}
              y={baselineY + 18}
              textAnchor="middle"
              className={`font-sans text-xs select-none transition-colors ${
                barraActiva === 'MARGEN'
                  ? 'font-bold fill-[#111827] dark:fill-white'
                  : 'font-medium fill-[#4B5563] dark:fill-[#9CA3AF]'
              }`}
            >
              Margen
            </text>

            {/* Porcentaje complementario bajo la etiqueta */}
            <text
              x={xMargen + barWidth / 2}
              y={baselineY + 32}
              textAnchor="middle"
              className="font-mono text-[10px] fill-[#9CA3AF]"
            >
              {pctMargen}%
            </text>

            {/* Zona táctil expandida para facilitar interacción en móviles */}
            <rect
              x={xMargen - 6}
              y={padTop}
              width={barWidth + 12}
              height={chartHeight + padBottom}
              fill="transparent"
            />
          </g>

          {/* ============================================================ */}
          {/* BARRA 2: GASTOS OPERATIVOS (Azul Marino Profundo FlotaX) */}
          {/* ============================================================ */}
          <g
            className="cursor-pointer group"
            onMouseEnter={() => setBarraActiva('GASTOS')}
            onMouseLeave={() => setBarraActiva((curr) => (curr === 'GASTOS' ? null : curr))}
            onClick={() => setBarraActiva('GASTOS')}
          >
            {/* Valor monetario flotante directamente sobre la barra */}
            <text
              x={xGastos + barWidth / 2}
              y={yGastos - 10}
              textAnchor="middle"
              className={`font-mono text-[11px] font-bold transition-all ${
                barraActiva === 'GASTOS'
                  ? 'fill-[#0F172A] dark:fill-white text-[12px]'
                  : 'fill-[#111827] dark:fill-white'
              }`}
            >
              {formatearMonedaCompactaCOP(valorGastos)}
            </text>

            {/* Trazo de la barra con bordes superiores suavemente redondeados */}
            <path
              d={generarPathBarraTopRedondeada(xGastos, yGastos, barWidth, hGastos, 8)}
              className={`transition-all duration-200 fill-[#0F172A] dark:fill-[#1E293B] ${
                barraActiva === 'GASTOS'
                  ? 'opacity-100 filter drop-shadow-sm'
                  : 'opacity-90 hover:opacity-100'
              }`}
            />

            {/* Eje X: Nombre de la categoría «Gastos» */}
            <text
              x={xGastos + barWidth / 2}
              y={baselineY + 18}
              textAnchor="middle"
              className={`font-sans text-xs select-none transition-colors ${
                barraActiva === 'GASTOS'
                  ? 'font-bold fill-[#111827] dark:fill-white'
                  : 'font-medium fill-[#4B5563] dark:fill-[#9CA3AF]'
              }`}
            >
              Gastos
            </text>

            {/* Porcentaje complementario bajo la etiqueta */}
            <text
              x={xGastos + barWidth / 2}
              y={baselineY + 32}
              textAnchor="middle"
              className="font-mono text-[10px] fill-[#9CA3AF]"
            >
              {pctGastos}%
            </text>

            {/* Zona táctil expandida para facilitar interacción en móviles */}
            <rect
              x={xGastos - 6}
              y={padTop}
              width={barWidth + 12}
              height={chartHeight + padBottom}
              fill="transparent"
            />
          </g>
        </svg>
      </div>

      {/* ============================================================== */}
      {/* 3. TOOLTIP / DETALLE EXACTO CUANDO SE INTERACTÚA */}
      {/* ============================================================== */}
      {barraActiva && (
        <div className="rounded-xl border border-[#9CA3AF]/20 dark:border-white/10 bg-[#EDEDED]/50 dark:bg-white/5 px-3 py-1.5 text-xs flex items-center justify-between font-mono animate-in fade-in duration-150">
          <span className="text-[#4B5563] dark:text-[#9CA3AF] font-sans">
            {barraActiva === 'MARGEN' ? 'Margen Financiero:' : 'Gastos Operativos:'}
          </span>
          <span className="font-bold text-[#111827] dark:text-white">
            {barraActiva === 'MARGEN'
              ? `${valorMargenBruto >= 0 ? '+' : ''}${formatearMonedaCOP(valorMargenBruto)} (${pctMargen}%)`
              : `${formatearMonedaCOP(valorGastos)} (${pctGastos}%)`}
          </span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. BOTÓN «EXPORTAR REPORTES» DEBAJO DE LA GRÁFICA */}
      {/* ============================================================== */}
      <div className="pt-2 border-t border-[#9CA3AF]/15 dark:border-white/10 flex justify-center sm:justify-end">
        <button
          type="button"
          onClick={onExportarReporte}
          className="fx-press inline-flex min-h-[36px] items-center justify-center gap-2 rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#111827] hover:bg-[#EDEDED] dark:hover:bg-white/10 px-4 py-1.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] shadow-2xs transition-colors cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 text-[#1E3A8A] dark:text-[#93C5FD]"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Exportar reportes</span>
        </button>
      </div>
    </section>
  );
}
