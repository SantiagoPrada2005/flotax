import { useState } from 'react';
import type {
  CuentaFinancieraSelect,
  TipoMovimientoCaja,
  CategoriaIngreso,
  CategoriaEgreso,
  MetodoPagoFinanciero,
  ContratoCarteraItem,
} from '@/lib/caja';

export interface ModalMovimientoProps {
  isOpen: boolean;
  onClose: () => void;
  tipoInicial: TipoMovimientoCaja;
  cuentas: CuentaFinancieraSelect[];
  contratos: ContratoCarteraItem[];
  onSubmit: (datos: {
    tipo: TipoMovimientoCaja;
    categoria: string;
    concepto: string;
    monto: number;
    metodoPago: MetodoPagoFinanciero;
    cuentaId: string;
    contratoId?: string | undefined;
    clienteNombre?: string | undefined;
    vehiculoId?: string | undefined;
    proveedor?: string | undefined;
    referencia?: string | undefined;
    observaciones?: string | undefined;
  }) => Promise<void>;
}

const CATEGORIAS_INGRESO: Array<{ id: CategoriaIngreso; label: string }> = [
  { id: 'PAGO_ALQUILER', label: 'Pago de Alquiler / Liquidación Waybill' },
  { id: 'ABONO_CONTRATO', label: 'Abono Parcial a Contrato' },
  { id: 'EXTENSION_ALQUILER', label: 'Pago por Prórroga / Extensión' },
  { id: 'SERVICIOS_ADICIONALES', label: 'Cobro por Servicios Adicionales' },
  { id: 'COBRO_DANOS_MULTAS', label: 'Cobro por Daños, Deducibles o Multas' },
  { id: 'DEPOSITO_GARANTIA', label: 'Recepción Depósito de Garantía (Custodia)' },
  { id: 'INGRESO_EXTRAORDINARIO', label: 'Ingreso Extraordinario' },
  { id: 'OTRO_INGRESO', label: 'Otros Ingresos' },
];

const CATEGORIAS_EGRESO: Array<{ id: CategoriaEgreso; label: string }> = [
  { id: 'MANTENIMIENTO_REPARACION', label: 'Mantenimiento y Reparación de Vehículo' },
  { id: 'COMBUSTIBLE_OPERACION', label: 'Combustible y Recarga Eléctrica' },
  { id: 'LIMPIEZA_ALISTAMIENTO', label: 'Lavado, Detailing y Alistamiento' },
  { id: 'SEGUROS_IMPUESTOS', label: 'Seguros, Pólizas, SOAT e Impuestos' },
  { id: 'COMISIONES_BANCARIAS', label: 'Comisiones Bancarias y Pasarelas' },
  { id: 'REEMBOLSO_GARANTIA', label: 'Reembolso / Restitución de Garantía' },
  { id: 'COMPRAS_ADMINISTRATIVAS', label: 'Suministros y Gastos Administrativos' },
  { id: 'OTRO_EGRESO', label: 'Otros Gastos Operativos' },
];

export function ModalMovimiento({
  isOpen,
  onClose,
  tipoInicial,
  cuentas,
  contratos,
  onSubmit,
}: ModalMovimientoProps) {
  const [tipo, setTipo] = useState<TipoMovimientoCaja>(tipoInicial);
  const [categoria, setCategoria] = useState<string>(
    tipoInicial === 'INGRESO' ? 'PAGO_ALQUILER' : 'MANTENIMIENTO_REPARACION'
  );
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoFinanciero>('efectivo');
  const [cuentaId, setCuentaId] = useState<string>(cuentas[0]?.id ?? '');
  const [contratoId, setContratoId] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState<string>('');
  const [vehiculoId, setVehiculoId] = useState<string>('');
  const [proveedor, setProveedor] = useState<string>('');
  const [referencia, setReferencia] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTipoChange = (nuevoTipo: TipoMovimientoCaja) => {
    setTipo(nuevoTipo);
    setCategoria(nuevoTipo === 'INGRESO' ? 'PAGO_ALQUILER' : 'MANTENIMIENTO_REPARACION');
  };

  const handleContratoSeleccionado = (cId: string) => {
    setContratoId(cId);
    if (!cId) return;
    const contrato = contratos.find((c) => c.codigoContrato === cId);
    if (contrato) {
      setClienteNombre(contrato.clienteNombre);
      setVehiculoId(contrato.vehiculoPlaca);
      setConcepto(
        tipo === 'INGRESO'
          ? `Abono contrato #${contrato.codigoContrato} (${contrato.vehiculoNombre})`
          : `Gasto imputado a contrato #${contrato.codigoContrato}`
      );
      if (tipo === 'INGRESO' && contrato.saldoPendiente > 0) {
        setMonto(String(contrato.saldoPendiente));
      }
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErrorValidacion(null);

    const valorNumerico = parseFloat(monto.replace(/[^\d.-]/g, ''));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setErrorValidacion('Ingresa un valor numérico positivo para el monto.');
      return;
    }

    if (!concepto.trim() || concepto.trim().length < 3) {
      setErrorValidacion('El concepto debe contener al menos 3 caracteres.');
      return;
    }

    if (!cuentaId) {
      setErrorValidacion('Debes seleccionar una cuenta o caja de destino/origen.');
      return;
    }

    try {
      setGuardando(true);
      await onSubmit({
        tipo,
        categoria,
        concepto: concepto.trim(),
        monto: Math.round(valorNumerico),
        metodoPago,
        cuentaId,
        contratoId: contratoId ? contratoId : undefined,
        clienteNombre: clienteNombre ? clienteNombre.trim() : undefined,
        vehiculoId: vehiculoId ? vehiculoId.trim() : undefined,
        proveedor: proveedor ? proveedor.trim() : undefined,
        referencia: referencia ? referencia.trim() : undefined,
        observaciones: observaciones ? observaciones.trim() : undefined,
      });
      onClose();
    } catch (err) {
      setErrorValidacion(err instanceof Error ? err.message : 'Error al guardar el movimiento');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-[28px] border border-[#9CA3AF]/30 bg-white p-5 sm:p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              Operación Financiera
            </span>
            <h2 className="font-display text-xl font-black text-[#111827]">
              {tipo === 'INGRESO' ? 'Registrar Ingreso' : 'Registrar Egreso'}
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

        {/* Selector de Tipo (Ingreso / Egreso) */}
        <div className="mt-4 flex rounded-xl bg-[#EDEDED] p-1">
          <button
            type="button"
            onClick={() => handleTipoChange('INGRESO')}
            className={`flex-1 min-h-[44px] rounded-lg text-sm font-bold transition ${
              tipo === 'INGRESO'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            + Ingreso (Recaudo)
          </button>
          <button
            type="button"
            onClick={() => handleTipoChange('EGRESO')}
            className={`flex-1 min-h-[44px] rounded-lg text-sm font-bold transition ${
              tipo === 'EGRESO'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            - Egreso (Gasto)
          </button>
        </div>

        {errorValidacion && (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            {errorValidacion}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Categoría */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              Categoría Contable *
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              required
            >
              {tipo === 'INGRESO'
                ? CATEGORIAS_INGRESO.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))
                : CATEGORIAS_EGRESO.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
            </select>
          </div>

          {/* Valor y Método de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                Valor en COP *
              </label>
              <input
                type="number"
                step="1000"
                min="1"
                placeholder="Ej. 250000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base font-bold text-[#111827] focus:border-[#111827] focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                Método de Pago *
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPagoFinanciero)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                required
              >
                <option value="efectivo">Efectivo (Caja Física)</option>
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="tarjeta">Tarjeta Débito / Crédito</option>
                <option value="especie">En Especie / Permuta</option>
                <option value="otro">Otro Método</option>
              </select>
            </div>
          </div>

          {/* Cuenta Destino / Origen */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              {tipo === 'INGRESO' ? 'Cuenta de Depósito / Caja *' : 'Cuenta de Salida / Caja *'}
            </label>
            <select
              value={cuentaId}
              onChange={(e) => setCuentaId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              required
            >
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.tipo})
                </option>
              ))}
            </select>
          </div>

          {/* Concepto */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              Concepto / Justificación *
            </label>
            <input
              type="text"
              placeholder="Descripción clara de la operación comercial..."
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              required
            />
          </div>

          {/* Vincular Contrato Existente (Opcional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              Vincular Contrato / Alquiler (Opcional)
            </label>
            <select
              value={contratoId}
              onChange={(e) => handleContratoSeleccionado(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
            >
              <option value="">-- No vincular a contrato --</option>
              {contratos.map((c) => (
                <option key={c.codigoContrato} value={c.codigoContrato}>
                  {c.codigoContrato} · {c.clienteNombre} ({c.vehiculoNombre}) - Saldo: ${c.saldoPendiente.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Proveedor (en caso de egreso) o Cliente (en caso de ingreso) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tipo === 'EGRESO' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                    Proveedor / Taller
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Serviteca Poblado"
                    value={proveedor}
                    onChange={(e) => setProveedor(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                    Placa / Unidad de Flota Imputada (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. FLX-801 o veh-mercedes-eqb"
                    value={vehiculoId}
                    onChange={(e) => setVehiculoId(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                  Cliente Registrado
                </label>
                <input
                  type="text"
                  placeholder="Nombre del cliente"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                Referencia / Factura / Voucher
              </label>
              <input
                type="text"
                placeholder="N° Comprobante"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
              Observaciones Internas
            </label>
            <textarea
              rows={2}
              placeholder="Detalles complementarios de la operación..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full rounded-xl border border-[#9CA3AF]/50 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
            />
          </div>

          {/* Botones de acción */}
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
              className={`min-h-[44px] rounded-full px-6 py-2 text-sm font-bold text-white shadow-sm transition active:scale-95 ${
                tipo === 'INGRESO'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {guardando ? 'Asentando...' : `Confirmar ${tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
