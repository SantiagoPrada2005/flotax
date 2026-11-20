import { useRef, type ChangeEvent } from 'react';
import type { VehiculoWizardData } from './types';
import {
  formatearNumeroConMiles,
  formatearValorMiles,
} from '@/lib/flota/numero';

export interface Step4CaracteristicasProps {
  data: VehiculoWizardData;
  errors: Record<string, string>;
  onChange: (updates: Partial<VehiculoWizardData>) => void;
}

const OPCIONES_TRANSMISION = ['Automática', 'Manual', 'Eléctrica'] as const;
const OPCIONES_COMBUSTIBLE = ['Gasolina', 'Diésel', 'Eléctrico', 'Híbrido'] as const;

export default function Step4Caracteristicas({
  data,
  errors,
  onChange,
}: Step4CaracteristicasProps) {
  const isPatineta = data.categoria === 'PATINETA';
  const kmInputRef = useRef<HTMLInputElement>(null);

  const handleKmChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { formatted, numericValue, cursor } = formatearNumeroConMiles(
      event.target.value,
      event.target.selectionStart
    );
    onChange({ kilometraje: numericValue });

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const input = kmInputRef.current;
        if (input && document.activeElement === input) {
          input.value = formatted;
          input.setSelectionRange(cursor, cursor);
        }
      });
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Encabezado Hero (sin texto descriptivo adicional) */}
      <div className="space-y-2">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] sm:text-xs dark:text-[#9CA3AF]">
          Paso 04 · Especificaciones Técnicas
        </span>
        <h1 className="font-display text-2xl leading-[1.12] font-bold tracking-tight text-[#111827] sm:text-3xl lg:text-4xl dark:text-[#EDEDED]">
          ¿Qué características tiene?
        </h1>
      </div>

      {/* Contenedor de Características */}
      <div className="space-y-6 rounded-[28px] border border-[#9CA3AF]/40 bg-white p-6 shadow-xs sm:p-8 dark:border-white/10 dark:bg-[#1F2937]">
        {/* Entrada 1: Tipo de caja */}
        {!isPatineta && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
                Tipo de caja <span className="text-rose-600 dark:text-rose-400">*</span>
              </span>
              {!data.transmision && (
                <span className="font-mono text-[11px] text-[#9CA3AF]">
                  Selecciona una opción
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {OPCIONES_TRANSMISION.map((t) => {
                const isSelected = data.transmision === t;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onChange({ transmision: t })}
                    className={`fx-press min-h-[44px] cursor-pointer rounded-2xl border px-2 py-3 text-center font-mono text-xs font-bold transition-colors duration-120 sm:text-sm ${
                      isSelected
                        ? 'border-[#111827] bg-[#111827] text-white shadow-xs dark:border-white dark:bg-white dark:text-[#111827]'
                        : 'border-[#9CA3AF]/40 bg-[#EDEDED]/50 text-[#111827] hover:border-[#111827] hover:bg-white dark:border-white/15 dark:bg-[#111827]/70 dark:text-[#EDEDED] dark:hover:border-white/40 dark:hover:bg-[#111827]'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            {errors.transmision && (
              <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                {errors.transmision}
              </p>
            )}
          </div>
        )}

        {/* Entrada 2: Combustible/Motor */}
        {!isPatineta && (
          <div className="space-y-2 border-t border-[#EDEDED] pt-5 dark:border-white/10">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
                Combustible/Motor <span className="text-rose-600 dark:text-rose-400">*</span>
              </span>
              {!data.combustible && (
                <span className="font-mono text-[11px] text-[#9CA3AF]">
                  Selecciona una opción
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OPCIONES_COMBUSTIBLE.map((c) => {
                const isSelected = data.combustible === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onChange({ combustible: c })}
                    className={`fx-press min-h-[44px] cursor-pointer rounded-2xl border px-2 py-3 text-center font-mono text-xs font-bold transition-colors duration-120 sm:text-sm ${
                      isSelected
                        ? 'border-[#111827] bg-[#111827] text-white shadow-xs dark:border-white dark:bg-white dark:text-[#111827]'
                        : 'border-[#9CA3AF]/40 bg-[#EDEDED]/50 text-[#111827] hover:border-[#111827] hover:bg-white dark:border-white/15 dark:bg-[#111827]/70 dark:text-[#EDEDED] dark:hover:border-white/40 dark:hover:bg-[#111827]'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            {errors.combustible && (
              <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                {errors.combustible}
              </p>
            )}
          </div>
        )}

        {/* Entrada 3: Kilómetros Acumulados con formato automático de miles */}
        <div
          className={`space-y-2 ${!isPatineta ? 'border-t border-[#EDEDED] pt-5 dark:border-white/10' : ''}`}
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-km-hero"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]"
            >
              Kilómetros Acumulados <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
          </div>

          <div className="relative">
            <input
              ref={kmInputRef}
              id="input-km-hero"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={formatearValorMiles(data.kilometraje)}
              onChange={handleKmChange}
              placeholder="Ej: 25.000"
              className={`w-full rounded-2xl border bg-[#EDEDED]/50 px-5 py-4 pr-14 font-mono text-xl font-bold text-[#111827] placeholder-[#9CA3AF] transition-colors duration-150 sm:text-2xl dark:bg-[#111827] dark:text-[#EDEDED] dark:placeholder-[#9CA3AF]/60 ${
                errors.kilometraje
                  ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 dark:border-rose-500 dark:bg-rose-950/20'
                  : 'border-transparent focus:border-[#111827] focus:bg-white dark:border-white/10 dark:focus:border-white dark:focus:bg-[#111827]'
              }`}
            />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-xs font-bold text-[#4B5563] dark:text-[#9CA3AF]">
              KM
            </span>
          </div>

          {errors.kilometraje && (
            <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
              {errors.kilometraje}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
