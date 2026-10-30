import { useState, useId } from 'react';
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
  const montoInputId = useId();
  const cuentaOrigenIdAttr = useId();
  const cuentaDestinoIdAttr = useId();
  const conceptoInputId = useId();

  const [cuentaOrigenId, setCuentaOrigenId] = useState<string>(cuentas[0]?.id ?? '');
  const [cuentaDestinoId, setCuentaDestinoId] = useState<string>(cuentas[1]?.id ?? '');
  const [monto, setMonto] = useState<string>('');
  const [concepto, setConcepto] = useState<string>('Traslado de fondos entre cuentas');
  const [referencia, setReferencia] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  if (!isOpen) return null;

  const montoNumerico = parseFloat(monto.replace(/[^\d.-]/g, '')) || 0;

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (cuentaOrigenId === cuentaDestinoId) {
      setErrorValidacion('La cuenta de origen y de destino no pueden ser la misma.');
      return;
    }

    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      setErrorValidacion('Ingresa un monto positivo para transferir.');
      return;
    }

    try {
      setGuardando(true);
      await onSubmit({
        cuentaOrigenId,
        cuentaDestinoId,
        monto: Math.round(montoNumerico),
        concepto: concepto.trim() || 'Traslado de fondos entre cuentas',
        referencia: referencia ? referencia.trim() : undefined,
      });
      onClose();
    } catch (err) {
      setErrorValidacion(
        err instanceof Error ? err.message : 'Error al procesar la transferencia'
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-md rounded-[28px] sm:rounded-[32px] border border-[#9CA3AF]/30 bg-white p-5 sm:p-7 shadow-2xl my-auto space-y-5 animate-fade-in">
        {/* Cabecera */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
              Gestión de Tesorería
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              Mover dinero entre cuentas
            </h2>
            <p className="text-xs text-[#4B5563]">
              Pasa saldo de una caja a un banco o viceversa sin alterar el balance operativo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EDEDED] text-[#4B5563] transition hover:bg-[#9CA3AF]/30 cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {errorValidacion && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50/70 p-3.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <span>⚠</span>
            <span>{errorValidacion}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monto Hero */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor={montoInputId}
                className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
              >
                ¿Cuánto vas a mover? <span className="text-rose-600">*</span>
              </label>
              {montoNumerico > 0 && (
                <span className="font-mono text-xs font-bold text-[#111827]">
                  $ {montoNumerico.toLocaleString('es-CO')} COP
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 font-mono text-2xl sm:text-3xl font-bold text-[#9CA3AF]">
                $
              </span>
              <input
                id={montoInputId}
                type="number"
                autoFocus
                min="1000"
                step="5000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                className="w-full rounded-2xl bg-[#EDEDED]/50 pl-11 sm:pl-12 pr-4 sm:pr-5 py-3.5 sm:py-4 font-mono text-2xl sm:text-3xl font-bold text-[#111827] placeholder-[#9CA3AF] border border-transparent focus:border-[#111827] focus:bg-white focus:outline-hidden transition-all"
                required
              />
            </div>
          </div>

          {/* Cuentas Origen y Destino */}
          <div className="space-y-3 rounded-2xl bg-[#EDEDED]/40 p-4 border border-[#9CA3AF]/20">
            <div className="space-y-1">
              <label
                htmlFor={cuentaOrigenIdAttr}
                className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] flex items-center justify-between"
              >
                <span>Desde (Sale dinero)</span>
                <span className="text-rose-600 font-bold">−</span>
              </label>
              <select
                id={cuentaOrigenIdAttr}
                value={cuentaOrigenId}
                onChange={(e) => setCuentaOrigenId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                required
              >
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.tipo === 'CAJA_EFECTIVO' ? 'Efectivo en Patio' : 'Banco'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center -my-1 text-[#4B5563]">
              <span className="h-6 w-6 rounded-full bg-white border border-[#9CA3AF]/30 flex items-center justify-center text-xs shadow-2xs font-bold">
                ↓
              </span>
            </div>

            <div className="space-y-1">
              <label
                htmlFor={cuentaDestinoIdAttr}
                className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] flex items-center justify-between"
              >
                <span>Hacia (Entra dinero)</span>
                <span className="text-emerald-600 font-bold">+</span>
              </label>
              <select
                id={cuentaDestinoIdAttr}
                value={cuentaDestinoId}
                onChange={(e) => setCuentaDestinoId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                required
              >
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.tipo === 'CAJA_EFECTIVO' ? 'Efectivo en Patio' : 'Banco'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Motivo y Referencia */}
          <div className="space-y-1.5">
            <label
              htmlFor={conceptoInputId}
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              Motivo o justificación
            </label>
            <input
              id={conceptoInputId}
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Consignación bancaria de efectivo del patio"
              className="w-full rounded-2xl bg-[#EDEDED]/50 px-4 py-3 text-base text-[#111827] placeholder-[#9CA3AF] border border-transparent focus:border-[#111827] focus:bg-white focus:outline-hidden transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="input-transferencia-referencia"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              N° Comprobante o Voucher (Opcional)
            </label>
            <input
              id="input-transferencia-referencia"
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej. TX-BAN-9102"
              className="w-full rounded-2xl bg-[#EDEDED]/50 px-4 py-3 text-base text-[#111827] placeholder-[#9CA3AF] border border-transparent focus:border-[#111827] focus:bg-white focus:outline-hidden transition-all"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EDEDED]">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px] rounded-full border border-[#9CA3AF]/40 px-5 py-2 text-xs sm:text-sm font-semibold text-[#4B5563] transition hover:bg-[#EDEDED] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="ios-press-bounce min-h-[44px] rounded-full bg-[#111827] hover:bg-[#1F2937] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-2"
            >
              {guardando ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Moviendo...</span>
                </>
              ) : (
                <span>Confirmar Transferencia</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
