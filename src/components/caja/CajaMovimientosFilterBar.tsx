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
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
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
        className={`flex min-h-[46px] w-full items-center justify-between gap-2.5 rounded-xl bg-white px-3.5 py-2.5 text-left text-base sm:text-sm transition-all duration-150 cursor-pointer ${
          isOpen
            ? 'border border-[#111827] text-[#111827] font-medium ring-3 ring-[#111827]/10 shadow-2xs'
            : isDefaultState
              ? 'border border-[#9CA3AF]/55 text-[#9CA3AF] font-normal hover:border-[#4B5563]/65 hover:text-[#4B5563]'
              : 'border border-[#9CA3AF]/65 text-[#111827] font-medium hover:border-[#111827]/55'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <span className="truncate">{selectedOption?.label ?? ''}</span>
          {selectedOption?.badge && !isDefaultState && (
            <span className="shrink-0 rounded-md bg-[#EDEDED] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#4B5563]">
              {selectedOption.badge}
            </span>
          )}
        </span>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            isOpen
              ? 'rotate-180 text-[#111827]'
              : isDefaultState
                ? 'text-[#9CA3AF]'
                : 'text-[#4B5563]'
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
          className={`max-h-60 overflow-y-auto rounded-2xl border border-[#9CA3AF]/30 bg-white p-1.5 animate-in fade-in duration-150 ${
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
                className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2 text-left text-sm transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#EDEDED] text-[#111827] font-semibold'
                    : isFocused
                      ? 'bg-[#EDEDED]/55 text-[#111827] font-normal'
                      : 'text-[#1F2937] font-normal hover:bg-[#EDEDED]/55'
                }`}
              >
                <span className="truncate">{opt.label}</span>

                <span className="flex shrink-0 items-center gap-2">
                  {opt.badge && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        isSelected
                          ? 'bg-white text-[#111827]'
                          : 'bg-[#EDEDED] text-[#4B5563]'
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
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-[#111827]"
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
 * Barra de filtros directa de Movimientos (dentro de Finanzas y Pagos):
 * - Buscador WebKit >= 16px (`text-base`).
 * - Segmented Control para Tipo de Movimiento (Todos / Ingresos / Egresos / Transferencias).
 * - Dropdown Lists personalizados directamente visibles (Método de Pago, Cuenta o Caja, Estado Contable)
 *   con los 3 estados interactivos (Default, Clicked y Selected).
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

  const hayCualquierFiltroActivo =
    filtroTipo !== 'TODOS' ||
    filtroMetodo !== 'TODOS' ||
    filtroCuenta !== 'TODAS' ||
    filtroEstado !== 'TODOS' ||
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
      className="relative z-20 rounded-[24px] border border-[#9CA3AF]/30 bg-white p-3.5 sm:p-4 shadow-xs space-y-3"
    >
      {/* 1. Buscador Operativo (16px mínimo en móvil para evitar auto-zoom WebKit) */}
      <div className="relative w-full">
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
          className="w-full min-h-[46px] rounded-xl border border-[#9CA3AF]/45 bg-white pl-10 pr-9 py-2.5 text-base text-[#111827] placeholder-[#9CA3AF] transition-all focus:border-[#111827] focus:ring-3 focus:ring-[#111827]/10 focus:outline-none"
        />

        {filtroBusqueda.length > 0 && (
          <button
            type="button"
            onClick={() => onChangeBusqueda('')}
            aria-label="Limpiar búsqueda"
            className="ios-press-bounce absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-[#EDEDED] text-xs font-bold text-[#111827] hover:bg-[#9CA3AF]/35 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* 2. Segmented Control de Tipo (Todos / Ingresos / Egresos / Transferencias) */}
      <div
        role="radiogroup"
        aria-label="Filtrar movimientos por tipo"
        className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl bg-[#EDEDED] p-1 border border-[#9CA3AF]/20"
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
              className={`ios-press-bounce min-h-[42px] flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs sm:text-sm font-bold tracking-tight transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#4B5563] hover:text-[#111827] hover:bg-white/50'
              }`}
            >
              {seg.label}
            </button>
          );
        })}
      </div>

      {/* 3. Dropdown Lists Personalizados Directamente Visibles (Default / Clicked / Selected States) */}
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
          label="Estado del Registro"
          ariaLabel="Filtrar por estado del movimiento"
          value={filtroEstado}
          defaultValue="TODOS"
          options={OPCIONES_ESTADO}
          onChange={onChangeEstado}
        />
      </div>

      {/* 4. Pie de Conteo Tabular + Limpieza Rápida + Exportación CSV */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#9CA3AF]/15 pt-2.5 text-xs text-[#4B5563]">
        <div className="flex flex-wrap items-center gap-2 tabular-nums">
          <span>
            Mostrando <b className="text-[#111827]">{totalFiltrados}</b> de{' '}
            <b className="text-[#111827]">{totalMovimientos}</b> movimientos
          </span>

          {hayCualquierFiltroActivo && (
            <button
              type="button"
              onClick={limpiarTodosLosFiltros}
              className="rounded-full bg-[#EDEDED] px-2.5 py-0.5 text-[11px] font-bold text-[#1F2937] hover:bg-[#9CA3AF]/30 transition cursor-pointer"
            >
              Restablecer filtros
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onDescargarCsv}
          className="ios-press-bounce inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#9CA3AF]/35 bg-[#EDEDED]/60 px-3 py-1 text-xs font-bold text-[#111827] transition hover:bg-[#EDEDED] cursor-pointer"
        >
          <span aria-hidden="true">⬇</span>
          <span>Descargar CSV filtrado</span>
        </button>
      </div>
    </section>
  );
}
