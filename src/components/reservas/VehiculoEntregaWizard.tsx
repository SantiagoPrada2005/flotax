import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import {
  STORAGE_KEY_RESERVAS_FLOTAX,
  formatearRangoReservaHumano,
  obtenerReservaClientePorCodigo,
  registrarEntregaClienteConEvaluacion,
  type CalificacionServicioNivel,
  type ChecklistEntregaCliente,
  type EvaluacionEntregaServicio,
  type ReservaClienteItem,
} from '@/lib/flota';

export interface VehiculoEntregaWizardProps {
  codigo: string;
  reservaInicial: ReservaClienteItem;
  hoyISO: string;
}

type PasoWizard = 0 | 1 | 2 | 3;

interface OpcionBentoCalificacion {
  id: CalificacionServicioNivel;
  puntaje: 5 | 4 | 3 | 2;
  badge: string;
  titulo: string;
  descripcion: string;
  desempenoDefault: 'IMPECABLE' | 'OPTIMO' | 'DETALLE_MENOR';
}

const OPCIONES_BENTO_CALIFICACION: ReadonlyArray<OpcionBentoCalificacion> = [
  {
    id: 'SOBRESALIENTE',
    puntaje: 5,
    badge: '5.0 ★',
    titulo: 'Sobresaliente',
    descripcion: 'Vehículo impecable y entrega ágil en patio',
    desempenoDefault: 'IMPECABLE',
  },
  {
    id: 'MUY_BUENO',
    puntaje: 4,
    badge: '4.0 ★',
    titulo: 'Muy bueno',
    descripcion: 'Todo funcionó según lo acordado en el contrato',
    desempenoDefault: 'OPTIMO',
  },
  {
    id: 'REGULAR',
    puntaje: 3,
    badge: '3.0 ★ · POR MEJORAR',
    titulo: 'Regular',
    descripcion: 'Demoras en recepción o detalles menores',
    desempenoDefault: 'OPTIMO',
  },
  {
    id: 'ATENCION_REQUERIDA',
    puntaje: 2,
    badge: 'ALERTA · SOPORTE',
    titulo: 'Tuve un problema',
    descripcion: 'Reportar falla técnica o novedad en cobro',
    desempenoDefault: 'DETALLE_MENOR',
  },
];

const TAGS_SERVICIO_DESTACADO: ReadonlyArray<string> = [
  'Entrega sin filas',
  'Unidad impecable',
  'Peritaje R2 transparente',
  'Atención del anfitrión',
  'Claridad en tarifa y garantía',
];

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

export default function VehiculoEntregaWizard({
  codigo,
  reservaInicial,
  hoyISO,
}: VehiculoEntregaWizardProps) {
  const [reserva, setReserva] = useState<ReservaClienteItem>(reservaInicial);
  const [pasoActual, setPasoActual] = useState<PasoWizard>(0);
  const [maxPasoDesbloqueado, setMaxPasoDesbloqueado] = useState<PasoWizard>(1);

  // Estado Paso 2: Checklist interactivo de unidad (Ref 03 Device Key style)
  const [checklist, setChecklist] = useState<ChecklistEntregaCliente>({
    cabinaSinObjetos: true,
    telemetriaVerificada: true,
    llavesEntregadas: true,
    combustibleNivel: 'MISMO_NIVEL',
  });

  // Estado Paso 3: Evaluación conversacional Typeform + Bento Cards
  const [calificacion, setCalificacion] =
    useState<CalificacionServicioNivel>('SOBRESALIENTE');
  const [aspectosSeleccionados, setAspectosSeleccionados] = useState<string[]>([
    'Entrega sin filas',
    'Unidad impecable',
    'Peritaje R2 transparente',
  ]);
  const [comentario, setComentario] = useState<string>('');
  const [mostrarInputComentario, setMostrarInputComentario] =
    useState<boolean>(false);
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState<boolean>(false);

  // Estado Paso 4: Síntesis 0% -> 100% y checklist en vivo (Ref 02 style)
  const [porcentajeSintesis, setPorcentajeSintesis] = useState<number>(0);
  const [sintesisCompletada, setSintesisCompletada] = useState<boolean>(false);

  // Control de gestos Page-Fold / Scrollytelling
  const touchStartYRef = useRef<number | null>(null);
  const lastWheelTimestampRef = useRef<number>(0);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const persistedFlagRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_RESERVAS_FLOTAX);
      const encontrada = obtenerReservaClientePorCodigo(codigo, raw, hoyISO);
      if (encontrada) {
        setReserva(encontrada);
        if (encontrada.evaluacionEntrega) {
          setCalificacion(encontrada.evaluacionEntrega.calificacionGeneral);
          setAspectosSeleccionados(
            encontrada.evaluacionEntrega.aspectosDestacados
          );
          setChecklist(encontrada.evaluacionEntrega.checklist);
          if (encontrada.evaluacionEntrega.comentarioOpcional) {
            setComentario(encontrada.evaluacionEntrega.comentarioOpcional);
          }
        }
      }
    } catch {
      // Mantener reservaInicial SSR
    }
  }, [codigo, hoyISO]);

  const primerNombreConductor = useMemo(() => {
    const partes = reserva.conductor.nombreCompleto.trim().split(/\s+/);
    return partes[0] || 'Conductor';
  }, [reserva.conductor.nombreCompleto]);

  const kmRetornoEstimado = useMemo(
    () => reserva.kilometrajeRetorno ?? reserva.kilometrajeEntrega + reserva.diasAlquiler * 68,
    [reserva.kilometrajeRetorno, reserva.kilometrajeEntrega, reserva.diasAlquiler]
  );

  const opcionCalificacionActiva = useMemo(
    () =>
      OPCIONES_BENTO_CALIFICACION.find((op) => op.id === calificacion) ??
      OPCIONES_BENTO_CALIFICACION[0]!,
    [calificacion]
  );

  const checklistCompleto =
    checklist.cabinaSinObjetos &&
    checklist.telemetriaVerificada &&
    checklist.llavesEntregadas;

  const irAPaso = useCallback(
    (destino: PasoWizard) => {
      if (autoAdvanceTimerRef.current !== null) {
        window.clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      setAutoAdvanceNotice(false);
      setPasoActual(destino);
      setMaxPasoDesbloqueado((prev) =>
        destino > prev ? destino : prev
      );
    },
    []
  );

  // Navegación con teclado (Typeform & Page-Fold Ergonomics)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        if (pasoActual === 0) irAPaso(1);
        else if (pasoActual === 1 && checklistCompleto) irAPaso(2);
        else if (pasoActual === 2) irAPaso(3);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (pasoActual > 0 && !sintesisCompletada) {
          irAPaso((pasoActual - 1) as PasoWizard);
        }
      } else if (e.key === 'Escape') {
        navigate(`/reservas/${reserva.codigo}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pasoActual, checklistCompleto, sintesisCompletada, irAPaso, reserva.codigo]);

  // Motor de Síntesis 0% -> 92% -> 100% cuando entra al Paso 4 (índice 3)
  useEffect(() => {
    if (pasoActual !== 3) {
      return;
    }

    setPorcentajeSintesis(0);
    setSintesisCompletada(false);
    persistedFlagRef.current = false;

    const duracionMs = 2400;
    const inicio = performance.now();
    let frameId = 0;

    const tick = (ahora: number) => {
      const transcurrido = ahora - inicio;
      const progresoLineal = Math.min(1, transcurrido / duracionMs);
      // Curva con pausa dramática breve alrededor de 92% (inspirada en Ref 02)
      const easeOut = 1 - Math.pow(1 - progresoLineal, 2.6);
      const valor = Math.min(100, Math.round(easeOut * 100));
      setPorcentajeSintesis(valor);

      if (progresoLineal < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setPorcentajeSintesis(100);
        setSintesisCompletada(true);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [pasoActual]);

  // Persistir evaluación y cierre de entrega al completar el 100%
  useEffect(() => {
    if (!sintesisCompletada || persistedFlagRef.current) return;
    persistedFlagRef.current = true;

    const evaluacion: EvaluacionEntregaServicio = {
      calificacionGeneral: opcionCalificacionActiva.id,
      puntajeNumerico: opcionCalificacionActiva.puntaje,
      aspectosDestacados: aspectosSeleccionados,
      desempenoVehiculo: opcionCalificacionActiva.desempenoDefault,
      comentarioOpcional: comentario.trim() || undefined,
      checklist,
      completadaEnISO: new Date().toISOString(),
    };

    const rawActual =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY_RESERVAS_FLOTAX)
        : null;

    const actualizada = registrarEntregaClienteConEvaluacion(
      reserva,
      evaluacion,
      rawActual,
      hoyISO
    );
    setReserva(actualizada);

    void actions.reservas
      .registrarEntregaEvaluacion({
        codigo: reserva.codigo,
        vehiculoId: reserva.vehiculo.id,
        vehiculoNombre: `${reserva.vehiculo.marca} ${reserva.vehiculo.modelo}`,
        calificacionGeneral: evaluacion.calificacionGeneral,
        puntajeNumerico: evaluacion.puntajeNumerico,
        aspectosDestacados: evaluacion.aspectosDestacados,
        desempenoVehiculo: evaluacion.desempenoVehiculo,
        comentarioOpcional: evaluacion.comentarioOpcional,
        cabinaSinObjetos: checklist.cabinaSinObjetos,
        telemetriaVerificada: checklist.telemetriaVerificada,
        llavesEntregadas: checklist.llavesEntregadas,
      })
      .catch(() => {
        // Persistido en localStorage
      });
  }, [
    sintesisCompletada,
    opcionCalificacionActiva,
    aspectosSeleccionados,
    comentario,
    checklist,
    reserva,
    hoyISO,
  ]);

  const toggleItemChecklist = (
    campo: 'cabinaSinObjetos' | 'telemetriaVerificada' | 'llavesEntregadas'
  ) => {
    setChecklist((prev) => ({
      ...prev,
      [campo]: !prev[campo],
    }));
  };

  const seleccionarBentoCalificacion = (id: CalificacionServicioNivel) => {
    setCalificacion(id);
    if (autoAdvanceTimerRef.current !== null) {
      window.clearTimeout(autoAdvanceTimerRef.current);
    }
    setAutoAdvanceNotice(true);
    autoAdvanceTimerRef.current = window.setTimeout(() => {
      setAutoAdvanceNotice(false);
    }, 1200);
  };

  const toggleTagServicio = (tag: string) => {
    setAspectosSeleccionados((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  // Gestos táctiles y rueda para Page-Fold Scrollytelling
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartYRef.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const deltaY = touchStartYRef.current - endY;
    touchStartYRef.current = null;

    if (Math.abs(deltaY) < 54) return;

    if (deltaY > 0) {
      // Swipe hacia arriba -> siguiente vista
      if (pasoActual === 0) irAPaso(1);
      else if (pasoActual === 1 && checklistCompleto) irAPaso(2);
      else if (pasoActual === 2) irAPaso(3);
    } else if (deltaY < 0 && pasoActual > 0 && pasoActual < 3) {
      // Swipe hacia abajo -> vista anterior
      irAPaso((pasoActual - 1) as PasoWizard);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const ahora = Date.now();
    if (ahora - lastWheelTimestampRef.current < 700) return;
    if (Math.abs(e.deltaY) < 36) return;

    if (e.deltaY > 0) {
      if (pasoActual === 0) {
        lastWheelTimestampRef.current = ahora;
        irAPaso(1);
      } else if (pasoActual === 1 && checklistCompleto) {
        lastWheelTimestampRef.current = ahora;
        irAPaso(2);
      } else if (pasoActual === 2) {
        lastWheelTimestampRef.current = ahora;
        irAPaso(3);
      }
    } else if (e.deltaY < 0 && pasoActual > 0 && pasoActual < 3) {
      lastWheelTimestampRef.current = ahora;
      irAPaso((pasoActual - 1) as PasoWizard);
    }
  };

  const itemsSintesis = useMemo(
    () => [
      {
        id: 'odo',
        umbral: 20,
        etiqueta: `Odómetro y telemetría (${kmRetornoEstimado.toLocaleString('es-CO')} km)`,
      },
      {
        id: 'r2',
        umbral: 45,
        etiqueta: 'Inspección pericial Cloudflare R2 sin cargos',
      },
      {
        id: 'eval',
        umbral: 70,
        etiqueta: `Calificación del servicio (${opcionCalificacionActiva.puntaje}.0 ★ ${opcionCalificacionActiva.titulo})`,
      },
      {
        id: 'garantia',
        umbral: 90,
        etiqueta: `Liberación de garantía (${formatCop(reserva.vehiculo.depositoGarantia)})`,
      },
      {
        id: 'pazysalvo',
        umbral: 100,
        etiqueta: 'Certificado de paz y salvo digital emitido',
      },
    ],
    [
      kmRetornoEstimado,
      opcionCalificacionActiva.puntaje,
      opcionCalificacionActiva.titulo,
      reserva.vehiculo.depositoGarantia,
    ]
  );

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="relative h-dvh w-full overflow-hidden bg-[#EDEDED] text-[#111827] select-none"
    >
      {/* =====================================================================
          HUD SUPERIOR PERSISTENTE (STORY SEGMENTED BAR + CONTROLES DE PASO)
          ===================================================================== */}
      <header className="fixed inset-x-0 top-0 z-40 mx-auto w-full max-w-[460px] px-5 pt-3 pb-2 safe-top pointer-events-none">
        {/* Story Progress Segments */}
        <div
          role="progressbar"
          aria-valuenow={pasoActual + 1}
          aria-valuemin={1}
          aria-valuemax={4}
          aria-label={`Paso ${pasoActual + 1} de 4`}
          className="flex items-center gap-1.5"
        >
          {[0, 1, 2, 3].map((idx) => {
            const completado = idx <= pasoActual;
            const esCupulaOscura = pasoActual === 1;
            return (
              <button
                key={idx}
                type="button"
                disabled={idx > maxPasoDesbloqueado || pasoActual === 3}
                onClick={() => irAPaso(idx as PasoWizard)}
                aria-label={`Ir al paso ${idx + 1}`}
                className="pointer-events-auto h-1.5 flex-1 rounded-full overflow-hidden bg-[#9CA3AF]/45 transition-all cursor-pointer disabled:cursor-default"
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    completado
                      ? esCupulaOscura
                        ? 'w-full bg-white'
                        : 'w-full bg-[#111827]'
                      : 'w-0'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Fila de metadatos de paso + Botones Subir/Cerrar */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="pointer-events-auto flex items-center gap-1.5">
            {pasoActual > 0 && pasoActual < 3 && (
              <button
                type="button"
                onClick={() => irAPaso((pasoActual - 1) as PasoWizard)}
                aria-label="Volver al paso anterior"
                className={`ios-press-bounce flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold cursor-pointer ${
                  pasoActual === 1
                    ? 'border-[#4B5563] bg-[#1F2937]/90 text-white'
                    : 'border-[#9CA3AF]/60 bg-white/90 text-[#111827]'
                }`}
              >
                ↑
              </button>
            )}
            <span
              className={`rounded-full px-3 py-1 font-mono text-[10px] font-bold tracking-wider uppercase ${
                pasoActual === 1
                  ? 'bg-[#1F2937]/90 text-white border border-[#4B5563]'
                  : 'bg-white/90 text-[#111827] border border-[#9CA3AF]/50'
              }`}
            >
              PASO 0{pasoActual + 1} / 04 ·{' '}
              {pasoActual === 0
                ? 'CIERRE DE VIAJE'
                : pasoActual === 1
                  ? 'ENTREGA EN PATIO R2'
                  : pasoActual === 2
                    ? 'EVALUACIÓN DEL SERVICIO'
                    : 'SÍNTESIS PERICIAL'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/reservas/${reserva.codigo}`)}
            aria-label="Cerrar asistente y volver a la reserva"
            className={`pointer-events-auto ios-press-bounce flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold cursor-pointer ${
              pasoActual === 1
                ? 'border-[#4B5563] bg-[#1F2937]/90 text-white'
                : 'border-[#9CA3AF]/60 bg-white/90 text-[#111827]'
            }`}
          >
            ✕
          </button>
        </div>
      </header>

      {/* =====================================================================
          STACK VERTICAL PAGE-FOLD (4 VISTAS DE 100DVH CADA UNA)
          ===================================================================== */}
      <div
        style={{
          transform: `translate3d(0, -${pasoActual * 100}dvh, 0)`,
          transition: 'transform 680ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className="h-[400dvh] w-full will-change-transform"
      >
        {/* ===================================================================
            VISTA 01 (100dvh): BIENVENIDA CINEMÁTICA DE ENTREGA (REF. 01)
            =================================================================== */}
        <section
          aria-label="Paso 1: Bienvenida de entrega del vehículo"
          className="relative flex h-dvh w-full flex-col justify-between overflow-hidden bg-white px-6 pt-24 pb-8 safe-bottom"
        >
          {/* Retícula milimétrica CAD superior + Horizonte Shader Monocromo inferior */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(156,163,175,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(156,163,175,0.14)_1px,transparent_1px)] bg-[size:44px_44px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(237,237,237,0.85)_26%,rgba(156,163,175,0.75)_54%,rgba(31,41,55,0.94)_80%,#111827_100%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-hatch-diagonal-dark opacity-45"
          />

          {/* Arcos Orbitales Vectoriales en la zona inferior (Shader / CAD Ring Stage) */}
          <svg
            aria-hidden="true"
            viewBox="0 0 400 400"
            className="pointer-events-none absolute bottom-[-70px] left-1/2 -translate-x-1/2 h-[360px] w-[360px] opacity-65"
          >
            <circle
              cx="200"
              cy="200"
              r="92"
              fill="none"
              stroke="#EDEDED"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />
            <circle
              cx="200"
              cy="200"
              r="138"
              fill="none"
              stroke="#EDEDED"
              strokeWidth="1.5"
              strokeDasharray="8 10"
              className="flotax-loader-orbit"
            />
            <circle
              cx="200"
              cy="200"
              r="182"
              fill="none"
              stroke="#9CA3AF"
              strokeWidth="1"
              strokeOpacity="0.45"
            />
          </svg>

          {/* Contenido Central Editorial (Welcome, Conductor) */}
          <div className="relative z-10 mx-auto my-auto w-full max-w-[412px] space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#111827] px-3.5 py-1.5 text-white shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#EDEDED]" />
              <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
                {reserva.vehiculo.placa} · {reserva.vehiculo.marca}{' '}
                {reserva.vehiculo.modelo}
              </span>
            </div>

            <h1 className="font-display text-[44px] sm:text-[52px] font-bold tracking-tight text-[#111827] leading-[1.03]">
              Bienvenido,
              <span className="block text-[#1F2937]">
                {primerNombreConductor}
              </span>
            </h1>

            <p className="max-w-[36ch] text-[15px] font-medium leading-relaxed text-[#1F2937]">
              Vamos a recibir tu vehículo y conocer cómo estuvo el servicio
              prestado en menos de 45 segundos. Una pregunta a la vez, sin
              formularios extensos.
            </p>

            {/* Tarjeta Flotante con Vehículo y Garantía en Custodia */}
            <div className="rounded-[24px] border border-[#9CA3AF]/50 bg-white/95 p-4 shadow-[0_18px_38px_-12px_rgba(17,24,39,0.18)] backdrop-blur-md">
              <div className="flex items-center gap-3.5">
                <img
                  src={reserva.vehiculo.imagenUrl}
                  alt={`${reserva.vehiculo.marca} ${reserva.vehiculo.modelo}`}
                  className="h-14 w-24 object-contain shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                    {reserva.sedeNombre} · #{reserva.codigo}
                  </span>
                  <p className="font-display text-sm font-bold text-[#111827] truncate">
                    {formatearRangoReservaHumano(
                      reserva.fechaInicio,
                      reserva.fechaFin
                    )}{' '}
                    ({reserva.diasAlquiler} días)
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-[#EDEDED] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#111827]">
                    {formatCop(reserva.vehiculo.depositoGarantia)} en custodia R2
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Zona del Pulgar: Anillo Cinético Interactivo (Ref 01 Bottom Ring) */}
          <div className="relative z-10 mx-auto flex w-full max-w-[412px] flex-col items-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => irAPaso(1)}
              aria-label="Iniciar entrega del vehículo y evaluación del servicio"
              className="ios-press-bounce group relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white text-[#111827] shadow-[0_16px_36px_rgba(0,0,0,0.38)] ring-4 ring-white/30 cursor-pointer"
            >
              <svg
                viewBox="0 0 72 72"
                className="absolute inset-0 h-full w-full -rotate-90"
              >
                <circle
                  cx="36"
                  cy="36"
                  r="31"
                  fill="none"
                  stroke="#EDEDED"
                  strokeWidth="3"
                />
                <circle
                  cx="36"
                  cy="36"
                  r="31"
                  fill="none"
                  stroke="#111827"
                  strokeWidth="3.5"
                  strokeDasharray="140 195"
                  strokeLinecap="round"
                  className="flotax-loader-orbit"
                />
              </svg>
              <span className="font-display text-2xl font-bold transition-transform group-hover:translate-y-0.5">
                ↓
              </span>
            </button>
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#EDEDED]">
              Toca el anillo o desliza para iniciar entrega
            </span>
          </div>
        </section>

        {/* ===================================================================
            VISTA 02 (100dvh): LLAVE DE ENTREGA R2 & CHECKLIST EXPRESS (REF. 03)
            =================================================================== */}
        <section
          aria-label="Paso 2: Llave de entrega R2 y verificación de unidad"
          className="relative flex h-dvh w-full flex-col justify-between overflow-hidden bg-white px-5 pt-3 pb-6 safe-bottom"
        >
          <div className="mx-auto flex h-full w-full max-w-[420px] flex-col justify-between">
            {/* Cúpula Atmosférica Superior con Radar Pericial (Ref 03 Top Stage) */}
            <div className="relative mt-12 overflow-hidden rounded-[30px] bg-[linear-gradient(165deg,#111827_0%,#1F2937_68%,#4B5563_100%)] p-5 text-white shadow-[0_18px_36px_-12px_rgba(17,24,39,0.32)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-hatch-diagonal-dark opacity-35"
              />
              {/* Anillos de calibración vectorial */}
              <svg
                aria-hidden="true"
                viewBox="0 0 260 260"
                className="pointer-events-none absolute right-[-30px] top-[-30px] h-52 w-52 opacity-35"
              >
                <circle
                  cx="130"
                  cy="130"
                  r="58"
                  fill="none"
                  stroke="#EDEDED"
                  strokeWidth="1.2"
                />
                <circle
                  cx="130"
                  cy="130"
                  r="92"
                  fill="none"
                  stroke="#EDEDED"
                  strokeWidth="1.5"
                  strokeDasharray="5 8"
                  className="flotax-loader-orbit"
                />
              </svg>

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                    RECEPCIÓN PERIMETRAL · R2
                  </span>
                  <h2 className="mt-0.5 font-display text-lg font-bold text-white leading-tight">
                    Entrega verificada en patio
                  </h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1 font-mono text-[10px] font-bold text-[#111827]">
                  R2 SYNC ✓
                </span>
              </div>

              {/* Vehículo y lectura de telemetría de retorno */}
              <div className="relative z-10 mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-[#4B5563]/80 bg-[#111827]/90 p-3.5">
                <div>
                  <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                    TELEMETRÍA DE RETORNO
                  </span>
                  <p className="mt-0.5 font-display text-base font-bold text-white tabular-nums">
                    {kmRetornoEstimado.toLocaleString('es-CO')} km ·{' '}
                    {reserva.nivelCargaPorcentaje}% Energía
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {(
                    [
                      ['MISMO_NIVEL', 'Nivel acordado'],
                      ['CARGA_COMPLETA', '100% Full'],
                    ] as const
                  ).map(([idNivel, labelNivel]) => (
                    <button
                      key={idNivel}
                      type="button"
                      onClick={() =>
                        setChecklist((prev) => ({
                          ...prev,
                          combustibleNivel: idNivel,
                        }))
                      }
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
                        checklist.combustibleNivel === idNivel
                          ? 'bg-white text-[#111827]'
                          : 'bg-[#1F2937] text-[#9CA3AF]'
                      }`}
                    >
                      {labelNivel}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cuerpo Inferior: Device Key / Llave de Entrega R2 + 3 Puntos Interactivos */}
            <div className="my-auto space-y-3.5 py-2">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-[#111827] bg-[#EDEDED] font-mono text-lg font-bold text-[#111827]">
                  ⛶
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold tracking-tight text-[#111827]">
                    Llave de Entrega R2
                  </h3>
                  <p className="text-xs font-medium text-[#4B5563]">
                    Confirma con un toque los 3 puntos de cierre de tu unidad:
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {(
                  [
                    {
                      key: 'cabinaSinObjetos',
                      titulo: 'Cabina libre de objetos personales',
                      subtitulo: 'Guantera, baúl y consola verificados',
                      activo: checklist.cabinaSinObjetos,
                    },
                    {
                      key: 'telemetriaVerificada',
                      titulo: 'Odómetro y nivel de energía conformes',
                      subtitulo: `Lectura sincronizada en ${kmRetornoEstimado.toLocaleString('es-CO')} km`,
                      activo: checklist.telemetriaVerificada,
                    },
                    {
                      key: 'llavesEntregadas',
                      titulo: 'Llave física / Tarjeta NFC entregada',
                      subtitulo: `Recibida en ${reserva.sedeNombre}`,
                      activo: checklist.llavesEntregadas,
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleItemChecklist(item.key)}
                    className={`ios-press-bounce flex w-full items-center justify-between gap-3 rounded-[20px] border p-3.5 text-left transition cursor-pointer ${
                      item.activo
                        ? 'border-[#111827] bg-[#EDEDED]/80 shadow-xs'
                        : 'border-[#9CA3AF]/50 bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="block font-display text-[13px] font-bold text-[#111827]">
                        {item.titulo}
                      </span>
                      <span className="block text-[11px] font-medium text-[#4B5563]">
                        {item.subtitulo}
                      </span>
                    </div>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                        item.activo
                          ? 'bg-[#111827] text-white'
                          : 'border border-[#9CA3AF] bg-white text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Botón Píldora en Zona del Pulgar (Ref 03 Create Device Key Button) */}
            <button
              type="button"
              disabled={!checklistCompleto}
              onClick={() => irAPaso(2)}
              className="ios-press-bounce flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#1F2937] px-6 py-3.5 font-display text-sm font-bold text-white shadow-md transition hover:bg-[#111827] disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>⛶</span>
              <span>Confirmar entrega y evaluar servicio</span>
              <span>→</span>
            </button>
          </div>
        </section>

        {/* ===================================================================
            VISTA 03 (100dvh): EVALUACIÓN CONVERSACIONAL BENTO & TYPEFORM
            =================================================================== */}
        <section
          aria-label="Paso 3: Evaluación interactiva del servicio prestado"
          className="relative flex h-dvh w-full flex-col justify-between overflow-hidden bg-[#EDEDED] px-5 pt-16 pb-6 safe-bottom"
        >
          <div className="mx-auto flex h-full w-full max-w-[420px] flex-col justify-between">
            {/* Pregunta Conversacional Única (Typeform Focus) */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                  EXPERIENCIA DEL SERVICIO PRESTADO
                </span>
                {autoAdvanceNotice && (
                  <span className="rounded-full bg-[#111827] px-2.5 py-0.5 font-mono text-[9px] font-bold text-white animate-fade-in">
                    SELECCIÓN GUARDADA ✓
                  </span>
                )}
              </div>
              <h2 className="font-display text-[24px] sm:text-[26px] font-bold tracking-tight text-[#111827] leading-[1.12]">
                ¿Cómo estuvo tu experiencia con el vehículo y la atención en
                patio?
              </h2>
              <p className="text-xs font-medium text-[#4B5563]">
                Elige una tarjeta Bento y marca qué fue lo mejor de tu alquiler:
              </p>
            </div>

            {/* Grid 2x2 de Grandes Tarjetas Bento Seleccionables (Story Walkthrough) */}
            <div className="my-auto space-y-3 py-1">
              <div
                role="radiogroup"
                aria-label="Calificación general del servicio"
                className="grid grid-cols-2 gap-2.5"
              >
                {OPCIONES_BENTO_CALIFICACION.map((opcion) => {
                  const activa = calificacion === opcion.id;
                  return (
                    <button
                      key={opcion.id}
                      type="button"
                      role="radio"
                      aria-checked={activa}
                      onClick={() => seleccionarBentoCalificacion(opcion.id)}
                      className={`ios-press-bounce flex flex-col justify-between rounded-[22px] border p-3.5 text-left transition cursor-pointer ${
                        activa
                          ? 'border-[#111827] bg-[#111827] text-white shadow-[0_14px_28px_-8px_rgba(17,24,39,0.35)]'
                          : 'border-[#9CA3AF]/50 bg-white text-[#111827] hover:border-[#4B5563]'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            activa ? 'text-white' : 'text-[#4B5563]'
                          }`}
                        >
                          {opcion.badge}
                        </span>
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                            activa
                              ? 'bg-white text-[#111827]'
                              : 'border border-[#9CA3AF] bg-[#EDEDED]/60 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      </div>

                      <div className="mt-2.5">
                        <span className="block font-display text-[15px] font-bold leading-snug">
                          {opcion.titulo}
                        </span>
                        <span
                          className={`mt-0.5 block text-[11px] leading-snug ${
                            activa ? 'text-[#EDEDED]/85' : 'text-[#4B5563]'
                          }`}
                        >
                          {opcion.descripcion}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Píldoras Interactivas de Aspectos Destacados + Observación Opcional */}
              <div className="rounded-[22px] border border-[#9CA3AF]/45 bg-white p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#4B5563]">
                    ¿QUÉ DESTACAS DEL SERVICIO? (MULTI-SELECCIÓN)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setMostrarInputComentario((prev) => !prev)
                    }
                    className="font-mono text-[10px] font-bold text-[#111827] underline cursor-pointer"
                  >
                    {mostrarInputComentario ? 'Ocultar nota' : '+ Añadir nota'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {TAGS_SERVICIO_DESTACADO.map((tag) => {
                    const seleccionado = aspectosSeleccionados.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTagServicio(tag)}
                        className={`ios-press-bounce rounded-full px-3 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                          seleccionado
                            ? 'bg-[#111827] text-white'
                            : 'bg-[#EDEDED] text-[#111827] hover:bg-[#9CA3AF]/35'
                        }`}
                      >
                        {seleccionado ? `✓ ${tag}` : tag}
                      </button>
                    );
                  })}
                </div>

                {mostrarInputComentario && (
                  <div className="pt-1">
                    <input
                      type="text"
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder="Escribe una observación breve del servicio o vehículo..."
                      aria-label="Observación opcional sobre el servicio prestado"
                      className="w-full rounded-[12px] border border-[#9CA3AF] bg-[#EDEDED] px-3.5 py-2.5 text-base font-medium text-[#111827] placeholder:text-[#4B5563] outline-none focus:border-[#111827]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* CTA en Zona del Pulgar */}
            <button
              type="button"
              onClick={() => irAPaso(3)}
              className="ios-press-bounce flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#111827] px-6 py-3.5 font-display text-sm font-bold text-white shadow-lg transition hover:bg-[#1F2937] cursor-pointer"
            >
              <span>Finalizar entrega y liberar garantía</span>
              <span>→</span>
            </button>
          </div>
        </section>

        {/* ===================================================================
            VISTA 04 (100dvh): SÍNTESIS 92%->100% Y PAZ Y SALVO (REF. 02)
            =================================================================== */}
        <section
          aria-label="Paso 4: Síntesis de cierre y liberación de garantía"
          className="relative flex h-dvh w-full flex-col justify-between overflow-hidden bg-white px-6 pt-16 pb-6 safe-bottom"
        >
          <div className="mx-auto flex h-full w-full max-w-[420px] flex-col justify-between">
            {/* Bloque Central Monumental: Contador Porcentual + Barra Achurada (Ref 02) */}
            <div className="mt-4 flex flex-col items-center text-center space-y-3">
              <span
                aria-live="polite"
                className="font-display text-[68px] sm:text-[76px] font-bold tracking-tight text-[#111827] leading-none tabular-nums"
              >
                {porcentajeSintesis}%
              </span>

              <h2 className="font-display text-[22px] sm:text-[24px] font-bold tracking-tight text-[#111827] leading-snug">
                {sintesisCompletada
                  ? '¡Entrega completada y garantía liberada!'
                  : 'Estamos cerrando tu entrega y liberando tu garantía'}
              </h2>

              {/* Barra de Progreso Horizontal con Achurado +62.3° */}
              <div className="w-full max-w-[360px] pt-1">
                <div className="h-3 w-full overflow-hidden rounded-full bg-[#EDEDED] p-0.5">
                  <div
                    style={{ width: `${porcentajeSintesis}%` }}
                    className="h-full rounded-full bg-[#111827] bg-hatch-diagonal-dark transition-all duration-150"
                  />
                </div>
                <p className="mt-2 font-mono text-[11px] font-semibold text-[#4B5563]">
                  {sintesisCompletada
                    ? `Paz y salvo digital #${reserva.codigo} verificado en Cloudflare R2`
                    : 'Consolidando acta R2 y evaluación del servicio...'}
                </p>
              </div>
            </div>

            {/* Tarjeta Checklist Secuencial en Vivo (Ref 02 Daily Recommendation List) */}
            <div className="my-auto rounded-[26px] border border-[#9CA3AF]/45 bg-[#EDEDED]/85 p-5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#9CA3AF]/30 pb-2.5">
                <span className="font-display text-xs font-bold text-[#111827]">
                  Resumen de cierre para #{reserva.codigo}
                </span>
                <span className="font-mono text-[10px] font-bold text-[#4B5563]">
                  {reserva.vehiculo.placa}
                </span>
              </div>

              <ul className="space-y-2.5">
                {itemsSintesis.map((item) => {
                  const verificado = porcentajeSintesis >= item.umbral;
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span
                        className={`text-[13px] transition-colors ${
                          verificado
                            ? 'font-semibold text-[#111827]'
                            : 'font-medium text-[#4B5563]'
                        }`}
                      >
                        · {item.etiqueta}
                      </span>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                          verificado
                            ? 'scale-100 bg-[#111827] text-white'
                            : 'scale-90 border border-[#9CA3AF] bg-white text-[#9CA3AF]'
                        }`}
                      >
                        {verificado ? '✓' : '·'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Acciones Finales en Zona del Pulgar */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={!sintesisCompletada}
                onClick={() => navigate(`/reservas/${reserva.codigo}`)}
                className="ios-press-bounce flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#111827] px-6 py-3.5 font-display text-sm font-bold text-white shadow-lg transition hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer disabled:cursor-wait"
              >
                <span>
                  {sintesisCompletada
                    ? 'Ver comprobante de cierre en mi reserva'
                    : 'Procesando cierre pericial...'}
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
