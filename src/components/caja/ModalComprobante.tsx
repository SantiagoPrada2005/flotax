import { formatearMonedaCOP } from '@/lib/caja';

export interface ModalComprobanteProps {
  isOpen: boolean;
  onClose: () => void;
  datos: {
    numeroRecibo: string;
    fechaISO: string;
    contratoCodigo: string;
    clienteNombre: string;
    clienteDocumento?: string | undefined;
    vehiculoNombre: string;
    vehiculoPlaca: string;
    concepto: string;
    monto: number;
    metodoPago: string;
    referencia?: string | undefined;
    saldoRestante?: number | undefined;
  } | null;
}

export function ModalComprobante({ isOpen, onClose, datos }: ModalComprobanteProps) {
  if (!isOpen || !datos) return null;

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md rounded-[28px] border border-[#9CA3AF]/30 bg-white p-6 shadow-2xl my-6">
        {/* Cabecera y botón cerrar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[#111827] flex items-center justify-center text-white text-[10px] font-black">
              FX
            </div>
            <span className="font-display text-sm font-black text-[#111827]">
              FlotaX · Recibo Oficial de Caja
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EDEDED] text-[#4B5563] transition hover:bg-[#9CA3AF]/30"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del Comprobante Imprimible */}
        <div id="comprobante-imprimible" className="mt-4 rounded-2xl border border-[#9CA3AF]/30 bg-[#EDEDED]/20 p-5 space-y-4">
          <div className="flex justify-between items-start border-b border-[#9CA3AF]/20 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                Comprobante N°
              </p>
              <p className="font-mono text-sm font-black text-[#111827]">
                {datos.numeroRecibo}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                Fecha y Hora
              </p>
              <p className="text-xs font-medium text-[#111827]">
                {new Date(datos.fechaISO).toLocaleString('es-CO', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#4B5563]">Contrato Waybill:</span>
              <span className="font-mono font-bold text-[#111827]">#{datos.contratoCodigo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4B5563]">Cliente Titular:</span>
              <span className="font-semibold text-[#111827] text-right">
                {datos.clienteNombre} {datos.clienteDocumento ? `(${datos.clienteDocumento})` : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4B5563]">Vehículo Asignado:</span>
              <span className="font-medium text-[#111827] text-right">
                {datos.vehiculoNombre} · <span className="font-mono font-bold">{datos.vehiculoPlaca}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4B5563]">Método de Pago:</span>
              <span className="font-semibold uppercase text-[#111827]">{datos.metodoPago}</span>
            </div>
            {datos.referencia && (
              <div className="flex justify-between">
                <span className="text-[#4B5563]">Referencia Transacción:</span>
                <span className="font-mono text-[#111827]">{datos.referencia}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[#9CA3AF]/20 pt-2">
              <span className="text-[#4B5563]">Concepto Liquidado:</span>
              <span className="font-medium text-[#111827] text-right max-w-[200px]">{datos.concepto}</span>
            </div>
          </div>

          <div className="rounded-xl bg-[#111827] p-3.5 text-center text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              Monto Pagado Asentado
            </p>
            <p className="font-display text-2xl font-black text-white mt-0.5">
              {formatearMonedaCOP(datos.monto)}
            </p>
          </div>

          {datos.saldoRestante !== undefined && (
            <div className="flex justify-between items-center text-xs font-semibold px-1">
              <span className="text-[#4B5563]">Saldo Pendiente Contrato:</span>
              <span className={`font-mono ${datos.saldoRestante === 0 ? 'text-emerald-700 font-bold' : 'text-amber-700'}`}>
                {datos.saldoRestante === 0 ? 'Totalmente Cancelado' : formatearMonedaCOP(datos.saldoRestante)}
              </span>
            </div>
          )}

          <div className="border-t border-dashed border-[#9CA3AF]/40 pt-3 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
              ✓ Asentado en Caja · Verificación Criptográfica FlotaX
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full border border-[#9CA3AF]/50 px-5 py-2 text-sm font-semibold text-[#4B5563] transition hover:bg-[#EDEDED]"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleImprimir}
            className="min-h-[44px] rounded-full bg-[#111827] px-6 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#1F2937] active:scale-95 inline-flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Imprimir Comprobante
          </button>
        </div>
      </div>
    </div>
  );
}
