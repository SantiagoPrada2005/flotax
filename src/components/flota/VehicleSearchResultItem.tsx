import type { VehiculoItem } from '@/lib/flota/types';

export interface VehicleSearchResultItemProps {
  vehiculo: VehiculoItem;
  onSelect?: (() => void) | undefined;
}

function getCategoriaIcon(categoria: VehiculoItem['categoria']) {
  switch (categoria) {
    case 'MOTO':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-[#4B5563]">
          <circle cx="18.5" cy="17.5" r="3.5" />
          <circle cx="5.5" cy="17.5" r="3.5" />
          <circle cx="15" cy="5" r="1" />
          <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
        </svg>
      );
    case 'PATINETA':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-[#4B5563]">
          <circle cx="6" cy="19" r="2" />
          <circle cx="18" cy="19" r="2" />
          <path d="M6 19h12" />
          <path d="M9 19V5" />
          <path d="M7 5h4" />
        </svg>
      );
    case 'UTILITARIO':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-[#4B5563]">
          <rect x="1" y="3" width="15" height="13" rx="2" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-[#4B5563]">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      );
  }
}

export default function VehicleSearchResultItem({
  vehiculo,
  onSelect,
}: VehicleSearchResultItemProps) {
  const isDisponible = vehiculo.estado === 'DISPONIBLE';

  const formatPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(precio);
  };

  return (
    <a
      href={`/vehiculos/${vehiculo.id}`}
      onClick={onSelect}
      className="group ios-press-bounce flex items-center justify-between gap-3 rounded-2xl border border-[#9CA3AF]/30 bg-white p-3.5 shadow-xs transition hover:border-[#4B5563]/60 hover:shadow-sm"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Thumbnail con Foto de Estudio de Vehículo */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EDEDED] border border-[#9CA3AF]/30 overflow-hidden transition group-hover:scale-105">
          {vehiculo.imagenUrl ? (
            <img src={vehiculo.imagenUrl} alt="" className="h-full w-full object-contain p-0.5" />
          ) : (
            getCategoriaIcon(vehiculo.categoria)
          )}
        </div>

        {/* Información del Vehículo */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate font-display text-sm font-bold text-[#111827]">
              {vehiculo.marca} {vehiculo.modelo}
            </h4>
            <span className="shrink-0 font-mono text-[10px] text-[#4B5563]">
              {vehiculo.anio}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#4B5563]">
            <span className="font-mono font-semibold uppercase tracking-wider text-[#111827] bg-[#EDEDED] px-1.5 py-0.5 rounded-sm">
              {vehiculo.placa}
            </span>
            <span>·</span>
            <span>{vehiculo.categoriaEtiqueta}</span>
            <span>·</span>
            <span>{vehiculo.transmision}</span>
          </div>
        </div>
      </div>

      {/* Precio y Disponibilidad */}
      <div className="flex flex-col items-end shrink-0 pl-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isDisponible ? 'bg-emerald-600' : 'bg-amber-500'
            }`}
          />
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isDisponible ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {isDisponible ? 'Disponible' : 'Reservado'}
          </span>
        </div>

        <p className="mt-1 font-display text-sm font-extrabold text-[#111827]">
          {formatPrecio(vehiculo.precioDia)}
          <span className="text-[10px] font-normal text-[#4B5563]"> /día</span>
        </p>
      </div>
    </a>
  );
}
