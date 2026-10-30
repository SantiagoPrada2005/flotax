import type { VehiculoWizardData, WizardStepId } from './types';

export interface Step8RevisionProps {
  data: VehiculoWizardData;
  onEditPaso: (paso: WizardStepId) => void;
}

export default function Step8Revision({
  data,
  onEditPaso,
}: Step8RevisionProps) {
  const formatearCOP = (valor: number | '') => {
    if (valor === '') return '$ 0';
    return `$ ${Number(valor).toLocaleString('es-CO')}`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Encabezado Hero */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 08 · Confirmación Final
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          Todo listo. Revisemos tu vehículo
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[50ch]">
          Verifica los datos consolidados antes de registrar la unidad en el sistema de flota.
        </p>
      </div>

      {/* Bento Grid Minimalista de Revisión */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Tarjeta 1: Unidad e Identificación */}
        <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EDEDED] pb-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              01 · Identidad
            </span>
            <button
              type="button"
              onClick={() => onEditPaso(2)}
              className="font-mono text-xs font-bold text-[#111827] hover:underline cursor-pointer"
            >
              Editar
            </button>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-2xl font-bold text-[#111827] tracking-wider block">
              {data.placa || 'SIN PLACA'}
            </span>
            <p className="font-display font-bold text-lg text-[#111827]">
              {data.marca} {data.modelo}
            </p>
            <p className="text-xs text-[#4B5563]">
              Modelo {data.anio} · {data.categoriaEtiqueta || data.categoria}
            </p>
          </div>
        </div>

        {/* Tarjeta 2: Especificaciones Técnicas */}
        <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EDEDED] pb-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              02 · Mecánica
            </span>
            <button
              type="button"
              onClick={() => onEditPaso(4)}
              className="font-mono text-xs font-bold text-[#111827] hover:underline cursor-pointer"
            >
              Editar
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#4B5563]">Caja:</span>
              <span className="font-bold text-[#111827]">{data.transmision}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#4B5563]">Energía:</span>
              <span className="font-bold text-[#111827]">{data.combustible}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#4B5563]">Odómetro:</span>
              <span className="font-mono font-bold text-[#111827]">
                {Number(data.kilometraje || 0).toLocaleString('es-CO')} km
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#4B5563]">Capacidad:</span>
              <span className="font-bold text-[#111827]">
                {data.capacidadPasajeros} {data.capacidadPasajeros === 1 ? 'persona' : 'personas'}
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta 3: Tarifas de Alquiler */}
        <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EDEDED] pb-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              03 · Tarifas
            </span>
            <button
              type="button"
              onClick={() => onEditPaso(5)}
              className="font-mono text-xs font-bold text-[#111827] hover:underline cursor-pointer"
            >
              Editar
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <span className="font-mono text-[10px] uppercase text-[#4B5563] block">
                Canon por día
              </span>
              <span className="font-mono text-xl font-bold text-[#111827]">
                {formatearCOP(data.precioDia)} COP
              </span>
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase text-[#4B5563] block">
                Depósito en garantía
              </span>
              <span className="font-mono text-sm font-bold text-[#4B5563]">
                {formatearCOP(data.depositoGarantia)} COP
              </span>
            </div>
          </div>
        </div>

        {/* Tarjeta 4: Fotografía Principal (Span 2 cols on desktop if wide) */}
        <div className="md:col-span-2 rounded-[28px] border border-[#9CA3AF]/40 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EDEDED] pb-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              04 · Fotografía de Ficha
            </span>
            <button
              type="button"
              onClick={() => onEditPaso(6)}
              className="font-mono text-xs font-bold text-[#111827] hover:underline cursor-pointer"
            >
              Cambiar
            </button>
          </div>

          {data.imagenUrl ? (
            <div className="relative h-44 sm:h-52 w-full overflow-hidden rounded-2xl border border-[#9CA3AF]/30">
              <img
                src={data.imagenUrl}
                alt={`${data.marca} ${data.modelo}`}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-[#111827]/80 backdrop-blur-xs px-3 py-1 rounded-full text-white font-mono text-[11px] font-bold">
                {data.marca} {data.modelo}
              </div>
            </div>
          ) : (
            <div className="h-32 w-full flex items-center justify-center rounded-2xl bg-[#EDEDED]/40 border border-dashed border-[#9CA3AF]/40 text-[#4B5563] text-xs font-medium">
              Sin fotografía asignada
            </div>
          )}
        </div>

        {/* Tarjeta 5: Estado Inicial y Documentación */}
        <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EDEDED] pb-3">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              05 · Patio
            </span>
            <button
              type="button"
              onClick={() => onEditPaso(7)}
              className="font-mono text-xs font-bold text-[#111827] hover:underline cursor-pointer"
            >
              Editar
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs items-center">
              <span className="text-[#4B5563]">Estado:</span>
              <span className="font-mono font-bold text-xs bg-[#111827] text-white px-2.5 py-0.5 rounded-full">
                {data.estado}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#4B5563]">SOAT:</span>
              <span className="font-bold text-[#111827]">{data.soatVigente ? 'Vigente' : 'Pendiente'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#4B5563]">Propiedad:</span>
              <span className="font-bold text-[#111827]">{data.tarjetaPropiedad ? 'Conforme' : 'Pendiente'}</span>
            </div>
            {data.descripcion && (
              <p className="text-[11px] text-[#4B5563] pt-1 italic line-clamp-2">
                "{data.descripcion}"
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
