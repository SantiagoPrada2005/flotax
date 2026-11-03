import { useState, useEffect, useTransition, useRef } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import type { VehiculoItem } from '@/lib/flota/types';
import type { WizardStepId, WizardStepInfo, VehiculoWizardData } from './types';
import StepIndicator from './StepIndicator';
import Step1TipoVehiculo from './Step1TipoVehiculo';
import Step2Identificacion from './Step2Identificacion';
import Step3InfoBasica from './Step3InfoBasica';
import Step4Caracteristicas from './Step4Caracteristicas';
import Step5Tarifas from './Step5Tarifas';
import Step6Fotografia from './Step6Fotografia';
import Step7Patio from './Step7Patio';
import Step8Revision from './Step8Revision';

export interface VehicleWizardIslandProps {
  vehiculoInicial?: VehiculoItem | undefined;
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

const STORAGE_DRAFT_KEY = 'flotax_vehiculo_wizard_draft';

const PASOS_CONFIG: WizardStepInfo[] = [
  {
    id: 1,
    titulo: '¿Qué vehículo vas a registrar?',
    subtitulo: 'Selecciona el segmento operativo de la unidad.',
    etiquetaCorta: 'Categoría',
  },
  {
    id: 2,
    titulo: 'Empecemos por identificarlo',
    subtitulo: 'Ingresa la placa de matrícula y el año del modelo.',
    etiquetaCorta: 'Identificación',
  },
  {
    id: 3,
    titulo: 'Cuéntanos un poco más',
    subtitulo: 'Fabricante y modelo comercial del vehículo.',
    etiquetaCorta: 'Modelo',
  },
  {
    id: 4,
    titulo: '¿Qué características tiene?',
    subtitulo: 'Especificaciones mecánicas y capacidad operativa.',
    etiquetaCorta: 'Especificaciones',
  },
  {
    id: 5,
    titulo: '¿A cuánto quieres alquilarlo?',
    subtitulo: 'Tarifa diaria y depósito de fianza en garantía.',
    etiquetaCorta: 'Tarifas',
  },
  {
    id: 6,
    titulo: 'Muéstranos tu vehículo',
    subtitulo: 'Fotografía principal para la ficha técnica del patio.',
    etiquetaCorta: 'Fotografía',
  },
  {
    id: 7,
    titulo: 'Prepara su documentación',
    subtitulo: 'Estado operativo inicial, notas y requisitos legales.',
    etiquetaCorta: 'Patio',
  },
  {
    id: 8,
    titulo: 'Todo listo. Revisemos tu vehículo',
    subtitulo: 'Confirma los datos consolidados antes de registrar.',
    etiquetaCorta: 'Revisión',
  },
];

const VALORES_INICIALES_DEFAULT: VehiculoWizardData = {
  categoria: 'SEDAN',
  categoriaEtiqueta: 'Automóvil / Sedán',
  marca: '',
  modelo: '',
  anio: 2024,
  placa: '',
  estado: 'DISPONIBLE',
  precioDia: 180000,
  depositoGarantia: 500000,
  transmision: 'Automática',
  combustible: 'Gasolina',
  capacidadPasajeros: 5,
  autonomiaKm: '',
  kilometraje: 0,
  imagenUrl: '',
  destacado: false,
  descripcion: '',
  aceleracion: '6.5 s',
  velocidadMaxima: '190 km/h',
  rating: 4.8,
  autonomiaOdo: '0 km',
  soatVigente: true,
  tarjetaPropiedad: true,
  tecnicoMecanica: true,
  kitCarretera: true,
};

export default function VehicleWizardIsland({ vehiculoInicial }: VehicleWizardIslandProps) {
  const esEdicion = Boolean(vehiculoInicial?.id);

  const [pasoActual, setPasoActual] = useState<WizardStepId>(1);
  const [pasoMaximoAlcanzado, setPasoMaximoAlcanzado] = useState<number>(esEdicion ? 8 : 1);
  const [direction, setDirection] = useState<number>(1);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto');
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const [data, setData] = useState<VehiculoWizardData>(() => {
    if (vehiculoInicial) {
      return {
        id: vehiculoInicial.id,
        marca: vehiculoInicial.marca,
        modelo: vehiculoInicial.modelo,
        anio: vehiculoInicial.anio,
        categoria: vehiculoInicial.categoria,
        categoriaEtiqueta: vehiculoInicial.categoriaEtiqueta,
        placa: vehiculoInicial.placa,
        estado: vehiculoInicial.estado,
        precioDia: vehiculoInicial.precioDia,
        depositoGarantia: vehiculoInicial.depositoGarantia,
        transmision: vehiculoInicial.transmision,
        combustible: vehiculoInicial.combustible,
        capacidadPasajeros: vehiculoInicial.capacidadPasajeros,
        autonomiaKm: vehiculoInicial.autonomiaKm ?? '',
        kilometraje: vehiculoInicial.kilometraje,
        imagenUrl: vehiculoInicial.imagenUrl,
        destacado: Boolean(vehiculoInicial.destacado),
        descripcion: vehiculoInicial.descripcion,
        aceleracion: vehiculoInicial.aceleracion,
        velocidadMaxima: vehiculoInicial.velocidadMaxima,
        rating: vehiculoInicial.rating,
        autonomiaOdo: vehiculoInicial.autonomiaOdo,
        soatVigente: true,
        tarjetaPropiedad: true,
        tecnicoMecanica: true,
        kitCarretera: true,
      };
    }
    return VALORES_INICIALES_DEFAULT;
  });

  const [borradorPendiente, setBorradorPendiente] = useState<VehiculoWizardData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMsgGeneral, setErrorMsgGeneral] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Detección de borrador local
  useEffect(() => {
    if (!esEdicion && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_DRAFT_KEY);
        if (raw) {
          const parseado = JSON.parse(raw) as VehiculoWizardData;
          if (parseado && (parseado.marca || parseado.placa)) {
            setBorradorPendiente(parseado);
          }
        }
      } catch { }
    }
  }, [esEdicion]);

  // Autoguardado silencioso de borrador
  useEffect(() => {
    if (esEdicion || typeof window === 'undefined') return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(data));
      } catch { }
    }, 800);

    return () => clearTimeout(timer);
  }, [data, esEdicion]);

  const handleRestaurarBorrador = () => {
    if (borradorPendiente) {
      setData(borradorPendiente);
      setBorradorPendiente(null);
      setErrorMsgGeneral(null);
    }
  };

  const handleDescartarBorrador = () => {
    setBorradorPendiente(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_DRAFT_KEY);
      } catch { }
    }
  };

  const handleDataChange = (updates: Partial<VehiculoWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    const clavesModificadas = Object.keys(updates);
    if (clavesModificadas.some((k) => errors[k])) {
      setErrors((prev) => {
        const copia = { ...prev };
        clavesModificadas.forEach((k) => delete copia[k]);
        return copia;
      });
    }
    setErrorMsgGeneral(null);
  };

  const validarPasoActual = (paso: WizardStepId): boolean => {
    const nuevosErrores: Record<string, string> = {};

    if (paso === 1) {
      if (!data.categoria) {
        nuevosErrores.categoria = 'Seleccione una categoría.';
      }
    } else if (paso === 2) {
      if (!data.placa.trim() || data.placa.trim().length < 3) {
        nuevosErrores.placa = 'Indique una placa o identificador válido (mín. 3 caracteres).';
      }
      if (!data.anio || data.anio < 1990 || data.anio > 2035) {
        nuevosErrores.anio = 'Indique un año válido entre 1990 y 2035.';
      }
    } else if (paso === 3) {
      if (!data.marca.trim()) {
        nuevosErrores.marca = 'Indique la marca o fabricante.';
      }
      if (!data.modelo.trim()) {
        nuevosErrores.modelo = 'Indique el modelo o versión comercial.';
      }
    } else if (paso === 4) {
      if (data.kilometraje === '' || Number(data.kilometraje) < 0) {
        nuevosErrores.kilometraje = 'Indique el kilometraje de patio.';
      }
    } else if (paso === 5) {
      if (data.precioDia === '' || Number(data.precioDia) <= 0) {
        nuevosErrores.precioDia = 'La tarifa diaria debe ser mayor a 0 COP.';
      }
      if (data.depositoGarantia === '' || Number(data.depositoGarantia) < 0) {
        nuevosErrores.depositoGarantia = 'El depósito de fianza no puede ser negativo.';
      }
    } else if (paso === 6) {
      if (!data.imagenUrl.trim()) {
        nuevosErrores.imagenUrl = 'Suba una fotografía para registrar la ficha de la unidad.';
      }
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const cambiarPaso = (nuevoPaso: WizardStepId, dir: number) => {
    if (isTransitioning || nuevoPaso === pasoActual) return;

    if (containerRef.current) {
      setContainerHeight(containerRef.current.offsetHeight);
    }
    setDirection(dir);
    setIsTransitioning(true);
    setPasoActual(nuevoPaso);
    setPasoMaximoAlcanzado((prev) => Math.max(prev, nuevoPaso));
    setErrorMsgGeneral(null);
  };

  const avanzarPaso = () => {
    if (isTransitioning) return;

    if (!validarPasoActual(pasoActual)) {
      setErrorMsgGeneral('Complete los datos requeridos para continuar.');
      return;
    }

    if (pasoActual < 8) {
      const siguiente = (pasoActual + 1) as WizardStepId;
      cambiarPaso(siguiente, 1);
    }
  };

  const retrocederPaso = () => {
    if (isTransitioning) return;

    if (pasoActual > 1) {
      const anterior = (pasoActual - 1) as WizardStepId;
      cambiarPaso(anterior, -1);
    }
  };

  const handleSelectPaso = (paso: WizardStepId) => {
    if (isTransitioning) return;

    if (paso <= pasoMaximoAlcanzado && paso !== pasoActual) {
      const currentIndex = PASOS_CONFIG.findIndex((p) => p.id === pasoActual);
      const targetIndex = PASOS_CONFIG.findIndex((p) => p.id === paso);
      const dir = targetIndex > currentIndex ? 1 : -1;
      cambiarPaso(paso, dir);
    }
  };

  const renderPaso = (paso: WizardStepId) => {
    switch (paso) {
      case 1:
        return <Step1TipoVehiculo data={data} onChange={handleDataChange} />;
      case 2:
        return <Step2Identificacion data={data} errors={errors} onChange={handleDataChange} />;
      case 3:
        return <Step3InfoBasica data={data} errors={errors} onChange={handleDataChange} />;
      case 4:
        return <Step4Caracteristicas data={data} errors={errors} onChange={handleDataChange} />;
      case 5:
        return <Step5Tarifas data={data} errors={errors} onChange={handleDataChange} />;
      case 6:
        return <Step6Fotografia data={data} errors={errors} onChange={handleDataChange} />;
      case 7:
        return <Step7Patio data={data} onChange={handleDataChange} />;
      case 8:
        return <Step8Revision data={data} onEditPaso={handleSelectPaso} />;
      default:
        return null;
    }
  };

  const handleGuardarVehiculo = () => {
    // Validar pasos críticos 2, 3, 5 y 6
    if (!validarPasoActual(2)) {
      setPasoActual(2);
      setErrorMsgGeneral('Verifique la identificación del vehículo.');
      return;
    }
    if (!validarPasoActual(3)) {
      setPasoActual(3);
      setErrorMsgGeneral('Verifique la marca y modelo.');
      return;
    }
    if (!validarPasoActual(5)) {
      setPasoActual(5);
      setErrorMsgGeneral('Verifique las tarifas de alquiler.');
      return;
    }
    if (!validarPasoActual(6)) {
      setPasoActual(6);
      setErrorMsgGeneral('Suba una fotografía para la ficha técnica.');
      return;
    }

    setErrorMsgGeneral(null);

    startTransition(async () => {
      try {
        const isElectrico =
          data.combustible === 'Eléctrico' || data.categoria === 'PATINETA';

        const payload = {
          id: esEdicion ? vehiculoInicial?.id : undefined,
          marca: data.marca.trim(),
          modelo: data.modelo.trim(),
          anio: Number(data.anio),
          categoria: data.categoria,
          categoriaEtiqueta: data.categoriaEtiqueta.trim() || data.categoria,
          placa: data.placa.trim().toUpperCase(),
          estado: data.estado,
          precioDia: Number(data.precioDia),
          depositoGarantia: Number(data.depositoGarantia),
          transmision: data.categoria === 'PATINETA' ? 'Eléctrica' : data.transmision,
          combustible: data.categoria === 'PATINETA' ? 'Eléctrico' : data.combustible,
          capacidadPasajeros: data.categoria === 'PATINETA' ? 1 : Number(data.capacidadPasajeros || 1),
          autonomiaKm: data.autonomiaKm !== '' ? Number(data.autonomiaKm) : undefined,
          kilometraje: Number(data.kilometraje || 0),
          imagenUrl: data.imagenUrl.trim(),
          destacado: Boolean(data.destacado),
          descripcion:
            data.descripcion.trim() ||
            `Unidad ${data.marca} ${data.modelo} ${data.anio} lista para alquiler en patio.`,
          aceleracion: isElectrico ? '4.5 s' : '7.2 s',
          velocidadMaxima: isElectrico ? '180 km/h' : '200 km/h',
          rating: vehiculoInicial?.rating ?? 4.8,
          autonomiaOdo: `${Number(data.kilometraje || 0).toLocaleString('es-CO')} km`,
        };

        const { error, data: resultado } = await actions.flota.guardarVehiculo(payload);

        if (error || !resultado?.ok) {
          setErrorMsgGeneral(error?.message || 'Error al guardar los datos del vehículo.');
          return;
        }

        if (!esEdicion && typeof window !== 'undefined') {
          try {
            localStorage.removeItem(STORAGE_DRAFT_KEY);
          } catch { }
        }

        setMensajeExito(resultado.mensaje || 'Unidad registrada exitosamente en flota.');

        setTimeout(async () => {
          await navigate('/admin/flota');
        }, 600);
      } catch {
        setErrorMsgGeneral('Error de conexión con el servidor. Intente nuevamente.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#EDEDED] flex flex-col justify-between py-6 px-4 sm:px-8 max-w-4xl mx-auto w-full select-none">
      {/* 1. Encabezado de Navegación y HUD Discreto (sin barra de progreso) */}
      <StepIndicator
        pasos={PASOS_CONFIG}
        pasoActual={pasoActual}
        pasoMaximoAlcanzado={pasoMaximoAlcanzado}
        isTransitioning={isTransitioning}
        onSelectPaso={handleSelectPaso}
        onPrevPaso={pasoActual > 1 ? retrocederPaso : undefined}
        onCancelar={() => navigate('/admin/flota')}
      />

      {/* Alerta de Restauración de Borrador */}
      {borradorPendiente && pasoActual === 1 && (
        <div
          role="status"
          className="my-4 rounded-[24px] border border-[#111827] bg-[#111827] p-4 text-white shadow-lg space-y-2 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-300">
              Borrador Encontrado
            </span>
            <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full bg-white text-[#111827]">
              AUTO-SAVE
            </span>
          </div>
          <p className="text-xs text-gray-300">
            Tienes un registro previo para{' '}
            <strong className="text-white">
              {borradorPendiente.marca || 'Vehículo'} {borradorPendiente.modelo} ({borradorPendiente.placa || 'Sin placa'})
            </strong>
            . ¿Deseas recuperarlo?
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleRestaurarBorrador}
              className="ios-press-bounce rounded-full bg-white px-4 py-1.5 font-display text-xs font-bold text-[#111827] hover:bg-gray-100 transition cursor-pointer"
            >
              Restaurar borrador
            </button>
            <button
              type="button"
              onClick={handleDescartarBorrador}
              className="ios-press-bounce rounded-full border border-gray-600 px-3 py-1.5 font-display text-xs font-medium text-gray-300 hover:text-white transition cursor-pointer"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* 2. Zona Central Inmersiva con Transición Vertical Continua */}
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
                    if (h && h > 0) {
                      setContainerHeight(h);
                    }
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
                {renderPaso(pasoActual)}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      {/* 3. Zona Inferior de Acciones Principales */}
      <footer className="w-full space-y-3 pt-4 border-t border-[#EDEDED]">
        {errorMsgGeneral && (
          <p
            role="alert"
            className="text-center font-mono text-xs font-bold text-rose-600 animate-fade-in"
          >
            {errorMsgGeneral}
          </p>
        )}

        {mensajeExito && (
          <p
            role="status"
            className="text-center font-mono text-xs font-bold text-emerald-600 animate-fade-in"
          >
            {mensajeExito}
          </p>
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

          {pasoActual < 8 ? (
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
              onClick={handleGuardarVehiculo}
              disabled={isPending || isTransitioning}
              className="ios-press-bounce flex-1 h-14 rounded-2xl bg-[#111827] hover:bg-[#1F2937] active:scale-[0.99] font-display text-base font-bold text-white shadow-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <span className="font-mono text-sm">Guardando en patio...</span>
              ) : (
                <span>{esEdicion ? 'Guardar Cambios' : 'Registrar Unidad en Flota'}</span>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
