import { useMemo, useState } from 'react';
import { Tag } from 'lucide-react';
import type { VehiculoWizardData } from './types';
import { WIZARD_ICON_STROKE } from './wizard-icons';
import {
  SUGERENCIAS_VEHICULOS_POR_CATEGORIA,
  separarMarcaYModelo,
  unificarMarcaYModelo,
} from '@/lib/flota/marca-modelo';
import { normalizarTextoBusqueda } from '@/lib/geo/colombia';

export interface Step3InfoBasicaProps {
  data: VehiculoWizardData;
  errors: Record<string, string>;
  onChange: (updates: Partial<VehiculoWizardData>) => void;
}

export default function Step3InfoBasica({
  data,
  errors,
  onChange,
}: Step3InfoBasicaProps) {
  const [rawInput, setRawInput] = useState<string>(() =>
    unificarMarcaYModelo(data.marca, data.modelo)
  );

  const sugerenciasCategoria = SUGERENCIAS_VEHICULOS_POR_CATEGORIA[data.categoria];
  const primeraSugerencia = sugerenciasCategoria[0] ?? 'Toyota Corolla';

  const sugerenciasFiltradas = useMemo(() => {
    const q = normalizarTextoBusqueda(rawInput);
    if (!q) return sugerenciasCategoria;
    const matches = sugerenciasCategoria.filter((item) =>
      normalizarTextoBusqueda(item).includes(q)
    );
    return matches.length > 0 ? matches : sugerenciasCategoria;
  }, [rawInput, sugerenciasCategoria]);

  const handleUnifiedChange = (nextValue: string) => {
    setRawInput(nextValue);
    const { marca, modelo } = separarMarcaYModelo(nextValue);
    onChange({ marca, modelo });
  };

  const handleSelectSugerencia = (sugerencia: string) => {
    const yaSeleccionada =
      normalizarTextoBusqueda(rawInput) === normalizarTextoBusqueda(sugerencia);
    if (yaSeleccionada) {
      setRawInput('');
      onChange({ marca: '', modelo: '' });
      return;
    }
    setRawInput(sugerencia);
    const { marca, modelo } = separarMarcaYModelo(sugerencia);
    onChange({ marca, modelo });
  };

  const errorUnificado = errors.marca || errors.modelo;

  return (
    <div className="w-full space-y-6">
      {/* Encabezado Hero */}
      <div className="space-y-2">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] sm:text-xs dark:text-[#9CA3AF]">
          Paso 03 · Vehículo
        </span>
        <h1 className="font-display text-2xl leading-[1.12] font-bold tracking-tight text-[#111827] sm:text-3xl lg:text-4xl dark:text-[#EDEDED]">
          Cuéntanos un poco más
        </h1>
        <p className="max-w-[50ch] text-xs font-medium text-[#4B5563] sm:text-sm dark:text-[#9CA3AF]">
          Escribe la marca y el modelo del vehículo en un solo campo.
        </p>
      </div>

      {/* Contenedor Único de Marca y Modelo */}
      <div className="space-y-4 rounded-[28px] border border-[#9CA3AF]/40 bg-white p-6 shadow-xs sm:p-8 dark:border-white/10 dark:bg-[#1F2937]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-marca-modelo-hero"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]"
            >
              <Tag
                className="h-3.5 w-3.5 shrink-0 text-[#4B5563] dark:text-[#9CA3AF]"
                strokeWidth={WIZARD_ICON_STROKE}
                aria-hidden="true"
              />
              <span>
                Marca y modelo <span className="text-rose-600 dark:text-rose-400">*</span>
              </span>
            </label>
            <span className="font-mono text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
              Ej: {primeraSugerencia}
            </span>
          </div>

          <input
            id="input-marca-modelo-hero"
            type="text"
            autoFocus
            value={rawInput}
            onChange={(e) => handleUnifiedChange(e.target.value)}
            placeholder={`Ej: ${primeraSugerencia}`}
            className={`w-full rounded-2xl border bg-[#EDEDED]/50 px-5 py-4 font-display text-xl font-bold text-[#111827] placeholder-[#9CA3AF] transition-colors duration-150 sm:text-2xl dark:bg-[#111827] dark:text-[#EDEDED] dark:placeholder-[#9CA3AF]/60 ${
              errorUnificado
                ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 dark:border-rose-500 dark:bg-rose-950/20'
                : 'border-transparent focus:border-[#111827] focus:bg-white dark:border-white/10 dark:focus:border-white dark:focus:bg-[#111827]'
            }`}
          />

          {/* Sugerencias populares filtrables */}
          <div className="space-y-1.5 pt-1">
            <span className="block text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
              Sugerencias populares para {data.categoriaEtiqueta || 'este segmento'}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sugerenciasFiltradas.map((sugerencia) => {
                const isSelected =
                  normalizarTextoBusqueda(rawInput) ===
                  normalizarTextoBusqueda(sugerencia);
                return (
                  <button
                    key={sugerencia}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectSugerencia(sugerencia)}
                    className={`fx-press cursor-pointer rounded-full border px-3 py-1 font-mono text-xs transition-colors duration-120 ${
                      isSelected
                        ? 'border-[#111827] bg-[#111827] font-bold text-white shadow-xs dark:border-white dark:bg-white dark:text-[#111827]'
                        : 'border-[#9CA3AF]/40 bg-[#EDEDED]/70 text-[#111827] hover:border-[#111827] hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-[#EDEDED] dark:hover:border-white/40 dark:hover:bg-white/20 dark:hover:text-white'
                    }`}
                  >
                    {sugerencia}
                  </button>
                );
              })}
            </div>
          </div>

          {errorUnificado && (
            <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
              {errorUnificado}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
