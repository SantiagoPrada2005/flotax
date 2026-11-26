import { Check } from 'lucide-react';
import type {
  CategoriaVehiculo,
  TransmisionVehiculo,
  CombustibleVehiculo,
} from '@/lib/flota/types';
import type { VehiculoWizardData } from './types';
import { VehicleCategoryIcon, WIZARD_ICON_STROKE } from './wizard-icons';

export interface Step1TipoVehiculoProps {
  data: VehiculoWizardData;
  onChange: (updates: Partial<VehiculoWizardData>) => void;
}

interface CategoriaCardOption {
  id: CategoriaVehiculo;
  etiqueta: string;
  subtitulo: string;
  marcasSugeridas: string[];
  defaultPasajeros: number;
  defaultTransmision: TransmisionVehiculo;
  defaultCombustible: CombustibleVehiculo;
  defaultPrecioDia: number;
  defaultGarantia: number;
}

const OPCIONES_CATEGORIA: CategoriaCardOption[] = [
  {
    id: 'SEDAN',
    etiqueta: 'Automóvil / Sedán',
    subtitulo: 'Turismo, confort urbano y viajes ejecutivos.',
    marcasSugeridas: ['BMW', 'Mercedes-Benz', 'Toyota', 'Mazda', 'Chevrolet', 'Audi', 'BYD'],
    defaultPasajeros: 5,
    defaultTransmision: 'Automática',
    defaultCombustible: 'Gasolina',
    defaultPrecioDia: 180000,
    defaultGarantia: 500000,
  },
  {
    id: 'SUV',
    etiqueta: 'Camioneta / SUV',
    subtitulo: 'Vehículo familiar, crossover o todo terreno.',
    marcasSugeridas: ['Mercedes-Benz', 'Mazda', 'Toyota', 'BMW', 'Chevrolet', 'Volvo', 'Ford'],
    defaultPasajeros: 5,
    defaultTransmision: 'Automática',
    defaultCombustible: 'Gasolina',
    defaultPrecioDia: 250000,
    defaultGarantia: 800000,
  },
  {
    id: 'MOTO',
    etiqueta: 'Motocicleta',
    subtitulo: 'Movilidad ágil de dos ruedas para la ciudad.',
    marcasSugeridas: ['Yamaha', 'Honda', 'Kawasaki', 'BMW Motorrad', 'KTM', 'Suzuki'],
    defaultPasajeros: 2,
    defaultTransmision: 'Manual',
    defaultCombustible: 'Gasolina',
    defaultPrecioDia: 85000,
    defaultGarantia: 400000,
  },
  {
    id: 'PATINETA',
    etiqueta: 'Monopatín / Patineta',
    subtitulo: 'Micromovilidad personal 100% eléctrica.',
    marcasSugeridas: ['Xiaomi', 'Segway-Ninebot', 'Dualtron', 'Volt', 'NIU'],
    defaultPasajeros: 1,
    defaultTransmision: 'Eléctrica',
    defaultCombustible: 'Eléctrico',
    defaultPrecioDia: 45000,
    defaultGarantia: 200000,
  },
  {
    id: 'UTILITARIO',
    etiqueta: 'Utilitario / Van',
    subtitulo: 'Carga ligera, transporte operativo o patio.',
    marcasSugeridas: ['Renault', 'Mercedes-Benz', 'Chevrolet', 'Ford', 'Nissan'],
    defaultPasajeros: 3,
    defaultTransmision: 'Manual',
    defaultCombustible: 'Diésel',
    defaultPrecioDia: 220000,
    defaultGarantia: 700000,
  },
];

export default function Step1TipoVehiculo({
  data,
  onChange,
}: Step1TipoVehiculoProps) {
  const handleSeleccionar = (op: CategoriaCardOption) => {
    onChange({
      categoria: op.id,
      categoriaEtiqueta: op.etiqueta,
      capacidadPasajeros: op.id === 'PATINETA' ? 1 : data.capacidadPasajeros || op.defaultPasajeros,
      transmision: op.id === 'PATINETA' ? 'Eléctrica' : data.transmision,
      combustible: op.id === 'PATINETA' ? 'Eléctrico' : data.combustible,
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Pregunta Hero Principal */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block">
          Paso 01 · Segmento Operativo
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] dark:text-[#EDEDED] leading-[1.12]">
          ¿Qué vehículo vas a registrar?
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] dark:text-[#9CA3AF] font-medium max-w-[50ch]">
          Selecciona el segmento de la unidad para adaptar automáticamente los requisitos y especificaciones.
        </p>
      </div>

      {/* Selector Amplio de 1 Entrada (Opciones Inmersivas) */}
      <div
        role="radiogroup"
        aria-label="Tipo de vehículo a registrar"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {OPCIONES_CATEGORIA.map((op) => {
          const isSelected = data.categoria === op.id;

          return (
            <button
              key={op.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSeleccionar(op)}
              className={`ios-press-bounce text-left rounded-[26px] p-5 sm:p-6 border transition-all cursor-pointer flex items-start gap-4 ${isSelected
                  ? 'bg-[#111827] text-white border-[#111827] shadow-xl dark:bg-white dark:text-[#111827] dark:border-white'
                  : 'bg-white text-[#111827] border-[#9CA3AF]/40 hover:border-[#111827] shadow-xs dark:bg-[#1F2937] dark:text-[#EDEDED] dark:border-white/10 dark:hover:border-white/30 dark:hover:bg-[#1F2937]/80'
                }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all ${isSelected
                    ? 'bg-white text-[#111827] border-white dark:bg-[#111827] dark:text-white dark:border-[#111827]'
                    : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/30 dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15'
                  }`}
              >
                <VehicleCategoryIcon
                  categoria={op.id}
                  className="h-[22px] w-[22px]"
                  strokeWidth={WIZARD_ICON_STROKE}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-base sm:text-lg leading-snug truncate">
                    {op.etiqueta}
                  </h3>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${isSelected
                        ? 'bg-white text-[#111827] dark:bg-[#111827] dark:text-white'
                        : 'border border-[#9CA3AF]/60 text-transparent dark:border-white/30'
                      }`}
                  >
                    {isSelected && <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />}
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 leading-relaxed ${isSelected ? 'text-gray-300 dark:text-gray-600' : 'text-[#4B5563] dark:text-[#9CA3AF]'
                    }`}
                >
                  {op.subtitulo}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
