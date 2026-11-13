import type { KeyboardEvent, ReactNode } from 'react';
import { formatearMonedaCOP, type PuntoGraficoFlujo } from '@/lib/caja';

/**
 * Contrato de teclado para una tarjeta expuesta como `role="button"`.
 * Enter y Space activan la misma acción que el clic; ambos previenen el
 * default para no disparar un submit ancestro ni desplazar la página.
 */
function crearManejadorTeclado(accion: (() => void) | undefined) {
  return (event: KeyboardEvent<HTMLElement>): void => {
    if (!accion) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      accion();
      return;
    }
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      accion();
    }
  };
}

export interface CajaKpiCardProps {
  titulo: string;
  monto: number;
  subtitulo?: string | undefined;
  badge?: string | undefined;
  badgeTipo?: 'neutral' | 'positivo' | 'alerta' | 'negativo' | undefined;
  icono: ReactNode;
  onClick?: (() => void) | undefined;
}

/**
 * Calcula un path SVG cúbico Catmull-Rom suavizado que une matemáticamente
 * los puntos numéricos reales de una serie de datos de tesorería.
 */
export function calcularPathSplineReal(
  valores: number[],
  ancho: number,
  alto: number,
  paddingX = 8,
  paddingY = 8
): {
  lineaPath: string;
  areaPath: string;
  nodos: { x: number; y: number; valor: number }[];
  min: number;
  max: number;
} {
  if (valores.length === 0) {
    return { lineaPath: '', areaPath: '', nodos: [], min: 0, max: 0 };
  }

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;

  const anchoUtil = Math.max(1, ancho - paddingX * 2);
  const altoUtil = Math.max(1, alto - paddingY * 2);

  const nodos = valores.map((v, i) => {
    const x =
      paddingX +
      (valores.length > 1 ? (i / (valores.length - 1)) * anchoUtil : anchoUtil / 2);
    // En SVG el eje Y 0 está arriba: valores mayores quedan más cerca del techo
    const y = alto - paddingY - ((v - min) / rango) * altoUtil;
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      valor: v,
    };
  });

  if (nodos.length === 1) {
    const p = nodos[0]!;
    return {
      lineaPath: `M 0 ${p.y} L ${ancho} ${p.y}`,
      areaPath: `M 0 ${p.y} L ${ancho} ${p.y} L ${ancho} ${alto} L 0 ${alto} Z`,
      nodos,
      min,
      max,
    };
  }

  // Algoritmo de interpolación Catmull-Rom a Bézier cúbica
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

  const ultimoNodo = nodos[nodos.length - 1]!;
  const primerNodo = nodos[0]!;
  const areaPath = `${d} L ${ultimoNodo.x} ${alto} L ${primerNodo.x} ${alto} Z`;

  return { lineaPath: d, areaPath, nodos, min, max };
}

/**
 * Tarjeta Bento Hero: Saldo Disponible Real
 * Fiel a BentoHeroCard.astro y la paleta canónica FlotaX:
 * Contenedor #111827, pill de estado, Space Grotesk
 * y mini-tarjeta blanca insertada para desglose exacto entre efectivo y bancos.
 */
export interface CajaBentoHeroCardProps {
  montoDisponible: number;
  saldoEfectivo?: number | undefined;
  saldoBancos?: number | undefined;
  depositosRetenidos?: number | undefined;
  yardName?: string | undefined;
  dateLabel?: string | undefined;
  puntosHistoricos?: PuntoGraficoFlujo[] | undefined;
  onClick?: (() => void) | undefined;
}

export function CajaBentoHeroCard({
  montoDisponible,
  saldoEfectivo: _saldoEfectivo = 0,
  saldoBancos: _saldoBancos = 0,
  depositosRetenidos = 0,
  yardName = 'Patio Central',
  dateLabel = 'Tesorería en Tiempo Real',
  puntosHistoricos: _puntosHistoricos = [],
  onClick,
}: CajaBentoHeroCardProps) {
  return (
    <article
      onClick={onClick}
      onKeyDown={onClick ? crearManejadorTeclado(onClick) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative overflow-hidden rounded-[24px] sm:rounded-[30px] bg-[#111827] p-5 sm:p-7 text-white shadow-xl border border-white/10 ${onClick ? 'fx-pressable cursor-pointer hover:border-white/25' : ''
        }`}
    >
      <div className="relative z-10 flex flex-col space-y-3 sm:space-y-4">
        {/* Pill de Tag Canónico con Azul FlotaX */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md border border-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2D6BFF]" />
            <span>Tesorería & Saldo Disponible Real</span>
          </div>

          <span className="text-xs font-medium text-[#9CA3AF]">
            {dateLabel} • {yardName}
          </span>
        </div>

        {/* Monto Destacado en Space Grotesk */}
        <div>
          <div className="flex items-baseline gap-2">
            <p className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#EDEDED]">
              {formatearMonedaCOP(montoDisponible)}
            </p>
            <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs font-bold text-[#9CA3AF]">
              COP
            </span>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm font-medium text-[#9CA3AF]">
            Fondos líquidos operativos libres de reservas
            {depositosRetenidos > 0 && (
              <span className="block sm:inline sm:ml-1 text-[#EDEDED]/90">
                • {formatearMonedaCOP(depositosRetenidos)} en custodia
              </span>
            )}
          </p>
        </div>

        {/* Pie informativo sutil */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-[#9CA3AF]">
          <div className="flex items-center gap-2">

          </div>
          <span className="text-xs font-semibold text-white hover:underline cursor-pointer flex items-center gap-1">
            <span>Ver cuentas</span>
            <span>→</span>
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * Tarjeta Bento: Distribución de Fondos
 * Card independiente ubicada bajo Tesorería, mostrando el desglose proporcional
 * entre efectivo en gaveta y fondos en bancos/billeteras.
 */
export interface CajaDistribucionFondosCardProps {
  saldoEfectivo: number;
  saldoBancos: number;
  totalCuentas?: number | undefined;
  onClick?: (() => void) | undefined;
}

export function CajaDistribucionFondosCard({
  saldoEfectivo,
  saldoBancos,
  totalCuentas,
  onClick,
}: CajaDistribucionFondosCardProps) {
  const suma = totalCuentas ?? Math.max(1, saldoEfectivo + saldoBancos);
  const total = Math.max(1, suma);
  const pctEfectivo = Math.round((saldoEfectivo / total) * 100);
  const pctBancos = Math.max(0, 100 - pctEfectivo);

  return (
    <article
      onClick={onClick}
      onKeyDown={onClick ? crearManejadorTeclado(onClick) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`rounded-[24px] sm:rounded-[28px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-4 sm:p-5 shadow-xs transition-all ${onClick ? 'fx-pressable cursor-pointer hover:border-[#111827]/40 dark:hover:border-white/25' : ''
        }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#9CA3AF]/15 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#1E3A8A] dark:bg-[#475569]" />
          <h3 className="font-display text-sm font-bold tracking-tight text-[#111827] dark:text-[#EDEDED]">
            Distribución de Fondos
          </h3>
          <span className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] hidden sm:inline">
            · Desglose de disponibilidad por canal
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            Operativo
          </span>
          {onClick && (
            <span className="text-xs font-semibold text-[#1E3A8A] dark:text-[#9CA3AF] hover:underline cursor-pointer">
              Ver cuentas →
            </span>
          )}
        </div>
      </div>

      {/* Desglose en 2 Bloques Limpios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
        <div className="flex items-center justify-between rounded-xl bg-[#EDEDED]/50 dark:bg-white/5 p-3 border border-[#9CA3AF]/15 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#111827] dark:bg-white text-white dark:text-[#111827] text-xs font-black shadow-xs">
              $
            </span>
            <div>
              <span className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
                Gaveta (Efectivo)
              </span>
              <span className="text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                Caja física en patio
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs sm:text-sm font-bold text-[#111827] dark:text-white block">
              {formatearMonedaCOP(saldoEfectivo)}
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
              {pctEfectivo}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#EDEDED]/50 dark:bg-white/5 p-3 border border-[#9CA3AF]/15 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1E3A8A] dark:bg-[#1E293B] text-white text-xs font-black shadow-xs border border-[#1E3A8A]/30">
              🏦
            </span>
            <div>
              <span className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
                Bancos & Billeteras
              </span>
              <span className="text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                Cuentas digitales / QR
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs sm:text-sm font-bold text-[#111827] dark:text-white block">
              {formatearMonedaCOP(saldoBancos)}
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#1E3A8A] dark:text-[#9CA3AF]">
              {pctBancos}%
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Tarjeta Bento Dividida con Sparkline Real
 * Fiel a BentoMetricsGrid.astro (Tarjeta blanca para ingresos, tarjeta carbón para egresos).
 * 2 cards por fila en móviles (col-span-1).
 */
export interface CajaBentoSparklineCardProps {
  tipo: 'INGRESO' | 'EGRESO';
  titulo: string;
  monto: number;
  subtitulo: string;
  trendBadge: string;
  puntosHistoricos?: PuntoGraficoFlujo[] | undefined;
  onClick?: (() => void) | undefined;
}

export function CajaBentoSparklineCard({
  tipo,
  titulo,
  monto,
  subtitulo,
  trendBadge,
  onClick,
}: CajaBentoSparklineCardProps) {
  if (tipo === 'INGRESO') {
    return (
      <article
        onClick={onClick}
        onKeyDown={onClick ? crearManejadorTeclado(onClick) : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={`relative flex flex-col justify-between rounded-[20px] sm:rounded-[24px] bg-white dark:bg-[#1F2937] p-3.5 sm:p-5 text-[#111827] dark:text-[#EDEDED] shadow-xs border border-[#9CA3AF]/30 dark:border-white/10 col-span-1 h-full min-h-[115px] sm:min-h-[130px] ${onClick ? 'fx-pressable cursor-pointer hover:border-[#2D6BFF]/50 dark:hover:border-white/20' : ''
          }`}
      >
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-black text-xs sm:text-sm border border-emerald-200/60 dark:border-emerald-800/40">
              +
            </div>
            <span className="text-xs sm:text-sm font-semibold text-[#4B5563] dark:text-[#9CA3AF] truncate">
              {titulo}
            </span>
          </div>

          {trendBadge && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
              {trendBadge}
            </span>
          )}
        </div>

        <div className="mt-3 sm:mt-4">
          <p className="font-display text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-[#111827] dark:text-white tabular-nums truncate">
            {formatearMonedaCOP(monto)}
          </p>
          <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] truncate">
            {subtitulo}
          </p>
        </div>
      </article>
    );
  }

  // Variante: EGRESO (Estructura idéntica y simétrica a ingresos)
  return (
    <article
      onClick={onClick}
      onKeyDown={onClick ? crearManejadorTeclado(onClick) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative flex flex-col justify-between rounded-[20px] sm:rounded-[24px] bg-white dark:bg-[#1F2937] p-3.5 sm:p-5 text-[#111827] dark:text-[#EDEDED] shadow-xs border border-[#9CA3AF]/30 dark:border-white/10 col-span-1 h-full min-h-[115px] sm:min-h-[130px] ${onClick ? 'fx-pressable cursor-pointer hover:border-[#2D6BFF]/50 dark:hover:border-white/20' : ''
        }`}
    >
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-black text-xs sm:text-sm border border-rose-200/60 dark:border-rose-800/40">
            −
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[#4B5563] dark:text-[#9CA3AF] truncate">
            {titulo}
          </span>
        </div>

        {trendBadge && (
          <span className="inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 shrink-0">
            {trendBadge}
          </span>
        )}
      </div>

      <div className="mt-3 sm:mt-4">
        <p className="font-display text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-[#111827] dark:text-white tabular-nums truncate">
          {formatearMonedaCOP(monto)}
        </p>
        <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF] truncate">
          {subtitulo}
        </p>
      </div>
    </article>
  );
}

/**
 * Tarjeta Bento Pill Interactiva (2 por fila en móvil)
 * Fiel a TelemetryBentoGrid.tsx y la paleta canónica (#EDEDED, #111827, #2D6BFF).
 */
export interface CajaBentoPillCardProps {
  variante: 'CARTERA' | 'GARANTIA' | 'BALANCE' | 'FLUJO_NETO';
  titulo: string;
  monto: number;
  subtitulo: string;
  etiquetaBadge?: string | undefined;
  indicadorExtra?: string | undefined;
  porcentajeBarra?: number | undefined;
  className?: string | undefined;
  onClick?: (() => void) | undefined;
}

export function CajaBentoPillCard({
  variante,
  titulo,
  monto,
  subtitulo,
  etiquetaBadge,
  indicadorExtra,
  porcentajeBarra = 65,
  className,
  onClick,
}: CajaBentoPillCardProps) {
  if (variante === 'CARTERA') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex flex-col justify-between rounded-[20px] sm:rounded-[22px] bg-white dark:bg-[#1F2937] p-3 sm:p-4 text-left border border-[#9CA3AF]/30 dark:border-white/10 shadow-xs col-span-1 ${onClick ? 'fx-pressable hover:border-[#2D6BFF]/50 dark:hover:border-white/20 cursor-pointer' : ''
          }`}
      >
        <div className="flex w-full items-center justify-between text-[11px] sm:text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
          <span className="truncate pr-1">{titulo}</span>
          <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-[#111827] dark:bg-white text-white dark:text-[#111827] shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3 w-3">
              <path d="M5 12c0-3.8 3.1-7 7-7s7 3.2 7 7-3.1 7-7 7-7-3.2-7-7Z" />
              <circle cx="17" cy="8" r="2" fill="currentColor" />
            </svg>
          </span>
        </div>

        <p className="mt-1.5 sm:mt-2 font-display text-base sm:text-xl font-extrabold tracking-tight text-[#111827] dark:text-white truncate">
          {formatearMonedaCOP(monto)}
        </p>

        {/* Barra de progreso de cobranza */}
        <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EDEDED] dark:bg-white/10 border border-[#9CA3AF]/30 dark:border-white/10">
            <div
              style={{ width: `${Math.min(100, Math.max(10, porcentajeBarra))}%` }}
              className="h-full rounded-full bg-[#2D6BFF] transition-[width] duration-300"
            />
          </div>
          <span className="font-mono text-[9px] sm:text-[10px] font-bold text-[#4B5563] dark:text-[#9CA3AF] truncate">
            {indicadorExtra || subtitulo}
          </span>
        </div>
      </button>
    );
  }

  if (variante === 'GARANTIA') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex flex-col justify-between rounded-[20px] sm:rounded-[22px] bg-white dark:bg-[#1F2937] p-3 sm:p-4 text-left border border-[#9CA3AF]/30 dark:border-white/10 shadow-xs col-span-1 ${onClick ? 'fx-pressable hover:border-[#2D6BFF]/50 dark:hover:border-white/20 cursor-pointer' : ''
          }`}
      >
        <div className="flex w-full items-center justify-between text-[11px] sm:text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
          <span className="truncate pr-1">{titulo}</span>
          <span className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 flex items-center justify-center text-[10px] font-black shrink-0">
            !
          </span>
        </div>

        <p className="mt-1.5 sm:mt-2 font-display text-base sm:text-xl font-extrabold tracking-tight text-[#111827] dark:text-white truncate">
          {formatearMonedaCOP(monto)}
        </p>

        {/* Barra dual-tone */}
        <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5">
          <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-[#EDEDED] dark:bg-white/10 border border-[#9CA3AF]/30 dark:border-white/10">
            <div style={{ width: '45%' }} className="h-full bg-amber-500" />
            <div style={{ width: '55%' }} className="h-full bg-amber-500/30" />
          </div>
          <span className="font-mono text-[9px] sm:text-[10px] font-bold text-[#4B5563] dark:text-[#9CA3AF] truncate">
            {etiquetaBadge || 'En Custodia'}
          </span>
        </div>
      </button>
    );
  }

  if (variante === 'FLUJO_NETO') {
    const esPositivo = monto >= 0;
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex flex-col justify-between rounded-[20px] sm:rounded-[22px] bg-[#111827] dark:bg-[#111827] p-3 sm:p-4 text-left border border-white/10 shadow-xs col-span-1 ${onClick ? 'fx-pressable hover:border-white/20 cursor-pointer' : ''
          }`}
      >
        <div className="flex w-full items-center justify-between text-[11px] sm:text-xs font-semibold text-blue-200/90">
          <span className="truncate pr-1">{titulo}</span>
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${esPositivo
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
              }`}
          >
            {esPositivo ? '+Caja' : '-Caja'}
          </span>
        </div>

        <p
          className={`mt-1.5 sm:mt-2 font-display text-base sm:text-xl font-extrabold tracking-tight truncate ${esPositivo ? 'text-white' : 'text-rose-400'
            }`}
        >
          {formatearMonedaCOP(monto)}
        </p>

        <div className="mt-1.5 sm:mt-2 flex items-center justify-between text-[9px] sm:text-[10px] font-medium text-[#9CA3AF] pt-1 border-t border-white/10">
          <span className="truncate">{subtitulo}</span>
          <span className="font-mono font-bold text-blue-300 ml-1">Efectivo Real</span>
        </div>
      </button>
    );
  }

  // Variante: BALANCE (Margen Operativo: Fondo azul oscuro canónico #111827, horizontal y compacta)
  const esPositivo = monto >= 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-row items-center justify-between gap-2.5 sm:gap-4 rounded-[18px] sm:rounded-[22px] bg-[#111827] dark:bg-[#1F2937] px-3.5 py-2.5 sm:px-5 sm:py-3 text-left border border-white/10 shadow-md col-span-2 w-full ${onClick ? 'fx-pressable hover:border-white/25 cursor-pointer' : ''
        } ${className || ''}`}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div
          className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm border ${esPositivo
              ? 'bg-white/10 text-white border-white/20'
              : 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
            }`}
        >
          {esPositivo ? '↗' : '↘'}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs sm:text-sm font-bold text-white truncate">
              {titulo}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0 ${esPositivo
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                }`}
            >
              {etiquetaBadge || (esPositivo ? 'Superávit' : 'Déficit')}
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-[#9CA3AF] truncate hidden sm:block">
            {subtitulo}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <p className={`font-display text-base sm:text-xl lg:text-2xl font-black tracking-tight ${esPositivo ? 'text-white' : 'text-rose-400'}`}>
          {esPositivo ? '+ ' : ''}{formatearMonedaCOP(monto)}
        </p>
        <span className="text-white/60 text-xs">→</span>
      </div>
    </button>
  );
}

/**
 * Componente canónico CajaKpiCard (Retrocompatible con micro-estilo canónico)
 */
export function CajaKpiCard({
  titulo,
  monto,
  subtitulo,
  badge,
  badgeTipo = 'neutral',
  icono,
  onClick,
}: CajaKpiCardProps) {
  const tituloNorm = titulo.toLowerCase();
  const esAzulOscuro =
    tituloNorm.includes('resultado operativo') || tituloNorm.includes('flujo neto');

  const badgeClases = {
    neutral: esAzulOscuro
      ? 'bg-white/10 text-blue-200 border-white/15'
      : 'bg-[#1F2937]/10 text-[#4B5563] border-[#9CA3AF]/30',
    positivo: esAzulOscuro
      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
      : 'bg-emerald-950/20 text-emerald-700 border-emerald-600/30',
    alerta: esAzulOscuro
      ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
      : 'bg-amber-950/20 text-amber-700 border-amber-600/30',
    negativo: esAzulOscuro
      ? 'bg-rose-950/60 text-rose-300 border-rose-500/30'
      : 'bg-rose-950/20 text-rose-700 border-rose-600/30',
  }[badgeTipo];

  return (
    <article
      onClick={onClick}
      onKeyDown={onClick ? crearManejadorTeclado(onClick) : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative flex flex-col justify-between rounded-[20px] sm:rounded-[24px] border shadow-xs col-span-1 ${esAzulOscuro
        ? 'bg-[#111827] border-white/10 text-white'
        : 'bg-white border-[#9CA3AF]/30 text-[#111827]'
        } p-3.5 sm:p-5 ${onClick
          ? `fx-pressable cursor-pointer ${esAzulOscuro ? 'hover:border-white/20' : 'hover:border-[#111827]'}`
          : ''
        }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-xl shadow-xs bg-[#111827] ${esAzulOscuro ? 'text-white' : 'text-[#EDEDED]'
              }`}
          >
            {icono}
          </div>
          <span
            className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate ${esAzulOscuro ? 'text-blue-200' : 'text-[#4B5563]'
              }`}
          >
            {titulo}
          </span>
        </div>
        {badge && (
          <span
            className={`inline-flex items-center rounded-full border px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider ${badgeClases}`}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="mt-2.5 sm:mt-4">
        <div
          className={`font-display text-lg sm:text-2xl font-black tracking-tight truncate ${esAzulOscuro ? 'text-white' : 'text-[#111827]'
            }`}
        >
          {formatearMonedaCOP(monto)}
        </div>
        {subtitulo && (
          <p
            className={`mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-medium truncate ${esAzulOscuro ? 'text-blue-200/80' : 'text-[#4B5563]'
              }`}
          >
            {subtitulo}
          </p>
        )}
      </div>

      {onClick && (
        <div
          className={`mt-2 sm:mt-3 flex items-center gap-1 border-t pt-1.5 sm:pt-2 text-[10px] sm:text-[11px] font-semibold opacity-80 ${esAzulOscuro
            ? 'border-white/10 text-blue-300'
            : 'border-[#9CA3AF]/15 text-[#111827]'
            }`}
        >
          <span>Ver detalles</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3 w-3 sm:h-3.5 sm:w-3.5"
          >
            <path
              fillRule="evenodd"
              d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </article>
  );
}
