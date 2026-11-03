import { useState, useId } from 'react';
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

const SUGERENCIAS_INGRESO: Array<{ label: string; categoria: CategoriaIngreso; texto: string }> = [
  { label: 'Pago Alquiler', categoria: 'PAGO_ALQUILER', texto: 'Pago de alquiler de vehículo' },
  { label: 'Abono Contrato', categoria: 'ABONO_CONTRATO', texto: 'Abono parcial a contrato' },
  { label: 'Garantía', categoria: 'DEPOSITO_GARANTIA', texto: 'Depósito de garantía en custodia' },
  { label: 'Prórroga', categoria: 'EXTENSION_ALQUILER', texto: 'Extensión de días de alquiler' },
  { label: 'Servicio Extra', categoria: 'SERVICIOS_ADICIONALES', texto: 'Cobro de servicio adicional' },
];

const SUGERENCIAS_EGRESO: Array<{ label: string; categoria: CategoriaEgreso; texto: string }> = [
  { label: 'Mantenimiento', categoria: 'MANTENIMIENTO_REPARACION', texto: 'Mantenimiento preventivo / correctivo' },
  { label: 'Combustible', categoria: 'COMBUSTIBLE_OPERACION', texto: 'Combustible / recarga para flota' },
  { label: 'Lavado / Aseo', categoria: 'LIMPIEZA_ALISTAMIENTO', texto: 'Lavado y alistamiento de unidad' },
  { label: 'Seguros / SOAT', categoria: 'SEGUROS_IMPUESTOS', texto: 'Pago de póliza / SOAT' },
  { label: 'Suministros', categoria: 'COMPRAS_ADMINISTRATIVAS', texto: 'Compras operativas de patio' },
];

export function ModalMovimiento({
  isOpen,
  onClose,
  tipoInicial,
  cuentas,
  contratos,
  onSubmit,
}: ModalMovimientoProps) {
  const montoInputId = useId();
  const conceptoInputId = useId();
  const cuentaInputId = useId();
  const metodoInputId = useId();

  const [tipo, setTipo] = useState<TipoMovimientoCaja>(tipoInicial);
  const [categoria, setCategoria] = useState<string>(
    tipoInicial === 'INGRESO' ? 'PAGO_ALQUILER' : 'MANTENIMIENTO_REPARACION'
  );
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoFinanciero>('efectivo');
  const [cuentaId, setCuentaId] = useState<string>(cuentas[0]?.id ?? '');
  const [mostrarOpcionesAvanzadas, setMostrarOpcionesAvanzadas] = useState(false);

  // Campos opcionales (Progressive Disclosure)
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

  const aplicarSugerencia = (texto: string, cat: string) => {
    setConcepto(texto);
    setCategoria(cat);
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
      setErrorValidacion('Por favor ingresa un monto válido mayor a 0.');
      return;
    }

    if (!concepto.trim() || concepto.trim().length < 3) {
      setErrorValidacion('Describe brevemente el motivo del movimiento (mínimo 3 caracteres).');
      return;
    }

    if (!cuentaId) {
      setErrorValidacion('Selecciona la cuenta o caja donde se registra el dinero.');
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
      setErrorValidacion(
        err instanceof Error ? err.message : 'No se pudo guardar el movimiento. Intenta de nuevo.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const montoNumerico = parseFloat(monto.replace(/[^\d.-]/g, '')) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-[28px] sm:rounded-[32px] border border-[#9CA3AF]/30 bg-white p-5 sm:p-7 shadow-2xl my-auto max-h-[92vh] overflow-y-auto space-y-5">
        {/* Cabecera iOS con jerarquía clara */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
              Caja Operativa · Registro Rápido
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#111827]">
              {tipo === 'INGRESO' ? 'Registrar nuevo ingreso' : 'Registrar nuevo gasto'}
            </h2>
            <p className="text-xs text-[#4B5563]">
              {tipo === 'INGRESO'
                ? 'Ingresa el dinero recaudado por alquileres, abonos o servicios.'
                : 'Ingresa los pagos de taller, compras, combustible o insumos.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EDEDED] text-[#4B5563] transition hover:bg-[#9CA3AF]/30 cursor-pointer"
            aria-label="Cerrar ventana"
          >
            ✕
          </button>
        </div>

        {/* Selector de Tipo (Pills Suaves) */}
        <div className="flex rounded-2xl bg-[#EDEDED] p-1 gap-1">
          <button
            type="button"
            onClick={() => handleTipoChange('INGRESO')}
            className={`flex-1 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              tipo === 'INGRESO'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            + Dinero que entra (Ingreso)
          </button>
          <button
            type="button"
            onClick={() => handleTipoChange('EGRESO')}
            className={`flex-1 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              tipo === 'EGRESO'
                ? 'bg-[#111827] text-white shadow-xs'
                : 'text-[#4B5563] hover:text-[#111827]'
            }`}
          >
            − Dinero que sale (Gasto)
          </button>
        </div>

        {errorValidacion && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50/70 p-3.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <span>⚠</span>
            <span>{errorValidacion}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Hero: Valor (Estilo idéntico a Step5Tarifas de vehículo) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor={montoInputId}
                className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
              >
                ¿Cuánto dinero es? <span className="text-rose-600">*</span>
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
                min="100"
                step="500"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                className="w-full rounded-2xl bg-[#EDEDED]/50 pl-11 sm:pl-12 pr-4 sm:pr-5 py-3.5 sm:py-4 font-mono text-2xl sm:text-3xl font-bold text-[#111827] placeholder-[#9CA3AF] border border-transparent focus:border-[#111827] focus:bg-white focus:outline-hidden transition-all"
                required
              />
            </div>
          </div>

          {/* Campo: Concepto o Motivo */}
          <div className="space-y-1.5">
            <label
              htmlFor={conceptoInputId}
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
            >
              ¿Cuál es el motivo? <span className="text-rose-600">*</span>
            </label>
            <input
              id={conceptoInputId}
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder={
                tipo === 'INGRESO'
                  ? 'Ej. Pago de alquiler de vehículo, Abono...'
                  : 'Ej. Cambio de aceite, Combustible, Lavado...'
              }
              className="w-full rounded-2xl bg-[#EDEDED]/50 px-4 py-3 text-base text-[#111827] placeholder-[#9CA3AF] border border-transparent focus:border-[#111827] focus:bg-white focus:outline-hidden transition-all"
              required
            />

            {/* Atajos / Sugerencias rápidas con un clic */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-[#4B5563] font-medium mr-1">Rápido:</span>
              {(tipo === 'INGRESO' ? SUGERENCIAS_INGRESO : SUGERENCIAS_EGRESO).map((sug) => (
                <button
                  key={sug.label}
                  type="button"
                  onClick={() => aplicarSugerencia(sug.texto, sug.categoria)}
                  className="rounded-lg bg-[#EDEDED] px-2.5 py-1 text-[11px] font-semibold text-[#4B5563] hover:bg-[#9CA3AF]/30 hover:text-[#111827] transition cursor-pointer"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cuenta y Método de Pago (2 Columnas Limpias) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label
                htmlFor={cuentaInputId}
                className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
              >
                {tipo === 'INGRESO' ? '¿Dónde entra el dinero?' : '¿De dónde sale el dinero?'}
              </label>
              <select
                id={cuentaInputId}
                value={cuentaId}
                onChange={(e) => setCuentaId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-[#EDEDED]/40 px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:bg-white focus:outline-hidden transition"
                required
              >
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.tipo === 'CAJA_EFECTIVO' ? 'Efectivo en Patio' : 'Banco'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor={metodoInputId}
                className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]"
              >
                Método de pago
              </label>
              <select
                id={metodoInputId}
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPagoFinanciero)}
                className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-[#EDEDED]/40 px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:bg-white focus:outline-hidden transition"
                required
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="tarjeta">Tarjeta Débito / Crédito</option>
                <option value="otro">Otro medio</option>
              </select>
            </div>
          </div>

          {/* Botón de Detalles Opcionales (Progressive Disclosure) */}
          <div className="pt-2 border-t border-[#EDEDED]">
            <button
              type="button"
              onClick={() => setMostrarOpcionesAvanzadas(!mostrarOpcionesAvanzadas)}
              className="flex items-center justify-between w-full py-1 text-xs font-bold text-[#4B5563] hover:text-[#111827] transition cursor-pointer"
            >
              <span>
                {mostrarOpcionesAvanzadas ? '− Ocultar detalles adicionales' : '+ Agregar detalles opcionales (Contrato, Factura, Cliente)'}
              </span>
              <span className="text-[11px] font-mono">{mostrarOpcionesAvanzadas ? '▲' : '▼'}</span>
            </button>

            {mostrarOpcionesAvanzadas && (
              <div className="mt-3 space-y-3 rounded-2xl bg-[#EDEDED]/30 p-3.5 border border-[#9CA3AF]/20 animate-fade-in">
                {/* Vincular Contrato */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                    Vincular a Contrato Activo
                  </label>
                  <select
                    value={contratoId}
                    onChange={(e) => handleContratoSeleccionado(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                  >
                    <option value="">-- No vincular a contrato --</option>
                    {contratos.map((c) => (
                      <option key={c.codigoContrato} value={c.codigoContrato}>
                        {c.codigoContrato} · {c.clienteNombre} ({c.vehiculoPlaca}) — Saldo: ${c.saldoPendiente.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                      {tipo === 'INGRESO' ? 'Nombre del Cliente' : 'Proveedor / Taller'}
                    </label>
                    <input
                      type="text"
                      placeholder={tipo === 'INGRESO' ? 'Nombre o empresa' : 'Taller o proveedor'}
                      value={tipo === 'INGRESO' ? clienteNombre : proveedor}
                      onChange={(e) =>
                        tipo === 'INGRESO'
                          ? setClienteNombre(e.target.value)
                          : setProveedor(e.target.value)
                      }
                      className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                      N° Factura / Referencia
                    </label>
                    <input
                      type="text"
                      placeholder="N° Comprobante / Recibo"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                    />
                  </div>
                </div>

                {tipo === 'EGRESO' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                      Placa del Vehículo Imputado
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. ABC-123"
                      value={vehiculoId}
                      onChange={(e) => setVehiculoId(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                    Notas adicionales
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles complementarios..."
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botones de Acción (iOS Press Bounce & Thumb friendly) */}
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
              className={`ios-press-bounce min-h-[44px] rounded-full px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-2 ${
                tipo === 'INGRESO'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-[#111827] hover:bg-[#1F2937]'
              }`}
            >
              {guardando ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar {tipo === 'INGRESO' ? 'Ingreso' : 'Gasto'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
