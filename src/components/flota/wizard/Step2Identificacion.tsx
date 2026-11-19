import { useRef, type ChangeEvent } from 'react';
import { Check } from 'lucide-react';
import type { VehiculoWizardData } from './types';
import { WheelPicker } from '@/components/ui/WheelPicker';
import { formatearPlacaVehiculo } from '@/lib/flota/placa';

const ANIOS_MODELO: readonly number[] = Array.from(
  { length: 2035 - 1990 + 1 },
  (_, index) => 1990 + index
);

export interface Step2IdentificacionProps {
  data: VehiculoWizardData;
  errors: Record<string, string>;
  onChange: (updates: Partial<VehiculoWizardData>) => void;
}

export default function Step2Identificacion({
  data,
  errors,
  onChange,
}: Step2IdentificacionProps) {
  const isPatineta = data.categoria === 'PATINETA';
  const placaInputRef = useRef<HTMLInputElement>(null);

  const handlePlacaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (isPatineta) {
      const limpia = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
      onChange({ placa: limpia });
      return;
    }

    const cursorPos = event.target.selectionStart;
    const { value: formateada, cursor } = formatearPlacaVehiculo(
      raw,
      data.placa,
      cursorPos
    );
    onChange({ placa: formateada });

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const input = placaInputRef.current;
        if (input && document.activeElement === input) {
          input.setSelectionRange(cursor, cursor);
        }
      });
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Pregunta Hero Principal */}
      <div className="space-y-2">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] sm:text-xs dark:text-[#9CA3AF]">
          Paso 02 · Identificación Legal
        </span>
        <h1 className="font-display text-2xl leading-[1.12] font-bold tracking-tight text-[#111827] sm:text-3xl lg:text-4xl dark:text-[#EDEDED]">
          Empecemos por identificarlo
        </h1>
        <p className="max-w-[50ch] text-xs font-medium text-[#4B5563] sm:text-sm dark:text-[#9CA3AF]">
          Ingresa la placa física de circulación o matrícula y el año del modelo.
        </p>
      </div>

      {/* Contenedor Inmersivo de 2 Entradas */}
      <div className="space-y-6 rounded-[28px] border border-[#9CA3AF]/40 bg-white p-6 shadow-xs sm:p-8 dark:border-white/10 dark:bg-[#1F2937]">
        {/* Entrada 1: Placa (Protagonista) */}
        <div className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-placa-hero"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]"
            >
              Placa <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <span className="font-mono text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
              {isPatineta ? 'Identificador Serial / QR' : ''}
            </span>
          </div>

          <div className="relative">
            <input
              ref={placaInputRef}
              id="input-placa-hero"
              type="text"
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={isPatineta ? 10 : 7}
              value={data.placa}
              onChange={handlePlacaChange}
              placeholder={isPatineta ? 'VOLT-001' : 'ABC-123'}
              className={`w-full rounded-2xl border bg-[#EDEDED]/50 px-5 py-4 font-mono text-2xl font-bold tracking-wider text-[#111827] uppercase placeholder-[#9CA3AF] transition-colors duration-150 sm:text-3xl dark:bg-[#111827] dark:text-[#EDEDED] dark:placeholder-[#9CA3AF]/60 ${errors.placa
                ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 dark:border-rose-500 dark:bg-rose-950/20'
                : 'border-transparent focus:border-[#111827] focus:bg-white dark:border-white/10 dark:focus:border-white dark:focus:bg-[#111827]'
                }`}
            />
            {data.placa.length >= 3 && (
              <Check
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-4 h-4 w-4 -translate-y-1/2 stroke-[2.5] text-emerald-600 dark:text-emerald-400"
              />
            )}
          </div>

          {errors.placa && (
            <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
              {errors.placa}
            </p>
          )}
        </div>

        {/* Entrada 2: Año del Modelo (Wheel Picker vertical estilo iOS) */}
        <div className="space-y-3 border-t border-[#EDEDED] pt-5 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
              Año del Modelo <span className="text-rose-600 dark:text-rose-400">*</span>
            </span>
            <span className="font-mono text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
              1990 — 2035
            </span>
          </div>

          <WheelPicker
            items={ANIOS_MODELO}
            value={Number(data.anio) || 2024}
            onChange={(anio) => onChange({ anio })}
            ariaLabel="Año del modelo"
          />

          {errors.anio && (
            <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
              {errors.anio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
