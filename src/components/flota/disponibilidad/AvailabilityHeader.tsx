import { navigate } from 'astro:transitions/client';
import type { EstadoVehiculo } from '@/db/schema';
import type { VehiculoItem } from '@/lib/flota/types';

export interface AvailabilityHeaderProps {
  vehiculo: Pick<
    VehiculoItem,
    'id' | 'placa' | 'marca' | 'modelo' | 'estado' | 'kilometraje'
  > & {
    anio?: number | undefined;
    categoriaEtiqueta?: string | undefined;
  };
  onBack?: () => void;
}

const ESTADOS_INFO: Record<
  EstadoVehiculo,
  { label: string; dotClass: string; badgeClass: string; ariaText: string }
> = {
  DISPONIBLE: {
    label: 'DISPONIBLE',
    dotClass: 'bg-status-success ring-2 ring-status-success/30',
    badgeClass: 'bg-[#EDEDED] text-[#111827] border border-[#9CA3AF]/50',
    ariaText: 'Vehículo disponible en patio',
  },
  RESERVADO: {
    label: 'EN ALQUILER',
    dotClass: 'bg-[#111827] ring-2 ring-[#111827]/25',
    badgeClass: 'bg-[#111827] text-[#EDEDED] border border-[#111827]',
    ariaText: 'Vehículo en contrato de alquiler activo',
  },
  MANTENIMIENTO: {
    label: 'EN TALLER',
    dotClass: 'bg-status-warning ring-2 ring-status-warning/40 animate-pulse',
    badgeClass: 'bg-[#EDEDED] text-[#111827] border border-status-warning/70',
    ariaText: 'Vehículo en mantenimiento o bloqueo técnico',
  },
  FUERA_SERVICIO: {
    label: 'FUERA DE SERVICIO',
    dotClass: 'bg-[#4B5563] ring-2 ring-[#4B5563]/30',
    badgeClass: 'bg-[#EDEDED] text-[#4B5563] border border-[#9CA3AF]/40',
    ariaText: 'Vehículo fuera de servicio',
  },
};

export default function AvailabilityHeader({ vehiculo, onBack }: AvailabilityHeaderProps) {
  const estadoInfo = ESTADOS_INFO[vehiculo.estado] ?? ESTADOS_INFO.DISPONIBLE;

  const manejarRegreso = () => {
    if (onBack) {
      onBack();
    } else {
      void navigate('/admin/flota');
    }
  };

  return (
    <header className="rounded-[28px] bg-white border border-[#9CA3AF]/30 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col gap-3.5">
        {/* Fila 1: Botón de Retorno + Badges de Odómetro y Estado */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={manejarRegreso}
            aria-label="Volver a Flota"
            className="ios-press-bounce min-h-[44px] min-w-[44px] inline-flex items-center gap-1.5 rounded-full bg-[#EDEDED] px-3.5 py-2 text-xs font-bold text-[#111827] hover:bg-[#9CA3AF]/20 border border-[#9CA3AF]/40 transition-transform active:scale-[0.96] cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Flota</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Odómetro */}
            <div
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#EDEDED]/70 border border-[#9CA3AF]/30 px-3 py-1 text-xs font-semibold text-[#4B5563]"
              title="Kilometraje actual del vehículo"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 text-[#4B5563] shrink-0"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m14 10-4 4" />
                <path d="M12 6v2" />
              </svg>
              <span className="font-mono tabular-nums text-[#111827] font-bold">
                {vehiculo.kilometraje.toLocaleString('es-CO')} km
              </span>
            </div>

            {/* Chip de Estado Operativo */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider shadow-2xs ${estadoInfo.badgeClass}`}
              role="status"
              aria-label={estadoInfo.ariaText}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${estadoInfo.dotClass}`} aria-hidden="true" />
              <span>{estadoInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Fila 2: Placa con formato de matrícula física + Marca y Modelo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[#EDEDED]">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Placa con formato físico de placa automotriz */}
            <span
              className="font-mono text-xs sm:text-sm font-bold tracking-widest text-[#111827] bg-[#EDEDED] px-3 py-1.5 rounded-lg border border-[#9CA3AF]/60 shadow-2xs select-all shrink-0 uppercase"
              title="Placa del vehículo"
            >
              {vehiculo.placa}
            </span>

            {/* Marca y Modelo */}
            <div className="min-w-0">
              <h1 className="font-display font-bold text-lg sm:text-xl text-[#111827] truncate leading-tight">
                {vehiculo.marca} {vehiculo.modelo}
                {vehiculo.anio ? (
                  <span className="ml-1.5 font-normal text-sm sm:text-base text-[#4B5563]">
                    {vehiculo.anio}
                  </span>
                ) : null}
              </h1>
            </div>
          </div>

          {/* Odómetro en móvil si la pantalla es muy pequeña */}
          <div className="flex sm:hidden items-center gap-1.5 text-xs text-[#4B5563] pt-0.5">
            <span className="text-[10px] uppercase font-bold text-[#9CA3AF]">Odómetro:</span>
            <span className="font-mono tabular-nums text-[#111827] font-bold">
              {vehiculo.kilometraje.toLocaleString('es-CO')} km
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
