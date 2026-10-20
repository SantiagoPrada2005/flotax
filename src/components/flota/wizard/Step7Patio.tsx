import type { EstadoVehiculo } from '@/lib/flota/types';
import type { VehiculoWizardData } from './types';

export interface Step7PatioProps {
  data: VehiculoWizardData;
  onChange: (updates: Partial<VehiculoWizardData>) => void;
}

const ESTADOS_PATIO: { id: EstadoVehiculo; etiqueta: string; desc: string }[] = [
  { id: 'DISPONIBLE', etiqueta: 'Disponible', desc: 'Listo en patio para asignación inmediata a clientes.' },
  { id: 'RESERVADO', etiqueta: 'Reservado', desc: 'Asignado previamente a una reserva programada.' },
  { id: 'MANTENIMIENTO', etiqueta: 'En Mantenimiento', desc: 'En alistamiento mecánico, lavado o peritaje técnico.' },
];

export default function Step7Patio({
  data,
  onChange,
}: Step7PatioProps) {
  return (
    <div className="w-full space-y-6">
      {/* Encabezado Hero */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 07 · Documentación y Patio
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          Prepara su documentación
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[50ch]">
          Verifica los requisitos documentales y define el estado operativo inicial en el patio.
        </p>
      </div>

      {/* Contenedor Inmersivo de Máximo 3 Entradas */}
      <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        {/* Entrada 1: Estado Operativo Inicial */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]">
              Estado Operativo en Patio
            </label>
            <span className="font-mono text-[11px] text-[#4B5563]">
              Disponibilidad inmediata
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ESTADOS_PATIO.map((item) => {
              const isSelected = data.estado === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ estado: item.id })}
                  className={`ios-press-bounce rounded-2xl p-4 border text-left transition cursor-pointer flex flex-col justify-between ${isSelected
                      ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                      : 'bg-[#EDEDED]/50 text-[#111827] border-[#9CA3AF]/40 hover:bg-white hover:border-[#111827]'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-sm">
                      {item.etiqueta}
                    </span>
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center text-[10px] font-bold ${isSelected
                          ? 'border-white bg-white text-[#111827]'
                          : 'border-[#9CA3AF]'
                        }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-2 leading-relaxed ${isSelected ? 'text-gray-300' : 'text-[#4B5563]'
                      }`}
                  >
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Entrada 2: Cumplimiento Documental */}
        <div className="space-y-2 border-t border-[#EDEDED] pt-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]">
              Requisitos Documentales
            </span>
            <span className="font-mono text-[11px] text-[#4B5563]">
              Checklist legal de entrega
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { key: 'soatVigente', label: 'SOAT Vigente y Registrado' },
              { key: 'tarjetaPropiedad', label: 'Tarjeta de Propiedad Original' },
              { key: 'tecnicoMecanica', label: 'Revisión Técnico-Mecánica al día' },
              { key: 'kitCarretera', label: 'Kit de Carretera y Llave' },
            ].map((doc) => {
              const active = Boolean(data[doc.key as keyof VehiculoWizardData]);
              return (
                <button
                  key={doc.key}
                  type="button"
                  onClick={() => onChange({ [doc.key]: !active } as Partial<VehiculoWizardData>)}
                  className={`ios-press-bounce rounded-2xl px-4 py-3 border text-left transition flex items-center justify-between cursor-pointer ${active
                      ? 'bg-white border-[#111827] text-[#111827] shadow-xs'
                      : 'bg-[#EDEDED]/40 border-[#9CA3AF]/30 text-[#4B5563]'
                    }`}
                >
                  <span className="font-mono text-xs font-semibold">
                    {doc.label}
                  </span>
                  <span
                    className={`h-5 w-5 rounded-lg border flex items-center justify-center text-xs font-bold transition ${active
                        ? 'bg-[#111827] text-white border-[#111827]'
                        : 'border-[#9CA3AF]/60 bg-white'
                      }`}
                  >
                    {active ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Entrada 3: Observaciones Periciales */}
        <div className="space-y-2 border-t border-[#EDEDED] pt-5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="textarea-descripcion-patio"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              Observaciones de Entrega
            </label>
            <span className="font-mono text-[11px] text-[#4B5563]">
              Opcional
            </span>
          </div>

          <textarea
            id="textarea-descripcion-patio"
            rows={2}
            value={data.descripcion}
            onChange={(e) => onChange({ descripcion: e.target.value })}
            placeholder="Detalles sobre accesorios, estado cosmético, o especificaciones especiales de patio..."
            className="w-full rounded-2xl bg-[#EDEDED]/50 px-4 py-3 font-sans text-sm text-[#111827] placeholder-[#9CA3AF] border border-transparent focus:border-[#111827] focus:bg-white focus:outline-none transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
}
