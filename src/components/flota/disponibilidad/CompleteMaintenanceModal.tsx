import { useState, useEffect } from 'react';
import { actions } from 'astro:actions';
import type { VehiculoItem } from '@/lib/flota/types';
import type {
  MantenimientoVehiculoSelect,
  EstadoVehiculo,
} from '@/lib/mantenimientos/types';
import { formatearFechaCorta } from '@/lib/flota/disponibilidad';
import { formatearMonedaCOP } from '@/lib/caja';

export interface CompleteMaintenanceModalProps {
  isOpen: boolean;
  orden: MantenimientoVehiculoSelect | null;
  vehiculo?: VehiculoItem | undefined;
  onClose: () => void;
  onSuccess: (
    ordenActualizada: MantenimientoVehiculoSelect,
    nuevoEstadoVehiculo: EstadoVehiculo
  ) => void;
}

const TIPOS_LABEL: Record<string, string> = {
  PREVENTIVO: 'Mantenimiento Preventivo',
  CORRECTIVO_NOVEDAD: 'Correctivo / Novedad',
  ALISTAMIENTO: 'Alistamiento de Patio',
  BLOQUEO_OPERATIVO: 'Bloqueo Operativo',
};

export default function CompleteMaintenanceModal({
  isOpen,
  orden,
  vehiculo,
  onClose,
  onSuccess,
}: CompleteMaintenanceModalProps) {
  const kmBase = orden?.kilometrajeRegistro ?? vehiculo?.kilometraje ?? 0;
  const costoBase = orden?.costoTotal ?? 0;

  const [kilometrajeFinal, setKilometrajeFinal] = useState<string>(String(kmBase));
  const [costoFinal, setCostoFinal] = useState<string>(String(costoBase));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sincronizar inputs cuando cambia la orden seleccionada
  useEffect(() => {
    if (orden) {
      setKilometrajeFinal(String(orden.kilometrajeRegistro ?? vehiculo?.kilometraje ?? 0));
      setCostoFinal(String(orden.costoTotal ?? 0));
      setErrorMsg(null);
    }
  }, [orden, vehiculo]);

  // Bloqueo de scroll y tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !orden) return null;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const kmNum = parseInt(kilometrajeFinal, 10);
    const costoNum = parseFloat(costoFinal);

    if (isNaN(kmNum) || kmNum < 0) {
      setErrorMsg('Indica un odómetro final válido (número entero mayor o igual a 0).');
      return;
    }

    if (orden.kilometrajeRegistro && kmNum < orden.kilometrajeRegistro) {
      setErrorMsg(
        `El odómetro final (${kmNum.toLocaleString('es-CO')} km) no puede ser menor al de ingreso (${orden.kilometrajeRegistro.toLocaleString('es-CO')} km).`
      );
      return;
    }

    if (isNaN(costoNum) || costoNum < 0) {
      setErrorMsg('Indica un costo real liquidado válido mayor o igual a $0 COP.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data, error } = await actions.mantenimientos.cambiarEstadoMantenimiento({
        id: orden.id,
        nuevoEstado: 'COMPLETADO',
        kilometrajeFinal: kmNum,
        costoFinal: Math.round(costoNum),
      });

      if (error || !data?.ok) {
        setErrorMsg(error?.message || 'Error al registrar la salida de taller.');
        return;
      }

      onSuccess(data.orden, data.nuevoEstadoVehiculo);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al conectar con el servidor.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-complete-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg rounded-[28px] border border-[#9CA3AF]/30 bg-white p-5 sm:p-6 shadow-2xl my-6">
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between pb-3 border-b border-[#9CA3AF]/20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                Liquidación y Egreso de Taller
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#111827] text-[#EDEDED]">
                #{orden.id.slice(-6).toUpperCase()}
              </span>
            </div>
            <h2
              id="modal-complete-title"
              className="font-display text-lg sm:text-xl font-bold text-[#111827]"
            >
              Registrar Salida de Taller
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar modal"
            className="ios-press-bounce min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-[#EDEDED] text-[#4B5563] transition hover:bg-[#9CA3AF]/30 cursor-pointer disabled:opacity-50"
          >
            <span className="text-sm font-bold">✕</span>
          </button>
        </div>

        {/* Resumen de la Orden Activa */}
        <div className="mt-4 rounded-2xl border border-[#9CA3AF]/25 bg-[#EDEDED]/40 p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#4B5563] font-medium">Concepto Técnico:</span>
            <span className="font-bold text-[#111827] text-right max-w-[240px] truncate">
              {orden.etiqueta}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#4B5563] font-medium">Tipo:</span>
            <span className="font-medium text-[#111827]">
              {TIPOS_LABEL[orden.tipo] ?? orden.tipo}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#4B5563] font-medium">Taller / Proveedor:</span>
            <span className="font-bold text-[#111827]">
              {orden.tallerProveedor?.trim() || 'Servicio Interno / Patio'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#4B5563] font-medium">Periodo Programado:</span>
            <span className="font-mono text-[#111827]">
              {formatearFechaCorta(orden.fechaInicio)} — {formatearFechaCorta(orden.fechaFin)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#9CA3AF]/20">
            <span className="text-[#4B5563] font-medium">Odómetro de Ingreso:</span>
            <span className="font-mono font-bold text-[#111827]">
              {(orden.kilometrajeRegistro ?? 0).toLocaleString('es-CO')} km
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#4B5563] font-medium">Costo Estimado Inicial:</span>
            <span className="font-mono font-bold text-[#111827]">
              {formatearMonedaCOP(orden.costoTotal ?? 0)}
            </span>
          </div>
        </div>

        {/* Formulario de Salida */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Odómetro Final */}
          <div>
            <label
              htmlFor="kilometrajeFinalInput"
              className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5"
            >
              Odómetro Final al Salir (km)
            </label>
            <div className="relative">
              <input
                id="kilometrajeFinalInput"
                type="number"
                min={orden.kilometrajeRegistro ?? 0}
                step="1"
                required
                value={kilometrajeFinal}
                onChange={(e) => setKilometrajeFinal(e.target.value)}
                placeholder="Ej: 45350"
                className="w-full h-12 rounded-xl border border-[#9CA3AF]/50 bg-white px-3.5 pr-14 text-base font-mono text-[#111827] shadow-xs focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#4B5563]">
                KM
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#4B5563]">
              Mínimo:{' '}
              <strong className="text-[#111827]">
                {(orden.kilometrajeRegistro ?? 0).toLocaleString('es-CO')} km
              </strong>{' '}
              (odómetro registrado al ingreso).
            </p>
          </div>

          {/* Costo Real Liquidado */}
          <div>
            <label
              htmlFor="costoFinalInput"
              className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5"
            >
              Costo Real Liquidado (COP)
            </label>
            <div className="relative">
              <input
                id="costoFinalInput"
                type="number"
                min="0"
                step="1000"
                required
                value={costoFinal}
                onChange={(e) => setCostoFinal(e.target.value)}
                placeholder="0"
                className="w-full h-12 rounded-xl border border-[#9CA3AF]/50 bg-white px-3.5 pr-14 text-base font-mono text-[#111827] shadow-xs focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#4B5563]">
                COP
              </span>
            </div>
            <p className="mt-1 text-[11px] font-mono text-[#4B5563]">
              Liquidación visual:{' '}
              <span className="font-bold text-[#111827]">
                {formatearMonedaCOP(parseFloat(costoFinal) || 0)}
              </span>
            </p>
          </div>

          {/* Banner de Error */}
          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 animate-fade-in"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">⚠</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="ios-press-bounce min-h-[48px] px-5 rounded-2xl border border-[#9CA3AF]/40 bg-white text-xs sm:text-sm font-bold text-[#4B5563] hover:bg-[#EDEDED] transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="ios-press-bounce min-h-[48px] flex-1 sm:flex-initial px-6 rounded-2xl bg-[#111827] text-xs sm:text-sm font-bold text-[#EDEDED] shadow-sm hover:bg-[#1F2937] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-[#EDEDED]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Procesando salida...</span>
                </>
              ) : (
                <span>Confirmar Salida de Taller</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
