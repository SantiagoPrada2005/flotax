import { useEffect, useMemo, useState } from 'react';
import { actions } from 'astro:actions';
import type { ReservaClienteItem } from '@/lib/flota';
import type { CapacidadesOperacionAlquiler } from '@/lib/auth/capacidades-alquiler';
import type {
  DetalleReservaAdminContext,
  FotoInspeccionItem,
} from '@/lib/flota/detalle-reserva-admin';
import type { ZonaEvidenciaVehiculo } from '@/db/schema';

export interface FinalizarAlquilerWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reserva: ReservaClienteItem;
  detalleAdmin: DetalleReservaAdminContext;
  hoyISO: string;
  capacidades?: CapacidadesOperacionAlquiler | undefined;
  cuentasFinancieras: Array<{ id: string; nombre: string; tipo: string }>;
  onExito: (
    reservaActualizada: ReservaClienteItem,
    detalleActualizado: DetalleReservaAdminContext | null,
    mensaje: string
  ) => void;
}

interface ZonaComparacionDef {
  id: ZonaEvidenciaVehiculo;
  etiqueta: string;
}

const ZONAS_COMPARACION_BASE: ZonaComparacionDef[] = [
  { id: 'EXTERIOR_FRONTAL', etiqueta: 'Frente' },
  { id: 'EXTERIOR_LATERAL_DER', etiqueta: 'Lateral derecho' },
  { id: 'EXTERIOR_LATERAL_IZQ', etiqueta: 'Lateral izquierdo' },
  { id: 'EXTERIOR_TRASERO', etiqueta: 'Parte trasera' },
  { id: 'INTERIOR_CABINA', etiqueta: 'Interior' },
  { id: 'PANTALLA_TABLERO_ODOMETRO', etiqueta: 'Tablero y odómetro' },
];

const CONCEPTOS_SUGERIDOS = [
  'Rayón en puerta',
  'Daño en parachoques',
  'Tapicería deteriorada',
  'Daño en llanta',
  'Limpieza extraordinaria',
];

interface EvaluacionZonaState {
  zonaId: ZonaEvidenciaVehiculo;
  etiqueta: string;
  estado: 'PENDIENTE' | 'SIN_NOVEDAD' | 'CON_NOVEDAD';
  nota: string;
  evidenciaId: string;
  evidenciaUrl: string;
  generaCobro: boolean;
  cobroConcepto: string;
  cobroValor: number;
}

interface FotoLocalNueva {
  tempId: string;
  zonaEvidencia: ZonaEvidenciaVehiculo;
  dataUrl: string;
  observacion?: string | undefined;
}

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

const formatMiles = (num: number): string => {
  if (!num || num <= 0) return '';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(num);
};

const parseSoloDigitos = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits ? Number.parseInt(digits, 10) : 0;
};

export function FinalizarAlquilerWizardModal({
  isOpen,
  onClose,
  reserva,
  detalleAdmin,
  hoyISO,
  capacidades,
  cuentasFinancieras,
  onExito,
}: FinalizarAlquilerWizardModalProps) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  // Zonas dinámicas: base + cualquier otra zona que tenga fotos en entrega/devolución
  const zonasEvaluacionBase = useMemo<ZonaComparacionDef[]>(() => {
    const mapa = new Map<ZonaEvidenciaVehiculo, ZonaComparacionDef>();
    for (const z of ZONAS_COMPARACION_BASE) {
      mapa.set(z.id, z);
    }
    const todas = [...detalleAdmin.fotosEntrega, ...detalleAdmin.fotosDevolucion];
    for (const f of todas) {
      if (!mapa.has(f.zonaEvidencia)) {
        mapa.set(f.zonaEvidencia, {
          id: f.zonaEvidencia,
          etiqueta: f.zonaEvidencia.replace(/_/g, ' '),
        });
      }
    }
    return Array.from(mapa.values());
  }, [detalleAdmin.fotosEntrega, detalleAdmin.fotosDevolucion]);

  const [evaluaciones, setEvaluaciones] = useState<EvaluacionZonaState[]>([]);
  const [zonaActivaIdx, setZonaActivaIdx] = useState<number>(0);
  const [sliderComparador, setSliderComparador] = useState<number>(50);
  const [fotoAmpliada, setFotoAmpliada] = useState<{ url: string; titulo: string } | null>(null);
  const [fotosNuevas, setFotosNuevas] = useState<FotoLocalNueva[]>([]);

  // Paso 2: Datos de retorno y finanzas
  const [fechaDevolucionReal, setFechaDevolucionReal] = useState<string>(hoyISO);
  const [medidorUsoRetorno, setMedidorUsoRetorno] = useState<number>(
    reserva.kilometrajeRetorno || reserva.kilometrajeEntrega + reserva.diasAlquiler * 50
  );
  const [nivelEnergiaRetornoPct, setNivelEnergiaRetornoPct] = useState<number>(85);
  const [observacionesGenerales, setObservacionesGenerales] = useState<string>('');
  const [requiereMantenimiento, setRequiereMantenimiento] = useState<boolean>(false);
  const [tipoMantenimiento, setTipoMantenimiento] = useState<
    'PREVENTIVO' | 'CORRECTIVO_NOVEDAD' | 'ALISTAMIENTO'
  >('CORRECTIVO_NOVEDAD');
  const [fechaFinTaller, setFechaFinTaller] = useState<string>(hoyISO);

  // Pago saldo y garantía
  const [cobrarSaldoAhora, setCobrarSaldoAhora] = useState<boolean>(true);
  const [metodoCobro, setMetodoCobro] = useState<'efectivo' | 'transferencia' | 'tarjeta'>(
    'efectivo'
  );
  const [cuentaCobroId, setCuentaCobroId] = useState<string>(
    cuentasFinancieras[0]?.id ?? ''
  );

  const garantiaRecibida =
    detalleAdmin.garantia?.montoRecibido ??
    detalleAdmin.garantia?.saldoComprometido ??
    0;
  const tieneGarantiaActiva = Boolean(detalleAdmin.garantia);

  const [resolucionGarantia, setResolucionGarantia] = useState<
    'DEVOLVER_TOTAL' | 'DEVOLVER_PARCIAL' | 'RETENER_CARGOS' | 'DEJAR_CUSTODIA'
  >('DEVOLVER_TOTAL');
  const [montoRetenerGarantia, setMontoRetenerGarantia] = useState<number>(0);
  const [cuentaGarantiaId, setCuentaGarantiaId] = useState<string>(
    cuentasFinancieras[0]?.id ?? ''
  );
  const [motivoRetencionGarantia, setMotivoRetencionGarantia] = useState<string>('');

  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicializar estado al abrir
  useEffect(() => {
    if (!isOpen) return;
    setPaso(1);
    setZonaActivaIdx(0);
    setSliderComparador(50);
    setErrorMsg(null);
    setFotosNuevas([]);
    setIdempotencyKey(
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    setEvaluaciones(
      zonasEvaluacionBase.map((z) => ({
        zonaId: z.id,
        etiqueta: z.etiqueta,
        estado: 'PENDIENTE',
        nota: '',
        evidenciaId: '',
        evidenciaUrl: '',
        generaCobro: false,
        cobroConcepto: '',
        cobroValor: 0,
      }))
    );
  }, [isOpen, zonasEvaluacionBase]);

  if (!isOpen) return null;

  const zonaActual = evaluaciones[zonaActivaIdx];
  const fotosEntregaZona = zonaActual
    ? detalleAdmin.fotosEntrega.filter((f) => f.zonaEvidencia === zonaActual.zonaId)
    : [];
  const fotosDevolucionZonaExistentes = zonaActual
    ? detalleAdmin.fotosDevolucion.filter((f) => f.zonaEvidencia === zonaActual.zonaId)
    : [];
  const fotosDevolucionZonaNuevas: FotoInspeccionItem[] = zonaActual
    ? fotosNuevas
        .filter((f) => f.zonaEvidencia === zonaActual.zonaId)
        .map((f) => ({
          id: f.tempId,
          url: f.dataUrl,
          r2Key: f.tempId,
          etapaOperativa: 'DEVOLUCION_RETORNO',
          zonaEvidencia: f.zonaEvidencia,
          capturadoEnISO: new Date().toISOString(),
          observacion: f.observacion ?? null,
        }))
    : [];

  const fotosDevolucionZona = [...fotosDevolucionZonaExistentes, ...fotosDevolucionZonaNuevas];
  const fotoEntregaPrincipal = fotosEntregaZona[0] ?? null;
  const fotoDevolucionPrincipal = fotosDevolucionZona[0] ?? null;

  const actualizarZonaActual = (patch: Partial<EvaluacionZonaState>) => {
    setEvaluaciones((prev) =>
      prev.map((item, idx) => (idx === zonaActivaIdx ? { ...item, ...patch } : item))
    );
    setErrorMsg(null);
  };

  const manejarCapturaCamara = (file: File | undefined) => {
    if (!file || !zonaActual) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const tempId = `tmp-dev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const nuevaFoto: FotoLocalNueva = {
        tempId,
        zonaEvidencia: zonaActual.zonaId,
        dataUrl: reader.result,
        observacion: `Evidencia de devolución - ${zonaActual.etiqueta}`,
      };
      setFotosNuevas((prev) => [...prev, nuevaFoto]);
      actualizarZonaActual({
        evidenciaId: tempId,
        evidenciaUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const totalZonas = evaluaciones.length;
  const zonasPendientes = evaluaciones.filter((e) => e.estado === 'PENDIENTE').length;
  const novedadesActivas = evaluaciones.filter((e) => e.estado === 'CON_NOVEDAD');
  const cobrosAdicionales = novedadesActivas
    .filter((n) => n.generaCobro && n.cobroValor > 0)
    .map((n, idx) => ({
      id: `cobro-nov-${idx + 1}-${n.zonaId}`,
      concepto: n.cobroConcepto.trim() || `Novedad en ${n.etiqueta}`,
      valor: n.cobroValor,
      nota: n.nota.trim(),
      zona: n.etiqueta,
      evidenciaId: n.evidenciaId || undefined,
      evidenciaUrl: n.evidenciaUrl || undefined,
    }));

  const totalCobrosAdicionales = cobrosAdicionales.reduce((acc, c) => acc + c.valor, 0);
  const totalAlquilerOriginal = reserva.totalAlquiler;
  const totalGeneral = totalAlquilerOriginal + totalCobrosAdicionales;
  const pagosRecibidos = reserva.montoReportado;
  const saldoPendienteFinal = Math.max(0, totalGeneral - pagosRecibidos);

  const montoGarantiaRetenida =
    !tieneGarantiaActiva
      ? 0
      : resolucionGarantia === 'DEVOLVER_TOTAL'
        ? 0
        : resolucionGarantia === 'RETENER_CARGOS'
          ? Math.min(garantiaRecibida, Math.max(0, montoRetenerGarantia || totalCobrosAdicionales || garantiaRecibida))
          : resolucionGarantia === 'DEVOLVER_PARCIAL'
            ? Math.min(garantiaRecibida, Math.max(0, montoRetenerGarantia))
            : garantiaRecibida;
  const montoGarantiaDevolver = Math.max(0, garantiaRecibida - montoGarantiaRetenida);

  const validarPaso1 = (): boolean => {
    if (zonasPendientes > 0) {
      setErrorMsg(
        `Debes revisar todas las zonas del vehículo (${zonasPendientes} pendiente${zonasPendientes === 1 ? '' : 's'}).`
      );
      return false;
    }
    for (const nov of novedadesActivas) {
      if (!nov.nota.trim()) {
        setErrorMsg(`Agrega una nota breve describiendo la novedad en "${nov.etiqueta}".`);
        return false;
      }
      if (nov.generaCobro && (!nov.cobroConcepto.trim() || nov.cobroValor <= 0)) {
        setErrorMsg(
          `Completa el concepto y un valor mayor a $0 para el cobro adicional en "${nov.etiqueta}".`
        );
        return false;
      }
    }
    return true;
  };

  const irAPaso2 = () => {
    if (!validarPaso1()) return;
    setErrorMsg(null);
    setPaso(2);
  };

  const irAPaso3 = () => {
    if (medidorUsoRetorno < reserva.kilometrajeEntrega) {
      setErrorMsg(
        `El odómetro de retorno (${formatMiles(medidorUsoRetorno)}) no puede ser menor al de entrega (${formatMiles(reserva.kilometrajeEntrega)}).`
      );
      return;
    }
    if (
      tieneGarantiaActiva &&
      (resolucionGarantia === 'RETENER_CARGOS' || resolucionGarantia === 'DEVOLVER_PARCIAL') &&
      montoGarantiaRetenida > 0 &&
      !motivoRetencionGarantia.trim()
    ) {
      setErrorMsg('Indica el motivo de la retención aplicada sobre la garantía.');
      return;
    }
    setErrorMsg(null);
    setPaso(3);
  };

  const confirmarFinalizacion = async () => {
    if (guardando) return;
    if (!validarPaso1()) return;

    setGuardando(true);
    setErrorMsg(null);

    try {
      const puedeAprobarCargos = capacidades?.puedeAjustarTarifasYCargos ?? true;
      const cobrosEnviar = puedeAprobarCargos ? cobrosAdicionales : [];

      const res = await actions.reservas.devolverYCerrarAlquiler({
        codigo: reserva.codigo,
        idempotencyKey,
        fechaDevolucionReal,
        medidorUsoRetorno,
        nivelEnergiaRetornoPct,
        estadoGeneral: novedadesActivas.length > 0 ? 'CON_NOVEDAD' : 'OPTIMO',
        observaciones: observacionesGenerales.trim() || undefined,
        cobrarSaldoAhora:
          saldoPendienteFinal > 0 && cobrarSaldoAhora
            ? {
                monto: saldoPendienteFinal,
                metodoPago: metodoCobro,
                cuentaId: cuentaCobroId || undefined,
                referencia: `Cierre contrato ${reserva.codigo}`,
              }
            : undefined,
        gestionGarantia: tieneGarantiaActiva
          ? {
              accion: resolucionGarantia,
              montoDevolver:
                resolucionGarantia === 'DEVOLVER_PARCIAL'
                  ? montoGarantiaDevolver
                  : resolucionGarantia === 'RETENER_CARGOS'
                    ? montoGarantiaRetenida
                    : undefined,
              cuentaId: cuentaGarantiaId || undefined,
              motivoRetencion: motivoRetencionGarantia.trim() || undefined,
            }
          : undefined,
        requiereMantenimiento,
        tipoMantenimiento: requiereMantenimiento ? tipoMantenimiento : undefined,
        fechaFinEstimadaMantenimiento: requiereMantenimiento ? fechaFinTaller : undefined,
        fotosDevolucionNuevas: fotosNuevas.length > 0 ? fotosNuevas : undefined,
        novedadesZonas: evaluaciones.map((e) => ({
          zona: e.zonaId,
          etiqueta: e.etiqueta,
          estado: e.estado === 'CON_NOVEDAD' ? 'CON_NOVEDAD' : 'SIN_NOVEDAD',
          nota: e.nota.trim() || undefined,
          evidenciaId: e.evidenciaId || undefined,
          evidenciaUrl: e.evidenciaUrl || undefined,
          cobroConcepto: e.generaCobro ? e.cobroConcepto.trim() : undefined,
          cobroValor: e.generaCobro ? e.cobroValor : undefined,
        })),
        cobrosAdicionales: cobrosEnviar.length > 0 ? cobrosEnviar : undefined,
      });

      if (res.error || !res.data?.ok) {
        setErrorMsg(
          res.error?.message || 'No fue posible registrar la devolución y finalización.'
        );
        return;
      }

      const resv = res.data.reserva;
      const actualizada: ReservaClienteItem = {
        ...reserva,
        estado: 'COMPLETADA',
        fechaFin: resv.fechaFin,
        totalAlquiler: resv.totalCotizado,
        montoReportado: resv.montoAbonoReportado,
        kilometrajeRetorno: medidorUsoRetorno,
        requiereMantenimientoRetorno: requiereMantenimiento,
        estadoGarantia:
          resolucionGarantia === 'DEVOLVER_TOTAL' || resolucionGarantia === 'DEVOLVER_PARCIAL'
            ? 'LIBERADA'
            : resolucionGarantia === 'RETENER_CARGOS'
              ? 'RETENIDA_NOVEDAD'
              : 'CUSTODIA_ACTIVA',
      };

      onExito(
        actualizada,
        res.data.detalleAdmin ?? null,
        res.data.mensaje || 'Alquiler finalizado e inspeccionado correctamente.'
      );
      onClose();
    } catch {
      setErrorMsg('Error de red al confirmar la finalización del alquiler.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Inspección comparativa y finalización de alquiler"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#111827]/70 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full max-w-4xl max-h-[94dvh] flex flex-col rounded-t-[28px] sm:rounded-[28px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/35 dark:border-white/15 shadow-2xl overflow-hidden">
        {/* Cabecera fija */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#EDEDED] dark:border-white/10 bg-white dark:bg-[#1F2937]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
                Finalizar alquiler · #{reserva.codigo}
              </span>
              <span className="rounded-full bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF]/30 dark:border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#111827] dark:text-[#EDEDED]">
                Paso {paso} de 3
              </span>
            </div>
            <h2 className="font-display text-lg font-extrabold text-[#111827] dark:text-[#EDEDED] truncate">
              {paso === 1
                ? 'Inspección comparativa: Entrega vs Devolución'
                : paso === 2
                  ? 'Resumen financiero, cobros y garantía'
                  : 'Confirmación final de cierre'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar asistente de finalización"
            className="fx-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EDEDED] dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] border border-[#9CA3AF]/35 dark:border-white/15 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-[16px] bg-[#111827] text-[#EDEDED] border border-[#4B5563] px-4 py-3 text-xs flex items-center justify-between gap-3"
            >
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-[11px] font-bold text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* ===============================================================
              PASO 1: COMPARACIÓN VISUAL POR ZONAS
             =============================================================== */}
          {paso === 1 && zonaActual && (
            <div className="space-y-4">
              {/* Selector de zonas */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {evaluaciones.map((ev, idx) => {
                  const activa = idx === zonaActivaIdx;
                  const estadoLabel =
                    ev.estado === 'SIN_NOVEDAD'
                      ? '✓'
                      : ev.estado === 'CON_NOVEDAD'
                        ? '!'
                        : '•';
                  return (
                    <button
                      key={ev.zonaId}
                      type="button"
                      onClick={() => {
                        setZonaActivaIdx(idx);
                        setSliderComparador(50);
                      }}
                      className={`fx-press shrink-0 min-h-[44px] inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold border cursor-pointer ${
                        activa
                          ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                          : ev.estado === 'CON_NOVEDAD'
                            ? 'bg-status-warning/15 text-[#111827] dark:text-[#EDEDED] border-status-warning/60'
                            : ev.estado === 'SIN_NOVEDAD'
                              ? 'bg-status-success/15 text-[#111827] dark:text-[#EDEDED] border-status-success/50'
                              : 'bg-[#EDEDED]/75 dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/35 dark:border-white/15'
                      }`}
                    >
                      <span className="font-mono text-[11px]">{estadoLabel}</span>
                      <span>{ev.etiqueta}</span>
                    </button>
                  );
                })}
              </div>

              {/* Comparador Escritorio: Lado a lado */}
              <div className="hidden md:grid md:grid-cols-2 gap-4">
                <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 overflow-hidden bg-[#111827]">
                  <div className="px-3.5 py-2 flex items-center justify-between border-b border-white/10 text-xs text-[#EDEDED]">
                    <span className="font-bold">Antes · Entrega</span>
                    <span className="font-mono text-[10px] text-[#9CA3AF]">
                      {fotoEntregaPrincipal?.capturadoEnISO
                        ? new Intl.DateTimeFormat('es-CO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(fotoEntregaPrincipal.capturadoEnISO))
                        : 'Sin fecha'}
                    </span>
                  </div>
                  <div className="relative aspect-video bg-[#111827] flex items-center justify-center">
                    {fotoEntregaPrincipal ? (
                      <>
                        <img
                          src={fotoEntregaPrincipal.url}
                          alt={`Entrega - ${zonaActual.etiqueta}`}
                          className="h-full w-full object-contain object-center"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFotoAmpliada({
                              url: fotoEntregaPrincipal.url,
                              titulo: `Entrega (Antes) · ${zonaActual.etiqueta}`,
                            })
                          }
                          className="fx-press absolute right-2.5 bottom-2.5 rounded-full bg-[#111827]/85 border border-white/25 px-3 py-1.5 text-[11px] font-bold text-[#EDEDED] cursor-pointer"
                        >
                          Ampliar
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-[#9CA3AF] px-4 text-center">
                        Sin fotografía de entrega registrada para {zonaActual.etiqueta}.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 overflow-hidden bg-[#111827]">
                  <div className="px-3.5 py-2 flex items-center justify-between border-b border-white/10 text-xs text-[#EDEDED]">
                    <span className="font-bold">Después · Devolución</span>
                    <span className="font-mono text-[10px] text-[#9CA3AF]">
                      {fotoDevolucionPrincipal?.capturadoEnISO
                        ? new Intl.DateTimeFormat('es-CO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          }).format(new Date(fotoDevolucionPrincipal.capturadoEnISO))
                        : 'Sin foto registrada'}
                    </span>
                  </div>
                  <div className="relative aspect-video bg-[#111827] flex items-center justify-center">
                    {fotoDevolucionPrincipal ? (
                      <>
                        <img
                          src={fotoDevolucionPrincipal.url}
                          alt={`Devolución - ${zonaActual.etiqueta}`}
                          className="h-full w-full object-contain object-center"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFotoAmpliada({
                              url: fotoDevolucionPrincipal.url,
                              titulo: `Devolución (Después) · ${zonaActual.etiqueta}`,
                            })
                          }
                          className="fx-press absolute right-2.5 bottom-2.5 rounded-full bg-[#111827]/85 border border-white/25 px-3 py-1.5 text-[11px] font-bold text-[#EDEDED] cursor-pointer"
                        >
                          Ampliar
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-[#9CA3AF] px-4 text-center">
                        Sin fotografía de devolución para {zonaActual.etiqueta}.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Comparador Móvil: Deslizador horizontal interactivo */}
              <div className="md:hidden rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 overflow-hidden bg-[#111827]">
                <div className="relative aspect-video w-full bg-[#111827] select-none overflow-hidden">
                  {fotoEntregaPrincipal && fotoDevolucionPrincipal ? (
                    <>
                      <img
                        src={fotoDevolucionPrincipal.url}
                        alt={`Devolución - ${zonaActual.etiqueta}`}
                        className="absolute inset-0 h-full w-full object-contain object-center"
                      />
                      <img
                        src={fotoEntregaPrincipal.url}
                        alt={`Entrega - ${zonaActual.etiqueta}`}
                        style={{ clipPath: `inset(0 ${100 - sliderComparador}% 0 0)` }}
                        className="absolute inset-0 h-full w-full object-contain object-center"
                      />
                      <div
                        style={{ left: `${sliderComparador}%` }}
                        className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-md"
                      />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-[#111827]/85 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-[#EDEDED]">
                        Entrega
                      </span>
                      <span className="absolute right-2.5 top-2.5 rounded-full bg-[#111827]/85 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-[#EDEDED]">
                        Devolución
                      </span>
                    </>
                  ) : fotoEntregaPrincipal || fotoDevolucionPrincipal ? (
                    <>
                      <img
                        src={(fotoDevolucionPrincipal ?? fotoEntregaPrincipal)!.url}
                        alt={zonaActual.etiqueta}
                        className="h-full w-full object-contain object-center"
                      />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-[#111827]/85 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-[#EDEDED]">
                        {fotoDevolucionPrincipal
                          ? 'Solo foto de Devolución'
                          : 'Solo foto de Entrega'}
                      </span>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center p-4 text-center text-xs text-[#9CA3AF]">
                      Sin fotografías registradas para {zonaActual.etiqueta}.
                    </div>
                  )}
                </div>

                {fotoEntregaPrincipal && fotoDevolucionPrincipal && (
                  <div className="px-4 py-2.5 bg-[#1F2937] flex items-center gap-3">
                    <span className="text-[10px] font-bold text-[#EDEDED] shrink-0">
                      Desliza
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sliderComparador}
                      aria-label="Comparar fotografía de entrega y devolución"
                      onChange={(e) => setSliderComparador(Number(e.target.value))}
                      className="w-full accent-[#EDEDED] cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Botones de Dictamen para la zona */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    actualizarZonaActual({
                      estado: 'SIN_NOVEDAD',
                      generaCobro: false,
                      cobroValor: 0,
                    });
                    if (zonaActivaIdx < totalZonas - 1) {
                      setZonaActivaIdx((i) => i + 1);
                    }
                  }}
                  className={`fx-press min-h-[46px] rounded-[16px] border px-4 py-2.5 text-xs font-bold cursor-pointer ${
                    zonaActual.estado === 'SIN_NOVEDAD'
                      ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                      : 'bg-[#EDEDED]/75 dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/40 dark:border-white/15'
                  }`}
                >
                  ✓ Sin novedad
                </button>

                <button
                  type="button"
                  onClick={() => actualizarZonaActual({ estado: 'CON_NOVEDAD' })}
                  className={`fx-press min-h-[46px] rounded-[16px] border px-4 py-2.5 text-xs font-bold cursor-pointer ${
                    zonaActual.estado === 'CON_NOVEDAD'
                      ? 'bg-[#111827] text-white border-status-warning ring-2 ring-status-warning/40 dark:bg-[#EDEDED] dark:text-[#111827]'
                      : 'bg-[#EDEDED]/75 dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/40 dark:border-white/15'
                  }`}
                >
                  ! Con novedad
                </button>
              </div>

              {/* Formulario breve si la zona tiene novedad */}
              {zonaActual.estado === 'CON_NOVEDAD' && (
                <div className="rounded-[20px] border border-[#9CA3AF]/35 dark:border-white/15 bg-[#EDEDED]/50 dark:bg-[#111827] p-4 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                      Registrar hallazgo en {zonaActual.etiqueta}
                    </span>
                    <label className="fx-press inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-1.5 text-[11px] font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer">
                      <span>📷 Capturar foto</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={(e) => manejarCapturaCamara(e.target.files?.[0])}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                      Nota de la novedad *
                    </label>
                    <textarea
                      rows={2}
                      value={zonaActual.nota}
                      onChange={(e) => actualizarZonaActual({ nota: e.target.value })}
                      placeholder="Describe el golpe, rayón o detalle encontrado..."
                      className="w-full rounded-[14px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED] placeholder:text-[#9CA3AF]"
                    />
                  </div>

                  {/* Selector de evidencia entre las fotos de devolución de la zona */}
                  {fotosDevolucionZona.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
                        Fotografía de evidencia (devolución)
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {fotosDevolucionZona.map((f) => {
                          const seleccionada = zonaActual.evidenciaId === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() =>
                                actualizarZonaActual({
                                  evidenciaId: f.id,
                                  evidenciaUrl: f.url,
                                })
                              }
                              className={`relative h-16 w-24 shrink-0 rounded-[12px] overflow-hidden border-2 cursor-pointer ${
                                seleccionada
                                  ? 'border-[#111827] dark:border-[#EDEDED]'
                                  : 'border-transparent opacity-75 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={f.url}
                                alt="Evidencia"
                                className="h-full w-full object-cover"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cobro adicional opcional */}
                  <div className="pt-2 border-t border-[#9CA3AF]/25 dark:border-white/10 space-y-2.5">
                    <label className="flex items-center justify-between gap-2 cursor-pointer">
                      <span className="text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
                        ¿Registrar cobro adicional por esta novedad?
                      </span>
                      <input
                        type="checkbox"
                        checked={zonaActual.generaCobro}
                        onChange={(e) =>
                          actualizarZonaActual({
                            generaCobro: e.target.checked,
                            cobroConcepto:
                              e.target.checked && !zonaActual.cobroConcepto
                                ? CONCEPTOS_SUGERIDOS[0]!
                                : zonaActual.cobroConcepto,
                          })
                        }
                        className="h-5 w-5 accent-[#111827] dark:accent-[#EDEDED] cursor-pointer"
                      />
                    </label>

                    {zonaActual.generaCobro && (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex flex-wrap gap-1.5">
                          {CONCEPTOS_SUGERIDOS.map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() => actualizarZonaActual({ cobroConcepto: sug })}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border cursor-pointer ${
                                zonaActual.cobroConcepto === sug
                                  ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827]'
                                  : 'bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/35 dark:border-white/15'
                              }`}
                            >
                              {sug}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                              Concepto *
                            </label>
                            <input
                              type="text"
                              value={zonaActual.cobroConcepto}
                              onChange={(e) =>
                                actualizarZonaActual({ cobroConcepto: e.target.value })
                              }
                              placeholder="Ej. Rayón en puerta"
                              className="w-full rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                              Valor del cobro (COP) *
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatMiles(zonaActual.cobroValor)}
                              onChange={(e) =>
                                actualizarZonaActual({
                                  cobroValor: parseSoloDigitos(e.target.value),
                                })
                              }
                              placeholder="150.000"
                              className="w-full rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base font-mono text-[#111827] dark:text-[#EDEDED]"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===============================================================
              PASO 2: RETORNO, RESUMEN FINANCIERO Y GARANTÍA
             =============================================================== */}
          {paso === 2 && (
            <div className="space-y-4">
              {/* Telemetría de retorno */}
              <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 bg-[#EDEDED]/45 dark:bg-[#111827] p-4 space-y-3">
                <h3 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                  Datos de recepción del vehículo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                      Fecha de devolución real
                    </label>
                    <input
                      type="date"
                      value={fechaDevolucionReal}
                      onChange={(e) => setFechaDevolucionReal(e.target.value)}
                      className="w-full rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                      Kilómetros acumulados
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatMiles(medidorUsoRetorno)}
                      onChange={(e) => setMedidorUsoRetorno(parseSoloDigitos(e.target.value))}
                      className="w-full rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base font-mono text-[#111827] dark:text-[#EDEDED]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                      Nivel combustible / batería (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={nivelEnergiaRetornoPct}
                      onChange={(e) =>
                        setNivelEnergiaRetornoPct(
                          Math.min(100, Math.max(0, Number(e.target.value) || 0))
                        )
                      }
                      className="w-full rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base font-mono text-[#111827] dark:text-[#EDEDED]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                    Observaciones generales (opcional)
                  </label>
                  <input
                    type="text"
                    value={observacionesGenerales}
                    onChange={(e) => setObservacionesGenerales(e.target.value)}
                    placeholder="Notas finales de recepción en patio..."
                    className="w-full rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                  />
                </div>

                <label className="flex items-center justify-between gap-2 pt-1 cursor-pointer">
                  <span className="text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
                    Enviar vehículo a taller / alistamiento al finalizar
                  </span>
                  <input
                    type="checkbox"
                    checked={requiereMantenimiento}
                    onChange={(e) => setRequiereMantenimiento(e.target.checked)}
                    className="h-5 w-5 accent-[#111827] dark:accent-[#EDEDED] cursor-pointer"
                  />
                </label>

                {requiereMantenimiento && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <select
                      value={tipoMantenimiento}
                      onChange={(e) =>
                        setTipoMantenimiento(
                          e.target.value as 'PREVENTIVO' | 'CORRECTIVO_NOVEDAD' | 'ALISTAMIENTO'
                        )
                      }
                      className="w-full rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                    >
                      <option value="CORRECTIVO_NOVEDAD">Correctivo por novedad</option>
                      <option value="ALISTAMIENTO">Alistamiento / Lavado</option>
                      <option value="PREVENTIVO">Mantenimiento preventivo</option>
                    </select>
                    <input
                      type="date"
                      value={fechaFinTaller}
                      onChange={(e) => setFechaFinTaller(e.target.value)}
                      className="w-full rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                    />
                  </div>
                )}
              </div>

              {/* Resumen financiero: Alquiler + Cobros adicionales */}
              <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 bg-white dark:bg-[#111827] p-4 space-y-3 text-xs">
                <h3 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                  Resultado financiero del alquiler
                </h3>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">Total del alquiler original</span>
                    <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                      {formatCop(totalAlquilerOriginal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                      Cobros adicionales ({cobrosAdicionales.length})
                    </span>
                    <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                      {formatCop(totalCobrosAdicionales)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">Pagos recibidos</span>
                    <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                      -{formatCop(pagosRecibidos)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#EDEDED] dark:border-white/10">
                    <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                      Saldo pendiente por cobrar
                    </span>
                    <span className="font-display text-base font-black text-[#111827] dark:text-[#EDEDED] tabular-nums">
                      {formatCop(saldoPendienteFinal)}
                    </span>
                  </div>
                </div>

                {cobrosAdicionales.length > 0 && (
                  <div className="pt-2 border-t border-[#EDEDED] dark:border-white/10 space-y-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
                      Detalle de cobros adicionales
                    </span>
                    {cobrosAdicionales.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 rounded-[12px] bg-[#EDEDED]/60 dark:bg-[#1F2937] px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {c.evidenciaUrl && (
                            <img
                              src={c.evidenciaUrl}
                              alt={c.concepto}
                              className="h-9 w-12 rounded-md object-cover shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                              {c.concepto} ({c.zona})
                            </p>
                            {c.nota && (
                              <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] truncate">
                                {c.nota}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums shrink-0">
                          {formatCop(c.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {saldoPendienteFinal > 0 && (
                  <div className="pt-2 border-t border-[#EDEDED] dark:border-white/10 space-y-2">
                    <label className="flex items-center justify-between gap-2 cursor-pointer">
                      <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                        Cobrar saldo pendiente ahora en caja ({formatCop(saldoPendienteFinal)})
                      </span>
                      <input
                        type="checkbox"
                        checked={cobrarSaldoAhora}
                        onChange={(e) => setCobrarSaldoAhora(e.target.checked)}
                        className="h-5 w-5 accent-[#111827] dark:accent-[#EDEDED] cursor-pointer"
                      />
                    </label>
                    {cobrarSaldoAhora && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={metodoCobro}
                          onChange={(e) =>
                            setMetodoCobro(
                              e.target.value as 'efectivo' | 'transferencia' | 'tarjeta'
                            )
                          }
                          className="w-full rounded-[12px] bg-[#EDEDED]/60 dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia / PSE</option>
                          <option value="tarjeta">Tarjeta / Datáfono</option>
                        </select>
                        {cuentasFinancieras.length > 0 && (
                          <select
                            value={cuentaCobroId}
                            onChange={(e) => setCuentaCobroId(e.target.value)}
                            className="w-full rounded-[12px] bg-[#EDEDED]/60 dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                          >
                            {cuentasFinancieras.map((cta) => (
                              <option key={cta.id} value={cta.id}>
                                {cta.nombre} ({cta.tipo})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tratamiento de garantía */}
              {tieneGarantiaActiva && (
                <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 bg-[#EDEDED]/45 dark:bg-[#111827] p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                      Tratamiento de garantía
                    </h3>
                    <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                      Recibida: {formatCop(garantiaRecibida)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'DEVOLVER_TOTAL', label: 'Devolver total' },
                      { id: 'DEVOLVER_PARCIAL', label: 'Retener parcial' },
                      { id: 'RETENER_CARGOS', label: 'Retener por cargos' },
                      { id: 'DEJAR_CUSTODIA', label: 'Dejar en custodia' },
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
                        className={`min-h-[44px] rounded-[12px] border px-2.5 py-2 text-[11px] font-bold cursor-pointer ${
                          resolucionGarantia === op.id
                            ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827]'
                            : 'bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/35 dark:border-white/15'
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>

                  {(resolucionGarantia === 'DEVOLVER_PARCIAL' ||
                    resolucionGarantia === 'RETENER_CARGOS') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                          Valor a retener (COP)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatMiles(montoRetenerGarantia)}
                          onChange={(e) =>
                            setMontoRetenerGarantia(
                              Math.min(garantiaRecibida, parseSoloDigitos(e.target.value))
                            )
                          }
                          placeholder={formatMiles(totalCobrosAdicionales || 0)}
                          className="w-full rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base font-mono text-[#111827] dark:text-[#EDEDED]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                          Motivo de retención *
                        </label>
                        <input
                          type="text"
                          value={motivoRetencionGarantia}
                          onChange={(e) => setMotivoRetencionGarantia(e.target.value)}
                          placeholder="Ej. Daño documentado en inspección"
                          className="w-full rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                        />
                      </div>
                    </div>
                  )}

                  {cuentasFinancieras.length > 0 &&
                    (resolucionGarantia === 'DEVOLVER_TOTAL' ||
                      resolucionGarantia === 'DEVOLVER_PARCIAL') && (
                      <div>
                        <label className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1">
                          Cuenta de caja para devolución
                        </label>
                        <select
                          value={cuentaGarantiaId}
                          onChange={(e) => setCuentaGarantiaId(e.target.value)}
                          className="w-full rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                        >
                          {cuentasFinancieras.map((cta) => (
                            <option key={cta.id} value={cta.id}>
                              {cta.nombre} ({cta.tipo})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                  <div className="flex items-center justify-between pt-1 border-t border-[#9CA3AF]/20 dark:border-white/10">
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                      Garantía retenida: <strong>{formatCop(montoGarantiaRetenida)}</strong>
                    </span>
                    <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                      A devolver al cliente: {formatCop(montoGarantiaDevolver)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===============================================================
              PASO 3: CONFIRMACIÓN FINAL
             =============================================================== */}
          {paso === 3 && (
            <div className="space-y-4 text-xs">
              <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 bg-[#EDEDED]/50 dark:bg-[#111827] p-4 space-y-2.5">
                <h3 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                  Resumen de inspección y cierre
                </h3>
                <p className="text-[#4B5563] dark:text-[#9CA3AF]">
                  Zonas revisadas: <strong>{totalZonas}</strong> · Sin novedad:{' '}
                  <strong>{totalZonas - novedadesActivas.length}</strong> · Con novedad:{' '}
                  <strong>{novedadesActivas.length}</strong>
                </p>
                <p className="text-[#4B5563] dark:text-[#9CA3AF]">
                  Devolución real: <strong>{fechaDevolucionReal}</strong> · Odómetro:{' '}
                  <strong>{formatMiles(medidorUsoRetorno)} km</strong> · Energía:{' '}
                  <strong>{nivelEnergiaRetornoPct}%</strong>
                </p>
              </div>

              <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 bg-white dark:bg-[#111827] p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#4B5563] dark:text-[#9CA3AF]">Total alquiler</span>
                  <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED]">
                    {formatCop(totalAlquilerOriginal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4B5563] dark:text-[#9CA3AF]">Cobros adicionales</span>
                  <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED]">
                    {formatCop(totalCobrosAdicionales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4B5563] dark:text-[#9CA3AF]">Pagos recibidos</span>
                  <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED]">
                    {formatCop(pagosRecibidos)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#EDEDED] dark:border-white/10">
                  <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                    Saldo pendiente {saldoPendienteFinal > 0 && cobrarSaldoAhora ? '(se cobrará ahora)' : ''}
                  </span>
                  <span className="font-mono font-black text-[#111827] dark:text-[#EDEDED]">
                    {formatCop(saldoPendienteFinal)}
                  </span>
                </div>
                {tieneGarantiaActiva && (
                  <div className="flex justify-between pt-1">
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                      Garantía (retenida {formatCop(montoGarantiaRetenida)})
                    </span>
                    <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED]">
                      Devolver {formatCop(montoGarantiaDevolver)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pie con acciones de navegación */}
        <div className="px-5 py-4 border-t border-[#EDEDED] dark:border-white/10 bg-white dark:bg-[#1F2937] flex items-center justify-between gap-2.5">
          {paso === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="fx-press min-h-[44px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#111827] px-4 py-2.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              disabled={guardando}
              onClick={() => setPaso((p) => (p === 3 ? 2 : 1))}
              className="fx-press min-h-[44px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#111827] px-4 py-2.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
            >
              ← Volver
            </button>
          )}

          {paso === 1 && (
            <button
              type="button"
              onClick={irAPaso2}
              className="fx-press min-h-[44px] rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] cursor-pointer"
            >
              Continuar al resumen financiero →
            </button>
          )}
          {paso === 2 && (
            <button
              type="button"
              onClick={irAPaso3}
              className="fx-press min-h-[44px] rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] cursor-pointer"
            >
              Revisar y confirmar →
            </button>
          )}
          {paso === 3 && (
            <button
              type="button"
              disabled={guardando || zonasPendientes > 0}
              onClick={confirmarFinalizacion}
              className="fx-press min-h-[44px] rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] disabled:opacity-50 cursor-pointer"
            >
              {guardando ? 'Finalizando alquiler...' : 'Confirmar y finalizar alquiler'}
            </button>
          )}
        </div>
      </div>

      {/* Lightbox para ampliar imagen */}
      {fotoAmpliada && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onClick={() => setFotoAmpliada(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setFotoAmpliada(null);
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111827]/90 p-4"
        >
          <div className="max-w-3xl w-full space-y-2 text-center">
            <img
              src={fotoAmpliada.url}
              alt={fotoAmpliada.titulo}
              className="max-h-[82dvh] w-auto mx-auto rounded-[18px] object-contain"
            />
            <p className="text-xs font-bold text-[#EDEDED]">{fotoAmpliada.titulo}</p>
          </div>
        </div>
      )}
    </div>
  );
}
