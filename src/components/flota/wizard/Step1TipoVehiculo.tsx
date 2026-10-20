import type { CategoriaVehiculo } from '@/lib/flota/types';
import type { VehiculoWizardData } from './types';

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
  defaultTransmision: 'Automática' | 'Manual' | 'Eléctrica';
  defaultCombustible: 'Gasolina' | 'Diésel' | 'Eléctrico' | 'Híbrido';
  defaultPrecioDia: number;
  defaultGarantia: number;
  iconoSvg: string;
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
    iconoSvg: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2m0 0a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0m10 0a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0',
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
    iconoSvg: 'M3 14l2-6a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 6M3 14h18M5 18a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0m8 0a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0',
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
    iconoSvg: 'M5 16a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm12 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm-9-5h6l3 5m-9-5-2-3H7',
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
    iconoSvg: 'M6 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm8 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM8 18h8M9 5l3 9h4',
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
    iconoSvg: 'M1 3h15v13H1zM16 8h4l3 3v5h-7zM5 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm11 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z',
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
      transmision: op.id === 'PATINETA' ? 'Eléctrica' : data.transmision || op.defaultTransmision,
      combustible: op.id === 'PATINETA' ? 'Eléctrico' : data.combustible || op.defaultCombustible,
      precioDia: data.precioDia || op.defaultPrecioDia,
      depositoGarantia: data.depositoGarantia || op.defaultGarantia,
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Pregunta Hero Principal */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 01 · Segmento Operativo
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          ¿Qué vehículo vas a registrar?
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[50ch]">
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
                  ? 'bg-[#111827] text-white border-[#111827] shadow-xl'
                  : 'bg-white text-[#111827] border-[#9CA3AF]/40 hover:border-[#111827] shadow-xs'
                }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all ${isSelected
                    ? 'bg-white text-[#111827] border-white'
                    : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/30'
                  }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d={op.iconoSvg} />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display font-bold text-base sm:text-lg leading-snug truncate">
                    {op.etiqueta}
                  </h3>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${isSelected
                        ? 'bg-white text-[#111827]'
                        : 'border border-[#9CA3AF]/60 text-transparent'
                      }`}
                  >
                    ✓
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 leading-relaxed ${isSelected ? 'text-gray-300' : 'text-[#4B5563]'
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
