import { useEffect, useRef, useState, useTransition } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import {
  obtenerPlantillaChecklistEntrega,
  obtenerPuntosInspeccionPorVehiculo,
  type ReservaClienteItem,
} from '@/lib/flota';
import {
  esLicenciaCompatibleConVehiculo,
  licenciaRecomendadaPorVehiculo,
  type CategoriaLicenciaEntrega,
  type EntregaStepId,
  type EntregaStepMeta,
  type EntregaWizardData,
  type EntregaWizardErrors,
  type TipoDocumentoEntrega,
} from './types';
import Step1ComprobacionCliente from './Step1ComprobacionCliente';
import Step2TelemetriaYChecklist from './Step2TelemetriaYChecklist';
import Step3PeritajeSalidaR2 from './Step3PeritajeSalidaR2';
import Step4CajaYGarantia from './Step4CajaYGarantia';
import Step5ContratoYConfirmacion from './Step5ContratoYConfirmacion';

export interface EntregaVehiculoWizardIslandProps {
  reservaInicial: ReservaClienteItem;
  cuentasFinancieras?: Array<{ id: string; nombre: string; tipo: string }> | undefined;
}

const MOTION_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stepVariants: Variants = {
  enter: (direction: number) => ({
    y: direction >= 0 ? '100%' : '-100%',
    opacity: 1,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: {
      y: { duration: 0.4, ease: MOTION_EASE },
    },
  },
  exit: (direction: number) => ({
    y: direction >= 0 ? '-100%' : '100%',
    opacity: 1,
    transition: {
      y: { duration: 0.4, ease: MOTION_EASE },
    },
  }),
};

const reducedVariants: Variants = {
  enter: { y: 0, opacity: 1 },
  center: { y: 0, opacity: 1, transition: { duration: 0 } },
  exit: { y: 0, opacity: 1, transition: { duration: 0 } },
};

const PASOS_CONFIG: ReadonlyArray<EntregaStepMeta> = [
  {
    id: 1,
    titulo: 'Comprobación del cliente',
    subtitulo: 'Identidad y licencia',
    etiquetaCorta: 'Cliente',
  },
  {
    id: 2,
    titulo: 'Telemetría e inventario',
    subtitulo: 'Odómetro y kit',
    etiquetaCorta: 'Telemetría',
  },
  {
    id: 3,
    titulo: 'Peritaje visual R2',
    subtitulo: 'Zonas de salida',
    etiquetaCorta: 'Peritaje R2',
  },
  {
    id: 4,
    titulo: 'Liquidación y garantía',
    subtitulo: 'Caja y fianza',
    etiquetaCorta: 'Caja',
  },
  {
    id: 5,
    titulo: 'Contrato y entrega',
    subtitulo: 'Firma y salida',
    etiquetaCorta: 'Entrega',
  },
];

function normalizarTipoDoc(val?: string | null): TipoDocumentoEntrega {
  if (val === 'CE' || val === 'PASAPORTE' || val === 'NIT') return val;
  return 'CC';
}

function normalizarCategoriaLic(
  val: string | null | undefined,
  categoriaVehiculo: string
): CategoriaLicenciaEntrega {
  if (val === 'A1' || val === 'A2' || val === 'B1' || val === 'B2' || val === 'C1') {
    return val;
  }
  return licenciaRecomendadaPorVehiculo(categoriaVehiculo);
}

export default function EntregaVehiculoWizardIsland({
  reservaInicial,
  cuentasFinancieras = [],
}: EntregaVehiculoWizardIslandProps) {
  const storageKey = `flotax_entrega_draft_${reservaInicial.codigo}`;
  const saldoPendienteInicial = Math.max(
    0,
    reservaInicial.totalAlquiler - reservaInicial.montoReportado
  );

  const [pasoActual, setPasoActual] = useState<EntregaStepId>(1);
  const [direction, setDirection] = useState<number>(1);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto');
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const [data, setData] = useState<EntregaWizardData>(() => ({
    nombreCompleto: reservaInicial.conductor.nombreCompleto,
    telefono: reservaInicial.conductor.telefono,
    correo: reservaInicial.conductor.correo ?? '',
    tipoDocumento: normalizarTipoDoc(reservaInicial.conductor.tipoDocumento),
    numeroDocumento: reservaInicial.conductor.numeroDocumento ?? '',
    ciudadExpedicion: reservaInicial.conductor.ciudadExpedicion ?? '',
    licenciaNumero:
      reservaInicial.conductor.licenciaNumero ??
      reservaInicial.conductor.numeroDocumento ??
      '',
    licenciaCategoria: normalizarCategoriaLic(
      reservaInicial.conductor.categoriaLicencia,
      reservaInicial.vehiculo.categoria
    ),
    licenciaVencimiento: reservaInicial.conductor.licenciaVencimiento ?? '',
    domicilio: reservaInicial.conductor.domicilio ?? '',
    autorizarSinDocumentos: false,
    notaAutorizacion: '',

    medidorUsoEntrega:
      reservaInicial.kilometrajeEntrega ?? reservaInicial.vehiculo.kilometraje,
    nivelEnergiaEntregaPct: reservaInicial.nivelCargaPorcentaje ?? 100,
    respuestasChecklist: obtenerPlantillaChecklistEntrega(
      reservaInicial.vehiculo.categoria
    ),

    puntosR2: obtenerPuntosInspeccionPorVehiculo(
      reservaInicial.vehiculo,
      reservaInicial
    ),
    estadoGeneralEntrega: 'IMPECABLE',
    observacionesEntrega: '',

    cobrarSaldoAhora: false,
    montoCobroSaldo: saldoPendienteInicial,
    metodoCobroSaldo: 'transferencia',
    cuentaCobroSaldoId: cuentasFinancieras[0]?.id ?? '',
    referenciaCobroSaldo: '',

    recibirGarantiaAhora: false,
    montoGarantia: reservaInicial.vehiculo.depositoGarantia,
    metodoGarantia: 'efectivo',
    cuentaGarantiaId: cuentasFinancieras[0]?.id ?? '',
    referenciaGarantia: '',

    ley1581Aceptada: reservaInicial.conductor.ley1581Aceptada ?? true,
    trasladoFotomultasAceptado: true,
    pagareBlancoFirmado: false,
    confirmacionFirmaArrendatario: true,
  }));

  const [errors, setErrors] = useState<EntregaWizardErrors>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [entregaCompletada, setEntregaCompletada] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Restaurar borrador si el operador refrescó en medio de la inspección
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<EntregaWizardData>;
        if (parsed && typeof parsed.nombreCompleto === 'string') {
          setData((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // Tolerante
    }
  }, [storageKey]);

  // Autoguardado silencioso en sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined' || entregaCompletada) return;
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(data));
      } catch {
        // Tolerante
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [data, storageKey, entregaCompletada]);

  const handleDataChange = (updates: Partial<EntregaWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    const keys = Object.keys(updates);
    if (keys.some((k) => errors[k])) {
      setErrors((prev) => {
        const next = { ...prev };
        for (const k of keys) delete next[k];
        return next;
      });
    }
    setErrorGeneral(null);
  };

  const validarPaso = (paso: EntregaStepId): boolean => {
    const nuevosErrores: EntregaWizardErrors = {};

    if (paso === 1) {
      if (!data.nombreCompleto.trim()) {
        nuevosErrores.nombreCompleto = 'El nombre completo del conductor es obligatorio.';
      }
      if (!data.telefono.trim()) {
        nuevosErrores.telefono = 'El teléfono de contacto es obligatorio.';
      }
      if (!data.autorizarSinDocumentos) {
        if (!data.numeroDocumento.trim() || data.numeroDocumento.trim().length < 4) {
          nuevosErrores.numeroDocumento =
            'Comprueba el número de documento o marca la autorización del local.';
        }
        if (
          reservaInicial.vehiculo.categoria !== 'PATINETA' &&
          !esLicenciaCompatibleConVehiculo(
            data.licenciaCategoria,
            reservaInicial.vehiculo.categoria
          )
        ) {
          nuevosErrores.licenciaCategoria = `La categoría ${data.licenciaCategoria} no es compatible con ${reservaInicial.vehiculo.categoria}. Ajusta la categoría o autoriza bajo responsabilidad del local.`;
        }
      }
    } else if (paso === 2) {
      if (data.medidorUsoEntrega < 0 || Number.isNaN(data.medidorUsoEntrega)) {
        nuevosErrores.medidorUsoEntrega = 'Indica un odómetro válido.';
      }
    } else if (paso === 5) {
      if (!data.confirmacionFirmaArrendatario) {
        nuevosErrores.confirmacionFirmaArrendatario =
          'Confirma la firma del arrendatario y la entrega física de llaves.';
      }
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const cambiarPaso = (nuevoPaso: EntregaStepId, dir: number) => {
    if (isTransitioning || nuevoPaso === pasoActual) return;
    if (containerRef.current) {
      setContainerHeight(containerRef.current.offsetHeight);
    }
    setDirection(dir);
    setIsTransitioning(true);
    setPasoActual(nuevoPaso);
    setErrorGeneral(null);
  };

  const avanzarPaso = () => {
    if (isTransitioning) return;
    if (!validarPaso(pasoActual)) {
      setErrorGeneral('Completa o verifica los datos requeridos antes de continuar.');
      return;
    }
    if (pasoActual < 5) {
      cambiarPaso((pasoActual + 1) as EntregaStepId, 1);
    }
  };

  const retrocederPaso = () => {
    if (isTransitioning) return;
    if (pasoActual > 1) {
      cambiarPaso((pasoActual - 1) as EntregaStepId, -1);
    }
  };

  const irAPaso = (destino: EntregaStepId) => {
    if (isTransitioning || destino === pasoActual) return;
    cambiarPaso(destino, destino > pasoActual ? 1 : -1);
  };

  const ejecutarEntregaDefinitiva = () => {
    if (!validarPaso(1)) {
      irAPaso(1);
      setErrorGeneral('Verifica los datos del arrendatario antes de entregar.');
      return;
    }
    if (!validarPaso(5)) {
      setErrorGeneral('Confirma la firma del arrendatario y entrega de llaves.');
      return;
    }

    setErrorGeneral(null);
    startTransition(async () => {
      try {
        const res = await actions.reservas.entregarVehiculo({
          codigo: reservaInicial.codigo,
          medidorUsoEntrega: Math.round(data.medidorUsoEntrega),
          nivelEnergiaEntregaPct: Math.round(data.nivelEnergiaEntregaPct),
          conductorVerificado: {
            nombreCompleto: data.nombreCompleto.trim(),
            telefono: data.telefono.trim(),
            correo: data.correo.trim() || undefined,
            tipoDocumento: data.tipoDocumento,
            numeroDocumento: data.numeroDocumento.trim() || undefined,
            ciudadExpedicion: data.ciudadExpedicion.trim() || undefined,
            licenciaNumero: data.licenciaNumero.trim() || undefined,
            licenciaCategoria: data.licenciaCategoria,
            licenciaVencimiento: data.licenciaVencimiento.trim() || undefined,
            domicilio: data.domicilio.trim() || undefined,
          },
          estadoGeneralEntrega: data.estadoGeneralEntrega,
          observacionesEntrega: data.observacionesEntrega.trim() || undefined,
          respuestasChecklist: data.respuestasChecklist.map((item) => ({
            codigo: item.codigo,
            nombre: item.nombre,
            estado: item.estado,
            observacion: item.observacion,
          })),
          puntosR2: data.puntosR2.map((p) => ({
            zona: p.zona,
            etiqueta: p.etiqueta,
            dictamen: p.dictamen,
            estado: p.estado,
            coordX: p.coordX,
            coordY: p.coordY,
          })),
          consentimientosContrato: {
            ley1581Aceptada: data.ley1581Aceptada,
            trasladoFotomultasAceptado: data.trasladoFotomultasAceptado,
            pagareBlancoFirmado: data.pagareBlancoFirmado,
          },
          cobrarSaldoAhora:
            data.cobrarSaldoAhora && data.montoCobroSaldo > 0
              ? {
                  monto: Math.round(data.montoCobroSaldo),
                  metodoPago: data.metodoCobroSaldo,
                  cuentaId: data.cuentaCobroSaldoId || undefined,
                  referencia: data.referenciaCobroSaldo.trim() || undefined,
                }
              : undefined,
          recibirGarantiaAhora:
            data.recibirGarantiaAhora && data.montoGarantia > 0
              ? {
                  monto: Math.round(data.montoGarantia),
                  metodoPago: data.metodoGarantia,
                  cuentaId: data.cuentaGarantiaId || undefined,
                  referencia: data.referenciaGarantia.trim() || undefined,
                }
              : undefined,
          autorizarSinDocumentos: data.autorizarSinDocumentos,
          notaAutorizacion: data.autorizarSinDocumentos
            ? data.notaAutorizacion.trim() ||
              'Entrega autorizada bajo responsabilidad del local en formulario de salida'
            : undefined,
        });

        if (res.error) {
          setErrorGeneral(res.error.message || 'No fue posible completar la entrega.');
          return;
        }

        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem(storageKey);
          } catch {
            // Tolerante
          }
        }

        setEntregaCompletada(true);
        window.setTimeout(() => {
          void navigate(`/admin/reservas/${reservaInicial.codigo}`);
        }, 700);
      } catch (err: unknown) {
        setErrorGeneral(
          err instanceof Error
            ? err.message
            : 'Error de conexión al registrar la entrega en D1.'
        );
      }
    });
  };

  const pasoMeta = PASOS_CONFIG.find((p) => p.id === pasoActual) ?? PASOS_CONFIG[0]!;

  if (entregaCompletada) {
    return (
      <div className="min-h-dvh bg-[#EDEDED] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[32px] bg-white border border-[#9CA3AF]/40 p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#111827] text-white text-2xl font-bold">
            ✓
          </div>
          <span className="inline-block rounded-full bg-[#EDEDED] px-3 py-1 font-mono text-[11px] font-bold text-[#111827]">
            CONTRATO VIGENTE · EN ALQUILER
          </span>
          <h1 className="font-display text-2xl font-bold text-[#111827]">
            Vehículo entregado en patio
          </h1>
          <p className="text-xs text-[#4B5563]">
            Los datos del cliente, el acta pericial R2 y el contrato #{reservaInicial.codigo} han sido guardados en Cloudflare D1.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#EDEDED] flex flex-col justify-between py-5 px-4 sm:px-8 max-w-4xl mx-auto w-full select-none">
      {/* HUD Superior Discreto (Filosofía Typeform FlotaX) */}
      <header className="w-full space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {pasoActual > 1 ? (
              <button
                type="button"
                onClick={retrocederPaso}
                disabled={isTransitioning || isPending}
                aria-label="Volver al paso anterior"
                className="ios-press-bounce flex h-11 w-11 items-center justify-center rounded-full border border-[#9CA3AF]/60 bg-white text-[#111827] text-sm font-bold hover:bg-[#EDEDED] transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                ←
              </button>
            ) : (
              <div className="h-11 w-11" />
            )}

            <span className="rounded-full px-3.5 py-1.5 font-mono text-xs font-bold tracking-wider uppercase bg-white text-[#111827] border border-[#9CA3AF]/50 shadow-xs">
              PASO 0{pasoActual} / 05 · {pasoMeta.etiquetaCorta} · #{reservaInicial.codigo}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/admin/reservas/${reservaInicial.codigo}`)}
            aria-label="Cerrar formulario de entrega"
            className="ios-press-bounce flex h-11 w-11 items-center justify-center rounded-full border border-[#9CA3AF]/60 bg-white text-[#111827] text-sm font-bold hover:bg-[#EDEDED] transition shadow-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Zona Central Typeform con Transición Vertical */}
      <main className="my-auto py-4 w-full">
        <motion.div
          ref={containerRef}
          animate={{ height: containerHeight }}
          transition={{ duration: 0.4, ease: MOTION_EASE }}
          className="w-full relative overflow-hidden bg-[#EDEDED]"
        >
          <div className="grid grid-cols-1 grid-rows-1 items-start w-full bg-[#EDEDED]">
            <AnimatePresence mode="sync" custom={direction} initial={false}>
              <motion.div
                key={pasoActual}
                custom={direction}
                variants={shouldReduceMotion ? reducedVariants : stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                ref={(node) => {
                  if (node && isTransitioning) {
                    const h = node.offsetHeight;
                    if (h && h > 0) setContainerHeight(h);
                  }
                }}
                onAnimationComplete={(definition) => {
                  if (definition === 'center') {
                    setIsTransitioning(false);
                    setContainerHeight('auto');
                  }
                }}
                className="col-start-1 row-start-1 w-full bg-[#EDEDED]"
                style={{ willChange: 'transform' }}
              >
                {pasoActual === 1 && (
                  <Step1ComprobacionCliente
                    reserva={reservaInicial}
                    data={data}
                    errors={errors}
                    onChange={handleDataChange}
                  />
                )}
                {pasoActual === 2 && (
                  <Step2TelemetriaYChecklist
                    reserva={reservaInicial}
                    data={data}
                    errors={errors}
                    onChange={handleDataChange}
                  />
                )}
                {pasoActual === 3 && (
                  <Step3PeritajeSalidaR2
                    reserva={reservaInicial}
                    data={data}
                    onChange={handleDataChange}
                  />
                )}
                {pasoActual === 4 && (
                  <Step4CajaYGarantia
                    reserva={reservaInicial}
                    data={data}
                    cuentasFinancieras={cuentasFinancieras}
                    onChange={handleDataChange}
                  />
                )}
                {pasoActual === 5 && (
                  <Step5ContratoYConfirmacion
                    reserva={reservaInicial}
                    data={data}
                    errors={errors}
                    onEditPaso={irAPaso}
                    onChange={handleDataChange}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      {/* Zona Inferior de Acciones (Thumb Zone) */}
      <footer className="w-full space-y-3 pt-4 border-t border-[#9CA3AF]/30">
        {errorGeneral && (
          <div
            role="alert"
            className="rounded-2xl bg-[#111827] px-4 py-3 text-center text-xs font-semibold text-white"
          >
            {errorGeneral}
          </div>
        )}

        <div className="flex items-center gap-3">
          {pasoActual > 1 && (
            <button
              type="button"
              onClick={retrocederPaso}
              disabled={isPending || isTransitioning}
              className="ios-press-bounce h-14 px-6 rounded-2xl border border-[#9CA3AF]/50 bg-white font-display text-sm font-bold text-[#111827] hover:bg-[#EDEDED] transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              Atrás
            </button>
          )}

          {pasoActual < 5 ? (
            <button
              type="button"
              onClick={avanzarPaso}
              disabled={isPending || isTransitioning}
              className="ios-press-bounce flex-1 h-14 rounded-2xl bg-[#111827] hover:bg-[#1F2937] active:scale-[0.99] font-display text-base font-bold text-white shadow-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Continuar</span>
              <span className="font-mono text-sm">→</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={ejecutarEntregaDefinitiva}
              disabled={isPending || isTransitioning}
              className="ios-press-bounce flex-1 h-14 rounded-2xl bg-[#111827] hover:bg-[#1F2937] active:scale-[0.99] font-display text-base font-bold text-white shadow-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending
                ? 'Activando contrato y salida...'
                : 'Confirmar entrega y poner en alquiler'}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
