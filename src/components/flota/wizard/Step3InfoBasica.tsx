import type { CategoriaVehiculo } from '@/lib/flota/types';
import type { VehiculoWizardData } from './types';

export interface Step3InfoBasicaProps {
  data: VehiculoWizardData;
  errors: Record<string, string>;
  onChange: (updates: Partial<VehiculoWizardData>) => void;
}

const DEFAULT_MARCAS: readonly string[] = [
  'BMW', 'Mercedes-Benz', 'Toyota', 'Mazda', 'Chevrolet', 'Audi', 'BYD', 'Hyundai',
];

const MARCAS_POR_CATEGORIA: Record<CategoriaVehiculo, readonly string[]> = {
  SEDAN: DEFAULT_MARCAS,
  SUV: ['Toyota', 'Mercedes-Benz', 'Mazda', 'BMW', 'Chevrolet', 'Volvo', 'Ford', 'Jeep'],
  MOTO: ['Yamaha', 'Honda', 'Kawasaki', 'BMW Motorrad', 'KTM', 'Suzuki', 'Royal Enfield'],
  PATINETA: ['Xiaomi', 'Segway-Ninebot', 'Dualtron', 'Volt', 'NIU', 'Inokim'],
  UTILITARIO: ['Renault', 'Mercedes-Benz', 'Chevrolet', 'Ford', 'Nissan', 'Volkswagen'],
};

export default function Step3InfoBasica({
  data,
  errors,
  onChange,
}: Step3InfoBasicaProps) {
  const marcasSugeridas = MARCAS_POR_CATEGORIA[data.categoria] ?? DEFAULT_MARCAS;
  const primeraMarca = marcasSugeridas[0] ?? 'Toyota';

  return (
    <div className="w-full space-y-6">
      {/* Encabezado Hero */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 03 · Fabricante y Modelo
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          Cuéntanos un poco más
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[50ch]">
          Especifica la marca del fabricante y la referencia o modelo comercial.
        </p>
      </div>

      {/* Contenedor Inmersivo de 2 Entradas */}
      <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        {/* Entrada 1: Marca / Fabricante */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-marca-hero"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              Marca / Fabricante <span className="text-rose-600">*</span>
            </label>
            <span className="font-mono text-[11px] text-[#4B5563]">
              Ej: {primeraMarca}
            </span>
          </div>

          <input
            id="input-marca-hero"
            type="text"
            autoFocus
            value={data.marca}
            onChange={(e) => onChange({ marca: e.target.value })}
            placeholder={`Ej: ${primeraMarca}`}
            className={`w-full rounded-2xl bg-[#EDEDED]/50 px-5 py-4 font-display text-xl sm:text-2xl font-bold text-[#111827] placeholder-[#9CA3AF] border transition-all ${errors.marca
                ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:outline-none'
                : 'border-transparent focus:border-[#111827] focus:bg-white focus:outline-none'
              }`}
          />

          {/* Chips de selección rápida de Marca con 1 toque */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-medium text-[#4B5563] block">
              Sugerencias populares para {data.categoriaEtiqueta || 'este segmento'}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {marcasSugeridas.map((m) => {
                const isSelected = data.marca.toLowerCase() === m.toLowerCase();
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChange({ marca: m })}
                    className={`ios-press-bounce rounded-full px-3 py-1 font-mono text-xs transition cursor-pointer border ${isSelected
                        ? 'bg-[#111827] text-white border-[#111827] font-bold shadow-xs'
                        : 'bg-[#EDEDED]/70 text-[#111827] border-[#9CA3AF]/40 hover:border-[#111827] hover:bg-white'
                      }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {errors.marca && (
            <p className="text-xs font-bold text-rose-600 mt-1 animate-fade-in">
              {errors.marca}
            </p>
          )}
        </div>

        {/* Entrada 2: Modelo / Línea */}
        <div className="space-y-2 border-t border-[#EDEDED] pt-5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="input-modelo-hero"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              Modelo / Referencia Comercial <span className="text-rose-600">*</span>
            </label>
            <span className="font-mono text-[11px] text-[#4B5563]">
              Línea o versión
            </span>
          </div>

          <input
            id="input-modelo-hero"
            type="text"
            value={data.modelo}
            onChange={(e) => onChange({ modelo: e.target.value })}
            placeholder="Ej: Serie 3 330i, Corolla Cross, MT-09, Pro 2..."
            className={`w-full rounded-2xl bg-[#EDEDED]/50 px-5 py-4 font-display text-xl sm:text-2xl font-bold text-[#111827] placeholder-[#9CA3AF] border transition-all ${errors.modelo
                ? 'border-rose-500 bg-rose-50/40 focus:border-rose-600 focus:outline-none'
                : 'border-transparent focus:border-[#111827] focus:bg-white focus:outline-none'
              }`}
          />

          {errors.modelo && (
            <p className="text-xs font-bold text-rose-600 mt-1 animate-fade-in">
              {errors.modelo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
