import { useState } from 'react';
import type { CuentaFinancieraSelect } from '@/lib/caja';

export interface ModalTransferenciaProps {
  isOpen: boolean;
  onClose: () => void;
  cuentas: CuentaFinancieraSelect[];
  onSubmit: (datos: {
    cuentaOrigenId: string;
    cuentaDestinoId: string;
    monto: number;
    concepto: string;
    referencia?: string | undefined;
  }) => Promise<void>;
}

export function ModalTransferencia({
  isOpen,
  onClose,
  cuentas,
  onSubmit,
}: ModalTransferenciaProps) {
  const [cuentaOrigenId, setCuentaOrigenId] = useState<string>(cuentas[0]?.id ?? '');
  const [cuentaDestinoId, setCuentaDestinoId] = useState<string>(cuentas[1]?.id ?? '');
  const [monto, setMonto] = useState<string>('');
  const [concepto, setConcepto] = useState<string>('Traslado interno de fondos');
  const [referencia, setReferencia] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (cuentaOrigenId === cuentaDestinoId) {
      setErrorValidacion('La cuenta origen y destino deben ser distintas.');
      return;
    }

    const valorNumerico = parseFloat(monto.replace(/[^\d.-]/g, ''));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setErrorValidacion('Ingresa un valor positivo a transferir.');
      return;
    }

    try {
      setGuardando(true);
      await onSubmit({
        cuentaOrigenId,
        cuentaDestinoId,
        monto: Math.round(valorNumerico),
        concepto: concepto.trim() || 'Traslado interno de fondos',
        referencia: referencia ? referencia.trim() : undefined,
      });
      onClose();
    } catch (err) {
      setErrorValidacion(err instanceof Error ? err.message : 'Error al procesar la transferencia');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-[28px] border border-[#9CA3AF]/30 bg-white p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              Gestión de Cuentas
            </span>
            <h2 className="font-display text-lg font-black text-[#111827]">
              Transferencia Interna
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

        <p className="mt-2 text-xs text-[#4B5563]">
          Los traslados internos mueven saldos entre cajas y cuentas bancarias sin alterar el resultado operativo consolidado ni contar como ingresos/egresos del negocio.
        </p>

        {errorValidacion && (
          <div className="mt-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            {errorValidacion}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              Cuenta Origen (Sale dinero) *
            </label>
            <select
              value={cuentaOrigenId}
              onChange={(e) => setCuentaOrigenId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              required
            >
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              Cuenta Destino (Ingresa dinero) *
            </label>
            <select
              value={cuentaDestinoId}
              onChange={(e) => setCuentaDestinoId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              required
            >
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              Monto en COP *
            </label>
            <input
              type="number"
              step="1000"
              min="1"
              placeholder="Ej. 500000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base font-bold text-[#111827] focus:border-[#111827] focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              Concepto / Motivo *
            </label>
            <input
              type="text"
              placeholder="Ej. Consignación bancaria de efectivo del patio"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              N° Comprobante / Referencia
            </label>
            <input
              type="text"
              placeholder="Ej. TX-BANC-84910"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
            />
          </div>

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
              className="min-h-[44px] rounded-full bg-[#111827] px-6 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#1F2937] active:scale-95"
            >
              {guardando ? 'Procesando...' : 'Realizar Transferencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
