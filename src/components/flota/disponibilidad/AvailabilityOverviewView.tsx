import { useState } from 'react';
import type { VehiculoItem, BloqueNoDisponible } from '@/lib/flota/types';
import type { MantenimientoVehiculoSelect } from '@/lib/mantenimientos/types';
import { formatearFechaCorta } from '@/lib/flota/disponibilidad';
import EditorialAvailabilityCalendar from '@/components/alquiler/EditorialAvailabilityCalendar';
import ActiveMaintenanceCard from './ActiveMaintenanceCard';

export interface AvailabilityOverviewViewProps {
  vehiculo: VehiculoItem;
  hoyISO: string;
  bloques?: BloqueNoDisponible[] | undefined;
  ordenActiva?: MantenimientoVehiculoSelect | null | undefined;
  ordenesHistorial?: MantenimientoVehiculoSelect[] | undefined;
  onProgramarMantenimiento: () => void;
  onRegistrarSalidaTaller?: ((orden: MantenimientoVehiculoSelect) => void) | undefined;
  fechaInicioSeleccionada?: string | null | undefined;
  fechaFinSeleccionada?: string | null | undefined;
  onCambiarRango?: ((inicio: string | null, fin: string | null) => void) | undefined;
}

const TIPOS_LABEL: Record<string, string> = {
  PREVENTIVO: 'Preventivo',
  CORRECTIVO_NOVEDAD: 'Correctivo / Novedad',
  ALISTAMIENTO: 'Alistamiento',
  BLOQUEO_OPERATIVO: 'Bloqueo Operativo',
};

export default function AvailabilityOverviewView({
  vehiculo,
  hoyISO,
  bloques,
  ordenActiva,
  ordenesHistorial = [],
  onProgramarMantenimiento,
  onRegistrarSalidaTaller,
  fechaInicioSeleccionada,
  fechaFinSeleccionada,
  onCambiarRango,
}: AvailabilityOverviewViewProps) {
  const [localInicio, setLocalInicio] = useState<string | null>(null);
  const [localFin, setLocalFin] = useState<string | null>(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  const fechaInicio = fechaInicioSeleccionada !== undefined ? fechaInicioSeleccionada : localInicio;
  const fechaFin = fechaFinSeleccionada !== undefined ? fechaFinSeleccionada : localFin;

  const manejarCambioRango = (inicio: string | null, fin: string | null) => {
    if (onCambiarRango) {
      onCambiarRango(inicio, fin);
    } else {
      setLocalInicio(inicio);
      setLocalFin(fin);
    }
  };

  // Detectar si hay una orden activa en taller
  const ordenTallerEfectiva =
    ordenActiva ??
    ordenesHistorial.find((o) => o.estado === 'EN_TALLER') ??
    null;

  // Órdenes programadas a futuro (no iniciadas aún)
  const ordenesProgramadas = ordenesHistorial.filter((o) => o.estado === 'PROGRAMADO');

  // Historial de órdenes concluidas o canceladas
  const ordenesCerradas = ordenesHistorial.filter(
    (o) => o.estado === 'COMPLETADO' || o.estado === 'CANCELADO'
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Alerta / Tarjeta de Orden Activa en Taller (si aplica) */}
      {ordenTallerEfectiva && (
        <ActiveMaintenanceCard
          orden={ordenTallerEfectiva}
          onRegistrarSalida={onRegistrarSalidaTaller}
        />
      )}

      {/* 2. Botón Destacado de Programación (Mínimo 44px de alto) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[#111827]">
            Calendario de Disponibilidad
          </h2>
          <p className="text-xs text-[#4B5563]">
            Vista de ocupación real en patio, reservas confirmadas y bloqueos técnicos.
          </p>
        </div>

        <button
          type="button"
          onClick={onProgramarMantenimiento}
          className="ios-press-bounce min-h-[48px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-xs sm:text-sm font-bold text-[#EDEDED] shadow-sm hover:bg-[#1F2937] active:scale-[0.98] transition cursor-pointer shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 text-[#EDEDED]"
            aria-hidden="true"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <span>Programar Mantenimiento / Bloqueo</span>
        </button>
      </div>

      {/* 3. Calendario Editorial Reutilizado */}
      <div className="rounded-[28px] overflow-hidden bg-white border border-[#9CA3AF]/30 shadow-xs">
        <EditorialAvailabilityCalendar
          vehiculo={vehiculo}
          hoyISO={hoyISO}
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          onChangeRango={manejarCambioRango}
          bloquesPrecalculados={bloques}
        />
      </div>

      {/* 4. Leyenda Visual Clara */}
      <div className="rounded-2xl bg-white border border-[#9CA3AF]/30 p-3 sm:p-4 shadow-2xs">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4B5563] mb-2">
          Leyenda de Disponibilidad
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="flex items-center gap-2.5 rounded-xl bg-[#EDEDED]/50 p-2.5 border border-[#9CA3AF]/20">
            <span className="h-3 w-3 rounded-full bg-status-success shrink-0 ring-2 ring-status-success/20" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111827]">Disponible</p>
              <p className="text-[10px] text-[#4B5563] truncate">Libre para alquiler</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-[#EDEDED]/50 p-2.5 border border-[#9CA3AF]/20">
            <span className="h-3 w-3 rounded-full bg-[#111827] shrink-0 ring-2 ring-[#111827]/25" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111827]">En Alquiler</p>
              <p className="text-[10px] text-[#4B5563] truncate">Reserva activa o contrato</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-[#EDEDED]/50 p-2.5 border border-[#9CA3AF]/20">
            <span className="h-3 w-3 rounded-full bg-status-warning shrink-0 ring-2 ring-status-warning/25 animate-pulse" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111827]">En Taller / Bloqueado</p>
              <p className="text-[10px] text-[#4B5563] truncate">Mantenimiento preventivo o correctivo</p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Próximos Mantenimientos Programados (si existen) */}
      {ordenesProgramadas.length > 0 && (
        <section
          aria-labelledby="titulo-ordenes-programadas"
          className="rounded-2xl bg-white border border-[#9CA3AF]/30 p-4 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3
              id="titulo-ordenes-programadas"
              className="font-display font-bold text-sm text-[#111827] flex items-center gap-2"
            >
              <span className="h-2 w-2 rounded-full bg-[#4B5563]" />
              <span>Mantenimientos Programados Próximos</span>
            </h3>
            <span className="font-mono text-[10px] font-bold text-[#4B5563] bg-[#EDEDED] px-2 py-0.5 rounded-full">
              {ordenesProgramadas.length} {ordenesProgramadas.length === 1 ? 'orden' : 'órdenes'}
            </span>
          </div>

          <div className="divide-y divide-[#EDEDED]">
            {ordenesProgramadas.map((ord) => (
              <div
                key={ord.id}
                className="py-2.5 first:pt-1 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase text-[#111827] bg-[#EDEDED] px-2 py-0.5 rounded">
                      {TIPOS_LABEL[ord.tipo] ?? ord.tipo}
                    </span>
                    <p className="font-bold text-xs text-[#111827]">{ord.etiqueta}</p>
                  </div>
                  {ord.tallerProveedor && (
                    <p className="text-[11px] text-[#4B5563] mt-0.5">
                      Taller: {ord.tallerProveedor}
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="font-mono text-xs font-bold text-[#111827] tabular-nums">
                    {formatearFechaCorta(ord.fechaInicio)} — {formatearFechaCorta(ord.fechaFin)}
                  </span>
                  <p className="font-mono text-[10px] text-[#9CA3AF] tabular-nums">
                    {ord.fechaInicio} al {ord.fechaFin}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Historial de Mantenimientos Cerrados (Colapsable) */}
      {ordenesCerradas.length > 0 && (
        <section className="rounded-2xl bg-white border border-[#9CA3AF]/30 p-3 sm:p-4 shadow-2xs">
          <button
            type="button"
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
            className="w-full flex items-center justify-between text-left cursor-pointer min-h-[40px]"
            aria-expanded={mostrarHistorial}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#4B5563]">📋</span>
              <span className="font-display font-bold text-xs sm:text-sm text-[#111827]">
                Historial Técnico ({ordenesCerradas.length}{' '}
                {ordenesCerradas.length === 1 ? 'intervención anterior' : 'intervenciones anteriores'})
              </span>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`h-4 w-4 text-[#4B5563] transition-transform duration-200 ${mostrarHistorial ? 'rotate-180' : ''
                }`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {mostrarHistorial && (
            <div className="mt-3 pt-3 border-t border-[#EDEDED] divide-y divide-[#EDEDED] max-h-60 overflow-y-auto">
              {ordenesCerradas.map((ord) => (
                <div
                  key={ord.id}
                  className="py-2 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${ord.estado === 'COMPLETADO'
                          ? 'bg-status-success/10 text-status-success border border-status-success/30'
                          : 'bg-[#EDEDED] text-[#4B5563]'
                          }`}
                      >
                        {ord.estado}
                      </span>
                      <span className="font-semibold text-[#111827]">{ord.etiqueta}</span>
                    </div>
                    {ord.tallerProveedor && (
                      <p className="text-[10px] text-[#4B5563]">{ord.tallerProveedor}</p>
                    )}
                  </div>
                  <div className="text-left sm:text-right font-mono text-[11px] text-[#4B5563]">
                    <span>
                      {ord.fechaInicio} al {ord.fechaFin}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
