import { useState, useEffect, useRef, useId } from 'react';
import type { CuentaFinancieraSelect } from '@/lib/caja';

export interface CajaSelectOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
  readonly badge?: string | undefined;
}

export interface CajaCustomSelectProps<T extends string = string> {
  readonly id?: string | undefined;
  readonly label?: string | undefined;
  readonly ariaLabel: string;
  readonly value: T;
  readonly defaultValue?: T | undefined;
  readonly options: readonly CajaSelectOption<T>[];
  readonly onChange: (nextValue: T) => void;
  readonly dropDirection?: 'down' | 'up' | undefined;
  /**
   * `floating`: la lista flota sobre el contenido (modales y formularios).
   * `inline`: la lista se expande en línea, empuja el contenido siguiente hacia abajo
   * y no se cierra al abrir otro selector (permite varios abiertos a la vez).
   */
  readonly display?: 'floating' | 'inline' | undefined;
}

/**
 * Dropdown List personalizado de FlotaX.
 * Implementa fielmente los 3 estados de diseño (Default State, Clicked State y Selected State):
 * - Default State: Contenedor blanco limpio, borde sutil `#9CA3AF`, texto atenuado y chevron fino `⌄`.
 * - Clicked State: Borde nítido `#111827` con anillo de foco suave, chevron `⌃` y tarjeta flotante blanca
 *   con opción activa resaltada en gris suave (`#EDEDED`) + check fino `✓` a la derecha.
 * - Selected State: Contenedor blanco con tipografía `#111827` de alto contraste.
 */
export function CajaCustomSelect<T extends string = string>({
  id,
  label,
  ariaLabel,
  value,
  defaultValue,
  options,
  onChange,
  dropDirection = 'down',
  display = 'floating',
}: CajaCustomSelectProps<T>) {
  const isInline = display === 'inline';
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const selectedOption =
    options.find((opt) => opt.value === value) ?? options[0];

  const isDefaultState =
    (defaultValue !== undefined && value === defaultValue) || value === '';

  useEffect(() => {
    if (!isOpen || isInline) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        containerRef.current &&
        target instanceof Node &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isInline]);

  const openDropdown = () => {
    if (options.length === 0) return;
    const currentIndex = options.findIndex((opt) => opt.value === value);
    setFocusedIdx(currentIndex >= 0 ? currentIndex : 0);
    setIsOpen(true);
  };

  const handleTriggerKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>
  ) => {
    if (options.length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setFocusedIdx((prev) => (prev + delta + options.length) % options.length);
    } else if ((event.key === 'Enter' || event.key === ' ') && isOpen) {
      event.preventDefault();
      const targetOption = options[focusedIdx];
      if (targetOption) {
        onChange(targetOption.value);
        setIsOpen(false);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={(event) => {
        if (isInline && isOpen && event.key === 'Escape') {
          setIsOpen(false);
        }
      }}
      className={`relative ${isInline ? '' : isOpen ? 'z-50' : 'z-10'}`}
    >
      {label && (
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
          {label}
        </span>
      )}

      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl bg-white dark:bg-[#1F2937] px-3.5 py-2 text-left text-base sm:text-sm transition-all duration-150 cursor-pointer ${
          isOpen
            ? 'border border-[#2D6BFF] text-[#111827] dark:text-[#EDEDED] font-semibold ring-3 ring-[#2D6BFF]/15 shadow-2xs'
            : isDefaultState
              ? 'border border-[#9CA3AF]/40 dark:border-white/10 text-[#4B5563] dark:text-[#9CA3AF] font-normal hover:border-[#2D6BFF]/60 hover:text-[#111827] dark:hover:text-[#EDEDED]'
              : 'border border-[#2D6BFF]/40 dark:border-[#2D6BFF]/50 text-[#111827] dark:text-[#EDEDED] font-medium bg-blue-50/20 dark:bg-blue-950/20'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <span className="truncate">{selectedOption?.label ?? ''}</span>
          {selectedOption?.badge && !isDefaultState && (
            <span className="shrink-0 rounded-md bg-[#EDEDED] dark:bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
              {selectedOption.badge}
            </span>
          )}
        </span>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            isOpen
              ? 'rotate-180 text-[#2D6BFF]'
              : isDefaultState
                ? 'text-[#9CA3AF]'
                : 'text-[#2D6BFF]'
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && options.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={`max-h-60 overflow-y-auto rounded-2xl border border-[#9CA3AF]/30 dark:border-white/15 bg-white dark:bg-[#1F2937] p-1.5 animate-in fade-in duration-150 shadow-xl ${
            isInline
              ? 'relative mt-1.5 shadow-2xs'
              : `absolute left-0 right-0 z-50 shadow-[0_16px_38px_-6px_rgba(17,24,39,0.16),0_4px_12px_-2px_rgba(17,24,39,0.06)] ${
                  dropDirection === 'up'
                    ? 'bottom-[calc(100%+6px)]'
                    : 'top-[calc(100%+6px)]'
                }`
          }`}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused = idx === focusedIdx;

            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setFocusedIdx(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex min-h-[40px] w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2 text-left text-sm transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#111827] text-white dark:bg-[#2D6BFF] font-semibold'
                    : isFocused
                      ? 'bg-[#EDEDED]/70 dark:bg-white/10 text-[#111827] dark:text-[#EDEDED]'
                      : 'text-[#1F2937] dark:text-[#D1D5DB] hover:bg-[#EDEDED]/55 dark:hover:bg-white/10'
                }`}
              >
                <span className="truncate">{opt.label}</span>

                <span className="flex shrink-0 items-center gap-2">
                  {opt.badge && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#EDEDED] dark:bg-white/10 text-[#4B5563] dark:text-[#D1D5DB]'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-white"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type FiltroTipoMovimiento =
  | 'TODOS'
  | 'INGRESO'
  | 'EGRESO'
  | 'TRANSFERENCIA';

const SEGMENTOS_TIPO: readonly {
  readonly id: FiltroTipoMovimiento;
  readonly label: string;
}[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'INGRESO', label: 'Ingresos' },
  { id: 'EGRESO', label: 'Egresos' },
  { id: 'TRANSFERENCIA', label: 'Transferencias' },
];

const OPCIONES_METODO: readonly CajaSelectOption[] = [
  { value: 'TODOS', label: 'Todos los Métodos' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia Bancaria' },
  { value: 'tarjeta', label: 'Tarjeta Débito / Crédito' },
  { value: 'especie', label: 'En Especie' },
  { value: 'otro', label: 'Otro Medio' },
];

const OPCIONES_ESTADO: readonly CajaSelectOption[] = [
  { value: 'TODOS', label: 'Todos los Estados' },
  { value: 'CONFIRMADO', label: 'Confirmados' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'ANULADO', label: 'Anulados' },
];

export interface CajaMovimientosFilterBarProps {
  readonly filtroBusqueda: string;
  readonly onChangeBusqueda: (val: string) => void;
  readonly filtroTipo: string;
  readonly onChangeTipo: (val: string) => void;
  readonly filtroMetodo: string;
  readonly onChangeMetodo: (val: string) => void;
  readonly filtroCuenta: string;
  readonly onChangeCuenta: (val: string) => void;
  readonly filtroEstado: string;
  readonly onChangeEstado: (val: string) => void;
  readonly cuentas: readonly CuentaFinancieraSelect[];
  readonly totalFiltrados: number;
  readonly totalMovimientos: number;
  readonly onDescargarCsv: () => void;
}

/**
 * Barra de filtros de Movimientos con estética Fintech y Progressive Disclosure:
 * - Fila principal compacta: Buscador rápido + Segmented Control de Tipo + Botón Filtros Avanzados + Descargar CSV.
 * - Panel desplegable de Filtros Avanzados (Método, Cuenta, Estado) accesible bajo demanda.
 * - Indicadores visuales claros de filtros activos.
 * - Adaptabilidad fluida en móvil y escritorio con soporte para modo claro y oscuro.
 */
export function CajaMovimientosFilterBar({
  filtroBusqueda,
  onChangeBusqueda,
  filtroTipo,
  onChangeTipo,
  filtroMetodo,
  onChangeMetodo,
  filtroCuenta,
  onChangeCuenta,
  filtroEstado,
  onChangeEstado,
  cuentas,
  totalFiltrados,
  totalMovimientos,
  onDescargarCsv,
}: CajaMovimientosFilterBarProps) {
  const [filtrosAvanzadosAbiertos, setFiltrosAvanzadosAbiertos] = useState(false);

  const opcionesCuenta: CajaSelectOption[] = [
    { value: 'TODAS', label: 'Todas las Cuentas' },
    ...cuentas.map((c) => ({
      value: c.id,
      label: c.nombre,
      badge:
        c.tipo === 'CAJA_EFECTIVO'
          ? 'Efectivo'
          : c.tipo === 'BANCO'
            ? 'Banco'
            : 'Billetera',
    })),
  ];

  const filtrosSecundariosActivos =
    (filtroMetodo !== 'TODOS' ? 1 : 0) +
    (filtroCuenta !== 'TODAS' ? 1 : 0) +
    (filtroEstado !== 'TODOS' ? 1 : 0);

  const hayCualquierFiltroActivo =
    filtroTipo !== 'TODOS' ||
    filtrosSecundariosActivos > 0 ||
    filtroBusqueda.trim().length > 0;

  const limpiarTodosLosFiltros = () => {
    onChangeBusqueda('');
    onChangeTipo('TODOS');
    onChangeMetodo('TODOS');
    onChangeCuenta('TODAS');
    onChangeEstado('TODOS');
  };

  return (
    <section
      aria-label="Filtros del libro de movimientos"
      className="relative z-20 rounded-[24px] border border-[#9CA3AF]/30 dark:border-white/10 bg-white dark:bg-[#1F2937] p-3 sm:p-4 shadow-xs space-y-3"
    >
      {/* 1. Fila de Control Principal: Buscador + Segmented Control + Acciones */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
        {/* Buscador Operativo (16px en WebKit para evitar auto-zoom) */}
        <div className="relative flex-1 min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>

          <input
            type="text"
            placeholder="Buscar por concepto, cliente, contrato, referencia..."
            value={filtroBusqueda}
            onChange={(e) => onChangeBusqueda(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 dark:border-white/10 bg-white dark:bg-[#111827] pl-10 pr-9 py-2 text-base text-[#111827] dark:text-[#EDEDED] placeholder-[#9CA3AF] transition-all focus:border-[#2D6BFF] focus:ring-3 focus:ring-[#2D6BFF]/15 focus:outline-none"
          />

          {filtroBusqueda.length > 0 && (
            <button
              type="button"
              onClick={() => onChangeBusqueda('')}
              aria-label="Limpiar búsqueda"
              className="ios-press-bounce absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-[#EDEDED] dark:bg-white/10 text-xs font-bold text-[#111827] dark:text-[#EDEDED] hover:bg-[#9CA3AF]/30 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Segmented Control de Tipo de Movimiento (Uso Frecuente) */}
        <div
          role="radiogroup"
          aria-label="Filtrar movimientos por tipo"
          className="flex items-center gap-1 rounded-xl bg-[#EDEDED] dark:bg-[#111827] p-1 border border-[#9CA3AF]/20 dark:border-white/10 overflow-x-auto no-scrollbar shrink-0"
        >
          {SEGMENTOS_TIPO.map((seg) => {
            const isSelected = filtroTipo === seg.id;
            return (
              <button
                key={seg.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChangeTipo(seg.id)}
                className={`ios-press-bounce min-h-[36px] whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold tracking-tight transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#111827] shadow-xs dark:bg-[#2D6BFF] dark:text-white'
                    : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/5'
                }`}
              >
                {seg.label}
              </button>
            );
          })}
        </div>

        {/* Acciones Rápidas: Desplegable de Filtros Avanzados + Descarga CSV */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setFiltrosAvanzadosAbiertos((prev) => !prev)}
            aria-expanded={filtrosAvanzadosAbiertos}
            className={`ios-press-bounce inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
              filtrosSecundariosActivos > 0
                ? 'bg-[#2D6BFF] text-white border-[#2D6BFF] shadow-xs'
                : filtrosAvanzadosAbiertos
                  ? 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/50 dark:bg-white/15 dark:text-white dark:border-white/20'
                  : 'bg-white text-[#4B5563] border-[#9CA3AF]/40 hover:bg-[#EDEDED] dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/10 dark:hover:bg-white/10'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-4 w-4"
            >
              <line x1="4" x2="4" y1="21" y2="14" />
              <line x1="4" x2="4" y1="10" y2="3" />
              <line x1="12" x2="12" y1="21" y2="12" />
              <line x1="12" x2="12" y1="8" y2="3" />
              <line x1="20" x2="20" y1="21" y2="16" />
              <line x1="20" x2="20" y1="12" y2="3" />
              <line x1="1" x2="7" y1="14" y2="14" />
              <line x1="9" x2="15" y1="8" y2="8" />
              <line x1="17" x2="23" y1="16" y2="16" />
            </svg>
            <span>Filtros</span>
            {filtrosSecundariosActivos > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#2D6BFF] font-black text-[10px]">
                {filtrosSecundariosActivos}
              </span>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                filtrosAvanzadosAbiertos ? 'rotate-180' : ''
              }`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onDescargarCsv}
            title="Descargar libro de movimientos filtrado a CSV"
            className="ios-press-bounce inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#9CA3AF]/40 dark:border-white/10 bg-white dark:bg-[#111827] px-3 py-2 text-xs font-bold text-[#111827] dark:text-[#EDEDED] hover:bg-[#EDEDED] dark:hover:bg-white/10 transition cursor-pointer"
          >
            <span aria-hidden="true">⬇</span>
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Panel Desplegable de Filtros Avanzados (Progressive Disclosure) */}
      {filtrosAvanzadosAbiertos && (
        <div className="pt-2 border-t border-[#9CA3AF]/20 dark:border-white/10 animate-in fade-in slide-in-from-top-1 duration-150 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
              Filtros Avanzados de Movimientos
            </span>
            {filtrosSecundariosActivos > 0 && (
              <button
                type="button"
                onClick={() => {
                  onChangeMetodo('TODOS');
                  onChangeCuenta('TODAS');
                  onChangeEstado('TODOS');
                }}
                className="text-xs font-semibold text-[#2D6BFF] hover:underline cursor-pointer"
              >
                Limpiar avanzados
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 items-start gap-2.5">
            <CajaCustomSelect
              display="inline"
              label="Método de Pago"
              ariaLabel="Filtrar por método de pago"
              value={filtroMetodo}
              defaultValue="TODOS"
              options={OPCIONES_METODO}
              onChange={onChangeMetodo}
            />

            <CajaCustomSelect
              display="inline"
              label="Cuenta o Caja"
              ariaLabel="Filtrar por cuenta financiera"
              value={filtroCuenta}
              defaultValue="TODAS"
              options={opcionesCuenta}
              onChange={onChangeCuenta}
            />

            <CajaCustomSelect
              display="inline"
              label="Estado Contable"
              ariaLabel="Filtrar por estado del movimiento"
              value={filtroEstado}
              defaultValue="TODOS"
              options={OPCIONES_ESTADO}
              onChange={onChangeEstado}
            />
          </div>
        </div>
      )}

      {/* 3. Barra de Conteo Tabular + Chips de Filtros Activos */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#9CA3AF]/15 dark:border-white/10 pt-2.5 text-xs text-[#4B5563] dark:text-[#9CA3AF]">
        <div className="flex flex-wrap items-center gap-2 tabular-nums">
          <span>
            Mostrando <b className="text-[#111827] dark:text-[#EDEDED]">{totalFiltrados}</b> de{' '}
            <b className="text-[#111827] dark:text-[#EDEDED]">{totalMovimientos}</b> movimientos
          </span>

          {hayCualquierFiltroActivo && (
            <button
              type="button"
              onClick={limpiarTodosLosFiltros}
              className="rounded-full bg-[#EDEDED] dark:bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-[#1F2937] dark:text-[#EDEDED] hover:bg-[#9CA3AF]/30 dark:hover:bg-white/20 transition cursor-pointer"
            >
              ✕ Restablecer todos
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          {filtroTipo !== 'TODOS' && (
            <span className="rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 px-2 py-0.5 font-medium text-blue-700 dark:text-blue-300">
              Tipo: {filtroTipo}
            </span>
          )}
          {filtroMetodo !== 'TODOS' && (
            <span className="rounded-md bg-[#EDEDED] dark:bg-white/10 px-2 py-0.5 font-medium text-[#111827] dark:text-[#EDEDED]">
              Método: {filtroMetodo}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
