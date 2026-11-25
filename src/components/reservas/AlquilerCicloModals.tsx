import { useState, type SyntheticEvent } from 'react';
import { actions } from 'astro:actions';
import type { ReservaClienteItem } from '@/lib/flota';
import type { CapacidadesOperacionAlquiler } from '@/lib/auth/capacidades-alquiler';
import { Select } from '@/components/ui/Select';

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

// ============================================================================
// 1. MODAL PAUSAR ALQUILER
// ============================================================================
export interface ModalPausarProps {
  isOpen: boolean;
  onClose: () => void;
  reserva: ReservaClienteItem;
  onExito: (reservaActualizada: ReservaClienteItem, mensaje?: string) => void;
}

export function ModalPausar({ isOpen, onClose, reserva, onExito }: ModalPausarProps) {
  const [diasPausa, setDiasPausa] = useState<number>(1);
  const [motivo, setMotivo] = useState<string>('Alquiler pausado por acuerdo mutuo');
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const manejarSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setGuardando(true);

    try {
      const res = await actions.reservas.pausarAlquiler({
        codigo: reserva.codigo,
        diasPausa,
        motivo: motivo.trim() || undefined,
      });

      if (res.error || !res.data?.ok) {
        setErrorMsg(res.error?.message || 'No fue posible pausar el alquiler.');
        return;
      }

      const resv = res.data.reserva;
      onExito({
        ...reserva,
        estado: 'PAUSADA',
        fechaFin: resv.fechaFin,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado al pausar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-pausar-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/65 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md rounded-[28px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#9CA3AF]/30 dark:border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
              Ciclo de Alquiler · Acuerdo
            </span>
            <h3
              id="modal-pausar-titulo"
              className="font-display text-lg font-black text-[#111827] dark:text-[#EDEDED]"
            >
              Pausar Alquiler #{reserva.codigo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#EDEDED] dark:bg-[#111827] dark:border dark:border-white/15 text-[#111827] dark:text-[#EDEDED] font-bold hover:bg-[#9CA3AF]/30 dark:hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[14px] bg-[#111827] border border-transparent dark:border-white/15 text-white p-3 text-xs font-semibold"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-4">
          <div className="rounded-[18px] bg-[#EDEDED] dark:bg-[#111827] dark:border dark:border-white/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
                Impacto en Tarifa y Calendario
              </span>
              <span className="rounded-full bg-[#111827] dark:bg-[#EDEDED] text-white dark:text-[#111827] px-2.5 py-0.5 text-[10px] font-black">
                Costo $0 COP
              </span>
            </div>
            <p className="text-[11px] text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
              La unidad pasa a estado <span className="font-bold text-[#111827] dark:text-[#EDEDED]">NO_DISPONIBLE</span> durante la pausa. Se bloquean los días en el calendario sin generar cobro adicional para el cliente.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5">
              Días de pausa a añadir
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[1, 2, 3, 5].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiasPausa(d)}
                  className={`min-h-[44px] rounded-[14px] font-bold text-xs cursor-pointer border ${
                    diasPausa === d
                      ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                      : 'bg-[#EDEDED] dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/40 dark:border-white/15 hover:bg-white dark:hover:bg-white/10'
                  }`}
                >
                  +{d} {d === 1 ? 'día' : 'días'}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={30}
              value={diasPausa}
              onChange={(e) => setDiasPausa(Math.max(1, Number(e.target.value)))}
              className="w-full min-h-[48px] rounded-[14px] bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF] dark:border-white/15 px-3.5 py-2.5 text-base text-[#111827] dark:text-[#EDEDED] font-semibold focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-[#EDEDED]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5">
              Motivo o acuerdo de la pausa
            </label>
            <textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Detalle el motivo acordado con el cliente..."
              className="w-full rounded-[14px] bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF] dark:border-white/15 px-3.5 py-2.5 text-base text-[#111827] dark:text-[#EDEDED] focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-[#EDEDED]"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-full bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF]/60 dark:border-white/15 px-5 py-2.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="min-h-[44px] rounded-full bg-[#111827] dark:bg-[#EDEDED] px-6 py-2.5 text-xs font-bold text-white dark:text-[#111827] hover:bg-[#1F2937] dark:hover:bg-white disabled:opacity-50 cursor-pointer"
            >
              {guardando ? 'Pausando...' : `Confirmar Pausa (+${diasPausa}d $0)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 2. MODAL PRORROGAR ALQUILER
// ============================================================================
export interface ModalProrrogarProps {
  isOpen: boolean;
  onClose: () => void;
  reserva: ReservaClienteItem;
  capacidades?: CapacidadesOperacionAlquiler | undefined;
  onExito: (reservaActualizada: ReservaClienteItem, mensaje?: string) => void;
}

export function ModalProrrogar({
  isOpen,
  onClose,
  reserva,
  capacidades,
  onExito,
}: ModalProrrogarProps) {
  const [diasExtra, setDiasExtra] = useState<number>(1);
  const [modalidadTarifa, setModalidadTarifa] = useState<
    'TARIFA_ESTANDAR' | 'MISMO_PRECIO' | 'PRECIO_PACTADO'
  >('TARIFA_ESTANDAR');
  const [montoAcordado, setMontoAcordado] = useState<number>(reserva.vehiculo.precioDia);
  const [clausulaAcuerdo, setClausulaAcuerdo] = useState<string>('');
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const precioDiaEst = reserva.vehiculo.precioDia;
  const costoProyectado =
    modalidadTarifa === 'MISMO_PRECIO'
      ? 0
      : modalidadTarifa === 'TARIFA_ESTANDAR'
        ? diasExtra * precioDiaEst
        : montoAcordado;

  const manejarSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setGuardando(true);

    try {
      const res = await actions.reservas.prorrogarAlquiler({
        codigo: reserva.codigo,
        diasExtra,
        modalidadTarifa,
        montoAcordado: modalidadTarifa === 'PRECIO_PACTADO' ? montoAcordado : undefined,
        clausulaAcuerdo: clausulaAcuerdo.trim() || undefined,
      });

      if (res.error || !res.data?.ok) {
        setErrorMsg(res.error?.message || 'No fue posible prorrogar el alquiler.');
        return;
      }

      const resv = res.data.reserva;
      onExito({
        ...reserva,
        fechaFin: resv.fechaFin,
        diasAlquiler: resv.diasAlquiler,
        totalAlquiler: resv.totalCotizado,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado al prorrogar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-prorrogar-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/65 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md rounded-[28px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#9CA3AF]/30 dark:border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
              Extensión de Días · FlotaX
            </span>
            <h3
              id="modal-prorrogar-titulo"
              className="font-display text-lg font-black text-[#111827] dark:text-[#EDEDED]"
            >
              Prorrogar Alquiler #{reserva.codigo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#EDEDED] dark:bg-[#111827] dark:border dark:border-white/15 text-[#111827] dark:text-[#EDEDED] font-bold hover:bg-[#9CA3AF]/30 dark:hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[14px] bg-[#111827] border border-transparent dark:border-white/15 text-white p-3 text-xs font-semibold"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5">
              Días adicionales a prorrogar
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[1, 2, 3, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDiasExtra(d);
                    if (modalidadTarifa === 'PRECIO_PACTADO') {
                      setMontoAcordado(d * precioDiaEst);
                    }
                  }}
                  className={`min-h-[44px] rounded-[14px] font-bold text-xs cursor-pointer border ${
                    diasExtra === d
                      ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                      : 'bg-[#EDEDED] dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/40 dark:border-white/15 hover:bg-white dark:hover:bg-white/10'
                  }`}
                >
                  +{d} {d === 1 ? 'día' : 'días'}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={60}
              value={diasExtra}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value));
                setDiasExtra(val);
                if (modalidadTarifa === 'PRECIO_PACTADO') {
                  setMontoAcordado(val * precioDiaEst);
                }
              }}
              className="w-full min-h-[48px] rounded-[14px] bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF] dark:border-white/15 px-3.5 py-2.5 text-base text-[#111827] dark:text-[#EDEDED] font-semibold focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-[#EDEDED]"
            />
          </div>

          {/* Modalidad de Tarifa (Con gating RBAC) */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
              Modalidad de tarifa para la prórroga
            </span>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-[14px] bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF]/40 dark:border-white/15 cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="modalidadTarifa"
                    value="TARIFA_ESTANDAR"
                    checked={modalidadTarifa === 'TARIFA_ESTANDAR'}
                    onChange={() => setModalidadTarifa('TARIFA_ESTANDAR')}
                    className="h-4 w-4 accent-[#111827] dark:accent-[#EDEDED]"
                  />
                  <div>
                    <span className="text-xs font-bold block text-[#111827] dark:text-[#EDEDED]">
                      Tarifa Estándar ({formatCop(precioDiaEst)}/día)
                    </span>
                    <span className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                      Cálculo automático según catálogo del vehículo
                    </span>
                  </div>
                </div>
                <span className="font-bold text-xs text-[#111827] dark:text-[#EDEDED]">
                  +{formatCop(diasExtra * precioDiaEst)}
                </span>
              </label>

              {capacidades?.puedeAjustarTarifasYCargos && (
                <>
                  <label className="flex items-center justify-between p-3 rounded-[14px] bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF]/40 dark:border-white/15 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="modalidadTarifa"
                        value="MISMO_PRECIO"
                        checked={modalidadTarifa === 'MISMO_PRECIO'}
                        onChange={() => setModalidadTarifa('MISMO_PRECIO')}
                        className="h-4 w-4 accent-[#111827] dark:accent-[#EDEDED]"
                      />
                      <div>
                        <span className="text-xs font-bold block text-[#111827] dark:text-[#EDEDED]">
                          Mismo Precio ($0 COP)
                        </span>
                        <span className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                          Extensión de cortesía o ajuste comercial
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-xs text-[#111827] dark:text-[#EDEDED]">$0 COP</span>
                  </label>

                  <label className="flex items-start justify-between p-3 rounded-[14px] bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF]/40 dark:border-white/15 cursor-pointer">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="modalidadTarifa"
                        value="PRECIO_PACTADO"
                        checked={modalidadTarifa === 'PRECIO_PACTADO'}
                        onChange={() => setModalidadTarifa('PRECIO_PACTADO')}
                        className="h-4 w-4 mt-0.5 accent-[#111827] dark:accent-[#EDEDED]"
                      />
                      <div>
                        <span className="text-xs font-bold block text-[#111827] dark:text-[#EDEDED]">
                          Precio Pactado
                        </span>
                        <span className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                          Monto acordado directamente con el cliente
                        </span>
                      </div>
                    </div>
                  </label>
                </>
              )}
            </div>

            {modalidadTarifa === 'PRECIO_PACTADO' && (
              <div className="pt-1">
                <label className="block text-[11px] font-bold text-[#111827] dark:text-[#EDEDED] mb-1">
                  Monto acordado total (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={montoAcordado}
                  onChange={(e) => setMontoAcordado(Math.max(0, Number(e.target.value)))}
                  className="w-full min-h-[48px] rounded-[14px] bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF] dark:border-white/15 px-3.5 py-2.5 text-base text-[#111827] dark:text-[#EDEDED] font-bold focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-[#EDEDED]"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5">
              Cláusula o nota de acuerdo (opcional)
            </label>
            <textarea
              rows={2}
              value={clausulaAcuerdo}
              onChange={(e) => setClausulaAcuerdo(e.target.value)}
              placeholder="Ej. Acuerdo pactado con cliente por viaje a Guatapé..."
              className="w-full rounded-[14px] bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF] dark:border-white/15 px-3.5 py-2.5 text-base text-[#111827] dark:text-[#EDEDED] focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-[#EDEDED]"
            />
          </div>

          <div className="flex items-center justify-between rounded-[18px] bg-[#111827] border border-transparent dark:border-white/15 text-white p-3.5">
            <div>
              <span className="text-[10px] text-[#9CA3AF] uppercase font-bold block">
                Incremento a liquidar
              </span>
              <span className="font-display text-base font-black text-white">
                +{formatCop(costoProyectado)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="min-h-[44px] rounded-full bg-white text-[#111827] px-5 py-2 text-xs font-bold hover:bg-[#EDEDED] disabled:opacity-50 cursor-pointer"
              >
                {guardando ? 'Guardando...' : 'Aplicar Prórroga'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 3. MODAL DEVOLVER Y CERRAR ALQUILER
// ============================================================================
export interface ModalDevolverCerrarProps {
  isOpen: boolean;
  onClose: () => void;
  reserva: ReservaClienteItem;
  capacidades?: CapacidadesOperacionAlquiler | undefined;
  cuentasFinancieras?: Array<{ id: string; nombre: string; tipo: string }> | undefined;
  hoyISO: string;
  onExito: (reservaActualizada: ReservaClienteItem, mensaje?: string) => void;
}

export function ModalDevolverCerrar({
  isOpen,
  onClose,
  reserva,
  capacidades,
  cuentasFinancieras,
  hoyISO,
  onExito,
}: ModalDevolverCerrarProps) {
  const [pasoDevolucion, setPasoDevolucion] = useState<1 | 2 | 3 | 4>(1);
  const [mostrarAjustesExtra, setMostrarAjustesExtra] = useState<boolean>(false);
  const [fechaDevolucionReal, setFechaDevolucionReal] = useState<string>(hoyISO);
  const [medidorUsoRetorno, setMedidorUsoRetorno] = useState<number>(
    reserva.kilometrajeRetorno || reserva.kilometrajeEntrega + reserva.diasAlquiler * 55
  );
  const [nivelEnergiaRetornoPct, setNivelEnergiaRetornoPct] = useState<number>(85);
  const [clausulaEncargado, setClausulaEncargado] = useState<string>('');
  const [sobrecostoLocal, setSobrecostoLocal] = useState<number>(0);
  const [motivoSobrecosto, setMotivoSobrecosto] = useState<string>('');
  const [descuentoAjusteLocal, setDescuentoAjusteLocal] = useState<number>(0);
  const [motivoDescuento, setMotivoDescuento] = useState<string>('');

  // Caja y Saldo
  const [cobrarSaldoAhora, setCobrarSaldoAhora] = useState<boolean>(true);
  const [metodoCobro, setMetodoCobro] = useState<
    'efectivo' | 'transferencia' | 'tarjeta'
  >('efectivo');
  const [cuentaCobroId, setCuentaCobroId] = useState<string>(
    cuentasFinancieras?.[0]?.id ?? ''
  );
  const [resolucionExcedente, setResolucionExcedente] = useState<
    'REEMBOLSO_ALQUILER' | 'RETENER_SALDO_LOCAL'
  >('REEMBOLSO_ALQUILER');
  const [cuentaReembolsoId, setCuentaReembolsoId] = useState<string>(
    cuentasFinancieras?.[0]?.id ?? ''
  );

  // Garantía
  const [resolucionGarantia, setResolucionGarantia] = useState<
    'DEVOLVER_TOTAL' | 'DEVOLVER_PARCIAL' | 'RETENER_CARGOS' | 'DEJAR_CUSTODIA'
  >('DEVOLVER_TOTAL');
  const [montoDevolverGarantia, setMontoDevolverGarantia] = useState<number>(
    reserva.vehiculo.depositoGarantia || 1500000
  );
  const [cuentaGarantiaId, setCuentaGarantiaId] = useState<string>(
    cuentasFinancieras?.[0]?.id ?? ''
  );
  const [motivoRetencionGarantia, setMotivoRetencionGarantia] = useState<string>('');

  // Taller
  const [requiereMantenimiento, setRequiereMantenimiento] = useState<boolean>(false);
  const [tipoMantenimiento, setTipoMantenimiento] = useState<
    'PREVENTIVO' | 'CORRECTIVO_NOVEDAD' | 'ALISTAMIENTO'
  >('CORRECTIVO_NOVEDAD');
  const [fechaFinTaller, setFechaFinTaller] = useState<string>(hoyISO);

  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Cálculos financieros en vivo
  const totalConAjustes =
    reserva.totalAlquiler + sobrecostoLocal - descuentoAjusteLocal;
  const saldoDiferencia = totalConAjustes - reserva.montoReportado;
  const tieneSaldoPendiente = saldoDiferencia > 0;
  const tieneExcedente = saldoDiferencia < 0;

  const pasosDevolucion = [
    { num: 1 as const, label: 'Telemetría' },
    { num: 2 as const, label: 'Ajustes' },
    { num: 3 as const, label: 'Liquidación' },
    { num: 4 as const, label: 'Garantía' },
  ];

  const avanzarPaso = () => {
    setErrorMsg(null);
    if (pasoDevolucion === 2) {
      if (sobrecostoLocal > 0 && !motivoSobrecosto.trim()) {
        setErrorMsg('Especifica el motivo del sobrecosto antes de continuar.');
        return;
      }
      if (descuentoAjusteLocal > 0 && !motivoDescuento.trim()) {
        setErrorMsg('Especifica el motivo del descuento antes de continuar.');
        return;
      }
    }
    setPasoDevolucion((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev));
  };

  const retrocederPaso = () => {
    setErrorMsg(null);
    setPasoDevolucion((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev));
  };

  const manejarSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    if (pasoDevolucion < 4) {
      avanzarPaso();
      return;
    }

    if (sobrecostoLocal > 0 && !motivoSobrecosto.trim()) {
      setErrorMsg('Debes especificar el motivo del sobrecosto establecido por el local.');
      setPasoDevolucion(2);
      return;
    }

    if (descuentoAjusteLocal > 0 && !motivoDescuento.trim()) {
      setErrorMsg('Debes especificar el motivo del descuento o ajuste aplicado.');
      setPasoDevolucion(2);
      return;
    }

    setGuardando(true);
    try {
      const res = await actions.reservas.devolverYCerrarAlquiler({
        codigo: reserva.codigo,
        fechaDevolucionReal,
        medidorUsoRetorno,
        nivelEnergiaRetornoPct,
        clausulaEncargado: clausulaEncargado.trim() || undefined,
        sobrecostoLocal: sobrecostoLocal > 0 ? sobrecostoLocal : undefined,
        motivoSobrecosto: motivoSobrecosto.trim() || undefined,
        descuentoAjusteLocal: descuentoAjusteLocal > 0 ? descuentoAjusteLocal : undefined,
        motivoDescuento: motivoDescuento.trim() || undefined,
        resolucionExcedente: tieneExcedente ? resolucionExcedente : undefined,
        cuentaReembolsoId:
          tieneExcedente && resolucionExcedente === 'REEMBOLSO_ALQUILER'
            ? cuentaReembolsoId
            : undefined,
        cobrarSaldoAhora:
          tieneSaldoPendiente && cobrarSaldoAhora
            ? {
                monto: saldoDiferencia,
                metodoPago: metodoCobro,
                cuentaId: cuentaCobroId || undefined,
                referencia: `Cierre contrato ${reserva.codigo}`,
              }
            : undefined,
        gestionGarantia: {
          accion: resolucionGarantia,
          montoDevolver:
            resolucionGarantia === 'DEVOLVER_PARCIAL' ? montoDevolverGarantia : undefined,
          cuentaId: cuentaGarantiaId || undefined,
          motivoRetencion: motivoRetencionGarantia.trim() || undefined,
        },
        requiereMantenimiento,
        tipoMantenimiento: requiereMantenimiento ? tipoMantenimiento : undefined,
        fechaFinEstimadaMantenimiento: requiereMantenimiento ? fechaFinTaller : undefined,
      });

      if (res.error || !res.data?.ok) {
        setErrorMsg(res.error?.message || 'No fue posible registrar la devolución y cierre.');
        return;
      }

      const resv = res.data.reserva;
      onExito({
        ...reserva,
        estado: 'COMPLETADA',
        fechaFin: resv.fechaFin,
        montoReportado: resv.montoAbonoReportado,
        kilometrajeRetorno: medidorUsoRetorno,
        requiereMantenimientoRetorno: requiereMantenimiento,
        estadoGarantia:
          resolucionGarantia === 'DEVOLVER_TOTAL' || resolucionGarantia === 'DEVOLVER_PARCIAL'
            ? 'LIBERADA'
            : resolucionGarantia === 'RETENER_CARGOS'
              ? 'RETENIDA_NOVEDAD'
              : 'CUSTODIA_ACTIVA',
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado al cerrar contrato.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-devolver-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/65 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="w-full max-w-md rounded-[28px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 p-5 sm:p-6 shadow-xl space-y-4">
        {/* Cabecera limpia con indicador de paso */}
        <div className="flex items-center justify-between border-b border-[#9CA3AF]/30 dark:border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
              Paso {pasoDevolucion} de 4 · Cierre de Contrato
            </span>
            <h3
              id="modal-devolver-titulo"
              className="font-display text-lg font-black text-[#111827] dark:text-[#EDEDED]"
            >
              Devolver #{reserva.codigo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#EDEDED] dark:bg-[#111827] dark:border dark:border-white/15 text-[#111827] dark:text-[#EDEDED] font-bold hover:bg-[#9CA3AF]/30 dark:hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Stepper horizontal de 4 slides (Progressive Disclosure) */}
        <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Etapas de devolución">
          {pasosDevolucion.map((item) => {
            const activo = pasoDevolucion === item.num;
            const completado = pasoDevolucion > item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => setPasoDevolucion(item.num)}
                className={`min-h-[38px] rounded-[12px] px-2 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                  activo
                    ? 'bg-[#111827] text-white dark:bg-[#EDEDED] dark:text-[#111827]'
                    : completado
                      ? 'bg-[#EDEDED] dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED]'
                      : 'bg-[#EDEDED]/50 dark:bg-[#111827]/60 text-[#4B5563] dark:text-[#9CA3AF]'
                }`}
              >
                {item.num}. {item.label}
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[14px] bg-[#111827] border border-transparent dark:border-white/15 text-white p-3 text-xs font-semibold"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-4 text-xs">
          {/* ===============================================================
              SLIDE 1: TELEMETRÍA DE RETORNO (1 sola caja enfocada)
              =============================================================== */}
          {pasoDevolucion === 1 && (
            <div className="rounded-[20px] bg-[#EDEDED]/70 dark:bg-[#111827] border border-[#9CA3AF]/40 dark:border-white/15 p-4 space-y-3.5 animate-fade-up">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block">
                  Recepción en patio
                </span>
                <h4 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                  Telemetría de entrada del vehículo
                </h4>
              </div>

              <div>
                <label className="block font-bold text-[#111827] dark:text-[#EDEDED] mb-1">
                  Fecha de devolución real
                </label>
                <input
                  type="date"
                  required
                  value={fechaDevolucionReal}
                  onChange={(e) => setFechaDevolucionReal(e.target.value)}
                  className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/60 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED] font-semibold focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-[#EDEDED]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111827] dark:text-[#EDEDED] mb-1">
                    Odómetro (km)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={medidorUsoRetorno}
                    onChange={(e) => setMedidorUsoRetorno(Number(e.target.value))}
                    className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/60 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED] font-bold focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-[#EDEDED]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#111827] dark:text-[#EDEDED] mb-1">
                    Nivel energía (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={nivelEnergiaRetornoPct}
                    onChange={(e) => setNivelEnergiaRetornoPct(Number(e.target.value))}
                    className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/60 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED] font-bold focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-[#EDEDED]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===============================================================
              SLIDE 2: AJUSTES DEL LOCAL (Progressive Disclosure)
              =============================================================== */}
          {pasoDevolucion === 2 && (
            <div className="rounded-[20px] bg-[#EDEDED]/70 dark:bg-[#111827] border border-[#9CA3AF]/40 dark:border-white/15 p-4 space-y-3.5 animate-fade-up">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block">
                    Condiciones de recepción
                  </span>
                  <h4 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                    Observaciones y ajustes
                  </h4>
                </div>
                <span className="rounded-full bg-white dark:bg-[#1F2937] px-2.5 py-1 font-mono text-[11px] font-bold text-[#111827] dark:text-[#EDEDED] border border-[#9CA3AF]/40 dark:border-white/15">
                  {sobrecostoLocal === 0 && descuentoAjusteLocal === 0
                    ? 'Sin cargos extra'
                    : `${formatCop(sobrecostoLocal - descuentoAjusteLocal)}`}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-[#4B5563] dark:text-[#D1D5DB] mb-1">
                  Observaciones de cierre (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Vehículo recibido a conformidad..."
                  value={clausulaEncargado}
                  onChange={(e) => setClausulaEncargado(e.target.value)}
                  className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/60 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED] focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-[#EDEDED]"
                />
              </div>

              {capacidades?.puedeAjustarTarifasYCargos && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setMostrarAjustesExtra((prev) => !prev)}
                    className="w-full min-h-[44px] flex items-center justify-between rounded-[14px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/50 dark:border-white/15 px-3.5 py-2.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
                  >
                    <span>
                      {mostrarAjustesExtra
                        ? '− Ocultar sobrecostos o descuentos'
                        : '+ Agregar sobrecosto o descuento del local'}
                    </span>
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">Opcional</span>
                  </button>

                  {mostrarAjustesExtra && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block font-semibold text-[#4B5563] dark:text-[#D1D5DB] mb-1">
                          Sobrecosto (+COP)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={sobrecostoLocal}
                          onChange={(e) =>
                            setSobrecostoLocal(Math.max(0, Number(e.target.value)))
                          }
                          className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/60 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED] font-bold"
                        />
                        {sobrecostoLocal > 0 && (
                          <input
                            type="text"
                            placeholder="Motivo del sobrecosto..."
                            value={motivoSobrecosto}
                            onChange={(e) => setMotivoSobrecosto(e.target.value)}
                            className="w-full min-h-[44px] rounded-[10px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/60 dark:border-white/15 px-2.5 py-1.5 text-base text-[#111827] dark:text-[#EDEDED] mt-1.5"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block font-semibold text-[#4B5563] dark:text-[#D1D5DB] mb-1">
                          Descuento (-COP)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={descuentoAjusteLocal}
                          onChange={(e) =>
                            setDescuentoAjusteLocal(Math.max(0, Number(e.target.value)))
                          }
                          className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/60 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED] font-bold"
                        />
                        {descuentoAjusteLocal > 0 && (
                          <input
                            type="text"
                            placeholder="Motivo del descuento..."
                            value={motivoDescuento}
                            onChange={(e) => setMotivoDescuento(e.target.value)}
                            className="w-full min-h-[44px] rounded-[10px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/60 dark:border-white/15 px-2.5 py-1.5 text-base text-[#111827] dark:text-[#EDEDED] mt-1.5"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===============================================================
              SLIDE 3: LIQUIDACIÓN FINANCIERA EN CAJA (1 sola tarjeta)
              =============================================================== */}
          {pasoDevolucion === 3 && (
            <div className="rounded-[20px] bg-[#111827] border border-transparent dark:border-white/15 text-white p-4 space-y-3.5 animate-fade-up">
              <div className="flex items-center justify-between border-b border-[#4B5563]/40 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] block">
                    Estado financiero final
                  </span>
                  <span className="font-display font-black text-base text-white">
                    Total neto: {formatCop(totalConAjustes)}
                  </span>
                </div>
                <span className="rounded-full bg-[#1F2937] border border-[#4B5563] px-2.5 py-1 text-[11px] font-bold text-[#EDEDED]">
                  Abonado: {formatCop(reserva.montoReportado)}
                </span>
              </div>

              {!tieneSaldoPendiente && !tieneExcedente && (
                <p className="text-xs text-[#EDEDED] py-2">
                  El contrato se encuentra 100% paz y salvo. No hay saldo pendiente por cobrar.
                </p>
              )}

              {tieneSaldoPendiente && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#EDEDED]">Saldo pendiente por cobrar:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {formatCop(saldoDiferencia)}
                    </span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cobrarSaldoAhora}
                      onChange={(e) => setCobrarSaldoAhora(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#EDEDED]"
                    />
                    <span className="font-semibold">Cobrar saldo ahora y asentar en caja</span>
                  </label>

                  {cobrarSaldoAhora && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1">
                          Cuenta de ingreso
                        </label>
                        <Select
                          ariaLabel="Cuenta de ingreso"
                          size="sm"
                          value={cuentaCobroId}
                          onChange={(val) => setCuentaCobroId(val)}
                          options={(cuentasFinancieras ?? []).map((c) => ({
                            value: c.id,
                            label: c.nombre,
                          }))}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1">
                          Método de pago
                        </label>
                        <Select<'efectivo' | 'transferencia' | 'tarjeta'>
                          ariaLabel="Método de pago"
                          size="sm"
                          value={metodoCobro}
                          onChange={(val) => setMetodoCobro(val)}
                          options={[
                            { value: 'efectivo', label: 'Efectivo' },
                            { value: 'transferencia', label: 'Transferencia / PSE' },
                            { value: 'tarjeta', label: 'Tarjeta Datáfono' },
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tieneExcedente && capacidades?.puedeReembolsarYAnularCaja && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span>Excedente a favor del cliente:</span>
                    <span className="font-bold text-[#EDEDED] text-sm">
                      {formatCop(Math.abs(saldoDiferencia))}
                    </span>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="resolucionExcedente"
                        value="REEMBOLSO_ALQUILER"
                        checked={resolucionExcedente === 'REEMBOLSO_ALQUILER'}
                        onChange={() => setResolucionExcedente('REEMBOLSO_ALQUILER')}
                        className="accent-[#EDEDED]"
                      />
                      <span>Reembolsar en caja</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="resolucionExcedente"
                        value="RETENER_SALDO_LOCAL"
                        checked={resolucionExcedente === 'RETENER_SALDO_LOCAL'}
                        onChange={() => setResolucionExcedente('RETENER_SALDO_LOCAL')}
                        className="accent-[#EDEDED]"
                      />
                      <span>Retener saldo local</span>
                    </label>
                  </div>

                  {resolucionExcedente === 'REEMBOLSO_ALQUILER' &&
                    cuentasFinancieras &&
                    cuentasFinancieras.length > 0 && (
                      <div className="pt-1">
                        <label
                          htmlFor="cuenta-reembolso-select"
                          className="block text-[10px] text-[#9CA3AF] mb-1"
                        >
                          Cuenta de salida para reembolso:
                        </label>
                        <Select
                          id="cuenta-reembolso-select"
                          ariaLabel="Cuenta de salida para reembolso"
                          size="sm"
                          value={cuentaReembolsoId}
                          onChange={(val) => setCuentaReembolsoId(val)}
                          options={cuentasFinancieras.map((c) => ({
                            value: c.id,
                            label: c.nombre,
                          }))}
                        />
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* ===============================================================
              SLIDE 4: DEPÓSITO DE GARANTÍA Y CIERRE FINAL (1 sola caja)
              =============================================================== */}
          {pasoDevolucion === 4 && (
            <div className="rounded-[20px] bg-[#EDEDED]/75 dark:bg-[#111827] border border-[#9CA3AF]/40 dark:border-white/15 p-4 space-y-3.5 animate-fade-up">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block">
                  Paso final de cierre
                </span>
                <h4 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                  Resolución de Depósito de Garantía
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'DEVOLVER_TOTAL', label: 'Devolver Total' },
                  { id: 'DEVOLVER_PARCIAL', label: 'Devolver Parcial' },
                  { id: 'RETENER_CARGOS', label: 'Retener Cargos' },
                  { id: 'DEJAR_CUSTODIA', label: 'Dejar en Custodia' },
                ].map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() =>
                      setResolucionGarantia(
                        op.id as
                          | 'DEVOLVER_TOTAL'
                          | 'DEVOLVER_PARCIAL'
                          | 'RETENER_CARGOS'
                          | 'DEJAR_CUSTODIA'
                      )
                    }
                    className={`min-h-[44px] rounded-[12px] p-2 text-xs font-bold border cursor-pointer ${
                      resolucionGarantia === op.id
                        ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                        : 'bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/40 dark:border-white/15'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>

              {(resolucionGarantia === 'DEVOLVER_TOTAL' ||
                resolucionGarantia === 'DEVOLVER_PARCIAL') &&
                cuentasFinancieras &&
                cuentasFinancieras.length > 0 && (
                  <div>
                    <label
                      htmlFor="cuenta-garantia-select"
                      className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#D1D5DB] mb-1"
                    >
                      Cuenta bancaria de desembolso:
                    </label>
                    <Select
                      id="cuenta-garantia-select"
                      ariaLabel="Cuenta bancaria de desembolso"
                      value={cuentaGarantiaId}
                      onChange={(val) => setCuentaGarantiaId(val)}
                      options={cuentasFinancieras.map((c) => ({
                        value: c.id,
                        label: c.nombre,
                      }))}
                    />
                  </div>
                )}

              {resolucionGarantia === 'DEVOLVER_PARCIAL' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#D1D5DB] mb-1">
                    Monto a devolver de garantía (COP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={montoDevolverGarantia}
                    onChange={(e) => setMontoDevolverGarantia(Number(e.target.value))}
                    className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/50 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED] font-bold"
                  />
                </div>
              )}

              {resolucionGarantia === 'RETENER_CARGOS' && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#D1D5DB] mb-1">
                    Motivo de retención de garantía
                  </label>
                  <input
                    type="text"
                    placeholder="Detallar daño, multa o novedad..."
                    value={motivoRetencionGarantia}
                    onChange={(e) => setMotivoRetencionGarantia(e.target.value)}
                    className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/50 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                  />
                </div>
              )}

              {capacidades?.puedeGestionarTaller && (
                <div className="pt-2 border-t border-[#9CA3AF]/30 dark:border-white/10">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#111827] dark:text-[#EDEDED]">
                    <input
                      type="checkbox"
                      checked={requiereMantenimiento}
                      onChange={(e) => setRequiereMantenimiento(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#111827] dark:accent-[#EDEDED]"
                    />
                    <span>Enviar unidad a taller / alistamiento al cerrar</span>
                  </label>

                  {requiereMantenimiento && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      <Select<'PREVENTIVO' | 'CORRECTIVO_NOVEDAD' | 'ALISTAMIENTO'>
                        ariaLabel="Tipo de mantenimiento"
                        value={tipoMantenimiento}
                        onChange={(val) => setTipoMantenimiento(val)}
                        options={[
                          { value: 'CORRECTIVO_NOVEDAD', label: 'Correctivo / Novedad' },
                          { value: 'PREVENTIVO', label: 'Preventivo' },
                          { value: 'ALISTAMIENTO', label: 'Alistamiento' },
                        ]}
                      />

                      <input
                        type="date"
                        value={fechaFinTaller}
                        onChange={(e) => setFechaFinTaller(e.target.value)}
                        className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/50 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Barra de navegación inferior por Slide */}
          <div className="flex items-center justify-between gap-2.5 pt-2">
            {pasoDevolucion > 1 ? (
              <button
                type="button"
                onClick={retrocederPaso}
                className="min-h-[44px] rounded-full bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF]/60 dark:border-white/15 px-5 py-2.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
              >
                ← Anterior
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-full bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF]/60 dark:border-white/15 px-5 py-2.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
              >
                Cancelar
              </button>
            )}

            {pasoDevolucion < 4 ? (
              <button
                type="button"
                onClick={avanzarPaso}
                className="min-h-[44px] flex-1 rounded-full bg-[#111827] dark:bg-[#EDEDED] px-6 py-2.5 text-xs font-bold text-white dark:text-[#111827] hover:bg-[#1F2937] dark:hover:bg-white cursor-pointer"
              >
                Siguiente paso →
              </button>
            ) : (
              <button
                type="submit"
                disabled={guardando}
                className="min-h-[44px] flex-1 rounded-full bg-[#111827] dark:bg-[#EDEDED] px-6 py-2.5 text-xs font-bold text-white dark:text-[#111827] hover:bg-[#1F2937] dark:hover:bg-white disabled:opacity-50 cursor-pointer"
              >
                {guardando ? 'Cerrando contrato...' : 'Registrar Devolución y Cerrar'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 4. MODAL CANCELAR / ANULAR / RECHAZAR ALQUILER
// ============================================================================
export interface ModalCancelarAnularProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: 'CANCELAR' | 'ANULAR' | 'ANULAR_CONTRATO' | 'RECHAZAR';
  reserva: ReservaClienteItem;
  capacidades?: CapacidadesOperacionAlquiler | undefined;
  cuentasFinancieras?: Array<{ id: string; nombre: string; tipo: string }> | undefined;
  tokenAccesoPublico?: string | null | undefined;
  onExito: (reservaActualizada: ReservaClienteItem, mensaje?: string) => void;
}

export function ModalCancelarAnular({
  isOpen,
  onClose,
  tipo,
  reserva,
  capacidades: _capacidades,
  cuentasFinancieras,
  tokenAccesoPublico,
  onExito,
}: ModalCancelarAnularProps) {
  const [motivo, setMotivo] = useState<string>('');
  const [resolucionFinanciera, setResolucionFinanciera] = useState<
    'REEMBOLSAR_EGRESO' | 'ANULAR_MOVIMIENTOS' | 'RETENER_SALDO_LOCAL'
  >('REEMBOLSAR_EGRESO');
  const [cuentaReembolsoId, setCuentaReembolsoId] = useState<string>(
    cuentasFinancieras?.[0]?.id ?? ''
  );
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const tienePagosPrevios = reserva.montoReportado > 0;

  const titulo =
    tipo === 'RECHAZAR'
      ? `Rechazar Solicitud #${reserva.codigo}`
      : tipo === 'ANULAR_CONTRATO'
        ? `Anular Contrato #${reserva.codigo}`
        : `Cancelar Reserva #${reserva.codigo}`;

  const manejarSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    if (motivo.trim().length < 5) {
      setErrorMsg('El motivo debe contener al menos 5 caracteres.');
      return;
    }

    setGuardando(true);
    try {
      if (tipo === 'RECHAZAR') {
        const res = await actions.reservas.rechazarReserva({
          codigo: reserva.codigo,
          motivoRechazo: motivo.trim(),
        });

        if (res.error || !res.data?.ok) {
          setErrorMsg(res.error?.message || 'Error al rechazar solicitud.');
          return;
        }

        onExito(
          { ...reserva, estado: 'RECHAZADA', motivoRechazo: motivo.trim() },
          'Solicitud rechazada'
        );
      } else if (tipo === 'ANULAR' || tipo === 'ANULAR_CONTRATO') {
        const res = await actions.reservas.anularContrato({
          codigo: reserva.codigo,
          motivoAnulacion: motivo.trim(),
          resolucionFinanciera: tienePagosPrevios ? resolucionFinanciera : undefined,
          cuentaReembolsoId:
            tienePagosPrevios && resolucionFinanciera === 'REEMBOLSAR_EGRESO'
              ? cuentaReembolsoId
              : undefined,
        });

        if (res.error || !res.data?.ok) {
          setErrorMsg(res.error?.message || 'Error al anular contrato.');
          return;
        }

        onExito(
          { ...reserva, estado: 'CANCELADA', motivoRechazo: motivo.trim() },
          'Contrato anulado'
        );
      } else {
        const res = await actions.reservas.cancelarReserva({
          codigo: reserva.codigo,
          tokenAccesoPublico: tokenAccesoPublico ?? undefined,
          motivoCancelacion: motivo.trim(),
          resolucionFinanciera: tienePagosPrevios ? resolucionFinanciera : undefined,
          cuentaReembolsoId:
            tienePagosPrevios && resolucionFinanciera === 'REEMBOLSAR_EGRESO'
              ? cuentaReembolsoId
              : undefined,
        });

        if (res.error || !res.data?.ok) {
          setErrorMsg(res.error?.message || 'Error al cancelar reserva.');
          return;
        }

        onExito(
          { ...reserva, estado: 'CANCELADA', motivoRechazo: motivo.trim() },
          'Reserva cancelada'
        );
      }

      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cancelar-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/65 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md rounded-[28px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#9CA3AF]/30 dark:border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
              Acción Operativa Irreversible
            </span>
            <h3
              id="modal-cancelar-titulo"
              className="font-display text-lg font-black text-[#111827] dark:text-[#EDEDED]"
            >
              {titulo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#EDEDED] dark:bg-[#111827] dark:border dark:border-white/15 text-[#111827] dark:text-[#EDEDED] font-bold hover:bg-[#9CA3AF]/30 dark:hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[14px] bg-[#111827] border border-transparent dark:border-white/15 text-white p-3 text-xs font-semibold"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5">
              Motivo obligatorio (mínimo 5 caracteres)
            </label>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica la razón de la cancelación o anulación..."
              className="w-full rounded-[14px] bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF] dark:border-white/15 px-3.5 py-2.5 text-base text-[#111827] dark:text-[#EDEDED] focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-[#EDEDED]"
            />
          </div>

          {/* Si hay dinero recaudado, resolución financiera obligatoria */}
          {tienePagosPrevios && tipo !== 'RECHAZAR' && (
            <div className="rounded-[18px] bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF]/40 dark:border-white/15 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                  Fondos Recaudados Previos
                </span>
                <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                  {formatCop(reserva.montoReportado)}
                </span>
              </div>
              <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                Selecciona la resolución contable en caja para los fondos registrados.
              </p>

              <div className="space-y-1.5">
                {[
                  { id: 'REEMBOLSAR_EGRESO', label: 'Reembolsar egreso de caja' },
                  { id: 'ANULAR_MOVIMIENTOS', label: 'Anular movimientos de ingreso' },
                  { id: 'RETENER_SALDO_LOCAL', label: 'Retener saldo a favor del local' },
                ].map((op) => (
                  <label
                    key={op.id}
                    className="flex items-center gap-2 p-2 rounded-[10px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/30 dark:border-white/12 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="resolucionFinanciera"
                      value={op.id}
                      checked={resolucionFinanciera === op.id}
                      onChange={() =>
                        setResolucionFinanciera(
                          op.id as 'REEMBOLSAR_EGRESO' | 'ANULAR_MOVIMIENTOS' | 'RETENER_SALDO_LOCAL'
                        )
                      }
                      className="accent-[#111827] dark:accent-[#EDEDED]"
                    />
                    <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">{op.label}</span>
                  </label>
                ))}
              </div>

              {resolucionFinanciera === 'REEMBOLSAR_EGRESO' && (
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#D1D5DB] mb-1">
                    Cuenta origen del egreso
                  </label>
                  <Select
                    ariaLabel="Cuenta origen del egreso"
                    size="sm"
                    value={cuentaReembolsoId}
                    onChange={(val) => setCuentaReembolsoId(val)}
                    options={(cuentasFinancieras ?? []).map((c) => ({
                      value: c.id,
                      label: `${c.nombre} (${c.tipo})`,
                    }))}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-full bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF]/60 dark:border-white/15 px-5 py-2.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
            >
              Regresar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="min-h-[44px] rounded-full bg-[#111827] dark:bg-[#EDEDED] px-6 py-2.5 text-xs font-bold text-white dark:text-[#111827] hover:bg-[#1F2937] dark:hover:bg-white disabled:opacity-50 cursor-pointer"
            >
              {guardando ? 'Procesando...' : 'Confirmar Acción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
