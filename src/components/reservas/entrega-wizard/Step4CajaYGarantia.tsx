import type { EntregaWizardData, MetodoPagoEntrega } from './types';
import type { ReservaClienteItem } from '@/lib/flota';

export interface Step4CajaYGarantiaProps {
  reserva: ReservaClienteItem;
  data: EntregaWizardData;
  cuentasFinancieras: Array<{ id: string; nombre: string; tipo: string }>;
  onChange: (updates: Partial<EntregaWizardData>) => void;
}

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

const METODOS_PAGO: ReadonlyArray<{ id: MetodoPagoEntrega; label: string }> = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Bre-B / Transf.' },
  { id: 'tarjeta', label: 'Datáfono' },
];

export default function Step4CajaYGarantia({
  reserva,
  data,
  cuentasFinancieras,
  onChange,
}: Step4CajaYGarantiaProps) {
  const saldoPendiente = Math.max(0, reserva.totalAlquiler - reserva.montoReportado);
  const garantiaEnCustodia = reserva.estadoGarantia === 'CUSTODIA_ACTIVA';

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 03 · Liquidación y Depósito de Garantía
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          Verifica el pago y la fianza en custodia
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[54ch]">
          Registra en caja cualquier saldo pendiente del canon y el depósito de garantía reembolsable antes de entregar el vehículo.
        </p>
      </div>

      {/* Tarjeta 1: Saldo del Alquiler */}
      <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-5 sm:p-7 shadow-xs space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-[20px] bg-[#EDEDED]/75 p-3.5 text-center">
          <div>
            <span className="block text-[10px] font-semibold text-[#4B5563] uppercase">
              Total Contrato
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-[#111827] tabular-nums">
              {formatCop(reserva.totalAlquiler)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-[#4B5563] uppercase">
              Abonado
            </span>
            <span className="font-mono text-xs sm:text-sm font-bold text-[#111827] tabular-nums">
              {formatCop(reserva.montoReportado)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-semibold text-[#4B5563] uppercase">
              Saldo Patio
            </span>
            <span className="font-mono text-xs sm:text-sm font-black text-[#111827] tabular-nums">
              {formatCop(saldoPendiente)}
            </span>
          </div>
        </div>

        {saldoPendiente > 0 ? (
          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3 rounded-[20px] border border-[#9CA3AF]/40 bg-[#EDEDED]/50 p-3.5 cursor-pointer">
              <div>
                <span className="block text-xs font-bold text-[#111827]">
                  Cobrar saldo pendiente en este momento
                </span>
                <span className="block text-[11px] text-[#4B5563]">
                  Asienta el ingreso confirmado en caja operativa automáticamente
                </span>
              </div>
              <input
                type="checkbox"
                checked={data.cobrarSaldoAhora}
                onChange={(e) =>
                  onChange({
                    cobrarSaldoAhora: e.target.checked,
                    montoCobroSaldo: e.target.checked
                      ? data.montoCobroSaldo || saldoPendiente
                      : 0,
                  })
                }
                className="h-5 w-5 rounded border-[#9CA3AF] cursor-pointer"
              />
            </label>

            {data.cobrarSaldoAhora && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-[20px] bg-[#EDEDED]/65 p-4">
                <div className="space-y-1">
                  <label
                    htmlFor="entrega-monto-saldo"
                    className="text-[11px] font-semibold text-[#4B5563]"
                  >
                    Monto a cobrar (COP)
                  </label>
                  <input
                    id="entrega-monto-saldo"
                    type="number"
                    min={0}
                    max={saldoPendiente}
                    value={data.montoCobroSaldo}
                    onChange={(e) =>
                      onChange({
                        montoCobroSaldo: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full min-h-[48px] rounded-xl bg-white border border-[#9CA3AF]/40 px-3.5 py-2 font-mono text-base font-bold text-[#111827]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#4B5563] block">
                    Método de cobro
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {METODOS_PAGO.map((mp) => (
                      <button
                        key={mp.id}
                        type="button"
                        onClick={() => onChange({ metodoCobroSaldo: mp.id })}
                        className={`min-h-[48px] rounded-xl px-2 text-[11px] font-bold cursor-pointer ${
                          data.metodoCobroSaldo === mp.id
                            ? 'bg-[#111827] text-white'
                            : 'bg-white text-[#4B5563]'
                        }`}
                      >
                        {mp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {cuentasFinancieras.length > 0 && (
                  <div className="space-y-1">
                    <label
                      htmlFor="entrega-cta-saldo"
                      className="text-[11px] font-semibold text-[#4B5563]"
                    >
                      Cuenta financiera
                    </label>
                    <select
                      id="entrega-cta-saldo"
                      value={data.cuentaCobroSaldoId}
                      onChange={(e) =>
                        onChange({ cuentaCobroSaldoId: e.target.value })
                      }
                      className="w-full min-h-[48px] rounded-xl bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base font-medium text-[#111827]"
                    >
                      {cuentasFinancieras.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label
                    htmlFor="entrega-ref-saldo"
                    className="text-[11px] font-semibold text-[#4B5563]"
                  >
                    Referencia / Comprobante
                  </label>
                  <input
                    id="entrega-ref-saldo"
                    type="text"
                    value={data.referenciaCobroSaldo}
                    onChange={(e) =>
                      onChange({ referenciaCobroSaldo: e.target.value })
                    }
                    placeholder="Opcional"
                    className="w-full min-h-[48px] rounded-xl bg-white border border-[#9CA3AF]/40 px-3.5 py-2 text-base text-[#111827]"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[18px] bg-[#EDEDED] px-4 py-3 text-xs font-bold text-[#111827] flex items-center justify-between">
            <span>Alquiler 100% pagado antes de salida</span>
            <span className="font-mono text-[11px] text-[#4B5563]">PAZ Y SALVO</span>
          </div>
        )}
      </div>

      {/* Tarjeta 2: Depósito de Garantía */}
      <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-[#111827]">
              Depósito de Garantía
            </h2>
            <p className="text-xs text-[#4B5563]">
              Monto sugerido de la unidad: {formatCop(reserva.vehiculo.depositoGarantia)}
            </p>
          </div>
          <span className="rounded-full bg-[#EDEDED] px-3 py-1 text-[11px] font-bold text-[#111827]">
            {garantiaEnCustodia ? 'En custodia activa' : 'Pendiente recibir'}
          </span>
        </div>

        {!garantiaEnCustodia && (
          <>
            <label className="flex items-center justify-between gap-3 rounded-[20px] border border-[#9CA3AF]/40 bg-[#EDEDED]/50 p-3.5 cursor-pointer">
              <div>
                <span className="block text-xs font-bold text-[#111827]">
                  Recibir depósito de garantía en custodia ahora
                </span>
                <span className="block text-[11px] text-[#4B5563]">
                  Registra la fianza en D1 y en el libro de caja como custodia reembolsable
                </span>
              </div>
              <input
                type="checkbox"
                checked={data.recibirGarantiaAhora}
                onChange={(e) =>
                  onChange({ recibirGarantiaAhora: e.target.checked })
                }
                className="h-5 w-5 rounded border-[#9CA3AF] cursor-pointer"
              />
            </label>

            {data.recibirGarantiaAhora && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-[20px] bg-[#EDEDED]/65 p-4">
                <div className="space-y-1">
                  <label
                    htmlFor="entrega-monto-garantia"
                    className="text-[11px] font-semibold text-[#4B5563]"
                  >
                    Valor de garantía recibido (COP)
                  </label>
                  <input
                    id="entrega-monto-garantia"
                    type="number"
                    min={0}
                    value={data.montoGarantia}
                    onChange={(e) =>
                      onChange({
                        montoGarantia: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full min-h-[48px] rounded-xl bg-white border border-[#9CA3AF]/40 px-3.5 py-2 font-mono text-base font-bold text-[#111827]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#4B5563] block">
                    Método de recepción
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {METODOS_PAGO.map((mp) => (
                      <button
                        key={mp.id}
                        type="button"
                        onClick={() => onChange({ metodoGarantia: mp.id })}
                        className={`min-h-[48px] rounded-xl px-2 text-[11px] font-bold cursor-pointer ${
                          data.metodoGarantia === mp.id
                            ? 'bg-[#111827] text-white'
                            : 'bg-white text-[#4B5563]'
                        }`}
                      >
                        {mp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {cuentasFinancieras.length > 0 && (
                  <div className="space-y-1">
                    <label
                      htmlFor="entrega-cta-garantia"
                      className="text-[11px] font-semibold text-[#4B5563]"
                    >
                      Cuenta de custodia
                    </label>
                    <select
                      id="entrega-cta-garantia"
                      value={data.cuentaGarantiaId}
                      onChange={(e) =>
                        onChange({ cuentaGarantiaId: e.target.value })
                      }
                      className="w-full min-h-[48px] rounded-xl bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base font-medium text-[#111827]"
                    >
                      {cuentasFinancieras.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label
                    htmlFor="entrega-ref-garantia"
                    className="text-[11px] font-semibold text-[#4B5563]"
                  >
                    Referencia de fianza
                  </label>
                  <input
                    id="entrega-ref-garantia"
                    type="text"
                    value={data.referenciaGarantia}
                    onChange={(e) =>
                      onChange({ referenciaGarantia: e.target.value })
                    }
                    placeholder="Recibo o voucher"
                    className="w-full min-h-[48px] rounded-xl bg-white border border-[#9CA3AF]/40 px-3.5 py-2 text-base text-[#111827]"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
