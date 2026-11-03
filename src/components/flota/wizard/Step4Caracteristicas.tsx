import type { VehiculoWizardData } from './types';

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

  return (
    <div className="w-full space-y-6">
      {/* Encabezado Hero */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 04 · Especificaciones Técnicas
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          ¿Qué características tiene?
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[50ch]">
          Configura la propulsión mecánica, el odómetro de patio y la capacidad de la unidad.
        </p>
      </div>

      {/* Contenedor Inmersivo de Máximo 4 Entradas */}
      <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        {/* Entrada 1: Transmisión */}
        {!isPatineta && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]">
                Transmisión
              </label>
              <span className="font-mono text-[11px] text-[#4B5563]">
                Tipo de caja
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {OPCIONES_TRANSMISION.map((t) => {
                const isSelected = data.transmision === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChange({ transmision: t })}
                    className={`ios-press-bounce rounded-2xl py-3 px-2 font-mono text-xs sm:text-sm font-bold border transition text-center cursor-pointer ${isSelected
                        ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                        : 'bg-[#EDEDED]/50 text-[#111827] border-[#9CA3AF]/40 hover:bg-white hover:border-[#111827]'
                      }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Entrada 2: Combustible / Energía */}
        {!isPatineta && (
          <div className="space-y-2 border-t border-[#EDEDED] pt-5">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]">
                Fuente de Energía
              </label>
              <span className="font-mono text-[11px] text-[#4B5563]">
                Combustible / Motor
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OPCIONES_COMBUSTIBLE.map((c) => {
                const isSelected = data.combustible === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onChange({ combustible: c })}
                    className={`ios-press-bounce rounded-2xl py-3 px-2 font-mono text-xs sm:text-sm font-bold border transition text-center cursor-pointer ${isSelected
                        ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                        : 'bg-[#EDEDED]/50 text-[#111827] border-[#9CA3AF]/40 hover:bg-white hover:border-[#111827]'
                      }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Entrada 3: Odómetro actual de patio */}
        <div className={`space-y-2 ${!isPatineta ? 'border-t border-[#EDEDED] pt-5' : ''}`}>
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-km-hero"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              Odómetro Inicial <span className="text-rose-600">*</span>
            </label>
            <span className="font-mono text-[11px] text-[#4B5563]">
              Kilómetros acumulados
            </span>
          </div>

          <div className="relative">
            <input
              id="input-km-hero"
              type="number"
              min={0}
              value={data.kilometraje}
              onChange={(e) => onChange({ kilometraje: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              className={`w-full rounded-2xl bg-[#EDEDED]/50 px-5 py-4 font-mono text-xl sm:text-2xl font-bold text-[#111827] placeholder-[#9CA3AF] border transition-all ${errors.kilometraje
                  ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:outline-none'
                  : 'border-transparent focus:border-[#111827] focus:bg-white focus:outline-none'
                }`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-[#4B5563]">
              KM
            </span>
          </div>

          {errors.kilometraje && (
            <p className="text-xs font-bold text-rose-600 mt-1 animate-fade-in">
              {errors.kilometraje}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
