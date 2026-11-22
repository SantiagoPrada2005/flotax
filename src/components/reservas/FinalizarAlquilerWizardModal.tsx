import { useEffect, useMemo, useRef, useState } from 'react';
import { actions } from 'astro:actions';
import {
  ZONAS_FOTOS_ALQUILER,
  calcularLiquidacionCierreAlquiler,
  etiquetaZonaEvidencia,
  type ReservaClienteItem,
} from '@/lib/flota';
import type { CapacidadesOperacionAlquiler } from '@/lib/auth/capacidades-alquiler';
import type {
  DetalleReservaAdminContext,
  FotoInspeccionItem,
} from '@/lib/flota/detalle-reserva-admin';
import { comprimirYNormalizarImagen } from '@/lib/media/image-compression';
import type { ZonaEvidenciaVehiculo } from '@/db/schema';

export interface FinalizarAlquilerWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reserva: ReservaClienteItem;
  detalleAdmin: DetalleReservaAdminContext;
  hoyISO: string;
  capacidades?: CapacidadesOperacionAlquiler | undefined;
  cuentasFinancieras: Array<{ id: string; nombre: string; tipo: string }>;
  onFotoDevolucionRegistrada?: ((foto: FotoInspeccionItem) => void) | undefined;
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

const CONCEPTOS_SUGERIDOS: ReadonlyArray<string> = [
  'Rayón en puerta',
  'Daño en parachoques',
  'Tapicería deteriorada',
  'Daño en llanta',
  'Limpieza extraordinaria',
];

type TipoMantenimientoRetorno =
  | 'PREVENTIVO'
  | 'CORRECTIVO_NOVEDAD'
  | 'ALISTAMIENTO';

type MetodoCobroRetorno = 'efectivo' | 'transferencia' | 'tarjeta';
type ModoGarantiaCierre = 'LIQUIDAR_AUTOMATICO' | 'DEJAR_CUSTODIA';

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

interface FotoLocalFallback {
  tempId: string;
  zonaEvidencia: ZonaEvidenciaVehiculo;
  dataUrl: string;
  capturadoEnISO: string;
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

const formatFechaCortaHora = (iso: string | null | undefined): string => {
  if (!iso) return 'Sin fecha';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(dt);
};

function normalizarTipoMantenimiento(val: string): TipoMantenimientoRetorno {
  if (val === 'PREVENTIVO' || val === 'ALISTAMIENTO') return val;
  return 'CORRECTIVO_NOVEDAD';
}

function normalizarMetodoCobro(val: string): MetodoCobroRetorno {
  if (val === 'transferencia' || val === 'tarjeta') return val;
  return 'efectivo';
}

export function FinalizarAlquilerWizardModal({
  isOpen,
  onClose,
  reserva,
  detalleAdmin,
  hoyISO,
  capacidades,
  cuentasFinancieras,
  onFotoDevolucionRegistrada,
  onExito,
}: FinalizarAlquilerWizardModalProps) {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  // Zonas dinámicas: las 6 obligatorias + cualquier otra zona con fotos en entrega/devolución
  const zonasEvaluacionBase = useMemo<ZonaComparacionDef[]>(() => {
    const mapa = new Map<ZonaEvidenciaVehiculo, ZonaComparacionDef>();
    for (const z of ZONAS_FOTOS_ALQUILER) {
      mapa.set(z.id, { id: z.id, etiqueta: z.etiqueta });
    }
    const todas = [...detalleAdmin.fotosEntrega, ...detalleAdmin.fotosDevolucion];
    for (const f of todas) {
      if (!mapa.has(f.zonaEvidencia)) {
        mapa.set(f.zonaEvidencia, {
          id: f.zonaEvidencia,
          etiqueta: etiquetaZonaEvidencia(f.zonaEvidencia),
        });
      }
    }
    return Array.from(mapa.values());
  }, [detalleAdmin.fotosEntrega, detalleAdmin.fotosDevolucion]);

  const [evaluaciones, setEvaluaciones] = useState<EvaluacionZonaState[]>([]);
  const [zonaActivaIdx, setZonaActivaIdx] = useState<number>(0);
  const [sliderComparador, setSliderComparador] = useState<number>(50);
  const [arrastrandoSlider, setArrastrandoSlider] = useState<boolean>(false);
  const comparadorMovilRef = useRef<HTMLDivElement>(null);

  const [fotoAmpliada, setFotoAmpliada] = useState<{
    url: string;
    titulo: string;
    fecha?: string | undefined;
  } | null>(null);

  // Fotos subidas inmediatamente a R2 durante la sesión del modal + fallback local si R2 fallara
  const [fotosDevolucionSesion, setFotosDevolucionSesion] = useState<
    FotoInspeccionItem[]
  >([]);
  const [fotosFallbackLocal, setFotosFallbackLocal] = useState<
    FotoLocalFallback[]
  >([]);
  const [subiendoFoto, setSubiendoFoto] = useState<boolean>(false);

  // Paso 2: Datos de recepción y finanzas
  const [fechaDevolucionReal, setFechaDevolucionReal] = useState<string>(hoyISO);
  const [medidorUsoRetorno, setMedidorUsoRetorno] = useState<number>(
    reserva.kilometrajeRetorno ||
      reserva.kilometrajeEntrega + reserva.diasAlquiler * 50
  );
  const [nivelEnergiaRetornoPct, setNivelEnergiaRetornoPct] =
    useState<number>(85);
  const [observacionesGenerales, setObservacionesGenerales] =
    useState<string>('');
  const [requiereMantenimiento, setRequiereMantenimiento] =
    useState<boolean>(false);
  const [tipoMantenimiento, setTipoMantenimiento] =
    useState<TipoMantenimientoRetorno>('CORRECTIVO_NOVEDAD');
  const [fechaFinTaller, setFechaFinTaller] = useState<string>(hoyISO);

  // Liquidación saldo y garantía
  const [cobrarSaldoAhora, setCobrarSaldoAhora] = useState<boolean>(true);
  const [metodoCobro, setMetodoCobro] =
    useState<MetodoCobroRetorno>('efectivo');
  const [cuentaCobroId, setCuentaCobroId] = useState<string>(
    cuentasFinancieras[0]?.id ?? ''
  );
  const [modoGarantia, setModoGarantia] = useState<ModoGarantiaCierre>(
    'LIQUIDAR_AUTOMATICO'
  );
  const [cuentaGarantiaId, setCuentaGarantiaId] = useState<string>(
    cuentasFinancieras[0]?.id ?? ''
  );
  const [notaGarantia, setNotaGarantia] = useState<string>('');

  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inicializar estado solo cuando se abre el modal
  const abiertoPrevioRef = useRef<boolean>(false);
  useEffect(() => {
    if (isOpen && !abiertoPrevioRef.current) {
      setPaso(1);
      setZonaActivaIdx(0);
      setSliderComparador(50);
      setErrorMsg(null);
      setFotosDevolucionSesion([]);
      setFotosFallbackLocal([]);
      setModoGarantia('LIQUIDAR_AUTOMATICO');
      setNotaGarantia('');
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
    }
    abiertoPrevioRef.current = isOpen;
  }, [isOpen, zonasEvaluacionBase]);

  if (!isOpen) return null;

  const zonaActual = evaluaciones[zonaActivaIdx];

  const fotosEntregaZona = zonaActual
    ? detalleAdmin.fotosEntrega.filter(
        (f) => f.zonaEvidencia === zonaActual.zonaId
      )
    : [];

  // Unificar fotos de devolución persistidas + recién subidas en esta sesión + fallback local
  const fotosDevolucionZona = (() => {
    if (!zonaActual) return [] as FotoInspeccionItem[];
    const idsVistos = new Set<string>();
    const lista: FotoInspeccionItem[] = [];

    for (const f of fotosDevolucionSesion) {
      if (f.zonaEvidencia === zonaActual.zonaId && !idsVistos.has(f.id)) {
        idsVistos.add(f.id);
        lista.push(f);
      }
    }
    for (const f of fotosFallbackLocal) {
      if (f.zonaEvidencia === zonaActual.zonaId && !idsVistos.has(f.tempId)) {
        idsVistos.add(f.tempId);
        lista.push({
          id: f.tempId,
          url: f.dataUrl,
          r2Key: f.tempId,
          etapaOperativa: 'DEVOLUCION_RETORNO',
          zonaEvidencia: f.zonaEvidencia,
          capturadoEnISO: f.capturadoEnISO,
          observacion: f.observacion ?? null,
        });
      }
    }
    for (const f of detalleAdmin.fotosDevolucion) {
      if (f.zonaEvidencia === zonaActual.zonaId && !idsVistos.has(f.id)) {
        idsVistos.add(f.id);
        lista.push(f);
      }
    }
    return lista;
  })();

  const fotoEntregaPrincipal = fotosEntregaZona[0] ?? null;
  const fotoDevolucionPrincipal = fotosDevolucionZona[0] ?? null;

  const actualizarZonaActual = (patch: Partial<EvaluacionZonaState>) => {
    setEvaluaciones((prev) =>
      prev.map((item, idx) =>
        idx === zonaActivaIdx ? { ...item, ...patch } : item
      )
    );
    setErrorMsg(null);
  };

  const actualizarSliderDesdePuntero = (clientX: number) => {
    const el = comparadorMovilRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = Math.round(
      Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    );
    setSliderComparador(pct);
  };

  const manejarCapturaFotoDevolucion = async (file: File | undefined) => {
    if (!file || !zonaActual) return;
    setErrorMsg(null);
    setSubiendoFoto(true);
    const capturadoEnISO = new Date().toISOString();

    try {
      const comprimida = await comprimirYNormalizarImagen(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.84,
      });

      const res = await actions.reservas.registrarFotoAlquiler({
        codigo: reserva.codigo,
        etapaOperativa: 'DEVOLUCION_RETORNO',
        zonaEvidencia: zonaActual.zonaId,
        dataUrl: comprimida.base64,
        observacion: `Devolución · ${zonaActual.etiqueta}`,
        ordenVisual: zonaActivaIdx,
        capturadoEnISO,
      });

      if (res.data?.ok && res.data.foto) {
        const fotoGuardada = res.data.foto;
        setFotosDevolucionSesion((prev) => [fotoGuardada, ...prev]);
        onFotoDevolucionRegistrada?.(fotoGuardada);
        actualizarZonaActual({
          evidenciaId: fotoGuardada.id,
          evidenciaUrl: fotoGuardada.url,
        });
      } else {
        const tempId = `tmp-dev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        setFotosFallbackLocal((prev) => [
          {
            tempId,
            zonaEvidencia: zonaActual.zonaId,
            dataUrl: comprimida.base64,
            capturadoEnISO,
            observacion: `Devolución · ${zonaActual.etiqueta}`,
          },
          ...prev,
        ]);
        actualizarZonaActual({
          evidenciaId: tempId,
          evidenciaUrl: comprimida.base64,
        });
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No fue posible registrar la fotografía de devolución.'
      );
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Totales y liquidación determinista con descuento automático sobre garantía
  const totalZonas = evaluaciones.length;
  const zonasPendientes = evaluaciones.filter(
    (e) => e.estado === 'PENDIENTE'
  ).length;
  const novedadesActivas = evaluaciones.filter(
    (e) => e.estado === 'CON_NOVEDAD'
  );
  const puedeAprobarCargos = capacidades?.puedeAjustarTarifasYCargos ?? true;

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

  const totalCobrosAdicionales = cobrosAdicionales.reduce(
    (acc, c) => acc + c.valor,
    0
  );

  const totalAlquilerBase =
    detalleAdmin.contrato?.totalLiquidado ?? reserva.totalAlquiler;
  const pagosPrevios =
    detalleAdmin.contrato?.totalPagado ?? reserva.montoReportado;
  const garantiaDisponible = Math.max(
    0,
    detalleAdmin.garantia?.saldoComprometido ?? 0
  );
  const tieneGarantiaActiva = Boolean(
    detalleAdmin.garantia && garantiaDisponible > 0
  );

  const liquidacion = calcularLiquidacionCierreAlquiler({
    totalAlquilerBase,
    totalPagadoPrevio: pagosPrevios,
    totalCobrosAdicionales,
    garantiaDisponible:
      tieneGarantiaActiva && modoGarantia === 'LIQUIDAR_AUTOMATICO'
        ? garantiaDisponible
        : 0,
  });

  const validarPaso1 = (): boolean => {
    if (zonasPendientes > 0) {
      setErrorMsg(
        `Debes revisar todas las zonas del vehículo antes de continuar (${zonasPendientes} pendiente${zonasPendientes === 1 ? '' : 's'}).`
      );
      return false;
    }
    for (const nov of novedadesActivas) {
      if (!nov.nota.trim()) {
        setErrorMsg(
          `Agrega una nota breve describiendo la novedad en "${nov.etiqueta}".`
        );
        return false;
      }
      if (
        nov.generaCobro &&
        (!nov.cobroConcepto.trim() || nov.cobroValor <= 0)
      ) {
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
    setErrorMsg(null);
    setPaso(3);
  };

  const confirmarFinalizacion = async () => {
    if (guardando) return;
    if (!validarPaso1()) return;

    setGuardando(true);
    setErrorMsg(null);

    try {
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
          liquidacion.saldoPendientePorCobrar > 0 && cobrarSaldoAhora
            ? {
                monto: liquidacion.saldoPendientePorCobrar,
                metodoPago: metodoCobro,
                cuentaId: cuentaCobroId || undefined,
                referencia: `Cierre contrato ${reserva.codigo}`,
              }
            : undefined,
        gestionGarantia: tieneGarantiaActiva
          ? {
              accion: modoGarantia,
              cuentaId: cuentaGarantiaId || undefined,
              motivoRetencion: notaGarantia.trim() || undefined,
            }
          : undefined,
        requiereMantenimiento,
        tipoMantenimiento: requiereMantenimiento
          ? tipoMantenimiento
          : undefined,
        fechaFinEstimadaMantenimiento: requiereMantenimiento
          ? fechaFinTaller
          : undefined,
        fotosDevolucionNuevas:
          fotosFallbackLocal.length > 0
            ? fotosFallbackLocal.map((f) => ({
                tempId: f.tempId,
                zonaEvidencia: f.zonaEvidencia,
                dataUrl: f.dataUrl,
                observacion: f.observacion,
              }))
            : undefined,
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
          res.error?.message ||
            'No fue posible registrar la devolución y finalización.'
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
          modoGarantia === 'DEJAR_CUSTODIA'
            ? 'CUSTODIA_ACTIVA'
            : liquidacion.garantiaRetenidaPorCobros > 0 &&
                liquidacion.garantiaADevolver === 0
              ? 'RETENIDA_NOVEDAD'
              : 'LIBERADA',
      };

      onExito(
        actualizada,
        res.data.detalleAdmin ?? null,
        res.data.mensaje || 'Alquiler finalizado y liquidado correctamente.'
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
      aria-label="Revisión comparativa y finalización de alquiler"
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
                ? 'Comparativa de fotos: Entrega vs. Devolución'
                : paso === 2
                  ? 'Recepción, garantía y saldo final'
                  : 'Resumen y confirmación final'}
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-[16px] bg-[#111827] text-[#EDEDED] border border-[#4B5563] px-4 py-3 text-xs flex items-center justify-between gap-3"
            >
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="min-h-[44px] px-2 text-[11px] font-bold text-[#9CA3AF] hover:text-white cursor-pointer"
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
              {/* Progreso de revisión + selector de zonas */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
                  Revisa las {totalZonas} zonas para habilitar el cierre (
                  <strong className="text-[#111827] dark:text-[#EDEDED]">
                    {totalZonas - zonasPendientes}/{totalZonas}
                  </strong>{' '}
                  revisadas)
                </span>
                {novedadesActivas.length > 0 && (
                  <span className="rounded-full bg-[#111827] dark:bg-[#EDEDED] px-2.5 py-0.5 font-mono text-[10px] font-bold text-white dark:text-[#111827]">
                    {novedadesActivas.length}{' '}
                    {novedadesActivas.length === 1 ? 'novedad' : 'novedades'}
                  </span>
                )}
              </div>

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
                      className={`fx-press shrink-0 min-h-[44px] inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                        activa
                          ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                          : ev.estado === 'CON_NOVEDAD'
                            ? 'bg-[#1F2937] text-[#EDEDED] border-[#4B5563] dark:bg-[#111827] dark:border-white/40'
                            : ev.estado === 'SIN_NOVEDAD'
                              ? 'bg-[#EDEDED] text-[#111827] border-[#111827]/40 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/25'
                              : 'bg-white dark:bg-[#111827] text-[#4B5563] dark:text-[#9CA3AF] border-[#9CA3AF]/40 dark:border-white/15'
                      }`}
                    >
                      <span className="font-mono text-[11px]">
                        {estadoLabel}
                      </span>
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
                      {formatFechaCortaHora(
                        fotoEntregaPrincipal?.capturadoEnISO
                      )}
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
                              fecha: formatFechaCortaHora(
                                fotoEntregaPrincipal.capturadoEnISO
                              ),
                            })
                          }
                          className="fx-press absolute right-2.5 bottom-2.5 min-h-[36px] rounded-full bg-[#111827]/85 border border-white/25 px-3 py-1.5 text-[11px] font-bold text-[#EDEDED] cursor-pointer"
                        >
                          Ampliar
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-[#9CA3AF] px-4 text-center">
                        Sin fotografía de entrega registrada para{' '}
                        {zonaActual.etiqueta}.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 overflow-hidden bg-[#111827]">
                  <div className="px-3.5 py-2 flex items-center justify-between gap-2 border-b border-white/10 text-xs text-[#EDEDED]">
                    <span className="font-bold">Después · Devolución</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#9CA3AF]">
                        {fotoDevolucionPrincipal
                          ? formatFechaCortaHora(
                              fotoDevolucionPrincipal.capturadoEnISO
                            )
                          : 'Sin foto'}
                      </span>
                      <label
                        className={`fx-press inline-flex min-h-[32px] items-center rounded-full bg-[#EDEDED] px-2.5 py-1 text-[10px] font-bold text-[#111827] cursor-pointer ${
                          subiendoFoto ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <span>
                          {subiendoFoto
                            ? 'Subiendo...'
                            : fotoDevolucionPrincipal
                              ? 'Nueva foto'
                              : 'Subir foto'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={subiendoFoto}
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            void manejarCapturaFotoDevolucion(f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
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
                              fecha: formatFechaCortaHora(
                                fotoDevolucionPrincipal.capturadoEnISO
                              ),
                            })
                          }
                          className="fx-press absolute right-2.5 bottom-2.5 min-h-[36px] rounded-full bg-[#111827]/85 border border-white/25 px-3 py-1.5 text-[11px] font-bold text-[#EDEDED] cursor-pointer"
                        >
                          Ampliar
                        </button>
                      </>
                    ) : (
                      <label
                        className={`fx-press inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/25 bg-[#1F2937] px-4 py-2 text-xs font-bold text-[#EDEDED] cursor-pointer ${
                          subiendoFoto ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        <span>
                          {subiendoFoto
                            ? 'Guardando fotografía...'
                            : `Tomar / subir foto de ${zonaActual.etiqueta}`}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={subiendoFoto}
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            void manejarCapturaFotoDevolucion(f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Comparador Móvil: Deslizador táctil interactivo Antes / Después */}
              <div className="md:hidden rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 overflow-hidden bg-[#111827]">
                <div
                  ref={comparadorMovilRef}
                  onPointerDown={(e) => {
                    if (!fotoEntregaPrincipal || !fotoDevolucionPrincipal)
                      return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setArrastrandoSlider(true);
                    actualizarSliderDesdePuntero(e.clientX);
                  }}
                  onPointerMove={(e) => {
                    if (!arrastrandoSlider) return;
                    actualizarSliderDesdePuntero(e.clientX);
                  }}
                  onPointerUp={() => setArrastrandoSlider(false)}
                  onPointerCancel={() => setArrastrandoSlider(false)}
                  className="relative aspect-video w-full bg-[#111827] select-none overflow-hidden touch-none"
                >
                  {fotoEntregaPrincipal && fotoDevolucionPrincipal ? (
                    <>
                      <img
                        src={fotoDevolucionPrincipal.url}
                        alt={`Devolución - ${zonaActual.etiqueta}`}
                        className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
                      />
                      <img
                        src={fotoEntregaPrincipal.url}
                        alt={`Entrega - ${zonaActual.etiqueta}`}
                        style={{
                          clipPath: `inset(0 ${100 - sliderComparador}% 0 0)`,
                        }}
                        className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
                      />
                      {/* Línea y tirador táctil */}
                      <div
                        style={{ left: `${sliderComparador}%` }}
                        className="pointer-events-none absolute inset-y-0 -translate-x-1/2 flex flex-col items-center justify-center"
                      >
                        <div className="h-full w-0.5 bg-white shadow-md" />
                        <span className="absolute flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#111827] font-mono text-xs font-black shadow-lg border border-[#111827]/20">
                          ↔
                        </span>
                      </div>
                      <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-[#111827]/85 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-[#EDEDED]">
                        Antes · Entrega
                      </span>
                      <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-[#111827]/85 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-[#EDEDED]">
                        Después · Devolución
                      </span>
                    </>
                  ) : fotoEntregaPrincipal || fotoDevolucionPrincipal ? (
                    <>
                      <img
                        src={
                          (fotoDevolucionPrincipal ?? fotoEntregaPrincipal)!.url
                        }
                        alt={zonaActual.etiqueta}
                        className="h-full w-full object-contain object-center"
                      />
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-[#111827]/85 border border-white/20 px-2.5 py-0.5 text-[10px] font-bold text-[#EDEDED]">
                        {fotoDevolucionPrincipal
                          ? 'Solo foto de devolución'
                          : 'Solo foto de entrega'}
                      </span>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center p-4 text-center text-xs text-[#9CA3AF]">
                      Sin fotografías registradas para {zonaActual.etiqueta}.
                    </div>
                  )}
                </div>

                <div className="px-3.5 py-2.5 bg-[#1F2937] space-y-2">
                  {fotoEntregaPrincipal && fotoDevolucionPrincipal && (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-[#EDEDED] shrink-0">
                        Deslizar
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={sliderComparador}
                        aria-label="Comparar fotografía de entrega y devolución"
                        onChange={(e) =>
                          setSliderComparador(Number(e.target.value))
                        }
                        className="w-full accent-[#EDEDED] cursor-pointer"
                      />
                    </div>
                  )}
                  <label
                    className={`fx-press flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/20 bg-[#111827] px-3.5 py-2 text-xs font-bold text-[#EDEDED] cursor-pointer ${
                      subiendoFoto ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <span>
                      {subiendoFoto
                        ? 'Guardando foto de devolución...'
                        : fotoDevolucionPrincipal
                          ? `Tomar otra foto de devolución (${zonaActual.etiqueta})`
                          : `Tomar / subir foto de devolución (${zonaActual.etiqueta})`}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={subiendoFoto}
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        void manejarCapturaFotoDevolucion(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
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
                      setSliderComparador(50);
                    }
                  }}
                  className={`fx-press min-h-[46px] rounded-[16px] border px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                    zonaActual.estado === 'SIN_NOVEDAD'
                      ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                      : 'bg-[#EDEDED]/75 dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/40 dark:border-white/15'
                  }`}
                >
                  ✓ Sin novedad
                </button>

                <button
                  type="button"
                  onClick={() =>
                    actualizarZonaActual({
                      estado: 'CON_NOVEDAD',
                      evidenciaId:
                        zonaActual.evidenciaId ||
                        fotoDevolucionPrincipal?.id ||
                        '',
                      evidenciaUrl:
                        zonaActual.evidenciaUrl ||
                        fotoDevolucionPrincipal?.url ||
                        '',
                    })
                  }
                  className={`fx-press min-h-[46px] rounded-[16px] border px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                    zonaActual.estado === 'CON_NOVEDAD'
                      ? 'bg-[#111827] text-white border-[#111827] ring-2 ring-[#4B5563]/40 dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                      : 'bg-[#EDEDED]/75 dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/40 dark:border-white/15'
                  }`}
                >
                  ! Con novedad
                </button>
              </div>

              {/* Formulario breve si la zona tiene novedad */}
              {zonaActual.estado === 'CON_NOVEDAD' && (
                <div className="rounded-[20px] border border-[#9CA3AF]/35 dark:border-white/15 bg-[#EDEDED]/50 dark:bg-[#111827] p-4 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                      Detalle de novedad en {zonaActual.etiqueta}
                    </span>
                    <label
                      className={`fx-press inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3.5 py-2 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer ${
                        subiendoFoto ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <span>
                        {subiendoFoto
                          ? 'Subiendo...'
                          : 'Agregar foto de detalle'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        disabled={subiendoFoto}
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          void manejarCapturaFotoDevolucion(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <label
                      htmlFor={`nota-novedad-${zonaActual.zonaId}`}
                      className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1"
                    >
                      Nota de la novedad *
                    </label>
                    <textarea
                      id={`nota-novedad-${zonaActual.zonaId}`}
                      rows={2}
                      value={zonaActual.nota}
                      onChange={(e) =>
                        actualizarZonaActual({ nota: e.target.value })
                      }
                      placeholder="Describe el rayón, golpe o hallazgo encontrado..."
                      className="w-full rounded-[14px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED] placeholder:text-[#9CA3AF]"
                    />
                  </div>

                  {/* Selector de foto de evidencia tomada de la comparativa */}
                  {fotosDevolucionZona.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
                        Foto de evidencia tomada de la comparativa
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
                                  : 'border-transparent opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={f.url}
                                alt="Evidencia de devolución"
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
                    <label className="flex items-center justify-between gap-2 min-h-[44px] cursor-pointer">
                      <span className="text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
                        Agregar cobro adicional a la factura
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
                        {!puedeAprobarCargos && (
                          <p className="rounded-xl bg-[#111827] text-[#EDEDED] px-3 py-2 text-[11px]">
                            Tu rol actual no tiene permiso para aprobar cobros
                            adicionales; solo un administrador o dueño puede
                            facturarlos.
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {CONCEPTOS_SUGERIDOS.map((sug) => (
                            <button
                              key={sug}
                              type="button"
                              onClick={() =>
                                actualizarZonaActual({ cobroConcepto: sug })
                              }
                              className={`min-h-[36px] rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors cursor-pointer ${
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
                            <label
                              htmlFor={`cobro-concepto-${zonaActual.zonaId}`}
                              className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1"
                            >
                              Concepto *
                            </label>
                            <input
                              id={`cobro-concepto-${zonaActual.zonaId}`}
                              type="text"
                              value={zonaActual.cobroConcepto}
                              onChange={(e) =>
                                actualizarZonaActual({
                                  cobroConcepto: e.target.value,
                                })
                              }
                              placeholder="Ej. Rayón en puerta"
                              className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`cobro-valor-${zonaActual.zonaId}`}
                              className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1"
                            >
                              Valor (COP) *
                            </label>
                            <input
                              id={`cobro-valor-${zonaActual.zonaId}`}
                              type="text"
                              inputMode="numeric"
                              value={formatMiles(zonaActual.cobroValor)}
                              onChange={(e) =>
                                actualizarZonaActual({
                                  cobroValor: parseSoloDigitos(e.target.value),
                                })
                              }
                              placeholder="150.000"
                              className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base font-mono text-[#111827] dark:text-[#EDEDED]"
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
              PASO 2: RECEPCIÓN, LIQUIDACIÓN AUTOMÁTICA DE GARANTÍA Y SALDO
             =============================================================== */}
          {paso === 2 && (
            <div className="space-y-4">
              {/* Telemetría de retorno */}
              <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 bg-[#EDEDED]/45 dark:bg-[#111827] p-4 space-y-3">
                <h3 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                  Datos de devolución del vehículo
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="fin-fecha-real"
                      className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1"
                    >
                      Fecha de devolución real
                    </label>
                    <input
                      id="fin-fecha-real"
                      type="date"
                      value={fechaDevolucionReal}
                      onChange={(e) => setFechaDevolucionReal(e.target.value)}
                      className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fin-odometro"
                      className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1"
                    >
                      Kilómetros al recibir
                    </label>
                    <input
                      id="fin-odometro"
                      type="text"
                      inputMode="numeric"
                      value={formatMiles(medidorUsoRetorno)}
                      onChange={(e) =>
                        setMedidorUsoRetorno(parseSoloDigitos(e.target.value))
                      }
                      className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base font-mono text-[#111827] dark:text-[#EDEDED]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fin-energia"
                      className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1"
                    >
                      Combustible / batería (%)
                    </label>
                    <input
                      id="fin-energia"
                      type="number"
                      min={0}
                      max={100}
                      value={nivelEnergiaRetornoPct}
                      onChange={(e) =>
                        setNivelEnergiaRetornoPct(
                          Math.min(
                            100,
                            Math.max(0, Number(e.target.value) || 0)
                          )
                        )
                      }
                      className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base font-mono text-[#111827] dark:text-[#EDEDED]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="fin-observaciones"
                    className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1"
                  >
                    Observaciones generales (opcional)
                  </label>
                  <input
                    id="fin-observaciones"
                    type="text"
                    value={observacionesGenerales}
                    onChange={(e) => setObservacionesGenerales(e.target.value)}
                    placeholder="Notas finales de recepción en patio..."
                    className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                  />
                </div>

                <label className="flex items-center justify-between gap-2 min-h-[44px] pt-1 cursor-pointer">
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
                      aria-label="Tipo de mantenimiento"
                      value={tipoMantenimiento}
                      onChange={(e) =>
                        setTipoMantenimiento(
                          normalizarTipoMantenimiento(e.target.value)
                        )
                      }
                      className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                    >
                      <option value="CORRECTIVO_NOVEDAD">
                        Correctivo por novedad
                      </option>
                      <option value="ALISTAMIENTO">
                        Alistamiento / Lavado
                      </option>
                      <option value="PREVENTIVO">
                        Mantenimiento preventivo
                      </option>
                    </select>
                    <input
                      type="date"
                      aria-label="Fecha estimada salida de taller"
                      value={fechaFinTaller}
                      onChange={(e) => setFechaFinTaller(e.target.value)}
                      className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                    />
                  </div>
                )}
              </div>

              {/* Liquidación financiera + Descuento automático sobre garantía */}
              <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 bg-white dark:bg-[#111827] p-4 space-y-3 text-xs">
                <h3 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                  Liquidación final y cruce con garantía
                </h3>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                      Total del alquiler
                    </span>
                    <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                      {formatCop(liquidacion.totalAlquilerBase)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                      Cobros adicionales ({cobrosAdicionales.length})
                    </span>
                    <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                      {formatCop(liquidacion.totalCobrosAdicionales)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                      Pagos recibidos previamente
                    </span>
                    <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                      -{formatCop(liquidacion.totalPagadoPrevio)}
                    </span>
                  </div>
                  {tieneGarantiaActiva && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                        Garantía retenida disponible
                      </span>
                      <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                        {formatCop(garantiaDisponible)}
                      </span>
                    </div>
                  )}
                  {liquidacion.garantiaRetenidaPorCobros > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                        Descontado de garantía por cobros
                      </span>
                      <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                        -{formatCop(liquidacion.garantiaRetenidaPorCobros)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Detalle de cobros adicionales */}
                {cobrosAdicionales.length > 0 && (
                  <div className="pt-2 border-t border-[#EDEDED] dark:border-white/10 space-y-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
                      Líneas separadas en factura
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
                              {c.concepto} · {c.zona}
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

                {/* Resultado neto de garantía / saldo por cobrar */}
                <div className="rounded-[16px] bg-[#111827] text-[#EDEDED] p-3.5 space-y-2">
                  {tieneGarantiaActiva && modoGarantia === 'LIQUIDAR_AUTOMATICO' ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[#9CA3AF]">
                          Garantía retenida para cobros
                        </span>
                        <span className="font-mono font-bold tabular-nums">
                          {formatCop(liquidacion.garantiaRetenidaPorCobros)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          Saldo de garantía a devolver al cliente
                        </span>
                        <span className="font-display text-base font-black text-white tabular-nums">
                          {formatCop(liquidacion.garantiaADevolver)}
                        </span>
                      </div>
                      {liquidacion.excedenteCobrosPorCobrar > 0 && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-white/15">
                          <span className="text-[#EDEDED] font-semibold">
                            Cobros que superan la garantía
                          </span>
                          <span className="font-mono font-extrabold text-white tabular-nums">
                            {formatCop(liquidacion.excedenteCobrosPorCobrar)}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-[#9CA3AF]">
                      {tieneGarantiaActiva
                        ? 'La garantía permanecerá en custodia para revisión posterior.'
                        : 'No hay depósito de garantía retenido para descontar.'}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1.5 border-t border-white/15">
                    <span className="font-bold text-white">
                      Saldo pendiente por cobrar al cliente
                    </span>
                    <span className="font-display text-base font-black text-white tabular-nums">
                      {formatCop(liquidacion.saldoPendientePorCobrar)}
                    </span>
                  </div>
                </div>

                {/* Opciones de cuenta de garantía si hay garantía activa */}
                {tieneGarantiaActiva && (
                  <div className="pt-2 border-t border-[#EDEDED] dark:border-white/10 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setModoGarantia('LIQUIDAR_AUTOMATICO')}
                        className={`fx-press min-h-[44px] rounded-[12px] border px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          modoGarantia === 'LIQUIDAR_AUTOMATICO'
                            ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827]'
                            : 'bg-[#EDEDED]/60 dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/40 dark:border-white/15'
                        }`}
                      >
                        Liquidar garantía ahora
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoGarantia('DEJAR_CUSTODIA')}
                        className={`fx-press min-h-[44px] rounded-[12px] border px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                          modoGarantia === 'DEJAR_CUSTODIA'
                            ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827]'
                            : 'bg-[#EDEDED]/60 dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/40 dark:border-white/15'
                        }`}
                      >
                        Dejar en custodia
                      </button>
                    </div>

                    {cuentasFinancieras.length > 0 &&
                      modoGarantia === 'LIQUIDAR_AUTOMATICO' && (
                        <div>
                          <label
                            htmlFor="fin-cuenta-garantia"
                            className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1"
                          >
                            Cuenta para liquidación / devolución de garantía
                          </label>
                          <select
                            id="fin-cuenta-garantia"
                            value={cuentaGarantiaId}
                            onChange={(e) =>
                              setCuentaGarantiaId(e.target.value)
                            }
                            className="w-full min-h-[44px] rounded-[12px] bg-[#EDEDED]/60 dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                          >
                            {cuentasFinancieras.map((cta) => (
                              <option key={cta.id} value={cta.id}>
                                {cta.nombre} ({cta.tipo})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                    {modoGarantia === 'DEJAR_CUSTODIA' && (
                      <div>
                        <label
                          htmlFor="fin-nota-garantia"
                          className="block text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] mb-1"
                        >
                          Nota de custodia (opcional)
                        </label>
                        <input
                          id="fin-nota-garantia"
                          type="text"
                          value={notaGarantia}
                          onChange={(e) => setNotaGarantia(e.target.value)}
                          placeholder="Ej. Pendiente cotización de taller"
                          className="w-full min-h-[44px] rounded-[12px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Cobro inmediato del saldo restante si supera la garantía o hay canon pendiente */}
                {liquidacion.saldoPendientePorCobrar > 0 && (
                  <div className="pt-2 border-t border-[#EDEDED] dark:border-white/10 space-y-2">
                    <label className="flex items-center justify-between gap-2 min-h-[44px] cursor-pointer">
                      <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                        Cobrar saldo pendiente ahora (
                        {formatCop(liquidacion.saldoPendientePorCobrar)})
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
                          aria-label="Método de cobro de saldo"
                          value={metodoCobro}
                          onChange={(e) =>
                            setMetodoCobro(normalizarMetodoCobro(e.target.value))
                          }
                          className="w-full min-h-[44px] rounded-[12px] bg-[#EDEDED]/60 dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
                        >
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">
                            Transferencia / PSE
                          </option>
                          <option value="tarjeta">Tarjeta / Datáfono</option>
                        </select>
                        {cuentasFinancieras.length > 0 && (
                          <select
                            aria-label="Cuenta de caja de ingreso"
                            value={cuentaCobroId}
                            onChange={(e) => setCuentaCobroId(e.target.value)}
                            className="w-full min-h-[44px] rounded-[12px] bg-[#EDEDED]/60 dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3 py-2 text-base text-[#111827] dark:text-[#EDEDED]"
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
            </div>
          )}

          {/* ===============================================================
              PASO 3: RESUMEN FINAL ANTES DE CONFIRMAR
             =============================================================== */}
          {paso === 3 && (
            <div className="space-y-4 text-xs">
              <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 bg-[#EDEDED]/50 dark:bg-[#111827] p-4 space-y-2">
                <h3 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                  Revisión comparativa completada
                </h3>
                <p className="text-[#4B5563] dark:text-[#9CA3AF]">
                  Zonas revisadas: <strong>{totalZonas}</strong> · Sin novedad:{' '}
                  <strong>{totalZonas - novedadesActivas.length}</strong> · Con
                  novedad: <strong>{novedadesActivas.length}</strong>
                </p>
                <p className="text-[#4B5563] dark:text-[#9CA3AF]">
                  Devolución real: <strong>{fechaDevolucionReal}</strong> ·
                  Odómetro:{' '}
                  <strong>{formatMiles(medidorUsoRetorno)} km</strong> ·
                  Energía: <strong>{nivelEnergiaRetornoPct}%</strong>
                </p>
              </div>

              <div className="rounded-[20px] border border-[#9CA3AF]/30 dark:border-white/15 bg-white dark:bg-[#111827] p-4 space-y-2.5">
                <h3 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                  Resumen final del cierre
                </h3>

                <div className="flex justify-between">
                  <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                    Total del alquiler
                  </span>
                  <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                    {formatCop(liquidacion.totalAlquilerBase)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                    Cobros adicionales ({cobrosAdicionales.length})
                  </span>
                  <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                    {formatCop(liquidacion.totalCobrosAdicionales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                    Total factura final
                  </span>
                  <span className="font-mono font-extrabold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                    {formatCop(liquidacion.totalFacturaFinal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                    Garantía retenida (descontada)
                  </span>
                  <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                    {formatCop(
                      tieneGarantiaActiva && modoGarantia === 'DEJAR_CUSTODIA'
                        ? garantiaDisponible
                        : liquidacion.garantiaRetenidaPorCobros
                    )}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#EDEDED] dark:border-white/10 space-y-1.5">
                  {tieneGarantiaActiva &&
                    modoGarantia === 'LIQUIDAR_AUTOMATICO' && (
                      <div className="flex justify-between">
                        <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                          Saldo a devolver al cliente (garantía)
                        </span>
                        <span className="font-mono text-sm font-black text-[#111827] dark:text-[#EDEDED] tabular-nums">
                          {formatCop(liquidacion.garantiaADevolver)}
                        </span>
                      </div>
                    )}
                  <div className="flex justify-between">
                    <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                      Saldo por cobrar al cliente
                      {liquidacion.saldoPendientePorCobrar > 0 &&
                      cobrarSaldoAhora
                        ? ' (se cobrará ahora)'
                        : ''}
                    </span>
                    <span className="font-mono text-sm font-black text-[#111827] dark:text-[#EDEDED] tabular-nums">
                      {formatCop(liquidacion.saldoPendientePorCobrar)}
                    </span>
                  </div>
                </div>
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
              disabled={zonasPendientes > 0 || subiendoFoto}
              onClick={irAPaso2}
              className="fx-press min-h-[44px] rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] disabled:opacity-40 cursor-pointer"
            >
              {zonasPendientes > 0
                ? `Revisa ${zonasPendientes} zona${zonasPendientes === 1 ? '' : 's'} para continuar`
                : 'Continuar al resumen →'}
            </button>
          )}
          {paso === 2 && (
            <button
              type="button"
              onClick={irAPaso3}
              className="fx-press min-h-[44px] rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] cursor-pointer"
            >
              Ver resumen y confirmar →
            </button>
          )}
          {paso === 3 && (
            <button
              type="button"
              disabled={guardando || zonasPendientes > 0}
              onClick={confirmarFinalizacion}
              className="fx-press min-h-[44px] rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] disabled:opacity-40 cursor-pointer"
            >
              {guardando
                ? 'Finalizando alquiler...'
                : 'Confirmar y finalizar alquiler'}
            </button>
          )}
        </div>
      </div>

      {/* Lightbox para ampliar imagen */}
      {fotoAmpliada && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={fotoAmpliada.titulo}
          tabIndex={-1}
          onClick={() => setFotoAmpliada(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setFotoAmpliada(null);
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111827]/90 p-4"
        >
          <div
            role="document"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="max-w-3xl w-full space-y-2 text-center"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFotoAmpliada(null)}
                aria-label="Cerrar imagen ampliada"
                className="fx-press min-h-[44px] min-w-[44px] rounded-full border border-white/25 bg-[#1F2937] text-sm font-bold text-[#EDEDED] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <img
              src={fotoAmpliada.url}
              alt={fotoAmpliada.titulo}
              className="max-h-[78dvh] w-auto mx-auto rounded-[18px] object-contain"
            />
            <p className="text-xs font-bold text-[#EDEDED]">
              {fotoAmpliada.titulo}
            </p>
            {fotoAmpliada.fecha && (
              <p className="text-[11px] text-[#9CA3AF]">{fotoAmpliada.fecha}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
