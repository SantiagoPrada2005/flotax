import { useEffect, useMemo, useRef, useState } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import { Select } from '@/components/ui/Select';
import {
  calcularCotizacionPorFechas,
  encontrarPrimerRangoDisponible,
  esRangoDisponibleValido,
  expandirRangoAFechas,
  formatearResumenFechasSeleccionadas,
  sonFechasDisponiblesValidas,
  validarReglasRangoAlquiler,
  type BloqueNoDisponible,
  type VehiculoItem,
} from '@/lib/flota';
import type { EstadoDocumentalVehiculo } from '@/lib/flota/disponibilidad';
import {
  formatearDistanciaKm,
  PATIO_COORDENADAS_DEFECTO,
  POLITICA_DOMICILIO_DEFECTO,
  type PoliticaDomicilioLocal,
  type UbicacionPatio,
} from '@/lib/ubicacion';
import DeliveryLocationSelector, {
  type EstadoEntregaWizard,
} from './DeliveryLocationSelector';
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

export type PasoWizard = 1 | 2 | 3 | 4 | 5;

export interface RentalWizardFlowProps {
  vehiculo: VehiculoItem;
  hoyISO: string;
  bloquesIniciales?: BloqueNoDisponible[] | undefined;
  usuarioActual: UsuarioSesionCliente | null;
  fechaInicioInicial?: string | undefined;
  fechaFinInicial?: string | undefined;
  pasoInicial?: PasoWizard | undefined;
  estadoDocumental?: EstadoDocumentalVehiculo | undefined;
  esAdminOperador?: boolean | undefined;
  telefonoEncargado?: string | null | undefined;
  vehiculosSimilares?: VehiculoItem[] | undefined;
  localId?: string | undefined;
  sedeNombre?: string | undefined;
  patioUbicacion?: UbicacionPatio | undefined;
  politicaDomicilio?: PoliticaDomicilioLocal | undefined;
  mapboxPublicToken?: string | null | undefined;
}

interface DatosConductorState {
  nombreCompleto: string;
  correo: string;
  telefono: string;
  tipoDocumento: 'CC' | 'CE' | 'PASAPORTE' | '';
  numeroDocumento: string;
  categoriaLicencia: 'B1' | 'B2' | 'A2' | 'C1' | '';
}

const PASOS_META: ReadonlyArray<{ numero: PasoWizard; titulo: string; subtitulo: string }> = [
  {
    numero: 1,
    titulo: 'Fechas',
    subtitulo: 'Disponibilidad',
  },
  {
    numero: 2,
    titulo: 'Conductor',
    subtitulo: 'Datos de contacto',
  },
  {
    numero: 3,
    titulo: 'Entrega',
    subtitulo: 'Mapa y ubicación',
  },
  {
    numero: 4,
    titulo: 'Resumen',
    subtitulo: 'Itinerario y total',
  },
  {
    numero: 5,
    titulo: 'Confirmar',
    subtitulo: 'Abono y autorización',
  },
];

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const formatCop = (val: number): string => COP_FORMATTER.format(val);

function construirUrlWhatsappEncargado(
  telefono: string | null | undefined,
  vehiculo: VehiculoItem,
  resumenFechas: string
): string | null {
  if (!telefono) return null;
  const soloDigitos = telefono.replace(/\D/g, '');
  if (soloDigitos.length < 7) return null;
  const numeroWhatsapp =
    soloDigitos.length === 10 && !soloDigitos.startsWith('57')
      ? `57${soloDigitos}`
      : soloDigitos;
  const detalleFechas = resumenFechas ? ` para las fechas (${resumenFechas})` : '';
  const mensaje = `Hola, estoy interesado en alquilar el vehículo ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.placa})${detalleFechas}, pero aparece no disponible por el momento. ¿Me podrías confirmar disponibilidad o alternativas?`;
  return `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensaje)}`;
}

export default function RentalWizardFlow({
  vehiculo,
  hoyISO,
  bloquesIniciales,
  usuarioActual,
  fechaInicioInicial,
  fechaFinInicial,
  pasoInicial = 1,
  estadoDocumental,
  esAdminOperador = false,
  telefonoEncargado = null,
  vehiculosSimilares = [],
  localId,
  sedeNombre,
  patioUbicacion,
  politicaDomicilio,
  mapboxPublicToken = null,
}: RentalWizardFlowProps) {
  const patioEfectivo: UbicacionPatio = useMemo(
    () =>
      patioUbicacion ?? {
        nombre: sedeNombre || 'Patio Norte Medellín',
        direccion: 'Av. El Poblado #10-45, Sede Principal',
        ciudad: 'Medellín',
        lat: PATIO_COORDENADAS_DEFECTO.lat,
        lng: PATIO_COORDENADAS_DEFECTO.lng,
      },
    [patioUbicacion, sedeNombre]
  );

  const politicaDomicilioEfectiva: PoliticaDomicilioLocal = useMemo(
    () => politicaDomicilio ?? { ...POLITICA_DOMICILIO_DEFECTO },
    [politicaDomicilio]
  );

  const [paso, setPaso] = useState<PasoWizard>(pasoInicial);
  const [bloques, setBloques] = useState<BloqueNoDisponible[]>(bloquesIniciales ?? []);

  // Rango inicial inteligente: respeta parámetros si cumplen las reglas del calendario, o calcula la primera franja libre contigua
  const rangoInicialCalculado = useMemo(() => {
    if (
      fechaInicioInicial &&
      esRangoDisponibleValido(
        vehiculo.id,
        fechaInicioInicial,
        fechaFinInicial ?? fechaInicioInicial,
        hoyISO,
        bloques
      ) &&
      validarReglasRangoAlquiler({
        fechaInicio: fechaInicioInicial,
        fechaFin: fechaFinInicial ?? fechaInicioInicial,
      }).valido
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

  const fechasSeleccionadas = useMemo(() => {
    if (fechaInicio && fechaFin && fechaInicio <= fechaFin) {
      return expandirRangoAFechas(fechaInicio, fechaFin);
    }
    if (fechaInicio) {
      return [fechaInicio];
    }
    return [];
  }, [fechaInicio, fechaFin]);

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
  });

  // Progressive disclosure para campos opcionales en Conductor y Confirmar
  const [mostrarDocsOpcionales, setMostrarDocsOpcionales] = useState<boolean>(() =>
    Boolean(usuarioActual?.numeroDocumento?.trim())
  );
  const [mostrarNotaComprobante, setMostrarNotaComprobante] = useState<boolean>(false);

  // La modalidad inicia sin mapa cargado para no penalizar velocidad;
  // el SDK de Mapbox se monta únicamente cuando el cliente elige patio o domicilio en el Slide 3.
  const [entrega, setEntrega] = useState<EstadoEntregaWizard>({
    modalidadEntrega: null,
    direccionEntrega: '',
    entregaReferencia: '',
    latitud: null,
    longitud: null,
    distanciaKm: null,
    recargoDomicilio: 0,
    dentroCobertura: false,
    mensajeCobertura: null,
  });

  const [aceptaLey1581, setAceptaLey1581] = useState(false);

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

  const recargoDomicilioActivo =
    entrega.modalidadEntrega === 'DOMICILIO_MEDELLIN' && entrega.dentroCobertura
      ? entrega.recargoDomicilio
      : 0;

  const cotizacion = useMemo(
    () =>
      calcularCotizacionPorFechas(
        vehiculo,
        fechasSeleccionadas,
        recargoDomicilioActivo
      ),
    [vehiculo, fechasSeleccionadas, recargoDomicilioActivo]
  );

  const resumenFechasTexto = useMemo(
    () => formatearResumenFechasSeleccionadas(fechasSeleccionadas),
    [fechasSeleccionadas]
  );

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

  const validacionRango = useMemo(() => {
    if (!fechaInicio || !fechaFin) {
      return {
        valido: false,
        mensaje: fechaInicio
          ? 'Selecciona también la fecha de devolución para completar el rango.'
          : 'Selecciona las fechas de inicio y devolución en el calendario.',
      };
    }
    return validarReglasRangoAlquiler({
      fechaInicio,
      fechaFin,
      fechasSeleccionadas,
    });
  }, [fechaFin, fechaInicio, fechasSeleccionadas]);

  const vehiculoBloqueadoPorDocs = Boolean(
    estadoDocumental?.bloqueadoPorDocumentos ||
    estadoDocumental?.tieneVencidos ||
    (estadoDocumental?.faltantesSinCarga?.length ?? 0) > 0
  );

  const avanzarPaso = () => {
    setErrorValidacion(null);

    if (paso === 1) {
      if (vehiculoBloqueadoPorDocs) {
        if (esAdminOperador) {
          setErrorValidacion(
            estadoDocumental?.motivoBloqueo
              ? `Esta unidad no puede reservarse hasta regularizar sus documentos (${estadoDocumental.motivoBloqueo}).`
              : 'Esta unidad se encuentra temporalmente en actualización de documentos legales (SOAT / Tecnomecánica). No es posible avanzar con la reserva.'
          );
        } else {
          setErrorValidacion(
            'Este vehículo no está disponible por el momento. Para más información, comuníquese con el encargado.'
          );
        }
        return;
      }
      if (!fechaInicio || !fechaFin) {
        setErrorValidacion(
          fechaInicio
            ? 'Selecciona también la fecha de devolución en el calendario.'
            : 'Selecciona el rango de fechas disponibles en el calendario.'
        );
        return;
      }
      if (!validacionRango.valido) {
        setErrorValidacion(
          validacionRango.mensaje ?? 'El rango de fechas seleccionado no es válido.'
        );
        return;
      }
      if (!sonFechasDisponiblesValidas(vehiculo.id, fechasSeleccionadas, hoyISO, bloques)) {
        setErrorValidacion(
          'La selección incluye días que ya se encuentran reservados o en taller. Por favor elige fechas disponibles.'
        );
        return;
      }
      setPaso(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (paso === 2) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!conductor.nombreCompleto.trim()) {
        setErrorValidacion('Ingresa tu nombre completo.');
        return;
      }
      if (!conductor.correo.trim() || !emailRegex.test(conductor.correo.trim())) {
        setErrorValidacion('Ingresa un correo electrónico válido.');
        return;
      }
      if (!conductor.telefono.trim()) {
        setErrorValidacion('Ingresa tu número de WhatsApp o celular.');
        return;
      }
      setPaso(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (paso === 3) {
      if (!entrega.modalidadEntrega) {
        setErrorValidacion(
          'Elige Retiro en Patio Principal o Entrega en tu ubicación para continuar.'
        );
        return;
      }
      if (entrega.modalidadEntrega === 'DOMICILIO_MEDELLIN') {
        if (entrega.direccionEntrega.trim().length < 5) {
          setErrorValidacion(
            'Busca tu dirección o usa tu ubicación actual para confirmar la entrega.'
          );
          return;
        }
        if (entrega.latitud == null || entrega.longitud == null) {
          setErrorValidacion(
            'Confirma el punto en el mapa moviendo el pin o usando tu ubicación actual.'
          );
          return;
        }
        if (!entrega.dentroCobertura) {
          setErrorValidacion(
            entrega.mensajeCobertura ||
            'La dirección elegida está fuera de la zona de cobertura. Ajusta el pin o elige Retiro en Patio Principal.'
          );
          return;
        }
      }
      setPaso(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (paso === 4) {
      setPaso(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
  };

  const confirmarSolicitudAlquiler = async () => {
    if (enviandoReserva) return;
    if (!aceptaLey1581) {
      setErrorValidacion(
        'Acepta la autorización de tratamiento de datos (Ley 1581) para confirmar.'
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
      const modalidadFinal = entrega.modalidadEntrega ?? 'PATIO_PRINCIPAL';
      const esDomicilioFinal = modalidadFinal === 'DOMICILIO_MEDELLIN';

      const { data, error } = await actions.reservas.crearReserva({
        vehiculoId: vehiculo.id,
        fechaInicio: cotizacion.fechaInicio,
        fechaFin: cotizacion.fechaFin,
        fechasSeleccionadas,
        diasAlquiler: cotizacion.diasAlquiler,
        precioDiaCotizado: vehiculo.precioDia,
        subtotalTarifaCotizado: cotizacion.subtotalTarifa,
        coberturaPericialCotizada: cotizacion.coberturaPericial,
        totalCotizado: cotizacion.totalAlquiler,
        modalidadEntrega: modalidadFinal,
        direccionEntrega: esDomicilioFinal
          ? entrega.direccionEntrega.trim()
          : undefined,
        entregaLatitud:
          esDomicilioFinal && entrega.latitud != null
            ? entrega.latitud
            : undefined,
        entregaLongitud:
          esDomicilioFinal && entrega.longitud != null
            ? entrega.longitud
            : undefined,
        entregaReferencia:
          esDomicilioFinal && entrega.entregaReferencia.trim()
            ? entrega.entregaReferencia.trim()
            : undefined,
        sedeNombre: sedeNombre || patioEfectivo.nombre,
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
        <div className="rounded-[32px] bg-white border border-[#9CA3AF]/45 p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#111827] text-white shadow-fab">
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

          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#EDEDED] border border-[#9CA3AF]/50 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#111827]">
            <span className="h-2 w-2 rounded-full bg-[#1F2937]" />
            Estado: Pendiente de verificación
          </span>

          <h2 className="mt-3 font-display text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
            Solicitud enviada
          </h2>
          <p className="mt-1.5 text-sm text-[#4B5563] dark:text-[#D1D5DB] max-w-md mx-auto">
            Radicado{' '}
            <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED]">
              {solicitudRadicada.codigo}
            </span>
            . Un asesor confirmará tu reserva y coordinará la entrega.
          </p>

          <div className="mt-6 rounded-[24px] bg-[#EDEDED] border border-[#9CA3AF]/45 p-4 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#4B5563]">Vehículo</span>
              <span className="font-bold text-[#111827]">
                {vehiculo.marca} {vehiculo.modelo} ({vehiculo.placa})
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#4B5563] dark:text-[#D1D5DB]">Fechas</span>
              <span className="font-bold text-[#111827] dark:text-[#EDEDED] text-right">
                {resumenFechasTexto} ({cotizacion.diasAlquiler}d)
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[#4B5563] dark:text-[#D1D5DB]">Entrega</span>
              <span className="font-semibold text-[#111827] dark:text-[#EDEDED] text-right max-w-[65%] truncate">
                {entrega.modalidadEntrega === 'DOMICILIO_MEDELLIN'
                  ? entrega.direccionEntrega || 'Entrega a domicilio'
                  : patioEfectivo.nombre}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs border-t border-[#9CA3AF]/35 pt-2 dark:border-white/12">
              <span className="text-[#4B5563] dark:text-[#D1D5DB]">Abono reportado</span>
              <span className="font-display font-bold text-[#111827] dark:text-white tabular-nums">
                {formatCop(solicitudRadicada.montoReportado)}
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
                className="flex-1 min-h-[48px] inline-flex items-center justify-center rounded-full bg-[#111827] px-6 py-3 text-sm font-bold text-white shadow-fab cursor-pointer hover:bg-[#1F2937]"
              >
                Ver mi reserva
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/reservas')}
                className="flex-1 min-h-[48px] inline-flex items-center justify-center rounded-full bg-[#111827] px-6 py-3 text-sm font-bold text-white shadow-fab cursor-pointer hover:bg-[#1F2937]"
              >
                Ver en Mis Reservas
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/catalogo')}
              className="min-h-[48px] inline-flex items-center justify-center rounded-full bg-[#EDEDED] border border-[#9CA3AF]/60 px-6 py-3 text-sm font-bold text-[#111827] cursor-pointer hover:bg-[#9CA3AF]/20"
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

  const autorizacionPendienteTexto = !aceptaLey1581
    ? 'Acepta la autorización de datos (Ley 1581) para habilitar.'
    : undefined;

  return (
    <div
      style={
        bottomBarHeightPx > 0
          ? { paddingBottom: `${bottomBarHeightPx + 20}px` }
          : undefined
      }
      className={`flex flex-1 flex-col gap-3 ${bottomBarHeightPx > 0
        ? ''
        : paso === 5
          ? 'pb-72 sm:pb-64'
          : 'pb-28'
        }`}
    >
      <div className="space-y-3">
        {/* Cabecera limpia con botón volver y barra progresiva de 5 slides */}
        <header className="flex items-center justify-between gap-3">
          <a
            href={paso === 1 ? `/vehiculos/${vehiculo.id}` : undefined}
            onClick={(e) => {
              if (paso > 1) {
                e.preventDefault();
                retrocederPaso();
              }
            }}
            aria-label={paso === 1 ? 'Volver a la ficha del vehículo' : 'Slide anterior'}
            className="fx-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white border border-[#9CA3AF]/45 text-[#111827] shadow-2xs cursor-pointer dark:bg-[#1F2937] dark:border-white/15 dark:text-[#EDEDED]"
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

          {/* Móvil: Barra de progreso segmentada + título activo sin desborde */}
          <div className="flex flex-1 flex-col gap-1.5 sm:hidden">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-[#111827] dark:text-[#EDEDED]">
                {pasoMetaActual.titulo}
              </span>
              <span className="font-mono text-[#4B5563] tabular-nums dark:text-[#D1D5DB]">
                {paso} / 5
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5" aria-label="Progreso del alquiler">
              {PASOS_META.map((item) => {
                const activo = item.numero === paso;
                const completado = item.numero < paso;
                return (
                  <button
                    key={item.numero}
                    type="button"
                    disabled={item.numero > paso}
                    aria-label={`Ir a paso ${item.numero}: ${item.titulo}`}
                    onClick={() => {
                      if (item.numero < paso) {
                        setErrorValidacion(null);
                        setPaso(item.numero);
                      }
                    }}
                    className={`h-2 rounded-full transition-colors ${activo || completado
                      ? 'bg-[#111827] dark:bg-[#EDEDED] cursor-pointer'
                      : 'bg-[#9CA3AF]/45 dark:bg-white/15 cursor-default'
                      }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Escritorio: 5 píldoras limpias */}
          <nav
            aria-label="Pasos del alquiler"
            className="hidden sm:flex flex-1 items-center justify-end gap-1.5"
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
                  className={`fx-press shrink-0 min-h-[36px] rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${activo
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

        {/* SLIDE 1: Vehículo protagonista + Fechas */}
        {paso === 1 && (
          <div className="animate-fade-in space-y-3">
            {vehiculoBloqueadoPorDocs &&
              (esAdminOperador ? (
                <div className="rounded-[20px] bg-[#111827] border border-[#9CA3AF]/40 p-4 text-white space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#EDEDED] px-2.5 py-0.5 text-[11px] font-bold text-[#111827]">
                      Documentos pendientes
                    </span>
                    <a
                      href={`/admin/flota/${vehiculo.id}#documentos`}
                      className="fx-press inline-flex min-h-[32px] items-center rounded-full bg-[#EDEDED] px-3 py-1 text-[11px] font-bold text-[#111827] hover:bg-white"
                    >
                      Registrar documentos →
                    </a>
                  </div>
                  <p className="text-xs text-[#EDEDED]/90 leading-relaxed">
                    {estadoDocumental?.motivoBloqueo
                      ? `Esta unidad presenta documentos pendientes (${estadoDocumental.motivoBloqueo}) y no puede reservarse hasta regularizarlos.`
                      : 'Esta unidad está actualizando documentos legales (SOAT / Tecnomecánica). No es posible reservarla en este momento.'}
                  </p>
                </div>
              ) : (
                <div className="rounded-[24px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 p-4 sm:p-5 space-y-3.5 shadow-xs">
                  <div className="space-y-1.5">
                    <span className="inline-flex items-center rounded-full bg-[#111827] dark:bg-[#111827] px-3 py-0.5 text-[10px] font-bold text-[#EDEDED] dark:text-[#EDEDED]">
                      No disponible por el momento
                    </span>
                    <p className="text-xs xs:text-xs text-[#111827] dark:text-[#9CA3AF] leading-relaxed font-medium">
                      Este vehículo no está disponible por el momento. Para más información, comuníquese con el encargado.
                    </p>
                  </div>

                  {(() => {
                    const urlWhatsapp = construirUrlWhatsappEncargado(
                      telefonoEncargado,
                      vehiculo,
                      resumenFechasTexto
                    );
                    return urlWhatsapp ? (
                      <a
                        href={urlWhatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fx-press flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[#111827] dark:bg-[#EDEDED] px-2 py-2 text-xs font-bold text-[#EDEDED] dark:text-[#111827] hover:bg-[#1F2937] dark:hover:bg-white transition-colors"
                      >
                        <span>Contactar al encargado por WhatsApp</span>
                        <span aria-hidden="true">→</span>
                      </a>
                    ) : null;
                  })()}

                  {vehiculosSimilares.length > 0 && (
                    <div className="space-y-2 border-t border-[#9CA3AF]/25 dark:border-white/10 pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
                        Vehículos similares disponibles en estas fechas
                      </p>
                      <div className="space-y-2">
                        {vehiculosSimilares.map((sim) => {
                          const qs = new URLSearchParams();
                          if (fechaInicio) qs.set('desde', fechaInicio);
                          if (fechaFin) qs.set('hasta', fechaFin);
                          const hrefSimilar = qs.toString()
                            ? `/alquilar/${sim.id}?${qs.toString()}`
                            : `/alquilar/${sim.id}`;
                          return (
                            <a
                              key={sim.id}
                              href={hrefSimilar}
                              className="fx-press flex items-center gap-3 rounded-[16px] border border-[#9CA3AF]/35 dark:border-white/12 bg-[#EDEDED]/55 dark:bg-[#111827] p-2 hover:border-[#111827] dark:hover:border-white/35 transition-colors"
                            >
                              <div className="h-12 w-18 shrink-0 overflow-hidden rounded-[10px]">
                                <img
                                  src={sim.imagenUrl}
                                  alt={`${sim.marca} ${sim.modelo}`}
                                  className="h-full w-full object-cover object-center block"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-display text-xs font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                                  {sim.marca} {sim.modelo}
                                </p>
                                <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] tabular-nums">
                                  {formatCop(sim.precioDia)} / día · {sim.categoriaEtiqueta}
                                </p>
                              </div>
                              <span className="shrink-0 text-xs font-bold text-[#111827] dark:text-[#EDEDED] pr-1">
                                Reservar →
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            <EditorialAvailabilityCalendar
              vehiculo={vehiculo}
              hoyISO={hoyISO}
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              onChangeRango={manejarCambioRango}
              bloquesPrecalculados={bloques}
              excluirDiaSiguiente={false}
            />
          </div>
        )}

        {/* SLIDE 2: Conductor (1 sola tarjeta limpia + progressive disclosure para docs opcionales) */}
        {paso === 2 && (
          <section className="space-y-3.5 animate-fade-in">
            <RentalVehicleHero vehiculo={vehiculo} compact />

            <div className="rounded-[28px] bg-white border border-[#9CA3AF]/45 p-5 space-y-4 shadow-xs dark:bg-[#1F2937] dark:border-white/12">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-black tracking-tight text-[#111827] dark:text-[#EDEDED]">
                    Datos del conductor
                  </h2>
                  <p className="mt-0.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                    Para radicar tu solicitud y contactarte en la entrega.
                  </p>
                </div>

                {!usuarioActual ? (
                  <a
                    href={urlLoginRetorno}
                    className="fx-press shrink-0 min-h-[44px] inline-flex items-center justify-center rounded-full bg-[#EDEDED] border border-[#9CA3AF]/55 px-3.5 py-1.5 text-xs font-bold text-[#111827] hover:bg-[#9CA3AF]/20 dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED] dark:hover:bg-white/10"
                  >
                    Iniciar sesión
                  </a>
                ) : (
                  <span className="shrink-0 rounded-full bg-[#EDEDED] border border-[#9CA3AF]/40 px-3 py-1 text-[11px] font-bold text-[#111827] dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED]">
                    Sesión activa
                  </span>
                )}
              </div>

              <div className="space-y-3.5">
                <div>
                  <label
                    htmlFor="conductor-nombre"
                    className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
                  >
                    Nombre completo *
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
                      Correo electrónico *
                    </label>
                    <input
                      id="conductor-correo"
                      type="email"
                      required
                      value={conductor.correo}
                      onChange={(e) =>
                        setConductor((prev) => ({ ...prev, correo: e.target.value }))
                      }
                      placeholder="correo@ejemplo.com"
                      className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus-visible:ring-2 focus-visible:ring-[#111827] dark:bg-[#111827] dark:border-white/20 dark:text-[#EDEDED] dark:placeholder:text-[#9CA3AF]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="conductor-telefono"
                      className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
                    >
                      WhatsApp / Celular *
                    </label>
                    <input
                      id="conductor-telefono"
                      type="tel"
                      required
                      value={conductor.telefono}
                      onChange={(e) =>
                        setConductor((prev) => ({ ...prev, telefono: e.target.value }))
                      }
                      placeholder="300 456 7890"
                      className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus-visible:ring-2 focus-visible:ring-[#111827] dark:bg-[#111827] dark:border-white/20 dark:text-[#EDEDED] dark:placeholder:text-[#9CA3AF]"
                    />
                  </div>
                </div>

                {/* Progressive Disclosure: Documento y licencia solo si el usuario desea adelantarlos */}
                <div className="border-t border-[#9CA3AF]/25 pt-3 dark:border-white/10">
                  <button
                    type="button"
                    aria-expanded={mostrarDocsOpcionales}
                    onClick={() => setMostrarDocsOpcionales((prev) => !prev)}
                    className="fx-press flex w-full min-h-[44px] items-center justify-between gap-2 rounded-[12px] px-2 py-1.5 text-left text-xs font-semibold text-[#4B5563] hover:text-[#111827] cursor-pointer dark:text-[#D1D5DB] dark:hover:text-white"
                  >
                    <span>
                      {mostrarDocsOpcionales
                        ? 'Ocultar documento y licencia'
                        : '+ Agregar documento y licencia ahora (opcional)'}
                    </span>
                    <span className="text-[11px] font-bold">
                      {mostrarDocsOpcionales ? '−' : '+'}
                    </span>
                  </button>

                  {mostrarDocsOpcionales && (
                    <div className="mt-3 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor="conductor-tipo-doc"
                            className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
                          >
                            Tipo doc.
                          </label>
                          <Select<DatosConductorState['tipoDocumento']>
                            id="conductor-tipo-doc"
                            ariaLabel="Tipo de documento"
                            variant="subtle"
                            value={conductor.tipoDocumento}
                            onChange={(val) =>
                              setConductor((prev) => ({
                                ...prev,
                                tipoDocumento: val,
                              }))
                            }
                            options={[
                              { value: '', label: 'Sin especificar' },
                              { value: 'CC', label: 'Cédula (CC)' },
                              { value: 'CE', label: 'Cédula Extranjería (CE)' },
                              { value: 'PASAPORTE', label: 'Pasaporte' },
                            ]}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="conductor-num-doc"
                            className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
                          >
                            Número de documento
                          </label>
                          <input
                            id="conductor-num-doc"
                            type="text"
                            inputMode="numeric"
                            value={conductor.numeroDocumento}
                            onChange={(e) =>
                              setConductor((prev) => ({
                                ...prev,
                                numeroDocumento: e.target.value,
                              }))
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
                          Categoría de licencia
                        </label>
                        <Select<DatosConductorState['categoriaLicencia']>
                          id="conductor-licencia"
                          ariaLabel="Categoría de licencia"
                          variant="subtle"
                          value={conductor.categoriaLicencia}
                          onChange={(val) =>
                            setConductor((prev) => ({
                              ...prev,
                              categoriaLicencia: val,
                            }))
                          }
                          options={[
                            { value: '', label: 'Sin especificar' },
                            { value: 'B1', label: 'Categoría B1 (Automóviles / SUV)' },
                            { value: 'B2', label: 'Categoría B2 / C1 (Servicio Público)' },
                            { value: 'A2', label: 'Categoría A2 (Motocicletas)' },
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SLIDE 3: Entrega y Mapa interactivo Mapbox (slide dedicado, cero saturación) */}
        {paso === 3 && (
          <section className="space-y-3.5 animate-fade-in">
            <RentalVehicleHero vehiculo={vehiculo} compact />

            <div className="rounded-[28px] bg-white border border-[#9CA3AF]/45 p-5 shadow-xs dark:bg-[#1F2937] dark:border-white/12">
              <DeliveryLocationSelector
                localId={localId}
                patio={patioEfectivo}
                politicaDomicilio={politicaDomicilioEfectiva}
                mapboxPublicToken={mapboxPublicToken}
                valor={entrega}
                onChange={(siguiente) => {
                  setErrorValidacion(null);
                  setEntrega(siguiente);
                }}
              />
            </div>
          </section>
        )}

        {/* SLIDE 4: Resumen unificado en una sola tarjeta editorial */}
        {paso === 4 && (
          <section className="space-y-3.5 animate-fade-in">
            <RentalVehicleHero vehiculo={vehiculo} compact />

            <div className="rounded-[28px] bg-white border border-[#9CA3AF]/45 p-5 space-y-4 shadow-xs dark:bg-[#1F2937] dark:border-white/12">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-black tracking-tight text-[#111827] dark:text-[#EDEDED]">
                  Resumen de reserva
                </h2>
                <span className="rounded-full bg-[#EDEDED] border border-[#9CA3AF]/45 px-3 py-1 text-xs font-bold text-[#111827] dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED]">
                  {cotizacion.diasAlquiler}{' '}
                  {cotizacion.diasAlquiler === 1 ? 'día' : 'días'}
                </span>
              </div>

              {/* Bloque 1: Fechas, entrega y titular */}
              <div className="space-y-2.5 border-t border-[#9CA3AF]/25 pt-3.5 text-xs dark:border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#4B5563] dark:text-[#D1D5DB]">Fechas</span>
                  <span className="font-bold text-[#111827] dark:text-[#EDEDED] text-right">
                    {resumenFechasTexto}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <span className="text-[#4B5563] dark:text-[#D1D5DB] shrink-0">
                    {entrega.modalidadEntrega === 'DOMICILIO_MEDELLIN'
                      ? 'Entrega a domicilio'
                      : 'Retiro en patio'}
                  </span>
                  <div className="text-right min-w-0">
                    <p className="font-bold text-[#111827] dark:text-[#EDEDED]">
                      {entrega.modalidadEntrega === 'DOMICILIO_MEDELLIN'
                        ? entrega.direccionEntrega
                        : patioEfectivo.nombre}
                    </p>
                    {entrega.modalidadEntrega === 'DOMICILIO_MEDELLIN' &&
                      entrega.entregaReferencia.trim() && (
                        <p className="text-[11px] text-[#4B5563] dark:text-[#D1D5DB]">
                          Ref.: {entrega.entregaReferencia.trim()}
                        </p>
                      )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#4B5563] dark:text-[#D1D5DB]">Conductor</span>
                  <span className="font-bold text-[#111827] dark:text-[#EDEDED] text-right truncate">
                    {conductor.nombreCompleto} · {conductor.telefono}
                  </span>
                </div>
              </div>

              {/* Bloque 2: Desglose económico */}
              <div className="space-y-2 border-t border-[#9CA3AF]/25 pt-3.5 text-sm dark:border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#4B5563] dark:text-[#D1D5DB]">
                    Tarifa ({cotizacion.diasAlquiler}d × {formatCop(cotizacion.precioDia)})
                  </span>
                  <span className="font-semibold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                    {formatCop(cotizacion.subtotalTarifa)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#4B5563] dark:text-[#D1D5DB]">
                    Cobertura y peritaje R2
                  </span>
                  <span className="font-semibold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                    {formatCop(cotizacion.coberturaPericial)}
                  </span>
                </div>

                {entrega.modalidadEntrega === 'DOMICILIO_MEDELLIN' && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#4B5563] dark:text-[#D1D5DB]">
                      Envío a domicilio
                      {entrega.distanciaKm != null
                        ? ` (${formatearDistanciaKm(entrega.distanciaKm)})`
                        : ''}
                    </span>
                    <span className="font-semibold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                      {cotizacion.recargoDomicilio > 0
                        ? formatCop(cotizacion.recargoDomicilio)
                        : 'Sin recargo'}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-[#9CA3AF]/30 pt-2.5 dark:border-white/12">
                  <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                    Total del contrato
                  </span>
                  <span className="font-display text-lg font-black text-[#111827] dark:text-white tabular-nums">
                    {formatCop(cotizacion.totalAlquiler)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                  <span>Depósito en garantía (reembolsable al cierre)</span>
                  <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                    {formatCop(cotizacion.depositoGarantia)}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SLIDE 5: Abono, Autorizaciones y Deslizamiento para Confirmar */}
        {paso === 5 && (
          <section className="space-y-3.5 animate-fade-in">
            <RentalVehicleHero vehiculo={vehiculo} compact />

            <div className="rounded-[28px] bg-white border border-[#9CA3AF]/45 p-5 space-y-4 shadow-xs dark:bg-[#1F2937] dark:border-white/12">
              <div>
                <h2 className="font-display text-xl font-black tracking-tight text-[#111827] dark:text-[#EDEDED]">
                  Confirmar alquiler
                </h2>
                <p className="mt-0.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
                  Elige el abono y acepta las autorizaciones para bloquear tu vehículo.
                </p>
              </div>

              {/* Monto inicial */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  aria-pressed={modalidadPago === 'ABONO_30'}
                  onClick={() => setModalidadPago('ABONO_30')}
                  className={`fx-press min-h-[68px] rounded-[18px] p-3.5 text-left border transition-colors cursor-pointer ${modalidadPago === 'ABONO_30'
                    ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                    : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15'
                    }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">
                    Abono 30%
                  </span>
                  <p className="mt-0.5 font-display text-lg font-black tabular-nums">
                    {formatCop(cotizacion.abonoMinimoReserva)}
                  </p>
                </button>

                <button
                  type="button"
                  aria-pressed={modalidadPago === 'TOTAL_100'}
                  onClick={() => setModalidadPago('TOTAL_100')}
                  className={`fx-press min-h-[68px] rounded-[18px] p-3.5 text-left border transition-colors cursor-pointer ${modalidadPago === 'TOTAL_100'
                    ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                    : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15'
                    }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">
                    Total 100%
                  </span>
                  <p className="mt-0.5 font-display text-lg font-black tabular-nums">
                    {formatCop(cotizacion.totalAlquiler)}
                  </p>
                </button>
              </div>

              {/* Medio de pago */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'TRANSFERENCIA_PSE', label: 'PSE / Banco' },
                  { id: 'NEQUI_BREB', label: 'Bre-B / Nequi' },
                  { id: 'CAJA_PATIO', label: 'Caja Patio' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={metodoAbono === item.id}
                    onClick={() => setMetodoAbono(item.id as typeof metodoAbono)}
                    className={`fx-press min-h-[44px] rounded-[12px] px-2 py-2 text-xs font-bold border transition-colors cursor-pointer ${metodoAbono === item.id
                      ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                      : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Progressive Disclosure: Comprobante o nota opcional */}
              {!mostrarNotaComprobante ? (
                <button
                  type="button"
                  onClick={() => setMostrarNotaComprobante(true)}
                  className="fx-press min-h-[44px] w-full rounded-[12px] border border-dashed border-[#9CA3AF]/70 px-3.5 py-2 text-left text-xs font-semibold text-[#4B5563] hover:text-[#111827] cursor-pointer dark:border-white/20 dark:text-[#D1D5DB] dark:hover:text-white"
                >
                  + Agregar número de comprobante o nota (opcional)
                </button>
              ) : (
                <div className="animate-fade-in">
                  <label
                    htmlFor="comprobante-ref"
                    className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
                  >
                    Comprobante o nota para el asesor (opcional)
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
              )}

              {/* Autorizaciones obligatorias */}
              <div className="space-y-2.5 border-t border-[#9CA3AF]/25 pt-3.5 dark:border-white/10">
                <label className="flex items-start gap-3 rounded-[14px] bg-[#EDEDED] p-3 border border-[#9CA3AF]/45 cursor-pointer dark:bg-[#111827] dark:border-white/15">
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
                    <strong>Ley 1581 de 2012:</strong>{' '}
                    {entrega.modalidadEntrega === 'DOMICILIO_MEDELLIN'
                      ? 'Autorizo el tratamiento de mis datos personales, dirección y coordenadas de entrega a domicilio, y verificación de licencia.'
                      : 'Autorizo el tratamiento de mis datos personales, datos de ubicación de entrega y verificación de licencia.'}
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
            className="rounded-[18px] bg-[#111827] text-white px-4 py-3 text-xs font-semibold flex items-center justify-between gap-3 shadow-md animate-fade-in"
          >
            <span>{errorValidacion}</span>
            <button
              type="button"
              onClick={() => setErrorValidacion(null)}
              className="text-[#9CA3AF] hover:text-white font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Barra Inferior Fija */}
      <div ref={bottomBarRef} className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <div className="mx-auto w-full max-w-md sm:max-w-xl px-3.5 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto rounded-[24px] bg-white/95 backdrop-blur-xl border border-[#9CA3AF]/50 px-4 py-3 shadow-[0_14px_34px_-8px_rgba(17,24,39,0.22)] space-y-2.5 dark:bg-[#1F2937]/95 dark:border-white/15">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB] truncate">
                  {paso === 5
                    ? modalidadPago === 'ABONO_30'
                      ? 'Abono inicial (30%)'
                      : 'Pago completo (100%)'
                    : `Paso ${paso} de 5 · ${pasoMetaActual.subtitulo}`}
                </span>
                <p className="font-display text-lg sm:text-xl font-black text-[#111827] dark:text-white tabular-nums truncate">
                  {formatCop(paso === 5 ? montoPasoFinal : cotizacion.totalAlquiler)}
                  <span className="ml-1.5 text-xs font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
                    {paso === 5
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
                    aria-label="Volver al paso anterior"
                    className="ios-press-bounce flex h-12 w-12 items-center justify-center rounded-full bg-[#EDEDED] border border-[#9CA3AF]/60 text-[#111827] font-bold cursor-pointer"
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

                {paso < 5 &&
                  (() => {
                    const estaBloqueadoPorDocs = Boolean(
                      paso === 1 && vehiculoBloqueadoPorDocs
                    );
                    const faltaCompletarRango =
                      paso === 1 && (!fechaInicio || !fechaFin || !validacionRango.valido);
                    const deshabilitado = estaBloqueadoPorDocs || faltaCompletarRango;
                    return (
                      <button
                        type="button"
                        disabled={deshabilitado}
                        onClick={avanzarPaso}
                        className={`fx-press min-h-[46px] rounded-full px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold shadow-fab inline-flex items-center gap-2 ${deshabilitado
                          ? 'bg-[#4B5563] text-[#EDEDED] opacity-60 cursor-not-allowed'
                          : 'bg-[#111827] hover:bg-[#1F2937] text-white cursor-pointer dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#111827]'
                          }`}
                      >
                        <span>
                          {paso === 1 &&
                            (estaBloqueadoPorDocs
                              ? esAdminOperador
                                ? 'En actualización de docs'
                                : 'No disponible'
                              : faltaCompletarRango
                                ? fechaInicio && !fechaFin
                                  ? 'Elige devolución'
                                  : 'Elige fechas'
                                : 'Confirmar fechas')}
                          {paso === 2 && 'Elegir entrega'}
                          {paso === 3 && 'Ver resumen'}
                          {paso === 4 && 'Ir a confirmar'}
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

            {paso === 5 && (
              <SlideToConfirmControl
                compact
                disabled={!aceptaLey1581}
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
