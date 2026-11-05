import { useState, useMemo } from 'react';
import { actions } from 'astro:actions';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import type { VehiculoItem, BloqueNoDisponible } from '@/lib/flota/types';
import type {
  MantenimientoVehiculoSelect,
  TipoMantenimientoVehiculo,
  AdvertenciaReservaSolapada,
} from '@/lib/mantenimientos/types';
import {
  calcularDiasInclusivos,
  formatearFechaCorta,
} from '@/lib/flota/disponibilidad';
import { formatearMonedaCOP } from '@/lib/caja';
import EditorialAvailabilityCalendar from '@/components/alquiler/EditorialAvailabilityCalendar';

export interface MaintenanceWizardFlowProps {
  vehiculo: VehiculoItem;
  hoyISO: string;
  bloques?: BloqueNoDisponible[] | undefined;
  fechaInicioInicial?: string | null | undefined;
  fechaFinInicial?: string | null | undefined;
  onCancel: () => void;
  onSuccess: (
    orden: MantenimientoVehiculoSelect,
    advertencias?: AdvertenciaReservaSolapada[]
  ) => void;
}

type PasoWizard = 1 | 2 | 3 | 4 | 5;

interface TipoOpcionConfig {
  id: TipoMantenimientoVehiculo;
  titulo: string;
  subtitulo: string;
  badge: string;
  icono: string;
}

const OPCIONES_TIPO: TipoOpcionConfig[] = [
  {
    id: 'PREVENTIVO',
    titulo: 'Mantenimiento Preventivo',
    subtitulo: 'Servicios periódicos programados, cambio de aceite, filtros y chequeo de rutina.',
    badge: 'Programado',
    icono: 'wrench',
  },
  {
    id: 'CORRECTIVO_NOVEDAD',
    titulo: 'Correctivo / Novedad Mecánica',
    subtitulo: 'Reparación de fallas mecánicas, eléctricas o novedades reportadas en patio o por cliente.',
    badge: 'Taller Urgente',
    icono: 'alert-triangle',
  },
  {
    id: 'ALISTAMIENTO',
    titulo: 'Alistamiento de Patio',
    subtitulo: 'Lavado profundo, peritaje estético, revisión de niveles e inventario previo a entrega.',
    badge: 'Patio Interno',
    icono: 'sparkles',
  },
  {
    id: 'BLOQUEO_OPERATIVO',
    titulo: 'Bloqueo Operativo / Administrativo',
    subtitulo: 'Retiro temporal por trámite documental, SOAT, peritaje aseguradora o decisión de patio.',
    badge: 'Administrativo',
    icono: 'shield-lock',
  },
];

const SUGERENCIAS_TALLER = [
  'Taller Central / Patio',
  'Serviteca Aliada',
  'Concesionario Oficial',
  'Patio Interno',
];

const SUGERENCIAS_CONCEPTO: Record<TipoMantenimientoVehiculo, string[]> = {
  PREVENTIVO: [
    'Revisión periódica 10.000 km',
    'Cambio de aceite, filtros y fluidos',
    'Alineación, balanceo y rotación de llantas',
    'Revisión y graduación de frenos',
  ],
  CORRECTIVO_NOVEDAD: [
    'Reparación sistema de frenos y pastillas',
    'Diagnóstico eléctrico y cambio de batería',
    'Reparación de embrague y caja',
    'Corrección de ruido en suspensión',
  ],
  ALISTAMIENTO: [
    'Alistamiento general y lavado profundo',
    'Peritaje técnico e inventario de patio',
    'Desinfección de cabina e interiores',
    'Revisión de kit de carretera y fluidos',
  ],
  BLOQUEO_OPERATIVO: [
    'Renovación SOAT y revisión técnico-mecánica',
    'Peritaje e inspección de aseguradora',
    'Custodia legal / administrativa',
    'Traspaso o auditoría documental',
  ],
};

const MOTION_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const stepVariants: Variants = {
  enter: (direction: number) => ({
    y: direction >= 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: {
      y: { duration: 0.32, ease: MOTION_EASE },
      opacity: { duration: 0.24 },
    },
  },
  exit: (direction: number) => ({
    y: direction >= 0 ? -40 : 40,
    opacity: 0,
    transition: {
      y: { duration: 0.24, ease: MOTION_EASE },
      opacity: { duration: 0.18 },
    },
  }),
};

const reducedVariants: Variants = {
  enter: { y: 0, opacity: 1 },
  center: { y: 0, opacity: 1, transition: { duration: 0 } },
  exit: { y: 0, opacity: 1, transition: { duration: 0 } },
};

export default function MaintenanceWizardFlow({
  vehiculo,
  hoyISO,
  bloques = [],
  fechaInicioInicial,
  fechaFinInicial,
  onCancel,
  onSuccess,
}: MaintenanceWizardFlowProps) {
  const shouldReduceMotion = useReducedMotion();

  const [paso, setPaso] = useState<PasoWizard>(1);
  const [direction, setDirection] = useState<number>(1);

  // Estado del Wizard
  const [tipo, setTipo] = useState<TipoMantenimientoVehiculo>('PREVENTIVO');
  const [fechaInicio, setFechaInicio] = useState<string | null>(fechaInicioInicial ?? hoyISO);
  const [fechaFin, setFechaFin] = useState<string | null>(fechaFinInicial ?? hoyISO);
  const [tallerProveedor, setTallerProveedor] = useState<string>('');
  const [kilometrajeRegistro, setKilometrajeRegistro] = useState<string>(
    String(vehiculo.kilometraje ?? 0)
  );
  const [etiqueta, setEtiqueta] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [costoTotal, setCostoTotal] = useState<string>('0');

  // Estados de proceso y respuesta
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [advertenciasServidor, setAdvertenciasServidor] = useState<
    AdvertenciaReservaSolapada[] | null
  >(null);
  const [ordenCreada, setOrdenCreada] = useState<MantenimientoVehiculoSelect | null>(null);

  // Detección previa en cliente de reservas solapadas usando bloques
  const reservasSolapadasCliente = useMemo(() => {
    if (!fechaInicio || !fechaFin) return [];
    return bloques.filter(
      (b) =>
        b.motivo === 'RESERVADO' &&
        b.fechaInicio <= fechaFin &&
        b.fechaFin >= fechaInicio
    );
  }, [bloques, fechaInicio, fechaFin]);

  const diasBloqueo = useMemo(() => {
    if (!fechaInicio || !fechaFin) return 0;
    if (fechaFin < fechaInicio) return 0;
    return calcularDiasInclusivos(fechaInicio, fechaFin);
  }, [fechaInicio, fechaFin]);

  const pasaInmediatoTaller = useMemo(() => {
    if (!fechaInicio || !fechaFin) return false;
    return fechaInicio <= hoyISO && fechaFin >= hoyISO;
  }, [fechaInicio, fechaFin, hoyISO]);

  const cambiarPaso = (nuevoPaso: PasoWizard) => {
    setErrorMsg(null);
    setDirection(nuevoPaso > paso ? 1 : -1);
    setPaso(nuevoPaso);
  };

  const avanzarPaso = () => {
    setErrorMsg(null);
    if (paso === 1) {
      if (!tipo) {
        setErrorMsg('Selecciona un tipo de intervención.');
        return;
      }
      cambiarPaso(2);
    } else if (paso === 2) {
      if (!fechaInicio || !fechaFin) {
        setErrorMsg('Selecciona una fecha de inicio y de fin en el calendario.');
        return;
      }
      if (fechaFin < fechaInicio) {
        setErrorMsg('La fecha de fin no puede ser anterior a la de inicio.');
        return;
      }
      cambiarPaso(3);
    } else if (paso === 3) {
      const kmNum = parseInt(kilometrajeRegistro, 10);
      if (isNaN(kmNum) || kmNum < 0) {
        setErrorMsg('Indica un odómetro válido mayor o igual a 0 km.');
        return;
      }
      cambiarPaso(4);
    } else if (paso === 4) {
      if (!etiqueta.trim()) {
        setErrorMsg('El concepto o motivo técnico es obligatorio.');
        return;
      }
      const costoNum = parseFloat(costoTotal);
      if (isNaN(costoNum) || costoNum < 0) {
        setErrorMsg('El costo estimado debe ser un número válido mayor o igual a 0.');
        return;
      }
      cambiarPaso(5);
    }
  };

  const retrocederPaso = () => {
    if (paso > 1) {
      cambiarPaso((paso - 1) as PasoWizard);
    } else {
      onCancel();
    }
  };

  const handleCrearMantenimiento = async () => {
    if (!fechaInicio || !fechaFin) {
      setErrorMsg('Las fechas de inicio y fin son obligatorias.');
      return;
    }
    if (!etiqueta.trim()) {
      setErrorMsg('El concepto o etiqueta corta es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const kmNum = parseInt(kilometrajeRegistro, 10);
      const costoNum = parseFloat(costoTotal);

      const payload = {
        vehiculoId: vehiculo.id,
        tipo,
        etiqueta: etiqueta.trim(),
        descripcion: descripcion.trim() || undefined,
        tallerProveedor: tallerProveedor.trim() || undefined,
        fechaInicio,
        fechaFin,
        kilometrajeRegistro: isNaN(kmNum) ? undefined : kmNum,
        costoTotal: isNaN(costoNum) ? undefined : Math.round(costoNum),
      };

      const { data, error } = await actions.mantenimientos.crearMantenimiento(payload);

      if (error || !data?.ok) {
        setErrorMsg(error?.message || 'Error al registrar el mantenimiento en patio.');
        return;
      }

      setOrdenCreada(data.orden);

      if (data.advertenciasReservas && data.advertenciasReservas.length > 0) {
        setAdvertenciasServidor(data.advertenciasReservas);
      } else {
        onSuccess(data.orden, []);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al conectar con el servidor.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderizador de iconos temáticos
  const renderIcono = (nombre: string, className = 'w-6 h-6') => {
    switch (nombre) {
      case 'wrench':
        return (
          <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        );
      case 'alert-triangle':
        return (
          <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'sparkles':
        return (
          <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
          </svg>
        );
      case 'shield-lock':
        return (
          <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <rect width="8" height="5" x="8" y="11" rx="1" />
            <path d="M10 11V9a2 2 0 0 1 4 0v2" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#EDEDED] flex flex-col justify-between py-4 px-4 sm:px-6 md:px-8 max-w-4xl mx-auto w-full select-none">
      {/* 1. Header de Navegación Estilo Apple */}
      <header className="w-full flex items-center justify-between pb-4 border-b border-[#9CA3AF]/20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancelar programación de mantenimiento"
            className="ios-press-bounce min-h-[44px] px-3.5 rounded-full border border-[#9CA3AF]/40 bg-white font-display text-xs font-bold text-[#4B5563] hover:text-[#111827] hover:bg-white shadow-2xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>✕</span>
            <span>Cancelar</span>
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="font-mono text-xs font-black tracking-wider text-[#111827] bg-white border border-[#9CA3AF]/40 px-2 py-0.5 rounded-md shadow-2xs">
              {vehiculo.placa}
            </span>
            <span className="text-xs text-[#4B5563] font-medium">
              {vehiculo.marca} {vehiculo.modelo}
            </span>
          </div>
        </div>

        {/* Indicador de Progreso Discreto */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#4B5563]">
            Paso {paso} de 5
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === paso
                    ? 'w-6 bg-[#111827]'
                    : idx < paso
                    ? 'w-2 bg-[#4B5563]'
                    : 'w-2 bg-[#9CA3AF]/40'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* 2. Zona Central Inmersiva con Animación Vertical Typeform */}
      <main className="my-auto py-6 w-full">
        <div className="relative overflow-hidden w-full">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={paso}
              custom={direction}
              variants={shouldReduceMotion ? reducedVariants : stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full"
            >
              {/* PASO 1: Tipo de Intervención */}
              {paso === 1 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                      Paso 1
                    </span>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#111827]">
                      ¿Qué tipo de intervención requiere el vehículo?
                    </h1>
                    <p className="text-sm text-[#4B5563]">
                      Selecciona la categoría operativa para catalogar la orden de patio.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    {OPCIONES_TIPO.map((op) => {
                      const isSelected = tipo === op.id;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setTipo(op.id)}
                          className={`ios-press-bounce min-h-[96px] text-left p-4 sm:p-5 rounded-[24px] border-2 transition shadow-sm cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#111827] bg-[#111827] text-[#EDEDED]'
                              : 'border-[#9CA3AF]/30 bg-white hover:border-[#4B5563]/60 text-[#111827]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className={`p-2.5 rounded-xl ${
                                isSelected
                                  ? 'bg-white/10 text-[#EDEDED]'
                                  : 'bg-[#EDEDED] text-[#111827]'
                              }`}
                            >
                              {renderIcono(op.icono, 'w-5 h-5')}
                            </div>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                isSelected
                                  ? 'bg-white/20 text-[#EDEDED]'
                                  : 'bg-[#EDEDED] text-[#4B5563]'
                              }`}
                            >
                              {op.badge}
                            </span>
                          </div>

                          <div className="mt-3">
                            <h3 className="font-display font-bold text-sm sm:text-base">
                              {op.titulo}
                            </h3>
                            <p
                              className={`text-xs mt-1 leading-relaxed ${
                                isSelected ? 'text-[#9CA3AF]' : 'text-[#4B5563]'
                              }`}
                            >
                              {op.subtitulo}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PASO 2: Selección de Fechas */}
              {paso === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                      Paso 2
                    </span>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#111827]">
                      ¿En qué fechas estará en taller o bloqueado?
                    </h1>
                    <p className="text-sm text-[#4B5563]">
                      Toca un día para inicio y otro para fin, o toca dos veces el mismo día para un bloqueo puntual.
                    </p>
                  </div>

                  {/* Resumen del Rango Seleccionado */}
                  <div className="rounded-2xl border border-[#9CA3AF]/30 bg-white p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-[#4B5563]">
                          Desde
                        </span>
                        <span className="font-mono font-bold text-sm text-[#111827]">
                          {fechaInicio ? formatearFechaCorta(fechaInicio) : 'Sin fecha'}
                        </span>
                      </div>
                      <span className="text-[#9CA3AF] font-bold">→</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-[#4B5563]">
                          Hasta
                        </span>
                        <span className="font-mono font-bold text-sm text-[#111827]">
                          {fechaFin ? formatearFechaCorta(fechaFin) : 'Sin fecha'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {pasaInmediatoTaller && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-status-warning/15 text-[#111827] border border-status-warning/40">
                          <span className="w-2 h-2 rounded-full bg-status-warning animate-pulse" />
                          <span>Pasa a Taller Hoy</span>
                        </span>
                      )}
                      <span className="font-mono text-xs font-bold bg-[#111827] text-[#EDEDED] px-3 py-1 rounded-full">
                        {diasBloqueo} {diasBloqueo === 1 ? 'día' : 'días'}
                      </span>
                    </div>
                  </div>

                  {/* Calendario de Disponibilidad Completo */}
                  <div className="w-full">
                    <EditorialAvailabilityCalendar
                      vehiculo={vehiculo}
                      hoyISO={hoyISO}
                      fechaInicio={fechaInicio}
                      fechaFin={fechaFin}
                      onChangeRango={(ini, fn) => {
                        setFechaInicio(ini);
                        setFechaFin(fn);
                        setErrorMsg(null);
                      }}
                      bloquesPrecalculados={bloques}
                    />
                  </div>

                  {/* Advertencia Temprana de Reservas */}
                  {reservasSolapadasCliente.length > 0 && (
                    <div
                      role="alert"
                      className="rounded-2xl border border-status-warning/50 bg-status-warning/10 p-3.5 text-xs text-[#111827] space-y-1.5"
                    >
                      <div className="flex items-center gap-2 font-bold">
                        <span>⚠</span>
                        <span>
                          Advertencia de patio: Existen {reservasSolapadasCliente.length} reserva(s)
                          en este periodo.
                        </span>
                      </div>
                      <p className="text-[11px] text-[#4B5563]">
                        Podrás confirmar la orden en el paso final, pero se notificará el conflicto para reubicar al cliente.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 3: Taller y Odómetro */}
              {paso === 3 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                      Paso 3
                    </span>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#111827]">
                      Taller Proveedor y Odómetro
                    </h1>
                    <p className="text-sm text-[#4B5563]">
                      Indica el centro técnico responsable y el kilometraje al momento del registro.
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Taller / Proveedor */}
                    <div>
                      <label
                        htmlFor="wizardTallerInput"
                        className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5"
                      >
                        Taller o Proveedor Asignado (Opcional)
                      </label>
                      <input
                        id="wizardTallerInput"
                        type="text"
                        value={tallerProveedor}
                        onChange={(e) => setTallerProveedor(e.target.value)}
                        placeholder="Ej. Taller Central Autolarte, Serviteca Calle 10"
                        className="w-full h-12 rounded-xl border border-[#9CA3AF]/50 bg-white px-3.5 text-base text-[#111827] shadow-xs focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
                      />
                      {/* Chips de Sugerencia */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {SUGERENCIAS_TALLER.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setTallerProveedor(sug)}
                            className="ios-press-bounce min-h-[32px] px-3 py-1 rounded-full text-xs font-medium border border-[#9CA3AF]/30 bg-white text-[#4B5563] hover:text-[#111827] hover:border-[#111827] transition cursor-pointer"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Odómetro de Ingreso */}
                    <div>
                      <label
                        htmlFor="wizardOdometroInput"
                        className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5"
                      >
                        Odómetro al Ingresar (km)
                      </label>
                      <div className="relative">
                        <input
                          id="wizardOdometroInput"
                          type="number"
                          min="0"
                          step="1"
                          value={kilometrajeRegistro}
                          onChange={(e) => setKilometrajeRegistro(e.target.value)}
                          placeholder="Ej. 45200"
                          className="w-full h-12 rounded-xl border border-[#9CA3AF]/50 bg-white px-3.5 pr-14 text-base font-mono text-[#111827] shadow-xs focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
                        />
                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#4B5563]">
                          KM
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-[#4B5563]">
                        Odómetro actual registrado en el sistema:{' '}
                        <strong className="text-[#111827] font-mono">
                          {(vehiculo.kilometraje ?? 0).toLocaleString('es-CO')} km
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 4: Concepto y Costo Estimado */}
              {paso === 4 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                      Paso 4
                    </span>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#111827]">
                      Concepto Técnico y Presupuesto
                    </h1>
                    <p className="text-sm text-[#4B5563]">
                      Describe el motivo técnico y el costo estimado en pesos colombianos (COP).
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Concepto / Etiqueta */}
                    <div>
                      <label
                        htmlFor="wizardConceptoInput"
                        className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5"
                      >
                        Concepto o Motivo Principal *
                      </label>
                      <input
                        id="wizardConceptoInput"
                        type="text"
                        required
                        value={etiqueta}
                        onChange={(e) => setEtiqueta(e.target.value)}
                        placeholder="Ej. Mantenimiento 10.000 km y frenos"
                        className="w-full h-12 rounded-xl border border-[#9CA3AF]/50 bg-white px-3.5 text-base text-[#111827] shadow-xs focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
                      />
                      {/* Sugerencias Dinámicas por Tipo */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {SUGERENCIAS_CONCEPTO[tipo]?.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setEtiqueta(sug)}
                            className="ios-press-bounce min-h-[32px] px-3 py-1 rounded-full text-xs font-medium border border-[#9CA3AF]/30 bg-white text-[#4B5563] hover:text-[#111827] hover:border-[#111827] transition cursor-pointer"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Descripción Detallada */}
                    <div>
                      <label
                        htmlFor="wizardDescripcionTextarea"
                        className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5"
                      >
                        Detalle Técnico Adicional (Opcional)
                      </label>
                      <textarea
                        id="wizardDescripcionTextarea"
                        rows={3}
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        placeholder="Observaciones de taller, repuestos cotizados o condiciones previas al peritaje..."
                        className="w-full rounded-xl border border-[#9CA3AF]/50 bg-white p-3 text-base text-[#111827] shadow-xs focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
                      />
                    </div>

                    {/* Costo Estimado */}
                    <div>
                      <label
                        htmlFor="wizardCostoInput"
                        className="block text-xs font-bold uppercase tracking-wider text-[#111827] mb-1.5"
                      >
                        Costo Estimado Preliminar (COP)
                      </label>
                      <div className="relative">
                        <input
                          id="wizardCostoInput"
                          type="number"
                          min="0"
                          step="1000"
                          value={costoTotal}
                          onChange={(e) => setCostoTotal(e.target.value)}
                          placeholder="0"
                          className="w-full h-12 rounded-xl border border-[#9CA3AF]/50 bg-white px-3.5 pr-14 text-base font-mono text-[#111827] shadow-xs focus:border-[#111827] focus:outline-none focus:ring-1 focus:ring-[#111827]"
                        />
                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#4B5563]">
                          COP
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs font-mono text-[#4B5563]">
                        Presupuesto visual:{' '}
                        <span className="font-bold text-[#111827]">
                          {formatearMonedaCOP(parseFloat(costoTotal) || 0)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 5: Resumen, Advertencias y Confirmación */}
              {paso === 5 && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                      Paso 5
                    </span>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#111827]">
                      Revisión y Confirmación de Orden
                    </h1>
                    <p className="text-sm text-[#4B5563]">
                      Verifica los datos técnicos antes de registrar la orden y actualizar la disponibilidad.
                    </p>
                  </div>

                  {/* Tarjeta de Resumen Consolidada */}
                  <div className="rounded-[28px] border border-[#9CA3AF]/30 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                    {/* Fila Unidad y Placa */}
                    <div className="flex items-center justify-between pb-3 border-b border-[#9CA3AF]/20">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4B5563]">
                          Unidad de Patio
                        </span>
                        <h2 className="font-display font-bold text-base sm:text-lg text-[#111827]">
                          {vehiculo.marca} {vehiculo.modelo} ({vehiculo.anio})
                        </h2>
                      </div>
                      <span className="font-mono text-xs font-black tracking-widest text-[#111827] bg-[#EDEDED] border border-[#9CA3AF]/50 px-2.5 py-1 rounded-md shadow-2xs">
                        {vehiculo.placa}
                      </span>
                    </div>

                    {/* Matriz de Datos Técnicos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#EDEDED]/50 border border-[#9CA3AF]/20 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#4B5563]">
                          Tipo de Intervención
                        </span>
                        <p className="font-bold text-[#111827]">
                          {OPCIONES_TIPO.find((o) => o.id === tipo)?.titulo ?? tipo}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#EDEDED]/50 border border-[#9CA3AF]/20 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#4B5563]">
                          Periodo y Duración
                        </span>
                        <p className="font-mono font-bold text-[#111827]">
                          {fechaInicio ? formatearFechaCorta(fechaInicio) : ''} —{' '}
                          {fechaFin ? formatearFechaCorta(fechaFin) : ''} ({diasBloqueo}{' '}
                          {diasBloqueo === 1 ? 'día' : 'días'})
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#EDEDED]/50 border border-[#9CA3AF]/20 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#4B5563]">
                          Taller Asignado
                        </span>
                        <p className="font-bold text-[#111827]">
                          {tallerProveedor.trim() || 'Servicio Interno / Patio'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#EDEDED]/50 border border-[#9CA3AF]/20 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[#4B5563]">
                          Odómetro de Ingreso
                        </span>
                        <p className="font-mono font-bold text-[#111827]">
                          {(parseInt(kilometrajeRegistro, 10) || 0).toLocaleString('es-CO')} km
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#EDEDED]/50 border border-[#9CA3AF]/20 space-y-1 sm:col-span-2">
                        <span className="text-[10px] uppercase font-bold text-[#4B5563]">
                          Concepto y Motivo Técnico
                        </span>
                        <p className="font-bold text-[#111827]">{etiqueta}</p>
                        {descripcion.trim() && (
                          <p className="text-[11px] text-[#4B5563] pt-1 leading-relaxed">
                            {descripcion.trim()}
                          </p>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-[#EDEDED]/50 border border-[#9CA3AF]/20 space-y-1 sm:col-span-2 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[#4B5563]">
                          Costo Estimado
                        </span>
                        <span className="font-mono font-bold text-sm text-[#111827]">
                          {formatearMonedaCOP(parseFloat(costoTotal) || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Alerta de Conmutación Inmediata de Estado */}
                    {pasaInmediatoTaller && (
                      <div className="rounded-xl border border-status-warning/40 bg-status-warning/10 p-3 text-xs flex items-center gap-2">
                        <span className="text-status-warning font-bold text-sm">ℹ</span>
                        <span className="text-[#111827]">
                          El vehículo pasará inmediatamente a estado{' '}
                          <strong className="font-mono">MANTENIMIENTO</strong> en patio.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Alerta si el Servidor Detectó Reservas en Conflicto */}
                  {advertenciasServidor && advertenciasServidor.length > 0 && (
                    <div
                      role="alert"
                      className="rounded-[24px] border-2 border-status-warning/60 bg-status-warning/10 p-4 sm:p-5 space-y-3 animate-fade-in"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚠️</span>
                        <div>
                          <h4 className="font-display font-bold text-sm text-[#111827]">
                            ¡Atención! Conflicto con Reservas Activas
                          </h4>
                          <p className="text-xs text-[#4B5563]">
                            Se detectaron {advertenciasServidor.length} reserva(s) que se solapan con estas fechas de taller:
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        {advertenciasServidor.map((adv) => (
                          <div
                            key={adv.id}
                            className="rounded-xl border border-status-warning/40 bg-white p-3 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-mono font-bold text-[#111827]">
                                Reserva #{adv.codigo}
                              </span>
                              <p className="text-[11px] text-[#4B5563] font-medium">
                                Cliente: {adv.clienteNombre}
                              </p>
                            </div>
                            <span className="font-mono text-[11px] text-[#111827] bg-[#EDEDED] px-2 py-1 rounded-md">
                              {formatearFechaCorta(adv.fechaInicio)} — {formatearFechaCorta(adv.fechaFin)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (ordenCreada) {
                              onSuccess(ordenCreada, advertenciasServidor);
                            }
                          }}
                          className="ios-press-bounce min-h-[44px] px-5 rounded-2xl bg-[#111827] text-xs font-bold text-[#EDEDED] shadow-sm hover:bg-[#1F2937] transition cursor-pointer"
                        >
                          Entendido, Finalizar Registro
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* 3. Barra Flotante Inferior de Acciones (Apple Ergonomics 44px+) */}
      <footer className="w-full space-y-3 pt-4 border-t border-[#9CA3AF]/20 safe-bottom">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 animate-fade-in flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">⚠</span>
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-xs font-bold text-rose-800 hover:text-rose-950 p-1"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={retrocederPaso}
            disabled={isSubmitting}
            className="ios-press-bounce min-h-[48px] px-5 sm:px-6 rounded-2xl border border-[#9CA3AF]/40 bg-white font-display text-sm font-bold text-[#111827] hover:bg-[#EDEDED] transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {paso === 1 ? 'Cancelar' : 'Atrás'}
          </button>

          {paso < 5 ? (
            <button
              type="button"
              onClick={avanzarPaso}
              disabled={isSubmitting}
              className="ios-press-bounce flex-1 min-h-[48px] rounded-2xl bg-[#111827] hover:bg-[#1F2937] active:scale-[0.99] font-display text-sm sm:text-base font-bold text-[#EDEDED] shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Continuar</span>
              <span className="font-mono text-sm">→</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCrearMantenimiento}
              disabled={isSubmitting || Boolean(advertenciasServidor)}
              className="ios-press-bounce flex-1 min-h-[48px] rounded-2xl bg-[#111827] hover:bg-[#1F2937] active:scale-[0.99] font-display text-sm sm:text-base font-bold text-[#EDEDED] shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-[#EDEDED]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Registrando en patio...</span>
                </>
              ) : (
                <span>Confirmar y Programar Mantenimiento</span>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
