import { useEffect, useMemo, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import {
  formatearRangoReservaHumano,
  obtenerRubrosWaybillReserva,
  type EstadoReservaCliente,
  type ReservaClienteItem,
} from '@/lib/flota';
import { ModalCancelarAnular } from './AlquilerCicloModals';
import DeliveryPointCard from './DeliveryPointCard';

export interface ReservaClienteDetalleViewProps {
  codigo: string;
  reservaInicial: ReservaClienteItem;
  hoyISO: string;
  tokenAccesoPublico?: string | null | undefined;
  mapboxPublicToken?: string | null | undefined;
}

type TabClienteDetalle = 'RESUMEN' | 'WAYBILL';

const ETIQUETA_ESTADO_CLIENTE: Readonly<
  Record<EstadoReservaCliente, { titulo: string; detalle: string }>
> = {
  PENDIENTE: {
    titulo: 'Solicitud en revisión',
    detalle: 'El patio verificará disponibilidad y tus datos antes de confirmar.',
  },
  CONFIRMADA: {
    titulo: 'Reserva confirmada',
    detalle: 'Acércate al patio con tu cédula y licencia vigentes para la entrega.',
  },
  EN_CURSO: {
    titulo: 'Vehículo en alquiler',
    detalle: 'Tu contrato está vigente. Conduce con precaución.',
  },
  PAUSADA: {
    titulo: 'Alquiler en pausa acordada',
    detalle: 'Tu contrato está temporalmente pausado con el patio.',
  },
  COMPLETADA: {
    titulo: 'Alquiler finalizado',
    detalle: 'El vehículo fue recibido y el contrato ha sido cerrado.',
  },
  RECHAZADA: {
    titulo: 'Solicitud rechazada',
    detalle: 'El patio no pudo confirmar esta solicitud.',
  },
  CANCELADA: {
    titulo: 'Reserva cancelada',
    detalle: 'La reserva fue cancelada y las fechas quedaron liberadas.',
  },
};

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

export default function ReservaClienteDetalleView({
  reservaInicial,
  tokenAccesoPublico,
  mapboxPublicToken = null,
}: ReservaClienteDetalleViewProps) {
  const [reserva, setReserva] = useState<ReservaClienteItem>(reservaInicial);
  const [tab, setTab] = useState<TabClienteDetalle>('RESUMEN');
  const [rubroActivoId, setRubroActivoId] = useState<string>('total-contrato');
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState<boolean>(false);
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);

  useEffect(() => {
    setReserva(reservaInicial);
  }, [reservaInicial]);

  const mostrarAviso = (msg: string) => {
    setToastMensaje(msg);
    window.setTimeout(() => setToastMensaje(null), 3500);
  };

  const { vehiculo } = reserva;
  const infoEstado = ETIQUETA_ESTADO_CLIENTE[reserva.estado];

  const rubrosWaybill = useMemo(
    () => obtenerRubrosWaybillReserva(reserva),
    [reserva]
  );

  const rubroSeleccionado = useMemo(
    () =>
      rubrosWaybill.find((r) => r.id === rubroActivoId) ?? rubrosWaybill[0]!,
    [rubrosWaybill, rubroActivoId]
  );

  const saldoPendiente = Math.max(
    0,
    reserva.totalAlquiler - reserva.montoReportado
  );

  const rutaEvaluacionCliente = `/reservas/${reserva.codigo}/entrega${
    tokenAccesoPublico ? `?token=${encodeURIComponent(tokenAccesoPublico)}` : ''
  }`;

  const puedeEvaluarRetorno =
    reserva.estado === 'EN_CURSO' || Boolean(reserva.evaluacionEntrega);

  return (
    <div className="min-h-[calc(100dvh-7.5rem)] pb-8 space-y-6">
      {toastMensaje && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-full bg-[#111827] px-4 py-2.5 text-xs font-semibold text-white shadow-lg"
        >
          {toastMensaje}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
        {/* Columna Izquierda: Estado, Unidad y Escenario */}
        <div className="w-full lg:w-7/12 space-y-5">
          <header className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
                  Reserva #{reserva.codigo} · {reserva.sedeNombre}
                </span>
                <h1 className="font-display text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[#111827] dark:text-[#EDEDED] leading-[1.08]">
                  {vehiculo.marca} {vehiculo.modelo}
                </h1>
              </div>

              <span className="rounded-full bg-[#111827] dark:bg-[#EDEDED] px-3.5 py-1.5 text-xs font-bold text-white dark:text-[#111827]">
                {infoEstado.titulo}
              </span>
            </div>

            <p className="text-xs text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
              {infoEstado.detalle}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-white dark:bg-[#1F2937] dark:border dark:border-white/10 px-3 py-1 text-[11px] font-semibold text-[#111827] dark:text-[#EDEDED]">
                {formatearRangoReservaHumano(reserva.fechaInicio, reserva.fechaFin)} ({reserva.diasAlquiler} días)
              </span>
              <span className="rounded-full bg-white dark:bg-[#1F2937] dark:border dark:border-white/10 px-3 py-1 font-mono text-[11px] font-bold text-[#111827] dark:text-[#EDEDED]">
                {vehiculo.placa}
              </span>
              <span className="rounded-full bg-white dark:bg-[#1F2937] dark:border dark:border-white/10 px-3 py-1 text-[11px] font-semibold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                {formatCop(reserva.totalAlquiler)} Total
              </span>
            </div>
          </header>

          {/* Escenario visual de la unidad */}
          <section className="relative rounded-[32px] bg-white/75 dark:bg-[#1F2937] dark:border dark:border-white/10 p-5 min-h-[210px] flex items-center justify-center">
            <img
              src={vehiculo.imagenUrl}
              alt={`${vehiculo.marca} ${vehiculo.modelo}`}
              className="w-full max-h-48 object-contain mx-auto drop-shadow-[0_18px_26px_rgba(17,24,39,0.16)]"
            />
          </section>
        </div>

        {/* Columna Derecha: Panel de Información para el Cliente */}
        <div className="w-full lg:w-5/12">
          <section className="rounded-[32px] bg-white dark:bg-[#1F2937] p-5 sm:p-6 shadow-[0_10px_30px_-15px_rgba(17,24,39,0.06)] border border-[#9CA3AF]/25 dark:border-white/12 space-y-4">
            {/* Selector de pestañas limpio para cliente */}
            <div className="grid grid-cols-2 gap-1.5 rounded-full bg-[#EDEDED] dark:bg-[#111827] p-1 border border-transparent dark:border-white/10">
              {(
                [
                  { id: 'RESUMEN', label: 'Mi Alquiler' },
                  { id: 'WAYBILL', label: 'Pagos' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`min-h-[44px] rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    tab === item.id
                      ? 'bg-[#111827] text-white dark:bg-[#EDEDED] dark:text-[#111827]'
                      : 'text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === 'RESUMEN' && (
              <div className="space-y-3">
                <div className="rounded-[20px] bg-[#EDEDED]/70 dark:bg-[#111827] dark:border dark:border-white/10 p-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">Conductor titular</span>
                    <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                      {reserva.conductor.nombreCompleto}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">Documento</span>
                    <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
                      {reserva.conductor.numeroDocumento
                        ? `${reserva.conductor.tipoDocumento || 'CC'} ${reserva.conductor.numeroDocumento}`
                        : 'Se comprobará al recoger en patio'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">Licencia</span>
                    <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
                      {reserva.conductor.categoriaLicencia
                        ? `Categoría ${reserva.conductor.categoriaLicencia}`
                        : 'Pendiente de comprobar en patio'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">Entrega</span>
                    <span className="font-semibold text-[#111827] dark:text-[#EDEDED] text-right">
                      {reserva.modalidadEntrega === 'DOMICILIO_MEDELLIN'
                        ? reserva.direccionEntrega || 'Entrega a domicilio'
                        : reserva.sedeNombre}
                    </span>
                  </div>
                </div>

                <DeliveryPointCard
                  modalidadEntrega={reserva.modalidadEntrega}
                  sedeNombre={reserva.sedeNombre}
                  direccionEntrega={reserva.direccionEntrega}
                  entregaLatitud={reserva.entregaLatitud}
                  entregaLongitud={reserva.entregaLongitud}
                  entregaReferencia={reserva.entregaReferencia}
                  distanciaEntregaKm={reserva.distanciaEntregaKm}
                  recargoEntregaDomicilio={reserva.recargoEntregaDomicilio}
                  mapboxPublicToken={mapboxPublicToken}
                  vista="cliente"
                  onAviso={mostrarAviso}
                />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-[18px] bg-[#EDEDED]/70 dark:bg-[#111827] dark:border dark:border-white/10 p-3.5">
                    <span className="text-[10px] font-medium text-[#4B5563] dark:text-[#9CA3AF] block">
                      Saldo en patio
                    </span>
                    <span className="font-mono text-base font-black text-[#111827] dark:text-[#EDEDED] tabular-nums">
                      {formatCop(saldoPendiente)}
                    </span>
                  </div>
                  <div className="rounded-[18px] bg-[#EDEDED]/70 dark:bg-[#111827] dark:border dark:border-white/10 p-3.5">
                    <span className="text-[10px] font-medium text-[#4B5563] dark:text-[#9CA3AF] block">
                      Garantía reembolsable
                    </span>
                    <span className="font-mono text-base font-black text-[#111827] dark:text-[#EDEDED] tabular-nums">
                      {formatCop(vehiculo.depositoGarantia)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'WAYBILL' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  {rubrosWaybill.map((rubro) => (
                    <button
                      key={rubro.id}
                      type="button"
                      onClick={() => setRubroActivoId(rubro.id)}
                      className={`w-full min-h-[44px] flex items-center justify-between rounded-2xl px-4 py-2 text-xs font-semibold cursor-pointer ${
                        rubroSeleccionado.id === rubro.id
                          ? 'bg-[#111827] text-white dark:bg-[#EDEDED] dark:text-[#111827]'
                          : 'bg-[#EDEDED]/70 dark:bg-[#111827] dark:border dark:border-white/10 text-[#111827] dark:text-[#EDEDED]'
                      }`}
                    >
                      <span>{rubro.etiqueta}</span>
                      <span className="font-mono font-bold tabular-nums">
                        {formatCop(rubro.monto)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cancelar solicitud pendiente sin abono */}
            {reserva.estado === 'PENDIENTE' && reserva.montoReportado === 0 && (
              <div className="border-t border-[#EDEDED] dark:border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() => setModalCancelarAbierto(true)}
                  className="min-h-[44px] w-full rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#111827] px-4 py-2.5 text-xs font-semibold text-[#4B5563] dark:text-[#D1D5DB] hover:text-[#111827] dark:hover:text-white cursor-pointer"
                >
                  Cancelar mi solicitud de alquiler
                </button>
              </div>
            )}

            {/* Autoevaluación y pre-entrega de retorno: únicamente cuando el vehículo ya está EN_CURSO */}
            {puedeEvaluarRetorno && (
              <div className="border-t border-[#EDEDED] dark:border-white/10 pt-3">
                {reserva.evaluacionEntrega ? (
                  <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#EDEDED]/85 dark:bg-[#111827] dark:border dark:border-white/10 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <span className="font-display text-xs font-bold text-[#111827] dark:text-[#EDEDED] block truncate">
                        Evaluación enviada ({reserva.evaluacionEntrega.puntajeNumerico}.0 ★)
                      </span>
                      <span className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] block truncate">
                        {reserva.evaluacionEntrega.aspectosDestacados.join(' · ') ||
                          'Pendiente validación final en patio'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(rutaEvaluacionCliente)}
                      className="min-h-[44px] shrink-0 rounded-full bg-white dark:bg-[#1F2937] dark:border dark:border-white/15 px-4 py-2 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
                    >
                      Ver resumen
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(rutaEvaluacionCliente)}
                    className="fx-press flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] hover:bg-[#1F2937] dark:hover:bg-white cursor-pointer"
                  >
                    <span>Devolver unidad y calificar servicio</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <ModalCancelarAnular
        isOpen={modalCancelarAbierto}
        onClose={() => setModalCancelarAbierto(false)}
        reserva={reserva}
        tipo="CANCELAR"
        tokenAccesoPublico={tokenAccesoPublico}
        onExito={(actualizada, msg) => {
          setReserva(actualizada);
          if (msg) mostrarAviso(msg);
        }}
      />
    </div>
  );
}
