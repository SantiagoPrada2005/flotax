import { useState } from 'react';
import type { DepositoGarantiaSelect, CuentaFinancieraSelect, MetodoPagoFinanciero } from '@/lib/caja';
import { formatearMonedaCOP } from '@/lib/caja';

export interface ModalGarantiaProps {
  isOpen: boolean;
  onClose: () => void;
  garantia: DepositoGarantiaSelect | null;
  accionInicial: 'RECIBIR' | 'DEVOLVER' | 'RETENER_CARGOS';
  cuentas: CuentaFinancieraSelect[];
  onSubmit: (datos: {
    garantiaId: string;
    accion: 'RECIBIR' | 'DEVOLVER' | 'RETENER_CARGOS';
    monto: number;
    cuentaId?: string | undefined;
    metodoPago?: MetodoPagoFinanciero | undefined;
    referencia?: string | undefined;
    motivo?: string | undefined;
  }) => Promise<void>;
}

export function ModalGarantia({
  isOpen,
  onClose,
  garantia,
  accionInicial,
  cuentas,
  onSubmit,
}: ModalGarantiaProps) {
  const [accion, setAccion] = useState<'RECIBIR' | 'DEVOLVER' | 'RETENER_CARGOS'>(accionInicial);
  const [monto, setMonto] = useState<string>(
    garantia
      ? String(
        accionInicial === 'RECIBIR'
          ? garantia.montoEsperado - (garantia.montoRecibido || 0)
          : Math.max(0, (garantia.montoRecibido || 0) - (garantia.montoDevuelto || 0) - (garantia.montoRetenido || 0))
      )
      : '0'
  );
  const [cuentaId, setCuentaId] = useState<string>(cuentas[0]?.id ?? '');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoFinanciero>('transferencia');
  const [referencia, setReferencia] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  if (!isOpen || !garantia) return null;

  const disponibleRetenido = Math.max(
    0,
    (garantia.montoRecibido || 0) - (garantia.montoDevuelto || 0) - (garantia.montoRetenido || 0)
  );

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    const valorNumerico = parseFloat(monto.replace(/[^\d.-]/g, ''));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setErrorValidacion('Ingresa un valor positivo a procesar.');
      return;
    }

    if (accion !== 'RECIBIR' && valorNumerico > disponibleRetenido) {
      setErrorValidacion(
        `El monto ($${valorNumerico.toLocaleString()}) supera la garantía disponible en custodia (${formatearMonedaCOP(disponibleRetenido)}).`
      );
      return;
    }

    if (accion === 'RETENER_CARGOS' && (!motivo.trim() || motivo.trim().length < 5)) {
      setErrorValidacion('Es obligatorio detallar el motivo pericial/justificación para retener garantía por cargos.');
      return;
    }

    try {
      setGuardando(true);
      await onSubmit({
        garantiaId: garantia.id,
        accion,
        monto: Math.round(valorNumerico),
        cuentaId: cuentaId || undefined,
        metodoPago,
        referencia: referencia.trim() || undefined,
        motivo: motivo.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorValidacion(err instanceof Error ? err.message : 'Error al procesar la garantía');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-[28px] border border-[#9CA3AF]/30 bg-white p-5 sm:p-6 shadow-2xl my-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              Gestión de Garantía Contractual
            </span>
            <h2 className="font-display text-xl font-black text-[#111827]">
              Contrato #{garantia.contratoId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EDEDED] text-[#4B5563] transition hover:bg-[#9CA3AF]/30"
          >
            ✕
          </button>
        </div>

        {/* Resumen de la Garantía */}
        <div className="mt-4 rounded-xl border border-[#9CA3AF]/20 bg-[#EDEDED]/30 p-3.5 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#4B5563]">Cliente:</span>
            <span className="font-semibold text-[#111827]">{garantia.clienteNombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4B5563]">Garantía Pactada:</span>
            <span className="font-mono font-bold text-[#111827]">{formatearMonedaCOP(garantia.montoEsperado)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4B5563]">Recibido en Custodia:</span>
            <span className="font-mono font-bold text-emerald-700">{formatearMonedaCOP(garantia.montoRecibido)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#4B5563]">Disponible por Devolver / Liquidar:</span>
            <span className="font-mono font-bold text-[#111827]">{formatearMonedaCOP(disponibleRetenido)}</span>
          </div>
        </div>

        {/* Selector de Acción */}
        <div className="mt-4 flex rounded-xl bg-[#EDEDED] p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setAccion('RECIBIR')}
            className={`flex-1 min-h-[38px] rounded-lg transition ${accion === 'RECIBIR' ? 'bg-[#111827] text-white shadow-xs' : 'text-[#4B5563]'
              }`}
          >
            Recibir Custodia
          </button>
          <button
            type="button"
            onClick={() => setAccion('DEVOLVER')}
            className={`flex-1 min-h-[38px] rounded-lg transition ${accion === 'DEVOLVER' ? 'bg-emerald-700 text-white shadow-xs' : 'text-[#4B5563]'
              }`}
          >
            Restituir a Cliente
          </button>
          <button
            type="button"
            onClick={() => setAccion('RETENER_CARGOS')}
            className={`flex-1 min-h-[38px] rounded-lg transition ${accion === 'RETENER_CARGOS' ? 'bg-rose-700 text-white shadow-xs' : 'text-[#4B5563]'
              }`}
          >
            Aplicar a Daños
          </button>
        </div>

        {errorValidacion && (
          <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            {errorValidacion}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              Monto a {accion === 'RECIBIR' ? 'Recibir' : accion === 'DEVOLVER' ? 'Devolver' : 'Aplicar'} en COP *
            </label>
            <input
              type="number"
              step="1000"
              min="1"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base font-bold text-[#111827] focus:border-[#111827] focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPagoFinanciero)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              >
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                Cuenta / Caja
              </label>
              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              >
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              Referencia / Comprobante
            </label>
            <input
              type="text"
              placeholder="N° Transacción o Recibo"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
            />
          </div>

          {accion === 'RETENER_CARGOS' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-800 mb-1">
                Justificación Pericial / Daño Autorizado *
              </label>
              <textarea
                rows={2}
                placeholder="Indica el daño en la unidad física, infracción o rubro descontado..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-base text-[#111827] focus:border-rose-600 focus:outline-hidden"
                required
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#9CA3AF]/20">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px] rounded-full border border-[#9CA3AF]/50 px-5 py-2 text-sm font-semibold text-[#4B5563] transition hover:bg-[#EDEDED]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className={`min-h-[44px] rounded-full px-6 py-2 text-sm font-bold text-white shadow-sm transition active:scale-95 ${accion === 'RECIBIR'
                  ? 'bg-[#111827] hover:bg-[#1F2937]'
                  : accion === 'DEVOLVER'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-rose-700 hover:bg-rose-800'
                }`}
            >
              {guardando ? 'Procesando...' : `Confirmar ${accion === 'RECIBIR' ? 'Recepción' : accion === 'DEVOLVER' ? 'Devolución' : 'Retención'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
