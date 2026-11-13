import { useState, type SyntheticEvent } from 'react';
import { actions } from 'astro:actions';
import type { ReservaClienteItem } from '@/lib/flota';
import type { CapacidadesOperacionAlquiler } from '@/lib/auth/capacidades-alquiler';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-[28px] bg-white border border-[#9CA3AF]/40 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#9CA3AF]/30 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              Ciclo de Alquiler · Acuerdo
            </span>
            <h3
              id="modal-pausar-titulo"
              className="font-display text-lg font-black text-[#111827]"
            >
              Pausar Alquiler #{reserva.codigo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] font-bold hover:bg-[#9CA3AF]/30 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[14px] bg-[#111827] text-white p-3 text-xs font-semibold"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-4">
          <div className="rounded-[18px] bg-[#EDEDED] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111827]">
                Impacto en Tarifa y Calendario
              </span>
              <span className="rounded-full bg-[#111827] text-white px-2.5 py-0.5 text-[10px] font-black">
                Costo $0 COP
              </span>
            </div>
            <p className="text-[11px] text-[#4B5563] leading-relaxed">
              La unidad pasa a estado <span className="font-bold text-[#111827]">NO_DISPONIBLE</span> durante la pausa. Se bloquean los días en el calendario sin generar cobro adicional para el cliente.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1.5">
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
                      ? 'bg-[#111827] text-white border-[#111827]'
                      : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/40 hover:bg-white'
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
              className="w-full min-h-[48px] rounded-[14px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] font-semibold focus-visible:ring-2 focus-visible:ring-[#111827]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1.5">
              Motivo o acuerdo de la pausa
            </label>
            <textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Detalle el motivo acordado con el cliente..."
              className="w-full rounded-[14px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-full bg-[#EDEDED] border border-[#9CA3AF]/60 px-5 py-2.5 text-xs font-bold text-[#111827] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="min-h-[44px] rounded-full bg-[#111827] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-[28px] bg-white border border-[#9CA3AF]/40 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#9CA3AF]/30 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              Extensión de Días · FlotaX
            </span>
            <h3
              id="modal-prorrogar-titulo"
              className="font-display text-lg font-black text-[#111827]"
            >
              Prorrogar Alquiler #{reserva.codigo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] font-bold hover:bg-[#9CA3AF]/30 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[14px] bg-[#111827] text-white p-3 text-xs font-semibold"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1.5">
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
                      ? 'bg-[#111827] text-white border-[#111827]'
                      : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/40 hover:bg-white'
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
              className="w-full min-h-[48px] rounded-[14px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] font-semibold focus-visible:ring-2 focus-visible:ring-[#111827]"
            />
          </div>

          {/* Modalidad de Tarifa (Con gating RBAC) */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-[#111827]">
              Modalidad de tarifa para la prórroga
            </span>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-[14px] bg-[#EDEDED] border border-[#9CA3AF]/40 cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="modalidadTarifa"
                    value="TARIFA_ESTANDAR"
                    checked={modalidadTarifa === 'TARIFA_ESTANDAR'}
                    onChange={() => setModalidadTarifa('TARIFA_ESTANDAR')}
                    className="h-4 w-4 text-[#111827]"
                  />
                  <div>
                    <span className="text-xs font-bold block text-[#111827]">
                      Tarifa Estándar ({formatCop(precioDiaEst)}/día)
                    </span>
                    <span className="text-[11px] text-[#4B5563]">
                      Cálculo automático según catálogo del vehículo
                    </span>
                  </div>
                </div>
                <span className="font-bold text-xs text-[#111827]">
                  +{formatCop(diasExtra * precioDiaEst)}
                </span>
              </label>

              {capacidades?.puedeAjustarTarifasYCargos && (
                <>
                  <label className="flex items-center justify-between p-3 rounded-[14px] bg-[#EDEDED] border border-[#9CA3AF]/40 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="modalidadTarifa"
                        value="MISMO_PRECIO"
                        checked={modalidadTarifa === 'MISMO_PRECIO'}
                        onChange={() => setModalidadTarifa('MISMO_PRECIO')}
                        className="h-4 w-4 text-[#111827]"
                      />
                      <div>
                        <span className="text-xs font-bold block text-[#111827]">
                          Mismo Precio ($0 COP)
                        </span>
                        <span className="text-[11px] text-[#4B5563]">
                          Extensión de cortesía o ajuste comercial
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-xs text-[#111827]">$0 COP</span>
                  </label>

                  <label className="flex items-start justify-between p-3 rounded-[14px] bg-[#EDEDED] border border-[#9CA3AF]/40 cursor-pointer">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="modalidadTarifa"
                        value="PRECIO_PACTADO"
                        checked={modalidadTarifa === 'PRECIO_PACTADO'}
                        onChange={() => setModalidadTarifa('PRECIO_PACTADO')}
                        className="h-4 w-4 mt-0.5 text-[#111827]"
                      />
                      <div>
                        <span className="text-xs font-bold block text-[#111827]">
                          Precio Pactado
                        </span>
                        <span className="text-[11px] text-[#4B5563]">
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
                <label className="block text-[11px] font-bold text-[#111827] mb-1">
                  Monto acordado total (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={montoAcordado}
                  onChange={(e) => setMontoAcordado(Math.max(0, Number(e.target.value)))}
                  className="w-full min-h-[48px] rounded-[14px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] font-bold focus-visible:ring-2 focus-visible:ring-[#111827]"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1.5">
              Cláusula o nota de acuerdo (opcional)
            </label>
            <textarea
              rows={2}
              value={clausulaAcuerdo}
              onChange={(e) => setClausulaAcuerdo(e.target.value)}
              placeholder="Ej. Acuerdo pactado con cliente por viaje a Guatapé..."
              className="w-full rounded-[14px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
            />
          </div>

          <div className="flex items-center justify-between rounded-[18px] bg-[#111827] text-white p-3.5">
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

  const manejarSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    if (sobrecostoLocal > 0 && !motivoSobrecosto.trim()) {
      setErrorMsg('Debes especificar el motivo del sobrecosto establecido por el local.');
      return;
    }

    if (descuentoAjusteLocal > 0 && !motivoDescuento.trim()) {
      setErrorMsg('Debes especificar el motivo del descuento o ajuste aplicado.');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg rounded-[28px] bg-white border border-[#9CA3AF]/40 p-5 sm:p-6 shadow-xl space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-[#9CA3AF]/30 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              Recepción Pericial & Cierre de Contrato
            </span>
            <h3
              id="modal-devolver-titulo"
              className="font-display text-lg font-black text-[#111827]"
            >
              Devolver y Cerrar #{reserva.codigo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] font-bold hover:bg-[#9CA3AF]/30 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Copy canónico de responsabilidad del local */}
        <div className="rounded-[16px] bg-[#EDEDED] border border-[#9CA3AF]/40 p-3 text-xs text-[#111827] font-medium leading-relaxed">
          Las condiciones, ajustes y sobrecostos de devolución los establece el local.
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[14px] bg-[#111827] text-white p-3 text-xs font-semibold"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-4 text-xs">
          {/* Telemetría de Retorno */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-bold text-[#111827] mb-1">
                Fecha devolución
              </label>
              <input
                type="date"
                required
                value={fechaDevolucionReal}
                onChange={(e) => setFechaDevolucionReal(e.target.value)}
                className="w-full min-h-[44px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3 py-2 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#111827] mb-1">
                Odómetro (km)
              </label>
              <input
                type="number"
                min={0}
                required
                value={medidorUsoRetorno}
                onChange={(e) => setMedidorUsoRetorno(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3 py-2 text-base text-[#111827] font-bold focus-visible:ring-2 focus-visible:ring-[#111827]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#111827] mb-1">
                Nivel energía (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                required
                value={nivelEnergiaRetornoPct}
                onChange={(e) => setNivelEnergiaRetornoPct(Number(e.target.value))}
                className="w-full min-h-[44px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3 py-2 text-base text-[#111827] font-bold focus-visible:ring-2 focus-visible:ring-[#111827]"
              />
            </div>
          </div>

          {/* Cláusula y Ajustes del Local (Solo con permiso) */}
          {capacidades?.puedeAjustarTarifasYCargos && (
            <div className="rounded-[18px] bg-[#EDEDED]/60 border border-[#9CA3AF]/40 p-3.5 space-y-3">
              <span className="font-bold text-[#111827] block">
                Ajustes y Sobrecostos del Local
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#4B5563] mb-1">
                    Sobrecosto local (+COP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={sobrecostoLocal}
                    onChange={(e) => setSobrecostoLocal(Math.max(0, Number(e.target.value)))}
                    className="w-full min-h-[44px] rounded-[12px] bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base text-[#111827] font-bold focus-visible:ring-2 focus-visible:ring-[#111827]"
                  />
                  {sobrecostoLocal > 0 && (
                    <input
                      type="text"
                      placeholder="Motivo del sobrecosto..."
                      value={motivoSobrecosto}
                      onChange={(e) => setMotivoSobrecosto(e.target.value)}
                      className="w-full min-h-[40px] rounded-[10px] bg-white border border-[#9CA3AF]/40 px-2.5 py-1.5 text-base text-[#111827] mt-1.5"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-[#4B5563] mb-1">
                    Descuento / Devolución anticipada (-COP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={descuentoAjusteLocal}
                    onChange={(e) => setDescuentoAjusteLocal(Math.max(0, Number(e.target.value)))}
                    className="w-full min-h-[44px] rounded-[12px] bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base text-[#111827] font-bold focus-visible:ring-2 focus-visible:ring-[#111827]"
                  />
                  {descuentoAjusteLocal > 0 && (
                    <input
                      type="text"
                      placeholder="Motivo del descuento..."
                      value={motivoDescuento}
                      onChange={(e) => setMotivoDescuento(e.target.value)}
                      className="w-full min-h-[40px] rounded-[10px] bg-white border border-[#9CA3AF]/40 px-2.5 py-1.5 text-base text-[#111827] mt-1.5"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#4B5563] mb-1">
                  Cláusula u observaciones del encargado
                </label>
                <input
                  type="text"
                  placeholder="Observaciones de cierre..."
                  value={clausulaEncargado}
                  onChange={(e) => setClausulaEncargado(e.target.value)}
                  className="w-full min-h-[44px] rounded-[12px] bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
                />
              </div>
            </div>
          )}

          {/* Liquidación de Saldo Pendiente o Reembolso */}
          <div className="rounded-[18px] bg-[#111827] text-white p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[#9CA3AF] font-bold">Estado financiero final</span>
              <span className="font-display font-black text-sm">
                Total neto: {formatCop(totalConAjustes)}
              </span>
            </div>

            {tieneSaldoPendiente && (
              <div className="space-y-2 pt-1 border-t border-[#4B5563]/40">
                <div className="flex items-center justify-between">
                  <span>Saldo pendiente por cobrar:</span>
                  <span className="font-bold text-white text-sm">
                    {formatCop(saldoDiferencia)}
                  </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={cobrarSaldoAhora}
                    onChange={(e) => setCobrarSaldoAhora(e.target.checked)}
                    className="h-4 w-4 rounded text-[#111827]"
                  />
                  <span>Cobrar saldo ahora y asentar en caja</span>
                </label>

                {cobrarSaldoAhora && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <select
                      value={cuentaCobroId}
                      onChange={(e) => setCuentaCobroId(e.target.value)}
                      className="w-full min-h-[40px] rounded-[10px] bg-[#1F2937] border border-[#4B5563] px-2.5 py-1 text-base text-white"
                    >
                      {cuentasFinancieras?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>

                    <select
                      value={metodoCobro}
                      onChange={(e) =>
                        setMetodoCobro(
                          e.target.value as 'efectivo' | 'transferencia' | 'tarjeta'
                        )
                      }
                      className="w-full min-h-[40px] rounded-[10px] bg-[#1F2937] border border-[#4B5563] px-2.5 py-1 text-base text-white"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia / PSE</option>
                      <option value="tarjeta">Tarjeta Datáfono</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {tieneExcedente && capacidades?.puedeReembolsarYAnularCaja && (
              <div className="space-y-2 pt-1 border-t border-[#4B5563]/40">
                <div className="flex items-center justify-between">
                  <span>Excedente a favor del cliente:</span>
                  <span className="font-bold text-emerald-300 text-sm">
                    {formatCop(Math.abs(saldoDiferencia))}
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="resolucionExcedente"
                      value="REEMBOLSO_ALQUILER"
                      checked={resolucionExcedente === 'REEMBOLSO_ALQUILER'}
                      onChange={() => setResolucionExcedente('REEMBOLSO_ALQUILER')}
                      className="text-white"
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
                      className="text-white"
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
                      <select
                        id="cuenta-reembolso-select"
                        value={cuentaReembolsoId}
                        onChange={(e) => setCuentaReembolsoId(e.target.value)}
                        className="w-full min-h-[38px] rounded-[10px] bg-[#1F2937] border border-[#4B5563] px-2.5 py-1 text-xs text-white"
                      >
                        {cuentasFinancieras.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Resolución del Depósito de Garantía */}
          <div className="rounded-[18px] bg-[#EDEDED] border border-[#9CA3AF]/40 p-3.5 space-y-2">
            <span className="font-bold text-[#111827] block">
              Resolución de Depósito de Garantía
            </span>
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
                      op.id as 'DEVOLVER_TOTAL' | 'DEVOLVER_PARCIAL' | 'RETENER_CARGOS' | 'DEJAR_CUSTODIA'
                    )
                  }
                  className={`min-h-[44px] rounded-[12px] p-2 text-xs font-bold border cursor-pointer ${
                    resolucionGarantia === op.id
                      ? 'bg-[#111827] text-white border-[#111827]'
                      : 'bg-white text-[#111827] border-[#9CA3AF]/40'
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
                <div className="pt-1">
                  <label
                    htmlFor="cuenta-garantia-select"
                    className="block text-[11px] font-semibold text-[#4B5563] mb-1"
                  >
                    Cuenta bancaria de desembolso:
                  </label>
                  <select
                    id="cuenta-garantia-select"
                    value={cuentaGarantiaId}
                    onChange={(e) => setCuentaGarantiaId(e.target.value)}
                    className="w-full min-h-[40px] rounded-[10px] bg-white border border-[#9CA3AF]/40 px-2.5 py-1 text-base text-[#111827]"
                  >
                    {cuentasFinancieras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            {resolucionGarantia === 'DEVOLVER_PARCIAL' && (
              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                  Monto a devolver de garantía (COP)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={montoDevolverGarantia}
                  onChange={(e) => setMontoDevolverGarantia(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-[12px] bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base text-[#111827] font-bold"
                />
              </div>
            )}

            {resolucionGarantia === 'RETENER_CARGOS' && (
              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                  Motivo de retención de garantía
                </label>
                <input
                  type="text"
                  placeholder="Detallar daño, multa o novedad..."
                  value={motivoRetencionGarantia}
                  onChange={(e) => setMotivoRetencionGarantia(e.target.value)}
                  className="w-full min-h-[44px] rounded-[12px] bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base text-[#111827]"
                />
              </div>
            )}
          </div>

          {/* Toggle Mantenimiento Taller */}
          {capacidades?.puedeGestionarTaller && (
            <div className="rounded-[18px] bg-[#EDEDED] border border-[#9CA3AF]/40 p-3.5 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-[#111827]">
                <input
                  type="checkbox"
                  checked={requiereMantenimiento}
                  onChange={(e) => setRequiereMantenimiento(e.target.checked)}
                  className="h-4 w-4 rounded text-[#111827]"
                />
                <span>Enviar vehículo directamente a taller / mantenimiento</span>
              </label>

              {requiereMantenimiento && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                      Tipo de mantenimiento
                    </label>
                    <select
                      value={tipoMantenimiento}
                      onChange={(e) =>
                        setTipoMantenimiento(
                          e.target.value as 'PREVENTIVO' | 'CORRECTIVO_NOVEDAD' | 'ALISTAMIENTO'
                        )
                      }
                      className="w-full min-h-[44px] rounded-[12px] bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base text-[#111827]"
                    >
                      <option value="CORRECTIVO_NOVEDAD">Correctivo / Novedad</option>
                      <option value="PREVENTIVO">Preventivo</option>
                      <option value="ALISTAMIENTO">Alistamiento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                      Fecha estimada fin taller
                    </label>
                    <input
                      type="date"
                      value={fechaFinTaller}
                      onChange={(e) => setFechaFinTaller(e.target.value)}
                      className="w-full min-h-[44px] rounded-[12px] bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base text-[#111827]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-full bg-[#EDEDED] border border-[#9CA3AF]/60 px-5 py-2.5 text-xs font-bold text-[#111827] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="min-h-[44px] rounded-full bg-[#111827] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
            >
              {guardando ? 'Cerrando contrato...' : 'Registrar Devolución y Cerrar'}
            </button>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-[28px] bg-white border border-[#9CA3AF]/40 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#9CA3AF]/30 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
              Acción Operativa Irreversible
            </span>
            <h3
              id="modal-cancelar-titulo"
              className="font-display text-lg font-black text-[#111827]"
            >
              {titulo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] font-bold hover:bg-[#9CA3AF]/30 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[14px] bg-[#111827] text-white p-3 text-xs font-semibold"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#111827] mb-1.5">
              Motivo obligatorio (mínimo 5 caracteres)
            </label>
            <textarea
              required
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explica la razón de la cancelación o anulación..."
              className="w-full rounded-[14px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
            />
          </div>

          {/* Si hay dinero recaudado, resolución financiera obligatoria */}
          {tienePagosPrevios && tipo !== 'RECHAZAR' && (
            <div className="rounded-[18px] bg-[#EDEDED] border border-[#9CA3AF]/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#111827]">
                  Fondos Recaudados Previos
                </span>
                <span className="font-bold text-[#111827]">
                  {formatCop(reserva.montoReportado)}
                </span>
              </div>
              <p className="text-[11px] text-[#4B5563]">
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
                    className="flex items-center gap-2 p-2 rounded-[10px] bg-white border border-[#9CA3AF]/30 cursor-pointer"
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
                      className="text-[#111827]"
                    />
                    <span className="font-semibold text-[#111827]">{op.label}</span>
                  </label>
                ))}
              </div>

              {resolucionFinanciera === 'REEMBOLSAR_EGRESO' && (
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Cuenta origen del egreso
                  </label>
                  <select
                    value={cuentaReembolsoId}
                    onChange={(e) => setCuentaReembolsoId(e.target.value)}
                    className="w-full min-h-[40px] rounded-[10px] bg-white border border-[#9CA3AF]/40 px-2.5 py-1 text-base text-[#111827]"
                  >
                    {cuentasFinancieras?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} ({c.tipo})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-full bg-[#EDEDED] border border-[#9CA3AF]/60 px-5 py-2.5 text-xs font-bold text-[#111827] cursor-pointer"
            >
              Regresar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="min-h-[44px] rounded-full bg-[#111827] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
            >
              {guardando ? 'Procesando...' : 'Confirmar Acción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
