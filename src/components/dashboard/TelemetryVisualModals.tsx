import { useEffect } from 'react';
import { navigate } from 'astro:transitions/client';
import { formatearMonedaCOP } from '@/lib/caja';
import type {
  DailyCompanyMovementItem,
  RentedAutomobileItem,
} from '@/lib/metricas';

export type TelemetryDetailSelection =
  | { readonly kind: 'AUTOMOBILE'; readonly item: RentedAutomobileItem }
  | { readonly kind: 'MOVEMENT'; readonly item: DailyCompanyMovementItem };

export interface TelemetryVisualModalsProps {
  readonly selection: TelemetryDetailSelection;
  readonly onClose: () => void;
}

export default function TelemetryVisualModals({
  selection,
  onClose,
}: TelemetryVisualModalsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isAuto = selection.kind === 'AUTOMOBILE';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        isAuto
          ? `Detalle de unidad alquilada ${selection.item.plate}`
          : `Detalle de movimiento diario ${selection.item.title}`
      }
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/45 backdrop-blur-xs p-3 sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[28px] bg-white p-5 sm:p-6 text-[#111827] shadow-2xl border border-[#9CA3AF]/45 space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div
          className="mx-auto h-1.5 w-11 rounded-full bg-[#9CA3AF]/60"
          aria-hidden="true"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full bg-[#1F2937] px-3 py-1 font-mono text-xs font-bold text-white">
              {isAuto
                ? `Auto en alquiler • ${selection.item.plate}`
                : `${selection.item.kind === 'INGRESO' ? 'Ingreso' : 'Egreso'} • ${selection.item.timeLabel}`}
            </span>
            <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-[#111827]">
              {isAuto ? selection.item.brandModel : selection.item.title}
            </h3>
          </div>

          <button
            type="button"
            aria-label="Cerrar ficha de detalle"
            onClick={onClose}
            className="ios-press-bounce flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-[#EDEDED] text-sm font-bold text-[#111827] border border-[#9CA3AF]/40 hover:bg-[#9CA3AF]/25 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {isAuto ? (
          <div className="space-y-4">
            {/* Bloque destacado en Azul Oscuro para alto contraste */}
            <div className="rounded-2xl bg-[#111827] p-4 text-white flex items-baseline justify-between gap-3 tabular-nums">
              <div>
                <span className="block text-xs font-semibold text-[#9CA3AF]">
                  Tarifa diaria activa
                </span>
                <p className="mt-0.5 font-display text-2xl font-extrabold text-white">
                  {selection.item.dailyRateFormatted}
                </p>
              </div>
              <div className="text-right">
                <span className="block text-xs font-semibold text-[#9CA3AF]">
                  Acumulado ({selection.item.daysActive} días)
                </span>
                <p className="mt-0.5 font-mono text-base font-bold text-white">
                  {formatearMonedaCOP(
                    selection.item.dailyRate * selection.item.daysActive
                  )}
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-[#EDEDED]/65 p-3.5 border border-[#9CA3AF]/30">
                <dt className="text-xs font-semibold text-[#4B5563]">
                  Cliente asignado
                </dt>
                <dd className="mt-1 font-bold text-[#111827] truncate">
                  {selection.item.clientName}
                </dd>
              </div>
              <div className="rounded-2xl bg-[#EDEDED]/65 p-3.5 border border-[#9CA3AF]/30">
                <dt className="text-xs font-semibold text-[#4B5563]">
                  Reserva activa
                </dt>
                <dd className="mt-1 font-mono font-bold text-[#111827]">
                  {selection.item.contractCode}
                </dd>
              </div>
              <div className="rounded-2xl bg-[#EDEDED]/65 p-3.5 border border-[#9CA3AF]/30">
                <dt className="text-xs font-semibold text-[#4B5563]">
                  Configuración
                </dt>
                <dd className="mt-1 font-bold text-[#111827]">
                  {selection.item.transmissionLabel} • {selection.item.fuelLabel}
                </dd>
              </div>
              <div className="rounded-2xl bg-[#EDEDED]/65 p-3.5 border border-[#9CA3AF]/30">
                <dt className="text-xs font-semibold text-[#4B5563]">
                  Retorno previsto
                </dt>
                <dd className="mt-1 font-bold text-[#111827]">
                  {selection.item.returnLabel}
                </dd>
              </div>
            </dl>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="ios-press-bounce min-h-[44px] rounded-xl bg-[#EDEDED] px-4 py-2.5 text-sm font-bold text-[#111827] border border-[#9CA3AF]/45 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/admin/flota');
                }}
                className="ios-press-bounce min-h-[44px] rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-[#1F2937] cursor-pointer"
              >
                Ir a Flota →
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#111827] p-4 text-white flex items-center justify-between gap-3 tabular-nums">
              <div>
                <span className="block text-xs font-semibold text-[#9CA3AF]">
                  Monto registrado
                </span>
                <p className="mt-0.5 font-display text-2xl font-extrabold text-white">
                  {selection.item.amountFormatted}
                </p>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                {selection.item.categoryLabel}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-[#EDEDED]/65 p-3.5 border border-[#9CA3AF]/30">
                <dt className="text-xs font-semibold text-[#4B5563]">
                  Medio de registro
                </dt>
                <dd className="mt-1 font-bold text-[#111827]">
                  {selection.item.paymentMethodLabel}
                </dd>
              </div>
              <div className="rounded-2xl bg-[#EDEDED]/65 p-3.5 border border-[#9CA3AF]/30">
                <dt className="text-xs font-semibold text-[#4B5563]">
                  Unidad / Referencia
                </dt>
                <dd className="mt-1 font-mono font-bold text-[#111827]">
                  {selection.item.vehiclePlate ??
                    selection.item.referenceCode ??
                    'Patio'}
                </dd>
              </div>
            </dl>

            <div className="rounded-2xl bg-[#EDEDED]/65 p-3.5 border border-[#9CA3AF]/30 text-sm">
              <span className="block text-xs font-semibold text-[#4B5563]">
                Detalle operativo
              </span>
              <p className="mt-1 font-medium text-[#111827] leading-relaxed">
                {selection.item.notes}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="ios-press-bounce flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#111827] px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-[#1F2937] cursor-pointer"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
