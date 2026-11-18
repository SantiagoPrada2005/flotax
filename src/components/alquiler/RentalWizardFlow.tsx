import { useEffect, useMemo, useRef, useState } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import {
  calcularCotizacionAlquiler,
  encontrarPrimerRangoDisponible,
  esRangoDisponibleValido,
  formatearFechaCorta,
  type BloqueNoDisponible,
  type VehiculoItem,
} from '@/lib/flota';
import type { EstadoDocumentalVehiculo } from '@/lib/flota/disponibilidad';
import EditorialAvailabilityCalendar from './EditorialAvailabilityCalendar';
import RentalVehicleHero from './RentalVehicleHero';
import SlideToConfirmControl from './SlideToConfirmControl';

export interface UsuarioSesionCliente {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
}

export interface RentalWizardFlowProps {
  vehiculo: VehiculoItem;
  hoyISO: string;
  bloquesIniciales?: BloqueNoDisponible[] | undefined;
  usuarioActual: UsuarioSesionCliente | null;
  fechaInicioInicial?: string | undefined;
  fechaFinInicial?: string | undefined;
  pasoInicial?: 1 | 2 | 3 | 4 | undefined;
  estadoDocumental?: EstadoDocumentalVehiculo | undefined;
  localId?: string | undefined;
  sedeNombre?: string | undefined;
}

type PasoWizard = 1 | 2 | 3 | 4;

interface DatosConductorState {
  nombreCompleto: string;
  correo: string;
  telefono: string;
  tipoDocumento: 'CC' | 'CE' | 'PASAPORTE' | '';
  numeroDocumento: string;
  categoriaLicencia: 'B1' | 'B2' | 'A2' | 'C1' | '';
  modalidadEntrega: 'PATIO_PRINCIPAL' | 'DOMICILIO_MEDELLIN';
}

const PASOS_META: ReadonlyArray<{ numero: PasoWizard; titulo: string; subtitulo: string }> = [
  {
    numero: 1,
    titulo: 'Fechas',
    subtitulo: 'Franjas de disponibilidad',
  },
  {
    numero: 2,
    titulo: 'Conductor',
    subtitulo: 'Sesión y credenciales',
  },
  {
    numero: 3,
    titulo: 'Resumen',
    subtitulo: 'Itinerario y costos',
  },
  {
    numero: 4,
    titulo: 'Confirmar',
    subtitulo: 'Abono y autorizaciones',
  },
];

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

export default function RentalWizardFlow({
  vehiculo,
  hoyISO,
  bloquesIniciales,
  usuarioActual,
  fechaInicioInicial,
  fechaFinInicial,
  pasoInicial = 1,
  estadoDocumental,
  localId,
  sedeNombre,
}: RentalWizardFlowProps) {
  const [paso, setPaso] = useState<PasoWizard>(pasoInicial);
  const [bloques, setBloques] = useState<BloqueNoDisponible[]>(bloquesIniciales ?? []);

  // Rango inicial inteligente: respeta parámetros si son válidos, o calcula la primera franja libre contigua
  const rangoInicialCalculado = useMemo(() => {
    if (
      fechaInicioInicial &&
      esRangoDisponibleValido(
        vehiculo.id,
        fechaInicioInicial,
        fechaFinInicial ?? fechaInicioInicial,
        hoyISO,
        bloques
      )
    ) {
      return {
        fechaInicio: fechaInicioInicial,
        fechaFin: fechaFinInicial ?? fechaInicioInicial,
      };
    }
    return encontrarPrimerRangoDisponible(vehiculo.id, hoyISO, bloques, 3);
  }, [fechaInicioInicial, fechaFinInicial, vehiculo.id, hoyISO, bloques]);

  const [fechaInicio, setFechaInicio] = useState<string | null>(
    rangoInicialCalculado.fechaInicio
  );
  const [fechaFin, setFechaFin] = useState<string | null>(
    rangoInicialCalculado.fechaFin
  );

  const [conductor, setConductor] = useState<DatosConductorState>({
    nombreCompleto: usuarioActual?.nombre ?? '',
    correo: usuarioActual?.correo ?? '',
    telefono: usuarioActual?.telefono ?? '',
    tipoDocumento:
      usuarioActual?.tipoDocumento === 'CE' || usuarioActual?.tipoDocumento === 'PASAPORTE'
        ? usuarioActual.tipoDocumento
        : 'CC',
    numeroDocumento: usuarioActual?.numeroDocumento ?? '',
    categoriaLicencia: vehiculo.categoria === 'MOTO' ? 'A2' : 'B1',
    modalidadEntrega: 'PATIO_PRINCIPAL',
  });

  const [aceptaLey1581, setAceptaLey1581] = useState(false);
  const [aceptaInspeccionR2, setAceptaInspeccionR2] = useState(false);

  const [modalidadPago, setModalidadPago] = useState<'ABONO_30' | 'TOTAL_100'>('ABONO_30');
  const [metodoAbono, setMetodoAbono] = useState<'TRANSFERENCIA_PSE' | 'NEQUI_BREB' | 'CAJA_PATIO'>(
    'TRANSFERENCIA_PSE'
  );
  const [referenciaComprobante, setReferenciaComprobante] = useState('');
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [enviandoReserva, setEnviandoReserva] = useState(false);
  const [solicitudRadicada, setSolicitudRadicada] = useState<{
    codigo: string;
    creadaEn: string;
    montoReportado: number;
    tokenAccesoPublico?: string | null | undefined;
  } | null>(null);

  const bottomBarRef = useRef<HTMLDivElement>(null);
  const [bottomBarHeightPx, setBottomBarHeightPx] = useState<number>(0);

  useEffect(() => {
    const el = bottomBarRef.current;
    if (!el || typeof window === 'undefined') return;

    const updateHeight = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      setBottomBarHeightPx(h);
    };

    updateHeight();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [paso, solicitudRadicada]);

  const cotizacion = useMemo(() => {
    const inicio = fechaInicio ?? hoyISO;
    const fin = fechaFin ?? inicio;
    return calcularCotizacionAlquiler(vehiculo, inicio, fin);
  }, [vehiculo, fechaInicio, fechaFin, hoyISO]);

  const urlLoginRetorno = useMemo(() => {
    const params = new URLSearchParams();
    if (fechaInicio) params.set('desde', fechaInicio);
    if (fechaFin) params.set('hasta', fechaFin);
    params.set('step', '2');
    const destino = `/alquilar/${vehiculo.id}?${params.toString()}`;
    return `/login?redirect=${encodeURIComponent(destino)}`;
  }, [vehiculo.id, fechaInicio, fechaFin]);

  const manejarCambioRango = (inicio: string | null, fin: string | null) => {
    setErrorValidacion(null);
    setFechaInicio(inicio);
    setFechaFin(fin);
  };

  const avanzarPaso = async () => {
    setErrorValidacion(null);

    if (paso === 1) {
      if (estadoDocumental?.tieneVencidos) {
        setErrorValidacion(
          'Esta unidad se encuentra temporalmente en actualización de documentos legales (SOAT / Tecnomecánica). No es posible avanzar con la reserva.'
        );
        return;
      }
      if (!fechaInicio) {
        setErrorValidacion('Selecciona al menos un día disponible en el calendario.');
        return;
      }
      const finEfectivo = fechaFin ?? fechaInicio;
      if (!esRangoDisponibleValido(vehiculo.id, fechaInicio, finEfectivo, hoyISO, bloques)) {
        setErrorValidacion(
          'El rango seleccionado incluye días que ya se encuentran reservados o en taller. Por favor elige fechas disponibles.'
        );
        return;
      }
      if (!fechaFin) {
        setFechaFin(fechaInicio);
      }
      setPaso(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (paso === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!conductor.nombreCompleto.trim()) {
        setErrorValidacion('Por favor ingresa tu nombre completo.');
        return;
      }
      if (!conductor.telefono.trim()) {
        setErrorValidacion('Por favor ingresa tu número de WhatsApp o celular de contacto.');
        return;
      }
      if (!conductor.correo.trim() || !emailRegex.test(conductor.correo.trim())) {
        setErrorValidacion('Ingresa un correo electrónico de contacto válido.');
        return;
      }
      setPaso(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (paso === 3) {
      setPaso(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  };

  const confirmarSolicitudAlquiler = async () => {
    if (enviandoReserva) return;
    if (!aceptaLey1581 || !aceptaInspeccionR2) {
      setErrorValidacion(
        'Debes autorizar el tratamiento de datos (Ley 1581) y el protocolo de inspección pericial para confirmar.'
      );
      return;
    }

    const montoReportado =
      modalidadPago === 'ABONO_30'
        ? cotizacion.abonoMinimoReserva
        : cotizacion.totalAlquiler;

    setErrorValidacion(null);
    setEnviandoReserva(true);

    try {
      const { data, error } = await actions.reservas.crearReserva({
        vehiculoId: vehiculo.id,
        fechaInicio: cotizacion.fechaInicio,
        fechaFin: cotizacion.fechaFin,
        diasAlquiler: cotizacion.diasAlquiler,
        precioDiaCotizado: vehiculo.precioDia,
        subtotalTarifaCotizado: cotizacion.subtotalTarifa,
        coberturaPericialCotizada: cotizacion.coberturaPericial,
        totalCotizado: cotizacion.totalAlquiler,
        modalidadEntrega: conductor.modalidadEntrega,
        direccionEntrega:
          conductor.modalidadEntrega === 'DOMICILIO_MEDELLIN'
            ? 'Dirección coordinada para Medellín / Valle de Aburrá'
            : undefined,
        sedeNombre: sedeNombre || 'Patio Norte Medellín',
        localId: localId || undefined,
        modalidadPagoInicial: modalidadPago,
        metodoAbonoInicial: metodoAbono,
        montoAbonoReportado: montoReportado,
        referenciaAbonoInicial: referenciaComprobante.trim() || undefined,
        contactoNombre: conductor.nombreCompleto.trim(),
        contactoTipoDocumento: conductor.tipoDocumento || undefined,
        contactoNumeroDocumento: conductor.numeroDocumento?.trim() || undefined,
        contactoCategoriaLicencia: conductor.categoriaLicencia || undefined,
        contactoTelefono: conductor.telefono.trim(),
        contactoCorreo: conductor.correo.trim(),
        ley1581Aceptada: aceptaLey1581,
        origen: 'CLIENTE_WEB',
      });

      if (error || !data?.ok) {
        const mensajeError =
          error?.message || 'No fue posible radicar la reserva. Intenta de nuevo.';
        setErrorValidacion(mensajeError);

        // Si el servidor detectó conflicto de fechas, refrescar disponibilidad y regresar al Paso 1
        if (error?.code === 'CONFLICT') {
          try {
            const resp = await actions.flota.consultarDisponibilidad({
              vehiculoId: vehiculo.id,
            });
            if (resp.data?.ok && resp.data.bloques) {
              setBloques(resp.data.bloques);
            }
          } catch {
            // Silencioso
          }
          setPaso(1);
        }
        return;
      }

      setSolicitudRadicada({
        codigo: data.codigo,
        creadaEn: data.reserva.creadaEn,
        montoReportado,
        tokenAccesoPublico: data.tokenAccesoPublico,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorValidacion(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al procesar tu solicitud.'
      );
    } finally {
      setEnviandoReserva(false);
    }
  };

  const retrocederPaso = () => {
    setErrorValidacion(null);
    if (paso > 1) {
      setPaso((prev) => (prev - 1) as PasoWizard);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Vista final: Solicitud enviada (Estado: PENDIENTE)
  if (solicitudRadicada) {
    return (
      <div className="space-y-5 animate-zoom-in pb-10">
        <div className="rounded-[32px] bg-white border border-[#9CA3AF]/45 p-6 sm:p-8 text-center shadow-sm dark:bg-[#1F2937] dark:border-white/12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#111827] text-white shadow-fab dark:bg-[#EDEDED] dark:text-[#111827]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-8 w-8"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#EDEDED] border border-[#9CA3AF]/50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#111827] dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED]">
            <span className="h-2 w-2 rounded-full bg-[#1F2937] dark:bg-[#EDEDED]" />
            Estado: Pendiente de verificación
          </span>

          <h2 className="mt-3 font-display text-2xl sm:text-3xl font-black tracking-tight text-[#111827] dark:text-[#EDEDED]">
            Solicitud enviada
          </h2>
          <p className="mt-1.5 text-sm text-[#4B5563] dark:text-[#D1D5DB] max-w-md mx-auto">
            Radicado{' '}
            <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED]">
              {solicitudRadicada.codigo}
            </span>
            . Un asesor de patio validará tu licencia y confirmará el bloqueo definitivo de la unidad.
          </p>

          <div className="mt-6 rounded-[24px] bg-[#EDEDED] border border-[#9CA3AF]/45 p-4 text-left space-y-2.5 dark:bg-[#111827] dark:border-white/12">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#4B5563] dark:text-[#D1D5DB]">Vehículo</span>
              <span className="font-bold text-[#111827] dark:text-[#EDEDED] text-right">
                {vehiculo.marca} {vehiculo.modelo} ({vehiculo.placa})
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#4B5563] dark:text-[#D1D5DB]">Franja reservada</span>
              <span className="font-bold text-[#111827] dark:text-[#EDEDED] text-right">
                {formatearFechaCorta(cotizacion.fechaInicio)} →{' '}
                {formatearFechaCorta(cotizacion.fechaFin)} ({cotizacion.diasAlquiler} días)
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#4B5563] dark:text-[#D1D5DB]">Abono reportado</span>
              <span className="font-display font-bold text-[#111827] dark:text-white tabular-nums">
                {formatCop(solicitudRadicada.montoReportado)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs border-t border-[#9CA3AF]/35 pt-2 dark:border-white/12">
              <span className="text-[#4B5563] dark:text-[#D1D5DB]">Siguiente paso en patio</span>
              <span className="font-semibold text-[#111827] dark:text-[#EDEDED] text-right">
                Acta de entrega e inspección R2
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {solicitudRadicada.tokenAccesoPublico ? (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/reservas/${solicitudRadicada.codigo}?token=${encodeURIComponent(
                      solicitudRadicada.tokenAccesoPublico!
                    )}`
                  )
                }
                className="fx-press flex-1 min-h-[48px] inline-flex items-center justify-center rounded-full bg-[#111827] px-6 py-3 text-sm font-bold text-white shadow-fab cursor-pointer hover:bg-[#1F2937] dark:bg-[#EDEDED] dark:text-[#111827] dark:hover:bg-white"
              >
                Ver mi reserva
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/reservas')}
                className="fx-press flex-1 min-h-[48px] inline-flex items-center justify-center rounded-full bg-[#111827] px-6 py-3 text-sm font-bold text-white shadow-fab cursor-pointer hover:bg-[#1F2937] dark:bg-[#EDEDED] dark:text-[#111827] dark:hover:bg-white"
              >
                Ver estado en Mis Reservas
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/catalogo')}
              className="fx-press min-h-[48px] inline-flex items-center justify-center rounded-full bg-[#EDEDED] border border-[#9CA3AF]/60 px-6 py-3 text-sm font-bold text-[#111827] cursor-pointer hover:bg-[#9CA3AF]/20 dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED] dark:hover:bg-white/10"
            >
              Volver al catálogo
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pasoMetaActual = PASOS_META.find((p) => p.numero === paso) ?? PASOS_META[0]!;
  const montoPasoFinal =
    modalidadPago === 'ABONO_30'
      ? cotizacion.abonoMinimoReserva
      : cotizacion.totalAlquiler;

  const autorizacionPendienteTexto = !aceptaLey1581 && !aceptaInspeccionR2
    ? 'Pendiente: acepta la Ley 1581 y el protocolo de inspección R2 para habilitar.'
    : !aceptaLey1581
    ? 'Pendiente: acepta la autorización de datos (Ley 1581) para habilitar.'
    : !aceptaInspeccionR2
    ? 'Pendiente: acepta el protocolo de patio e inspección R2 para habilitar.'
    : undefined;

  return (
    <div
      style={
        bottomBarHeightPx > 0
          ? { paddingBottom: `${bottomBarHeightPx + 20}px` }
          : undefined
      }
      className={`flex flex-1 flex-col gap-3 ${
        bottomBarHeightPx > 0
          ? ''
          : paso === 4
          ? 'pb-72 sm:pb-64'
          : 'pb-28'
      }`}
    >
      <div className="space-y-3">
        {/* Cabecera Compacta: Botón Volver + Píldoras de Paso */}
        <header className="flex items-center justify-between gap-2">
          <a
            href={paso === 1 ? `/vehiculos/${vehiculo.id}` : undefined}
            onClick={(e) => {
              if (paso > 1) {
                e.preventDefault();
                retrocederPaso();
              }
            }}
            aria-label={paso === 1 ? 'Volver a la ficha del vehículo' : 'Paso anterior'}
            className="fx-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-[#9CA3AF]/45 text-[#111827] shadow-2xs cursor-pointer dark:bg-[#1F2937] dark:border-white/15 dark:text-[#EDEDED]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="h-4 w-4"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </a>

          {/* Píldoras Segmentadas de Pasos */}
          <nav
            aria-label="Pasos del alquiler"
            className="flex flex-1 items-center justify-end gap-1.5 overflow-x-auto no-scrollbar"
          >
            {PASOS_META.map((item) => {
              const activo = item.numero === paso;
              const completado = item.numero < paso;
              return (
                <button
                  key={item.numero}
                  type="button"
                  onClick={() => {
                    if (item.numero < paso) {
                      setErrorValidacion(null);
                      setPaso(item.numero);
                    }
                  }}
                  disabled={item.numero > paso}
                  className={`fx-press shrink-0 min-h-[36px] rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    activo
                      ? 'bg-[#111827] text-white shadow-xs dark:bg-[#EDEDED] dark:text-[#111827]'
                      : completado
                      ? 'bg-white text-[#111827] border border-[#9CA3AF]/45 cursor-pointer dark:bg-[#1F2937] dark:text-[#EDEDED] dark:border-white/15'
                      : 'bg-white/70 text-[#4B5563] border border-[#9CA3AF]/30 opacity-70 cursor-default dark:bg-[#1F2937]/60 dark:text-[#9CA3AF] dark:border-white/10'
                  }`}
                >
                  {completado ? `✓ ${item.titulo}` : item.titulo}
                </button>
              );
            })}
          </nav>
        </header>

        {/* PASO 1: Presentación Protagonista del Vehículo + Calendario de Disponibilidad */}
        {paso === 1 && (
          <div className="animate-fade-up space-y-3.5">
            <RentalVehicleHero vehiculo={vehiculo} />

            {estadoDocumental?.tieneVencidos && (
              <div className="rounded-[20px] bg-[#111827] border border-[#9CA3AF]/40 p-4 text-white space-y-1.5 dark:bg-[#1F2937] dark:border-status-warning/50">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[#EDEDED] px-2.5 py-0.5 text-[11px] font-bold text-[#111827]">
                    En actualización de documentos
                  </span>
                </div>
                <p className="text-xs text-[#EDEDED]/90 leading-relaxed">
                  Esta unidad se encuentra temporalmente en trámite de actualización de documentos legales (SOAT / Tecnomecánica). Las fechas no están disponibles para reserva en línea en este momento.
                </p>
              </div>
            )}

            <EditorialAvailabilityCalendar
              vehiculo={vehiculo}
              hoyISO={hoyISO}
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              onChangeRango={manejarCambioRango}
              bloquesPrecalculados={bloques}
            />
          </div>
        )}

      {/* PASO 2: Bifurcación de Sesión + Datos de Conductor (Cédula y Licencia) */}
      {paso === 2 && (
        <section className="space-y-3.5 animate-fade-up">
          <RentalVehicleHero vehiculo={vehiculo} compact />

          {/* Estado de sesión actual */}
          {!usuarioActual ? (
            <div className="rounded-[24px] bg-white border border-[#9CA3AF]/45 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs dark:bg-[#1F2937] dark:border-white/12">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
                  ¿Ya tienes cuenta en FlotaX?
                </span>
                <p className="mt-0.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                  Inicia sesión con código OTP o Google para autocompletar tus datos sin perder las fechas elegidas ({formatearFechaCorta(cotizacion.fechaInicio)} → {formatearFechaCorta(cotizacion.fechaFin)}).
                </p>
              </div>
              <a
                href={urlLoginRetorno}
                className="fx-press shrink-0 min-h-[44px] inline-flex items-center justify-center rounded-full bg-[#111827] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1F2937] dark:bg-[#EDEDED] dark:text-[#111827] dark:hover:bg-white"
              >
                Iniciar sesión
              </a>
            </div>
          ) : (
            <div className="rounded-[24px] bg-white border border-[#9CA3AF]/45 p-4 flex items-center justify-between gap-3 shadow-xs dark:bg-[#1F2937] dark:border-white/12">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
                  Sesión verificada
                </span>
                <p className="text-sm font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                  {usuarioActual.nombre} · {usuarioActual.correo}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#EDEDED] border border-[#9CA3AF]/40 px-3 py-1 text-[11px] font-bold text-[#111827] dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED]">
                Activa
              </span>
            </div>
          )}

          {/* Formulario de Credenciales de Conducción (16px WebKit Shield) */}
          <div className="rounded-[28px] bg-white border border-[#9CA3AF]/45 p-5 space-y-4 shadow-xs dark:bg-[#1F2937] dark:border-white/12">
            <div>
              <h2 className="font-display text-xl font-black tracking-tight text-[#111827] dark:text-[#EDEDED]">
                Datos de contacto y conductor
              </h2>
              <p className="mt-0.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                Datos para radicar tu solicitud y preparar la reserva en patio.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="conductor-nombre"
                  className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
                >
                  Nombre completo del titular <span className="text-[#111827] dark:text-[#EDEDED]">*</span>
                </label>
                <input
                  id="conductor-nombre"
                  type="text"
                  required
                  value={conductor.nombreCompleto}
                  onChange={(e) =>
                    setConductor((prev) => ({ ...prev, nombreCompleto: e.target.value }))
                  }
                  placeholder="Ej. Santiago Restrepo"
                  className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus-visible:ring-2 focus-visible:ring-[#111827] dark:bg-[#111827] dark:border-white/20 dark:text-[#EDEDED] dark:placeholder:text-[#9CA3AF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="conductor-correo"
                    className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
                  >
                    Correo electrónico <span className="text-[#111827] dark:text-[#EDEDED]">*</span>
                  </label>
                  <input
                    id="conductor-correo"
                    type="email"
                    required
                    value={conductor.correo}
                    onChange={(e) =>
                      setConductor((prev) => ({ ...prev, correo: e.target.value }))
                    }
                    placeholder="Ej. santiago@ejemplo.com"
                    className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus-visible:ring-2 focus-visible:ring-[#111827] dark:bg-[#111827] dark:border-white/20 dark:text-[#EDEDED] dark:placeholder:text-[#9CA3AF]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="conductor-telefono"
                    className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
                  >
                    WhatsApp / Celular <span className="text-[#111827] dark:text-[#EDEDED]">*</span>
                  </label>
                  <input
                    id="conductor-telefono"
                    type="tel"
                    required
                    value={conductor.telefono}
                    onChange={(e) =>
                      setConductor((prev) => ({ ...prev, telefono: e.target.value }))
                    }
                    placeholder="Ej. 300 456 7890"
                    className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus-visible:ring-2 focus-visible:ring-[#111827] dark:bg-[#111827] dark:border-white/20 dark:text-[#EDEDED] dark:placeholder:text-[#9CA3AF]"
                  />
                </div>
              </div>

              <div className="rounded-[16px] bg-[#EDEDED] border border-[#9CA3AF]/40 p-3.5 text-xs text-[#4B5563] dark:bg-[#111827] dark:border-white/12 dark:text-[#D1D5DB]">
                <p className="font-semibold text-[#111827] dark:text-[#EDEDED] mb-1">
                  Documento y licencia opcionales en este paso
                </p>
                <p>
                  Si aún no tienes tu documento de identidad o licencia a mano, puedes enviar tu solicitud igual; el equipo de patio revisará tu documentación física antes de confirmar o entregar el vehículo.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="conductor-tipo-doc"
                    className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
                  >
                    Tipo doc. (Opcional)
                  </label>
                  <select
                    id="conductor-tipo-doc"
                    value={conductor.tipoDocumento}
                    onChange={(e) =>
                      setConductor((prev) => ({
                        ...prev,
                        tipoDocumento: e.target.value as DatosConductorState['tipoDocumento'],
                      }))
                    }
                    className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3 py-2.5 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827] dark:bg-[#111827] dark:border-white/20 dark:text-[#EDEDED]"
                  >
                    <option value="">Sin especificar aún</option>
                    <option value="CC">Cédula (CC)</option>
                    <option value="CE">Cédula Extranjería (CE)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="conductor-num-doc"
                    className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
                  >
                    Número de documento (Opcional)
                  </label>
                  <input
                    id="conductor-num-doc"
                    type="text"
                    inputMode="numeric"
                    value={conductor.numeroDocumento}
                    onChange={(e) =>
                      setConductor((prev) => ({ ...prev, numeroDocumento: e.target.value }))
                    }
                    placeholder="Ej. 1037645890"
                    className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus-visible:ring-2 focus-visible:ring-[#111827] dark:bg-[#111827] dark:border-white/20 dark:text-[#EDEDED] dark:placeholder:text-[#9CA3AF]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="conductor-licencia"
                  className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
                >
                  Categoría de licencia (Opcional)
                </label>
                <select
                  id="conductor-licencia"
                  value={conductor.categoriaLicencia}
                  onChange={(e) =>
                    setConductor((prev) => ({
                      ...prev,
                      categoriaLicencia: e.target
                        .value as DatosConductorState['categoriaLicencia'],
                    }))
                  }
                  className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3 py-2.5 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827] dark:bg-[#111827] dark:border-white/20 dark:text-[#EDEDED]"
                >
                  <option value="">Sin especificar aún</option>
                  <option value="B1">Categoría B1 (Automóviles / SUV)</option>
                  <option value="B2">Categoría B2 / C1 (Servicio Público)</option>
                  <option value="A2">Categoría A2 (Motocicletas)</option>
                </select>
              </div>

              <div>
                <span className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5">
                  Punto de entrega y peritaje inicial
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      setConductor((prev) => ({
                        ...prev,
                        modalidadEntrega: 'PATIO_PRINCIPAL',
                      }))
                    }
                    className={`fx-press min-h-[48px] rounded-[14px] p-3 text-left border transition-colors cursor-pointer ${
                      conductor.modalidadEntrega === 'PATIO_PRINCIPAL'
                        ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                        : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15'
                    }`}
                  >
                    <p className="text-xs font-bold">Retiro en Patio Principal</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        conductor.modalidadEntrega === 'PATIO_PRINCIPAL'
                          ? 'text-[#EDEDED] dark:text-[#4B5563]'
                          : 'text-[#4B5563] dark:text-[#D1D5DB]'
                      }`}
                    >
                      Sin recargo · Inspección inmediata
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setConductor((prev) => ({
                        ...prev,
                        modalidadEntrega: 'DOMICILIO_MEDELLIN',
                      }))
                    }
                    className={`fx-press min-h-[48px] rounded-[14px] p-3 text-left border transition-colors cursor-pointer ${
                      conductor.modalidadEntrega === 'DOMICILIO_MEDELLIN'
                        ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                        : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15'
                    }`}
                  >
                    <p className="text-xs font-bold">Entrega en tu ubicación</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        conductor.modalidadEntrega === 'DOMICILIO_MEDELLIN'
                          ? 'text-[#EDEDED] dark:text-[#4B5563]'
                          : 'text-[#4B5563] dark:text-[#D1D5DB]'
                      }`}
                    >
                      Coordinado con asesor de flota
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PASO 3: Resumen Estructurado en Tarjetas (Itinerario, Conductor y Liquidación) */}
      {paso === 3 && (
        <section className="space-y-3.5 animate-fade-up">
          <RentalVehicleHero vehiculo={vehiculo} compact />

          {/* Tarjeta 1: Itinerario de Recogida y Devolución */}
          <div className="rounded-[28px] bg-white border border-[#9CA3AF]/45 p-5 space-y-3.5 shadow-xs dark:bg-[#1F2937] dark:border-white/12">
            <div className="flex items-center justify-between border-b border-[#9CA3AF]/25 pb-3 dark:border-white/10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
                  Itinerario del alquiler
                </span>
                <h2 className="font-display text-lg font-black tracking-tight text-[#111827] dark:text-[#EDEDED]">
                  Recogida y devolución
                </h2>
              </div>
              <span className="rounded-full bg-[#EDEDED] border border-[#9CA3AF]/45 px-3 py-1 text-xs font-bold text-[#111827] dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED]">
                {cotizacion.diasAlquiler} {cotizacion.diasAlquiler === 1 ? 'día' : 'días'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-[18px] bg-[#EDEDED] p-3 border border-[#9CA3AF]/40 dark:bg-[#111827] dark:border-white/12">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
                  Recogida
                </span>
                <p className="mt-0.5 font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                  {formatearFechaCorta(cotizacion.fechaInicio)}
                </p>
                <span className="font-mono text-[11px] font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
                  09:00 · {conductor.modalidadEntrega === 'PATIO_PRINCIPAL' ? (sedeNombre || 'Patio Principal') : 'Domicilio'}
                </span>
              </div>

              <div className="rounded-[18px] bg-[#EDEDED] p-3 border border-[#9CA3AF]/40 dark:bg-[#111827] dark:border-white/12">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
                  Devolución
                </span>
                <p className="mt-0.5 font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                  {formatearFechaCorta(cotizacion.fechaFin)}
                </p>
                <span className="font-mono text-[11px] font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
                  18:00 · Acta de cierre
                </span>
              </div>
            </div>

            <div className="rounded-[16px] bg-[#EDEDED] px-3.5 py-2.5 border border-[#9CA3AF]/40 flex items-center justify-between gap-2 text-xs dark:bg-[#111827] dark:border-white/12">
              <div className="min-w-0">
                <span className="text-[#4B5563] dark:text-[#D1D5DB]">Titular: </span>
                <span className="font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                  {conductor.nombreCompleto}
                </span>
              </div>
              <span className="font-mono text-[11px] font-semibold text-[#4B5563] dark:text-[#D1D5DB] shrink-0">
                {conductor.telefono}
              </span>
            </div>
          </div>

          {/* Tarjeta 2: Liquidación Transparente */}
          <div className="rounded-[28px] bg-white border border-[#9CA3AF]/45 p-5 space-y-3.5 shadow-xs dark:bg-[#1F2937] dark:border-white/12">
            <div className="border-b border-[#9CA3AF]/25 pb-3 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
                Liquidación transparente
              </span>
              <h2 className="font-display text-lg font-black tracking-tight text-[#111827] dark:text-[#EDEDED]">
                Desglose económico
              </h2>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#4B5563] dark:text-[#D1D5DB]">
                  Tarifa ({cotizacion.diasAlquiler}d × {formatCop(cotizacion.precioDia)})
                </span>
                <span className="font-semibold text-[#111827] dark:text-[#EDEDED] tabular-nums shrink-0">
                  {formatCop(cotizacion.subtotalTarifa)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[#4B5563] dark:text-[#D1D5DB]">
                  Cobertura básica y peritaje R2
                </span>
                <span className="font-semibold text-[#111827] dark:text-[#EDEDED] tabular-nums shrink-0">
                  {formatCop(cotizacion.coberturaPericial)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-[#9CA3AF]/30 pt-2.5 dark:border-white/12">
                <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                  Total del contrato
                </span>
                <span className="font-display text-lg font-black text-[#111827] dark:text-white tabular-nums">
                  {formatCop(cotizacion.totalAlquiler)}
                </span>
              </div>

              <div className="rounded-[16px] bg-[#EDEDED] p-3 flex items-center justify-between gap-3 text-xs border border-[#9CA3AF]/40 dark:bg-[#111827] dark:border-white/12">
                <div>
                  <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                    Depósito en garantía (reembolsable)
                  </span>
                  <p className="text-[11px] text-[#4B5563] dark:text-[#D1D5DB]">
                    Se libera al cerrar el acta de devolución sin novedades
                  </p>
                </div>
                <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums shrink-0">
                  {formatCop(cotizacion.depositoGarantia)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PASO 4: Abono, Autorizaciones Obligatorias y Confirmación por Deslizamiento */}
      {paso === 4 && (
        <section className="space-y-3.5 animate-fade-up">
          <RentalVehicleHero vehiculo={vehiculo} compact />

          <div className="rounded-[28px] bg-white border border-[#9CA3AF]/45 p-5 space-y-4 shadow-xs dark:bg-[#1F2937] dark:border-white/12">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
                Paso final · Confirmación
              </span>
              <h2 className="font-display text-xl font-black tracking-tight text-[#111827] dark:text-[#EDEDED]">
                Pagar o reportar abono
              </h2>
              <p className="mt-0.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                Para bloquear del {formatearFechaCorta(cotizacion.fechaInicio)} al{' '}
                {formatearFechaCorta(cotizacion.fechaFin)}, elige el monto y confirma las autorizaciones.
              </p>
            </div>

            {/* Selección de porcentaje de abono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModalidadPago('ABONO_30')}
                className={`fx-press min-h-[68px] rounded-[20px] p-4 text-left border transition-colors cursor-pointer ${
                  modalidadPago === 'ABONO_30'
                    ? 'bg-[#111827] text-white border-[#111827] shadow-xs dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                    : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">
                  Abono inicial (30%)
                </span>
                <p className="mt-1 font-display text-xl font-black tabular-nums">
                  {formatCop(cotizacion.abonoMinimoReserva)}
                </p>
                <span className="text-[11px] opacity-85">
                  Saldo restante al retirar en patio
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModalidadPago('TOTAL_100')}
                className={`fx-press min-h-[68px] rounded-[20px] p-4 text-left border transition-colors cursor-pointer ${
                  modalidadPago === 'TOTAL_100'
                    ? 'bg-[#111827] text-white border-[#111827] shadow-xs dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                    : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">
                  Pago completo (100%)
                </span>
                <p className="mt-1 font-display text-xl font-black tabular-nums">
                  {formatCop(cotizacion.totalAlquiler)}
                </p>
                <span className="text-[11px] opacity-85">
                  Check-in expreso en patio
                </span>
              </button>
            </div>

            {/* Canal de pago / reporte */}
            <div>
              <span className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-2">
                Medio de pago o transferencia
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'TRANSFERENCIA_PSE', label: 'PSE / Banco' },
                  { id: 'NEQUI_BREB', label: 'Llave Bre-B / Nequi' },
                  { id: 'CAJA_PATIO', label: 'Caja en Patio' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setMetodoAbono(item.id as typeof metodoAbono)
                    }
                    className={`fx-press min-h-[44px] rounded-[12px] px-2.5 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                      metodoAbono === item.id
                        ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                        : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="comprobante-ref"
                className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
              >
                Número de comprobante o nota para el asesor (opcional)
              </label>
              <input
                id="comprobante-ref"
                type="text"
                value={referenciaComprobante}
                onChange={(e) => setReferenciaComprobante(e.target.value)}
                placeholder="Ej. Comprobante #948201 o llego a las 10:00 AM"
                className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus-visible:ring-2 focus-visible:ring-[#111827] dark:bg-[#111827] dark:border-white/20 dark:text-[#EDEDED] dark:placeholder:text-[#9CA3AF]"
              />
            </div>

            {/* Consentimientos Legales Obligatorios (conectados en vivo al control deslizante) */}
            <div className="space-y-2.5 border-t border-[#9CA3AF]/30 pt-4 dark:border-white/12">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
                  Autorizaciones obligatorias
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    aceptaLey1581 && aceptaInspeccionR2
                      ? 'bg-[#111827] text-white dark:bg-[#EDEDED] dark:text-[#111827]'
                      : 'bg-[#EDEDED] text-[#4B5563] border border-[#9CA3AF]/45 dark:bg-[#111827] dark:text-[#D1D5DB] dark:border-white/15'
                  }`}
                >
                  {aceptaLey1581 && aceptaInspeccionR2 ? 'Completas' : 'Requeridas'}
                </span>
              </div>

              <label className="flex items-start gap-3 rounded-[16px] bg-[#EDEDED] p-3.5 border border-[#9CA3AF]/50 cursor-pointer dark:bg-[#111827] dark:border-white/15">
                <input
                  type="checkbox"
                  checked={aceptaLey1581}
                  onChange={(e) => {
                    setErrorValidacion(null);
                    setAceptaLey1581(e.target.checked);
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#111827] dark:accent-[#EDEDED]"
                />
                <span className="text-xs text-[#111827] dark:text-[#EDEDED] leading-relaxed">
                  <strong>Autorización de Datos (Ley 1581 de 2012):</strong> Autorizo el tratamiento de mis datos personales y la verificación de mi licencia de conducción para la formalización del contrato de alquiler.
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-[16px] bg-[#EDEDED] p-3.5 border border-[#9CA3AF]/50 cursor-pointer dark:bg-[#111827] dark:border-white/15">
                <input
                  type="checkbox"
                  checked={aceptaInspeccionR2}
                  onChange={(e) => {
                    setErrorValidacion(null);
                    setAceptaInspeccionR2(e.target.checked);
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#111827] dark:accent-[#EDEDED]"
                />
                <span className="text-xs text-[#111827] dark:text-[#EDEDED] leading-relaxed">
                  <strong>Protocolo de Patio e Inspección:</strong> Acepto que la entrega del vehículo incluye registro fotográfico de estado, combustible y kilometraje antes de salir de patio.
                </span>
              </label>
            </div>
          </div>
        </section>
      )}

        {/* Mensaje de error de validación */}
        {errorValidacion && (
          <div
            role="alert"
            className="rounded-[18px] bg-[#111827] text-white px-4 py-3 text-xs font-semibold flex items-center justify-between gap-3 shadow-md animate-fade-in dark:bg-[#1F2937] dark:border dark:border-[#DC2626]/70"
          >
            <span>{errorValidacion}</span>
            <button
              type="button"
              onClick={() => setErrorValidacion(null)}
              aria-label="Cerrar mensaje de error"
              className="text-[#D1D5DB] hover:text-white font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Barra Inferior Fija con Resumen Económico Dinámico y Acción Principal / Control Deslizante */}
      <div ref={bottomBarRef} className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <div className="mx-auto w-full max-w-md sm:max-w-xl px-3.5 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto rounded-[24px] bg-white/95 backdrop-blur-xl border border-[#9CA3AF]/50 px-4 py-3 shadow-[0_14px_34px_-8px_rgba(17,24,39,0.22)] space-y-2.5 dark:bg-[#1F2937]/95 dark:border-white/15">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB] truncate">
                  {paso === 4
                    ? modalidadPago === 'ABONO_30'
                      ? 'Abono inicial (30%)'
                      : 'Pago completo (100%)'
                    : `Paso ${paso} de 4 · ${pasoMetaActual.subtitulo}`}
                </span>
                <p className="font-display text-lg sm:text-xl font-black text-[#111827] dark:text-white tabular-nums truncate">
                  {formatCop(paso === 4 ? montoPasoFinal : cotizacion.totalAlquiler)}
                  <span className="ml-1.5 text-xs font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
                    {paso === 4
                      ? `de ${formatCop(cotizacion.totalAlquiler)}`
                      : `(${cotizacion.diasAlquiler} ${cotizacion.diasAlquiler === 1 ? 'día' : 'días'})`}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {paso > 1 && (
                  <button
                    type="button"
                    onClick={retrocederPaso}
                    disabled={enviandoReserva}
                    aria-label="Volver al paso anterior"
                    className="fx-press flex h-11 w-11 items-center justify-center rounded-full bg-[#EDEDED] border border-[#9CA3AF]/60 text-[#111827] font-bold cursor-pointer disabled:opacity-45 dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      className="h-5 w-5"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                )}

                {paso < 4 &&
                  (() => {
                    const estaBloqueadoPorDocs = Boolean(
                      paso === 1 && estadoDocumental?.tieneVencidos
                    );
                    return (
                      <button
                        type="button"
                        disabled={estaBloqueadoPorDocs}
                        onClick={avanzarPaso}
                        className={`fx-press min-h-[46px] rounded-full px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold shadow-fab inline-flex items-center gap-2 ${
                          estaBloqueadoPorDocs
                            ? 'bg-[#4B5563] text-[#EDEDED] opacity-60 cursor-not-allowed'
                            : 'bg-[#111827] hover:bg-[#1F2937] text-white cursor-pointer dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#111827]'
                        }`}
                      >
                        <span>
                          {paso === 1 &&
                            (estaBloqueadoPorDocs
                              ? 'En actualización de documentos'
                              : 'Confirmar fechas')}
                          {paso === 2 && 'Ver resumen'}
                          {paso === 3 && 'Ir a confirmar'}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          className="h-4 w-4"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                    );
                  })()}
              </div>
            </div>

            {paso === 4 && (
              <SlideToConfirmControl
                compact
                disabled={!aceptaLey1581 || !aceptaInspeccionR2}
                disabledReason={autorizacionPendienteTexto}
                loading={enviandoReserva}
                error={errorValidacion}
                label="Desliza para confirmar alquiler"
                loadingLabel="Confirmando solicitud..."
                confirmedLabel="Solicitud confirmada"
                holdLabel="Mantener presionado para confirmar"
                onConfirm={confirmarSolicitudAlquiler}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
