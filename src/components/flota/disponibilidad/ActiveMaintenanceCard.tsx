import type { MantenimientoVehiculoSelect } from '@/lib/mantenimientos/types';
import { formatearFechaCorta } from '@/lib/flota/disponibilidad';

export interface ActiveMaintenanceCardProps {
  orden: MantenimientoVehiculoSelect;
  onRegistrarSalida?: ((orden: MantenimientoVehiculoSelect) => void) | undefined;
  className?: string | undefined;
}

const TIPOS_LABEL: Record<string, string> = {
  PREVENTIVO: 'Mantenimiento Preventivo',
  CORRECTIVO_NOVEDAD: 'Correctivo / Novedad',
  ALISTAMIENTO: 'Alistamiento de Patio',
  BLOQUEO_OPERATIVO: 'Bloqueo Operativo',
};

const formatearMonedaCOP = (valor: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
};

export default function ActiveMaintenanceCard({
  orden,
  onRegistrarSalida,
  className = '',
}: ActiveMaintenanceCardProps) {
  const tipoLabel = TIPOS_LABEL[orden.tipo] ?? orden.tipo;
  const taller = orden.tallerProveedor?.trim() || 'Taller de patio interno';
  const descripcion = orden.descripcion?.trim() || 'Sin observaciones técnicas adicionales.';

  return (
    <article
      aria-label="Orden técnica activa en taller"
      className={`relative overflow-hidden rounded-[26px] bg-white border-2 border-[#f59e0b]/55 p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-md ${className}`}
    >
      {/* Indicador de acento superior sutil */}
      <div className="absolute top-0 inset-x-0 h-1 bg-[#f59e0b]" aria-hidden="true" />

      {/* Cabecera de la orden */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-[#EDEDED] border border-[#f59e0b]/60 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#111827]"
            role="status"
          >
            <span className="h-2 w-2 rounded-full bg-status-warning animate-pulse ring-2 ring-status-warning/30" />
            <span>En Taller</span>
          </span>

          <span className="font-mono text-[10px] font-bold text-[#4B5563] bg-[#EDEDED]/80 px-2.5 py-1 rounded-full border border-[#9CA3AF]/30">
            {tipoLabel}
          </span>
        </div>

        <span className="text-[11px] font-mono font-medium text-[#9CA3AF]">
          ID: {orden.id.slice(0, 8)}
        </span>
      </div>

      {/* Título / Motivo del Trabajo */}
      <div className="mt-3">
        <h3 className="font-display font-bold text-base sm:text-lg text-[#111827] leading-snug">
          {orden.etiqueta}
        </h3>
        <p className="mt-1 text-xs text-[#4B5563] leading-relaxed line-clamp-2 sm:line-clamp-none">
          {descripcion}
        </p>
      </div>

      {/* Datos Clave: Fechas, Taller, Odómetro y Costo */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl bg-[#EDEDED]/60 p-3 border border-[#9CA3AF]/30">
        {/* Fecha Ingreso */}
        <div>
          <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[#4B5563]">
            Ingreso
          </span>
          <p className="font-display font-bold text-xs sm:text-sm text-[#111827] tabular-nums mt-0.5">
            {formatearFechaCorta(orden.fechaInicio)}
          </p>
          <span className="block font-mono text-[10px] text-[#9CA3AF] tabular-nums">
            {orden.fechaInicio}
          </span>
        </div>

        {/* Fecha Estimada Entrega */}
        <div>
          <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[#4B5563]">
            Entrega Estimada
          </span>
          <p className="font-display font-bold text-xs sm:text-sm text-[#111827] tabular-nums mt-0.5">
            {formatearFechaCorta(orden.fechaFin)}
          </p>
          <span className="block font-mono text-[10px] text-[#9CA3AF] tabular-nums">
            {orden.fechaFin}
          </span>
        </div>

        {/* Taller / Proveedor */}
        <div>
          <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[#4B5563]">
            Taller Asignado
          </span>
          <p
            className="font-display font-bold text-xs sm:text-sm text-[#111827] truncate mt-0.5"
            title={taller}
          >
            {taller}
          </p>
        </div>

        {/* Odómetro inicial o Costo */}
        <div>
          <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[#4B5563]">
            {orden.kilometrajeRegistro ? 'Km Registro' : 'Costo Estimado'}
          </span>
          <p className="font-display font-bold text-xs sm:text-sm text-[#111827] tabular-nums mt-0.5">
            {orden.kilometrajeRegistro
              ? `${orden.kilometrajeRegistro.toLocaleString('es-CO')} km`
              : orden.costoTotal > 0
              ? formatearMonedaCOP(orden.costoTotal)
              : 'Sin liquidar'}
          </p>
        </div>
      </div>

      {/* Acción Prioritaria: Registrar Salida de Taller */}
      <div className="mt-4 pt-3.5 border-t border-[#EDEDED] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-[#4B5563]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-status-warning shrink-0"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-[11px] leading-tight">
            La unidad permanecerá no disponible hasta registrar su retorno de patio.
          </span>
        </div>

        <button
          type="button"
          onClick={() => onRegistrarSalida?.(orden)}
          className="ios-press-bounce w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-[#111827] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#EDEDED] shadow-sm hover:bg-[#1F2937] active:scale-[0.98] transition cursor-pointer shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <path d="M18 15l3-3-3-3" />
            <path d="M21 12H9" />
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          </svg>
          <span>Registrar salida de taller</span>
        </button>
      </div>
    </article>
  );
}
