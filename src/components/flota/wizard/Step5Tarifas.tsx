import type { VehiculoWizardData } from './types';

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
  const formatearCOP = (valor: number | '') => {
    if (valor === '') return '$ 0';
    return `$ ${Number(valor).toLocaleString('es-CO')}`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Encabezado Hero */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 05 · Tarifas y Liquidación
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          ¿A cuánto quieres alquilarlo?
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[50ch]">
          Define el valor del canon diario y el depósito de garantía en custodia temporal.
        </p>
      </div>

      {/* Contenedor Inmersivo de 2 Entradas */}
      <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        {/* Entrada 1: Tarifa Diaria (Protagonista) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-precio-dia-hero"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              Tarifa Diaria (24 horas) <span className="text-rose-600">*</span>
            </label>
            <span className="font-mono text-[11px] font-bold text-[#111827]">
              {formatearCOP(data.precioDia)} COP / día
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-mono text-2xl font-bold text-[#9CA3AF]">
              $
            </span>
            <input
              id="input-precio-dia-hero"
              type="number"
              min={1000}
              step={5000}
              value={data.precioDia}
              onChange={(e) => onChange({ precioDia: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="180000"
              className={`w-full rounded-2xl bg-[#EDEDED]/50 pl-12 pr-5 py-4 font-mono text-2xl sm:text-3xl font-bold text-[#111827] placeholder-[#9CA3AF] border transition-all ${errors.precioDia
                  ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:outline-none'
                  : 'border-transparent focus:border-[#111827] focus:bg-white focus:outline-none'
                }`}
            />
          </div>

          {errors.precioDia && (
            <p className="text-xs font-bold text-rose-600 mt-1 animate-fade-in">
              {errors.precioDia}
            </p>
          )}
        </div>

        {/* Entrada 2: Depósito de Garantía (Fianza) */}
        <div className="space-y-3 border-t border-[#EDEDED] pt-5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-garantia-hero"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              Depósito de Garantía (Fianza) <span className="text-rose-600">*</span>
            </label>
            <span className="font-mono text-[11px] font-bold text-[#111827]">
              {formatearCOP(data.depositoGarantia)} COP
            </span>
          </div>

          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-mono text-2xl font-bold text-[#9CA3AF]">
              $
            </span>
            <input
              id="input-garantia-hero"
              type="number"
              min={0}
              step={50000}
              value={data.depositoGarantia}
              onChange={(e) => onChange({ depositoGarantia: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="500000"
              className={`w-full rounded-2xl bg-[#EDEDED]/50 pl-12 pr-5 py-4 font-mono text-2xl sm:text-3xl font-bold text-[#111827] placeholder-[#9CA3AF] border transition-all ${errors.depositoGarantia
                  ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:outline-none'
                  : 'border-transparent focus:border-[#111827] focus:bg-white focus:outline-none'
                }`}
            />
          </div>

          {errors.depositoGarantia && (
            <p className="text-xs font-bold text-rose-600 mt-1 animate-fade-in">
              {errors.depositoGarantia}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
