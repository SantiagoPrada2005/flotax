import {
  etiquetaEstadoGarantia,
  etiquetaMetodoPago,
  type ReservaClienteItem,
} from '@/lib/flota';
import type { DetalleReservaAdminContext } from '@/lib/flota/detalle-reserva-admin';

export interface FacturaAlquilerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reserva: ReservaClienteItem;
  detalleAdmin: DetalleReservaAdminContext;
}

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

const formatFechaHora = (iso: string | null | undefined): string => {
  if (!iso) return 'Pendiente';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
};

export function FacturaAlquilerModal({
  isOpen,
  onClose,
  reserva,
  detalleAdmin,
}: FacturaAlquilerModalProps) {
  if (!isOpen) return null;

  const { contrato, garantia, pagosHistorial } = detalleAdmin;
  const cobrosAdicionales = contrato?.cobrosAdicionalesLineas ?? [];
  const totalCobrosAdicionales = cobrosAdicionales.reduce(
    (acc, l) => acc + l.valor,
    0
  );
  const valorOriginalAlquiler = contrato
    ? contrato.subtotalCanon + contrato.coberturaPericial + contrato.cargosMora
    : Math.max(0, reserva.totalAlquiler - totalCobrosAdicionales);
  const descuento = contrato?.ajusteDescuentoLocal ?? 0;
  const totalFacturado = contrato?.totalLiquidado ?? reserva.totalAlquiler;
  const totalPagado = contrato?.totalPagado ?? reserva.montoReportado;
  const saldoPendiente = Math.max(0, totalFacturado - totalPagado);

  const pagosAlquiler = pagosHistorial.filter(
    (p) =>
      p.estado === 'CONFIRMADO' &&
      p.categoria !== 'DEPOSITO_GARANTIA' &&
      p.categoria !== 'REEMBOLSO_GARANTIA'
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Factura de alquiler #${reserva.codigo}`}
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#111827]/65 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/35 dark:border-white/15 p-5 sm:p-6 shadow-2xl space-y-5">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-[#EDEDED] dark:border-white/10 pb-4">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
              Comprobante de Liquidación y Factura
            </span>
            <h2 className="font-display text-xl font-extrabold text-[#111827] dark:text-[#EDEDED]">
              {contrato?.numeroContrato ??
                `CTR-${reserva.codigo.replace('FLX-', '')}`}
            </h2>
            <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
              Reserva #{reserva.codigo} · {reserva.sedeNombre}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar factura"
            className="fx-press flex h-11 w-11 items-center justify-center rounded-full bg-[#EDEDED] dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] border border-[#9CA3AF]/35 dark:border-white/15 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Partes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-[18px] bg-[#EDEDED]/65 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 p-3.5 space-y-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
              Cliente / Arrendatario
            </span>
            <p className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
              {reserva.conductor.nombreCompleto}
            </p>
            <p className="text-[#4B5563] dark:text-[#9CA3AF]">
              {reserva.conductor.tipoDocumento}{' '}
              {reserva.conductor.numeroDocumento} · Lic.{' '}
              {reserva.conductor.categoriaLicencia}
            </p>
            <p className="text-[#4B5563] dark:text-[#9CA3AF]">
              {reserva.conductor.telefono}
            </p>
          </div>

          <div className="rounded-[18px] bg-[#EDEDED]/65 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 p-3.5 space-y-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
              Unidad Arrendada
            </span>
            <p className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
              {reserva.vehiculo.marca} {reserva.vehiculo.modelo} (
              {reserva.vehiculo.anio})
            </p>
            <p className="font-mono text-[#111827] dark:text-[#EDEDED] font-semibold">
              Placa: {reserva.vehiculo.placa}
            </p>
            <p className="text-[#4B5563] dark:text-[#9CA3AF]">
              Período: {reserva.fechaInicio} → {reserva.fechaFin} (
              {reserva.diasAlquiler}{' '}
              {reserva.diasAlquiler === 1 ? 'día' : 'días'})
            </p>
          </div>
        </div>

        {/* Líneas de Factura */}
        <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 overflow-hidden">
          <div className="bg-[#EDEDED]/75 dark:bg-[#111827] px-4 py-2.5 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
            <span>Concepto</span>
            <span>Valor</span>
          </div>
          <div className="divide-y divide-[#EDEDED] dark:divide-white/10 bg-white dark:bg-[#1F2937]">
            <div className="px-4 py-3 flex items-start justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-[#111827] dark:text-[#EDEDED]">
                  Alquiler del vehículo ({reserva.diasAlquiler}{' '}
                  {reserva.diasAlquiler === 1 ? 'día' : 'días'})
                </p>
                <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                  Tarifa base y cobertura del contrato original
                </p>
              </div>
              <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums shrink-0">
                {formatCop(valorOriginalAlquiler)}
              </span>
            </div>

            {cobrosAdicionales.map((linea) => (
              <div
                key={linea.id}
                className="px-4 py-3 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {linea.evidenciaUrl && (
                    <img
                      src={linea.evidenciaUrl}
                      alt={`Evidencia · ${linea.concepto}`}
                      className="h-11 w-14 rounded-[10px] object-cover shrink-0 border border-[#9CA3AF]/30 dark:border-white/15"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                        {linea.concepto}
                      </span>
                      <span className="rounded-full bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF]/35 dark:border-white/15 px-2 py-0.5 text-[10px] font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
                        Cobro adicional · {linea.zona}
                      </span>
                    </div>
                    {linea.nota && (
                      <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                        {linea.nota}
                      </p>
                    )}
                    {(linea.registradoPorNombre ||
                      linea.registradoPorId ||
                      linea.registradoEnISO) && (
                      <p className="text-[10px] text-[#4B5563] dark:text-[#9CA3AF] mt-1 font-mono">
                        Agregado por:{' '}
                        {linea.registradoPorNombre ?? 'Operador de patio'}
                        {linea.registradoEnISO
                          ? ` · ${formatFechaHora(linea.registradoEnISO)}`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
                <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums shrink-0">
                  {formatCop(linea.valor)}
                </span>
              </div>
            ))}

            {(contrato?.cargosOtrosLocal ?? 0) > 0 &&
              cobrosAdicionales.length === 0 && (
                <div className="px-4 py-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <p className="font-bold text-[#111827] dark:text-[#EDEDED]">
                      Otros cargos operativos
                    </p>
                  </div>
                  <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums shrink-0">
                    {formatCop(contrato?.cargosOtrosLocal ?? 0)}
                  </span>
                </div>
              )}

            {descuento > 0 && (
              <div className="px-4 py-3 flex items-start justify-between gap-3 text-xs">
                <p className="font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
                  Descuento / ajuste autorizado
                </p>
                <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums shrink-0">
                  -{formatCop(descuento)}
                </span>
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="bg-[#EDEDED]/55 dark:bg-[#111827] px-4 py-3.5 space-y-1.5 border-t border-[#9CA3AF]/25 dark:border-white/10 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                Total facturado
              </span>
              <span className="font-display text-base font-black text-[#111827] dark:text-[#EDEDED] tabular-nums">
                {formatCop(totalFacturado)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#4B5563] dark:text-[#9CA3AF]">
              <span>Pagos y garantía aplicados</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatCop(totalPagado)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#9CA3AF]/20 dark:border-white/10">
              <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                Saldo pendiente por cobrar
              </span>
              <span className="font-mono font-extrabold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                {formatCop(saldoPendiente)}
              </span>
            </div>
          </div>
        </div>

        {/* Pagos y Garantía */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-[18px] bg-[#EDEDED]/55 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 p-3.5 space-y-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
              Pagos registrados ({pagosAlquiler.length})
            </span>
            {pagosAlquiler.length > 0 ? (
              <ul className="space-y-1.5">
                {pagosAlquiler.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-[#4B5563] dark:text-[#9CA3AF] truncate">
                      {formatFechaHora(p.fechaISO)} ·{' '}
                      {etiquetaMetodoPago(p.metodoPago)}
                    </span>
                    <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums shrink-0">
                      {p.tipo === 'EGRESO' ? '-' : ''}
                      {formatCop(p.monto)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[#4B5563] dark:text-[#9CA3AF]">
                Abono inicial reportado: {formatCop(reserva.montoReportado)}
              </p>
            )}
          </div>

          <div className="rounded-[18px] bg-[#EDEDED]/55 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
                Liquidación de Garantía
              </span>
              {garantia && (
                <span className="rounded-full bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/30 dark:border-white/15 px-2 py-0.5 text-[10px] font-bold text-[#111827] dark:text-[#EDEDED]">
                  {etiquetaEstadoGarantia(garantia.estado)}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                Recibida:
              </span>
              <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                {formatCop(garantia?.montoRecibido ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                Descontada por cobros:
              </span>
              <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                {formatCop(garantia?.montoRetenido ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                Devuelta al cliente:
              </span>
              <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                {formatCop(garantia?.montoDevuelto ?? 0)}
              </span>
            </div>
            {garantia?.motivoRetencion && (
              <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] pt-1">
                Motivo: {garantia.motivoRetencion}
              </p>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="fx-press min-h-[44px] rounded-full border border-[#9CA3AF]/45 dark:border-white/15 bg-white dark:bg-[#111827] px-5 py-2.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] hover:bg-[#EDEDED] dark:hover:bg-[#1F2937] transition-colors cursor-pointer"
          >
            Imprimir / Guardar PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="fx-press min-h-[44px] rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] hover:bg-[#1F2937] dark:hover:bg-white transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
