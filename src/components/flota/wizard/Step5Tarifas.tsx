import { useRef, type ChangeEvent } from 'react';
import type { VehiculoWizardData } from './types';
import {
  formatearNumeroConMiles,
  formatearValorMiles,
} from '@/lib/flota/numero';

export interface Step5TarifasProps {
  data: VehiculoWizardData;
  errors: Record<string, string>;
  onChange: (updates: Partial<VehiculoWizardData>) => void;
}

export default function Step5Tarifas({
  data,
  errors,
  onChange,
}: Step5TarifasProps) {
  const precioInputRef = useRef<HTMLInputElement>(null);
  const garantiaInputRef = useRef<HTMLInputElement>(null);

  const formatearCOP = (valor: number | '') => {
    if (valor === '') return '$ 0';
    return `$ ${formatearValorMiles(valor)}`;
  };

  const handlePrecioChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { formatted, numericValue, cursor } = formatearNumeroConMiles(
      event.target.value,
      event.target.selectionStart
    );
    onChange({ precioDia: numericValue });
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const input = precioInputRef.current;
        if (input && document.activeElement === input) {
          input.value = formatted;
          input.setSelectionRange(cursor, cursor);
        }
      });
    }
  };

  const handleGarantiaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { formatted, numericValue, cursor } = formatearNumeroConMiles(
      event.target.value,
      event.target.selectionStart
    );
    onChange({ depositoGarantia: numericValue });
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const input = garantiaInputRef.current;
        if (input && document.activeElement === input) {
          input.value = formatted;
          input.setSelectionRange(cursor, cursor);
        }
      });
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Encabezado Hero */}
      <div className="space-y-2">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] sm:text-xs dark:text-[#9CA3AF]">
          Paso 05 · Tarifas y Liquidación
        </span>
        <h1 className="font-display text-2xl leading-[1.12] font-bold tracking-tight text-[#111827] sm:text-3xl lg:text-4xl dark:text-[#EDEDED]">
          ¿A cuánto quieres alquilarlo?
        </h1>
        <p className="max-w-[50ch] text-xs font-medium text-[#4B5563] sm:text-sm dark:text-[#9CA3AF]">
          Define el valor del canon diario y el depósito de garantía en custodia temporal.
        </p>
      </div>

      {/* Contenedor Inmersivo de 2 Entradas */}
      <div className="space-y-6 rounded-[28px] border border-[#9CA3AF]/40 bg-white p-6 shadow-xs sm:p-8 dark:border-white/10 dark:bg-[#1F2937]">
        {/* Entrada 1: Tarifa Diaria (Protagonista) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-precio-dia-hero"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]"
            >
              Tarifa Diaria (24 horas) <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <span className="font-mono text-[11px] font-bold text-[#111827] dark:text-[#EDEDED]">
              {formatearCOP(data.precioDia)} COP / día
            </span>
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 font-mono text-2xl font-bold text-[#9CA3AF]">
              $
            </span>
            <input
              ref={precioInputRef}
              id="input-precio-dia-hero"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={formatearValorMiles(data.precioDia)}
              onChange={handlePrecioChange}
              placeholder="180.000"
              className={`w-full rounded-2xl border bg-[#EDEDED]/50 py-4 pr-5 pl-12 font-mono text-2xl font-bold text-[#111827] placeholder-[#9CA3AF] transition-colors duration-150 sm:text-3xl dark:bg-[#111827] dark:text-[#EDEDED] dark:placeholder-[#9CA3AF]/60 ${
                errors.precioDia
                  ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 dark:border-rose-500 dark:bg-rose-950/20'
                  : 'border-transparent focus:border-[#111827] focus:bg-white dark:border-white/10 dark:focus:border-white dark:focus:bg-[#111827]'
              }`}
            />
          </div>

          {errors.precioDia && (
            <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
              {errors.precioDia}
            </p>
          )}
        </div>

        {/* Entrada 2: Depósito de Garantía (Fianza) */}
        <div className="space-y-3 border-t border-[#EDEDED] pt-5 dark:border-white/10">
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-garantia-hero"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]"
            >
              Depósito de Garantía (Fianza) <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <span className="font-mono text-[11px] font-bold text-[#111827] dark:text-[#EDEDED]">
              {formatearCOP(data.depositoGarantia)} COP
            </span>
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 font-mono text-2xl font-bold text-[#9CA3AF]">
              $
            </span>
            <input
              ref={garantiaInputRef}
              id="input-garantia-hero"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={formatearValorMiles(data.depositoGarantia)}
              onChange={handleGarantiaChange}
              placeholder="500.000"
              className={`w-full rounded-2xl border bg-[#EDEDED]/50 py-4 pr-5 pl-12 font-mono text-2xl font-bold text-[#111827] placeholder-[#9CA3AF] transition-colors duration-150 sm:text-3xl dark:bg-[#111827] dark:text-[#EDEDED] dark:placeholder-[#9CA3AF]/60 ${
                errors.depositoGarantia
                  ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 dark:border-rose-500 dark:bg-rose-950/20'
                  : 'border-transparent focus:border-[#111827] focus:bg-white dark:border-white/10 dark:focus:border-white dark:focus:bg-[#111827]'
              }`}
            />
          </div>

          {errors.depositoGarantia && (
            <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
              {errors.depositoGarantia}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
