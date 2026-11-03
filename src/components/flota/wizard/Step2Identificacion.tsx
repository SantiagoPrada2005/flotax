import type { VehiculoWizardData } from './types';

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

  const handlePlacaChange = (val: string) => {
    const limpia = val.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10);
    onChange({ placa: limpia });
  };

  return (
    <div className="w-full space-y-6">
      {/* Pregunta Hero Principal */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 02 · Identificación Legal
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          Empecemos por identificarlo
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[50ch]">
          Ingresa la placa física de circulación o matrícula pericial y el año del modelo.
        </p>
      </div>

      {/* Contenedor Inmersivo de 2 Entradas */}
      <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        {/* Entrada 1: Placa (Protagonista) */}
        <div className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-placa-hero"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              Placa / Matrícula <span className="text-rose-600">*</span>
            </label>
            <span className="font-mono text-[11px] text-[#4B5563]">
              {isPatineta ? 'Identificador Serial / QR' : '3 letras - 3 números'}
            </span>
          </div>

          <div className="relative">
            <input
              id="input-placa-hero"
              type="text"
              autoFocus
              value={data.placa}
              onChange={(e) => handlePlacaChange(e.target.value)}
              placeholder={isPatineta ? 'VOLT-001' : 'ABC-123'}
              className={`w-full rounded-2xl bg-[#EDEDED]/50 px-5 py-4 font-mono text-2xl sm:text-3xl font-bold text-[#111827] placeholder-[#9CA3AF] border transition-all uppercase tracking-wider ${errors.placa
                  ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:outline-none'
                  : 'border-transparent focus:border-[#111827] focus:bg-white focus:outline-none'
                }`}
            />
            {data.placa.length >= 3 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">
                ✓
              </span>
            )}
          </div>

          {errors.placa && (
            <p className="text-xs font-bold text-rose-600 mt-1 animate-fade-in">
              {errors.placa}
            </p>
          )}
        </div>

        {/* Entrada 2: Año del Modelo */}
        <div className="space-y-2 border-t border-[#EDEDED] pt-5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-anio-hero"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              Año del Modelo <span className="text-rose-600">*</span>
            </label>
            <span className="font-mono text-[11px] text-[#4B5563]">
              1990 — 2035
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onChange({ anio: Math.max(1990, Number(data.anio || 2024) - 1) })}
              className="ios-press-bounce h-12 w-12 shrink-0 rounded-2xl border border-[#9CA3AF]/40 bg-white font-mono text-lg font-bold text-[#111827] hover:bg-[#EDEDED] transition flex items-center justify-center cursor-pointer shadow-xs"
            >
              −
            </button>
            <input
              id="input-anio-hero"
              type="number"
              min={1990}
              max={2035}
              value={data.anio}
              onChange={(e) => onChange({ anio: Number(e.target.value) || 2024 })}
              className={`flex-1 rounded-2xl bg-[#EDEDED]/50 px-4 py-3.5 font-mono text-lg font-bold text-[#111827] text-center border transition-all ${errors.anio
                  ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:outline-none'
                  : 'border-transparent focus:border-[#111827] focus:bg-white focus:outline-none'
                }`}
            />
            <button
              type="button"
              onClick={() => onChange({ anio: Math.min(2035, Number(data.anio || 2024) + 1) })}
              className="ios-press-bounce h-12 w-12 shrink-0 rounded-2xl border border-[#9CA3AF]/40 bg-white font-mono text-lg font-bold text-[#111827] hover:bg-[#EDEDED] transition flex items-center justify-center cursor-pointer shadow-xs"
            >
              +
            </button>
          </div>

          {errors.anio && (
            <p className="text-xs font-bold text-rose-600 mt-1 animate-fade-in">
              {errors.anio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
