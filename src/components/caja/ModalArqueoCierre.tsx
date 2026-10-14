import { useState } from 'react';
import type { SesionCajaSelect, CuentaFinancieraSelect, MovimientoCajaSelect } from '@/lib/caja';
import { formatearMonedaCOP } from '@/lib/caja';

export interface ModalArqueoCierreProps {
  isOpen: boolean;
  onClose: () => void;
  sesionActiva: SesionCajaSelect | null;
  cuentas: CuentaFinancieraSelect[];
  movimientos: MovimientoCajaSelect[];
  onApertura: (cuentaId: string, saldoInicial: number, notas?: string) => Promise<void>;
  onCierre: (sesionId: string, saldoContado: number, motivoDiff?: string, notas?: string) => Promise<void>;
}

export function ModalArqueoCierre({
  isOpen,
  onClose,
  sesionActiva,
  cuentas,
  movimientos,
  onApertura,
  onCierre,
}: ModalArqueoCierreProps) {
  const [cuentaId, setCuentaId] = useState<string>(
    cuentas.find((c) => c.tipo === 'CAJA_EFECTIVO')?.id ?? cuentas[0]?.id ?? ''
  );
  const [saldoInicialApertura, setSaldoInicialApertura] = useState<string>('1200000');
  const [saldoContadoCierre, setSaldoContadoCierre] = useState<string>('');
  const [motivoDiferencia, setMotivoDiferencia] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  if (!isOpen) return null;

  // Si hay sesión activa, calcular saldo esperado
  let ingresosEfectivo = 0;
  let egresosEfectivo = 0;
  let saldoEsperado = sesionActiva ? sesionActiva.saldoInicialContado : 0;

  if (sesionActiva) {
    const fApertura = new Date(sesionActiva.fechaApertura);
    const movsSesion = movimientos.filter(
      (m) =>
        m.cuentaId === sesionActiva.cuentaId &&
        m.estado === 'CONFIRMADO' &&
        new Date(m.fechaMovimiento) >= fApertura
    );

    for (const m of movsSesion) {
      if (m.tipo === 'INGRESO') ingresosEfectivo += m.monto;
      else if (m.tipo === 'EGRESO') egresosEfectivo += m.monto;
      else if (m.tipo === 'TRANSFERENCIA') {
        if (m.cuentaDestinoId === sesionActiva.cuentaId) ingresosEfectivo += m.monto;
        if (m.cuentaId === sesionActiva.cuentaId) egresosEfectivo += m.monto;
      }
    }

    saldoEsperado = sesionActiva.saldoInicialContado + ingresosEfectivo - egresosEfectivo;
  }

  const saldoContadoNum = parseFloat(saldoContadoCierre.replace(/[^\d.-]/g, '')) || 0;
  const diferencia = saldoContadoNum - saldoEsperado;

  const handleAperturaSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    const val = parseFloat(saldoInicialApertura.replace(/[^\d.-]/g, ''));
    if (isNaN(val) || val < 0) {
      setErrorValidacion('El saldo inicial contado debe ser mayor o igual a cero.');
      return;
    }

    try {
      setGuardando(true);
      await onApertura(cuentaId, Math.round(val), observaciones.trim() || undefined);
      onClose();
    } catch (err) {
      setErrorValidacion(err instanceof Error ? err.message : 'Error al abrir caja');
    } finally {
      setGuardando(false);
    }
  };

  const handleCierreSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    if (!sesionActiva) return;

    if (!saldoContadoCierre.trim()) {
      setErrorValidacion('Debes ingresar el valor en efectivo real contado.');
      return;
    }

    if (diferencia !== 0 && (!motivoDiferencia.trim() || motivoDiferencia.trim().length < 5)) {
      setErrorValidacion('Existe un descuadre en el arqueo; explica obligatoriamente el motivo del faltante/sobrante.');
      return;
    }

    try {
      setGuardando(true);
      await onCierre(
        sesionActiva.id,
        Math.round(saldoContadoNum),
        diferencia !== 0 ? motivoDiferencia.trim() : undefined,
        observaciones.trim() || undefined
      );
      onClose();
    } catch (err) {
      setErrorValidacion(err instanceof Error ? err.message : 'Error al cerrar caja');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-[28px] border border-[#9CA3AF]/30 bg-white p-5 sm:p-6 shadow-2xl my-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              Control de Efectivo
            </span>
            <h2 className="font-display text-xl font-black text-[#111827]">
              {sesionActiva ? 'Arqueo y Cierre Diario de Caja' : 'Apertura de Turno de Caja'}
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

        {errorValidacion && (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            {errorValidacion}
          </div>
        )}

        {sesionActiva ? (
          /* MODO CIERRE DE CAJA */
          <form onSubmit={handleCierreSubmit} className="mt-4 space-y-4">
            {/* Panel de conciliación en tiempo real */}
            <div className="rounded-2xl border border-[#9CA3AF]/20 bg-[#EDEDED]/40 p-4 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#4B5563]">Apertura de turno:</span>
                <span className="font-semibold text-[#111827]">
                  {new Date(sesionActiva.fechaApertura).toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#4B5563]">Saldo inicial contado:</span>
                <span className="font-mono font-bold text-[#111827]">
                  {formatearMonedaCOP(sesionActiva.saldoInicialContado)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-emerald-700 font-medium">+ Ingresos efectivo en turno:</span>
                <span className="font-mono font-bold text-emerald-700">
                  + {formatearMonedaCOP(ingresosEfectivo)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-rose-700 font-medium">- Egresos efectivo en turno:</span>
                <span className="font-mono font-bold text-rose-700">
                  - {formatearMonedaCOP(egresosEfectivo)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#9CA3AF]/30 pt-2 text-sm font-bold">
                <span className="text-[#111827]">Saldo Matemático Esperado:</span>
                <span className="font-mono text-[#111827]">
                  {formatearMonedaCOP(saldoEsperado)}
                </span>
              </div>
            </div>

            {/* Input para contar efectivo real */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1">
                Efectivo Real Contado en Gaveta *
              </label>
              <input
                type="number"
                step="1000"
                min="0"
                placeholder="Digita el dinero físico contado..."
                value={saldoContadoCierre}
                onChange={(e) => setSaldoContadoCierre(e.target.value)}
                className="w-full min-h-[48px] rounded-xl border-2 border-[#111827] bg-white px-4 py-2.5 text-lg font-black text-[#111827] focus:outline-hidden"
                required
              />
            </div>

            {/* Cálculo de la diferencia */}
            {saldoContadoCierre.trim() && (
              <div
                className={`rounded-xl border p-3 text-xs ${diferencia === 0
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : diferencia > 0
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : 'border-rose-300 bg-rose-50 text-rose-900'
                  }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>
                    {diferencia === 0
                      ? '✓ Caja en perfecto equilibrio'
                      : diferencia > 0
                        ? '⚠ Sobrante detectado'
                        : '⚠ Faltante detectado'}
                  </span>
                  <span className="font-mono text-sm">
                    {diferencia > 0 ? '+' : ''}
                    {formatearMonedaCOP(diferencia)}
                  </span>
                </div>
              </div>
            )}

            {/* Justificación obligatoria si hay diferencia */}
            {diferencia !== 0 && saldoContadoCierre.trim() && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-rose-800 mb-1">
                  Justificación de la Diferencia * (Obligatoria para auditoría)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalla el motivo del faltante o sobrante de efectivo..."
                  value={motivoDiferencia}
                  onChange={(e) => setMotivoDiferencia(e.target.value)}
                  className="w-full rounded-xl border border-rose-300 bg-white px-3 py-2 text-base text-[#111827] focus:border-rose-600 focus:outline-hidden"
                  required
                />
              </div>
            )}

            {/* Observaciones generales */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                Observaciones de Entrega de Turno
              </label>
              <textarea
                rows={2}
                placeholder="Novedades para el siguiente turno o administrador..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
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
                {guardando ? 'Cerrando Arqueo...' : 'Confirmar Cierre de Turno'}
              </button>
            </div>
          </form>
        ) : (
          /* MODO APERTURA DE CAJA */
          <form onSubmit={handleAperturaSubmit} className="mt-4 space-y-4">
            <p className="text-xs text-[#4B5563]">
              Inicia la jornada de patio registrando el fondo de caja base para cambio y pagos menores en efectivo.
            </p>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                Punto Operativo / Caja Física *
              </label>
              <select
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                required
              >
                {cuentas
                  .filter((c) => c.tipo === 'CAJA_EFECTIVO')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                Saldo Inicial Contado (Base en gaveta) *
              </label>
              <input
                type="number"
                step="1000"
                min="0"
                placeholder="Ej. 1200000"
                value={saldoInicialApertura}
                onChange={(e) => setSaldoInicialApertura(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base font-bold text-[#111827] focus:border-[#111827] focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                Observaciones de Apertura
              </label>
              <textarea
                rows={2}
                placeholder="Observaciones de verificación al recibir la gaveta..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
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
                className="min-h-[44px] rounded-full bg-emerald-700 px-6 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 active:scale-95"
              >
                {guardando ? 'Iniciando...' : 'Abrir Turno de Caja'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
