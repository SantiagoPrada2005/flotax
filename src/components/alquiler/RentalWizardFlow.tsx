import { useMemo, useState } from 'react';
import {
  calcularCotizacionAlquiler,
  formatearFechaCorta,
  sumarDiasISO,
  type VehiculoItem,
} from '@/lib/flota';
import EditorialAvailabilityCalendar from './EditorialAvailabilityCalendar';

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
  usuarioActual: UsuarioSesionCliente | null;
  fechaInicioInicial?: string | undefined;
  fechaFinInicial?: string | undefined;
  pasoInicial?: 1 | 2 | 3 | 4 | undefined;
}

type PasoWizard = 1 | 2 | 3 | 4;

interface DatosConductorState {
  nombreCompleto: string;
  correo: string;
  telefono: string;
  tipoDocumento: 'CC' | 'CE' | 'PASAPORTE';
  numeroDocumento: string;
  categoriaLicencia: 'B1' | 'B2' | 'A2' | 'C1';
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
    subtitulo: 'Costos y Ley 1581',
  },
  {
    numero: 4,
    titulo: 'Abono',
    subtitulo: 'Radicar solicitud',
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
  usuarioActual,
  fechaInicioInicial,
  fechaFinInicial,
  pasoInicial = 1,
}: RentalWizardFlowProps) {
  const [paso, setPaso] = useState<PasoWizard>(pasoInicial);

  // Por defecto seleccionamos una franja inicial de 3 días desde hoy
  const [fechaInicio, setFechaInicio] = useState<string | null>(
    fechaInicioInicial ?? hoyISO
  );
  const [fechaFin, setFechaFin] = useState<string | null>(
    fechaFinInicial ?? sumarDiasISO(hoyISO, 2)
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
  const [solicitudRadicada, setSolicitudRadicada] = useState<{
    codigo: string;
    creadaEn: string;
    montoReportado: number;
  } | null>(null);

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

  const avanzarPaso = () => {
    setErrorValidacion(null);

    if (paso === 1) {
      if (!fechaInicio) {
        setErrorValidacion('Selecciona al menos un día disponible en el calendario.');
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
      if (
        !conductor.nombreCompleto.trim() ||
        !conductor.numeroDocumento.trim() ||
        !conductor.telefono.trim()
      ) {
        setErrorValidacion(
          'Completa tu nombre, documento de identidad y teléfono de contacto para el contrato.'
        );
        return;
      }
      setPaso(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (paso === 3) {
      if (!aceptaLey1581 || !aceptaInspeccionR2) {
        setErrorValidacion(
          'Debes autorizar el tratamiento de datos (Ley 1581) y el protocolo de inspección pericial para continuar.'
        );
        return;
      }
      setPaso(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (paso === 4) {
      const montoReportado =
        modalidadPago === 'ABONO_30'
          ? cotizacion.abonoMinimoReserva
          : cotizacion.totalAlquiler;
      const codigo = `FLX-${Math.floor(100000 + Math.random() * 900000)}`;
      const nuevaSolicitud = {
        codigo,
        vehiculoId: vehiculo.id,
        vehiculoNombre: `${vehiculo.marca} ${vehiculo.modelo}`,
        placa: vehiculo.placa,
        imagenUrl: vehiculo.imagenUrl,
        fechaInicio: cotizacion.fechaInicio,
        fechaFin: cotizacion.fechaFin,
        diasAlquiler: cotizacion.diasAlquiler,
        totalAlquiler: cotizacion.totalAlquiler,
        montoReportado,
        estado: 'PENDIENTE',
        creadaEn: new Date().toISOString(),
      };

      try {
        const prevRaw = window.localStorage.getItem('flotax_reservas_cliente');
        const prevList = prevRaw ? (JSON.parse(prevRaw) as unknown[]) : [];
        window.localStorage.setItem(
          'flotax_reservas_cliente',
          JSON.stringify([nuevaSolicitud, ...prevList])
        );
      } catch {
        // Ignorar si localStorage está restringido
      }

      setSolicitudRadicada({
        codigo,
        creadaEn: nuevaSolicitud.creadaEn,
        montoReportado,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
          <p className="mt-1.5 text-sm text-[#4B5563] max-w-md mx-auto">
            Radicado <span className="font-mono font-bold text-[#111827]">{solicitudRadicada.codigo}</span>. Un asesor de patio validará tu licencia y confirmará el bloqueo definitivo de la unidad.
          </p>

          <div className="mt-6 rounded-[24px] bg-[#EDEDED] border border-[#9CA3AF]/45 p-4 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#4B5563]">Vehículo</span>
              <span className="font-bold text-[#111827]">
                {vehiculo.marca} {vehiculo.modelo} ({vehiculo.placa})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#4B5563]">Franja reservada</span>
              <span className="font-bold text-[#111827]">
                {formatearFechaCorta(cotizacion.fechaInicio)} →{' '}
                {formatearFechaCorta(cotizacion.fechaFin)} ({cotizacion.diasAlquiler} días)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#4B5563]">Abono reportado</span>
              <span className="font-display font-bold text-[#111827]">
                {formatCop(solicitudRadicada.montoReportado)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-t border-[#9CA3AF]/35 pt-2">
              <span className="text-[#4B5563]">Siguiente paso en patio</span>
              <span className="font-semibold text-[#111827]">
                Acta de entrega e inspección R2
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href="/reservas"
              className="ios-press-bounce flex-1 min-h-[48px] inline-flex items-center justify-center rounded-full bg-[#111827] px-6 py-3 text-sm font-bold text-white shadow-fab"
            >
              Ver estado en Mis Reservas
            </a>
            <a
              href="/catalogo"
              className="ios-press-bounce min-h-[48px] inline-flex items-center justify-center rounded-full bg-[#EDEDED] border border-[#9CA3AF]/60 px-6 py-3 text-sm font-bold text-[#111827]"
            >
              Volver al catálogo
            </a>
          </div>
        </div>
      </div>
    );
  }

  const pasoMetaActual = PASOS_META.find((p) => p.numero === paso) ?? PASOS_META[0]!;

  return (
    <div className="flex flex-1 flex-col justify-between gap-2.5">
      <div className="space-y-2.5">
        {/* Cabecera Compacta Estilo Referencia: Botón Volver + Píldoras de Paso */}
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
            className="ios-press-bounce flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-[#9CA3AF]/45 text-[#111827] shadow-2xs cursor-pointer"
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

          {/* Píldoras Segmentadas de Pasos (Estilo Models / Services / Experience) */}
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
                  className={`shrink-0 min-h-[36px] rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                    activo
                      ? 'bg-[#111827] text-white shadow-xs'
                      : completado
                      ? 'bg-white text-[#111827] border border-[#9CA3AF]/45 cursor-pointer'
                      : 'bg-white/60 text-[#4B5563] border border-[#9CA3AF]/30 opacity-65 cursor-default'
                  }`}
                >
                  {completado ? `✓ ${item.titulo}` : item.titulo}
                </button>
              );
            })}
          </nav>
        </header>

        {/* PASO 1: Componente Único de Calendario + Imagen del Vehículo */}
        {paso === 1 && (
          <div className="animate-fade-up">
            <EditorialAvailabilityCalendar
              vehiculo={vehiculo}
              hoyISO={hoyISO}
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              onChangeRango={manejarCambioRango}
            />
          </div>
        )}

      {/* PASO 2: Bifurcación de Sesión + Datos de Conductor (Cédula y Licencia) */}
      {paso === 2 && (
        <section className="space-y-4 animate-fade-up">
          {/* Estado de sesión actual (Regla docs/user-flows.md Sección 4) */}
          {!usuarioActual ? (
            <div className="rounded-[24px] bg-[#EDEDED] border border-[#9CA3AF]/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#111827]">
                  ¿Ya tienes cuenta en FlotaX?
                </span>
                <p className="mt-0.5 text-xs text-[#4B5563]">
                  Inicia sesión con código OTP o Google para autocompletar tus datos sin perder las fechas elegidas ({formatearFechaCorta(cotizacion.fechaInicio)} → {formatearFechaCorta(cotizacion.fechaFin)}).
                </p>
              </div>
              <a
                href={urlLoginRetorno}
                className="ios-press-bounce shrink-0 min-h-[44px] inline-flex items-center justify-center rounded-full bg-[#1F2937] px-4 py-2 text-xs font-bold text-white shadow-xs"
              >
                Iniciar sesión
              </a>
            </div>
          ) : (
            <div className="rounded-[24px] bg-white border border-[#9CA3AF]/40 p-4 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                  Sesión verificada
                </span>
                <p className="text-sm font-bold text-[#111827]">
                  {usuarioActual.nombre} · {usuarioActual.correo}
                </p>
              </div>
              <span className="rounded-full bg-[#EDEDED] px-3 py-1 text-[11px] font-bold text-[#111827]">
                Activa
              </span>
            </div>
          )}

          {/* Formulario de Credenciales de Conducción (16px WebKit Shield) */}
          <div className="rounded-[28px] bg-white border border-[#9CA3AF]/40 p-5 space-y-4 shadow-xs">
            <div>
              <h2 className="font-display text-xl font-black tracking-tight text-[#111827]">
                Credenciales del conductor
              </h2>
              <p className="mt-0.5 text-xs text-[#4B5563]">
                La cédula y la licencia se validan para preparar el acta de entrega en patio.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="conductor-nombre"
                  className="block text-xs font-bold text-[#111827] mb-1.5"
                >
                  Nombre completo del titular
                </label>
                <input
                  id="conductor-nombre"
                  type="text"
                  value={conductor.nombreCompleto}
                  onChange={(e) =>
                    setConductor((prev) => ({ ...prev, nombreCompleto: e.target.value }))
                  }
                  placeholder="Ej. Santiago Restrepo"
                  className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#111827]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="conductor-tipo-doc"
                    className="block text-xs font-bold text-[#111827] mb-1.5"
                  >
                    Tipo doc.
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
                    className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3 py-2.5 text-base text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  >
                    <option value="CC">Cédula (CC)</option>
                    <option value="CE">Cédula Extranjería (CE)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="conductor-num-doc"
                    className="block text-xs font-bold text-[#111827] mb-1.5"
                  >
                    Número de documento
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
                    className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="conductor-telefono"
                    className="block text-xs font-bold text-[#111827] mb-1.5"
                  >
                    WhatsApp / Celular
                  </label>
                  <input
                    id="conductor-telefono"
                    type="tel"
                    value={conductor.telefono}
                    onChange={(e) =>
                      setConductor((prev) => ({ ...prev, telefono: e.target.value }))
                    }
                    placeholder="Ej. 300 456 7890"
                    className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="conductor-licencia"
                    className="block text-xs font-bold text-[#111827] mb-1.5"
                  >
                    Categoría de licencia vigente
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
                    className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3 py-2.5 text-base text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]"
                  >
                    <option value="B1">Categoría B1 (Automóviles / SUV)</option>
                    <option value="B2">Categoría B2 / C1 (Servicio Público)</option>
                    <option value="A2">Categoría A2 (Motocicletas)</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-[#111827] mb-1.5">
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
                    className={`min-h-[48px] rounded-[14px] p-3 text-left border transition-colors cursor-pointer ${
                      conductor.modalidadEntrega === 'PATIO_PRINCIPAL'
                        ? 'bg-[#111827] text-white border-[#111827]'
                        : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60'
                    }`}
                  >
                    <p className="text-xs font-bold">Retiro en Patio Principal</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        conductor.modalidadEntrega === 'PATIO_PRINCIPAL'
                          ? 'text-[#EDEDED]'
                          : 'text-[#4B5563]'
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
                    className={`min-h-[48px] rounded-[14px] p-3 text-left border transition-colors cursor-pointer ${
                      conductor.modalidadEntrega === 'DOMICILIO_MEDELLIN'
                        ? 'bg-[#111827] text-white border-[#111827]'
                        : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60'
                    }`}
                  >
                    <p className="text-xs font-bold">Entrega en tu ubicación</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        conductor.modalidadEntrega === 'DOMICILIO_MEDELLIN'
                          ? 'text-[#EDEDED]'
                          : 'text-[#4B5563]'
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

      {/* PASO 3: Resumen de Costos + Autorización Obligatoria Ley 1581 */}
      {paso === 3 && (
        <section className="space-y-4 animate-fade-up">
          <div className="rounded-[28px] bg-white border border-[#9CA3AF]/40 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#9CA3AF]/30 pb-3.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                  Liquidación transparente
                </span>
                <h2 className="font-display text-xl font-black tracking-tight text-[#111827]">
                  Resumen y costo total
                </h2>
              </div>
              <span className="rounded-full bg-[#EDEDED] border border-[#9CA3AF]/50 px-3 py-1 text-xs font-bold text-[#111827]">
                {cotizacion.diasAlquiler} {cotizacion.diasAlquiler === 1 ? 'día' : 'días'}
              </span>
            </div>

            {/* Rango de fechas y conductor */}
            <div className="grid grid-cols-2 gap-3 rounded-[20px] bg-[#EDEDED] p-3.5 border border-[#9CA3AF]/40">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                  Desde (Entrega)
                </span>
                <p className="mt-0.5 font-display text-sm font-bold text-[#111827]">
                  {formatearFechaCorta(cotizacion.fechaInicio)} · 09:00
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                  Hasta (Devolución)
                </span>
                <p className="mt-0.5 font-display text-sm font-bold text-[#111827]">
                  {formatearFechaCorta(cotizacion.fechaFin)} · 18:00
                </p>
              </div>
            </div>

            {/* Desglose de tarifa */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#4B5563]">
                  Tarifa de alquiler ({cotizacion.diasAlquiler}d ×{' '}
                  {formatCop(cotizacion.precioDia)})
                </span>
                <span className="font-semibold text-[#111827] tabular-nums">
                  {formatCop(cotizacion.subtotalTarifa)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#4B5563]">
                  Cobertura básica y peritaje fotográfico R2
                </span>
                <span className="font-semibold text-[#111827] tabular-nums">
                  {formatCop(cotizacion.coberturaPericial)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-[#9CA3AF]/30 pt-2.5">
                <span className="font-bold text-[#111827]">Total del contrato</span>
                <span className="font-display text-lg font-black text-[#111827] tabular-nums">
                  {formatCop(cotizacion.totalAlquiler)}
                </span>
              </div>

              <div className="rounded-[16px] bg-[#EDEDED] p-3 flex items-center justify-between text-xs border border-[#9CA3AF]/40">
                <div>
                  <span className="font-bold text-[#111827]">
                    Depósito en garantía (reembolsable)
                  </span>
                  <p className="text-[11px] text-[#4B5563]">
                    Se libera al cerrar el acta de devolución sin novedades
                  </p>
                </div>
                <span className="font-mono font-bold text-[#111827] tabular-nums">
                  {formatCop(cotizacion.depositoGarantia)}
                </span>
              </div>
            </div>

            {/* Consentimientos Legales Obligatorios (Ley 1581 + Peritaje R2) */}
            <div className="space-y-2.5 border-t border-[#9CA3AF]/30 pt-4">
              <label className="flex items-start gap-3 rounded-[16px] bg-[#EDEDED] p-3.5 border border-[#9CA3AF]/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceptaLey1581}
                  onChange={(e) => setAceptaLey1581(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#111827]"
                />
                <span className="text-xs text-[#111827] leading-relaxed">
                  <strong>Autorización de Datos (Ley 1581 de 2012):</strong> Autorizo el tratamiento de mis datos personales y la verificación de mi licencia de conducción para la formalización del contrato de alquiler.
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-[16px] bg-[#EDEDED] p-3.5 border border-[#9CA3AF]/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aceptaInspeccionR2}
                  onChange={(e) => setAceptaInspeccionR2(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#111827]"
                />
                <span className="text-xs text-[#111827] leading-relaxed">
                  <strong>Protocolo de Patio e Inspección:</strong> Acepto que la entrega del vehículo incluye registro fotográfico de estado, combustible y kilometraje antes de salir de patio.
                </span>
              </label>
            </div>
          </div>
        </section>
      )}

      {/* PASO 4: Pagar o Reportar Abono */}
      {paso === 4 && (
        <section className="space-y-4 animate-fade-up">
          <div className="rounded-[28px] bg-white border border-[#9CA3AF]/40 p-5 space-y-4 shadow-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                Paso final
              </span>
              <h2 className="font-display text-xl font-black tracking-tight text-[#111827]">
                Pagar o reportar abono
              </h2>
              <p className="mt-0.5 text-xs text-[#4B5563]">
                Para bloquear la franja del {formatearFechaCorta(cotizacion.fechaInicio)} al{' '}
                {formatearFechaCorta(cotizacion.fechaFin)}, elige el monto a abonar.
              </p>
            </div>

            {/* Selección de porcentaje de abono */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModalidadPago('ABONO_30')}
                className={`min-h-[68px] rounded-[20px] p-4 text-left border transition-colors cursor-pointer ${
                  modalidadPago === 'ABONO_30'
                    ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                    : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  Abono inicial (30%)
                </span>
                <p className="mt-1 font-display text-xl font-black tabular-nums">
                  {formatCop(cotizacion.abonoMinimoReserva)}
                </p>
                <span className="text-[11px] opacity-80">
                  Saldo restante al retirar en patio
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModalidadPago('TOTAL_100')}
                className={`min-h-[68px] rounded-[20px] p-4 text-left border transition-colors cursor-pointer ${
                  modalidadPago === 'TOTAL_100'
                    ? 'bg-[#111827] text-white border-[#111827] shadow-xs'
                    : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                  Pago completo (100%)
                </span>
                <p className="mt-1 font-display text-xl font-black tabular-nums">
                  {formatCop(cotizacion.totalAlquiler)}
                </p>
                <span className="text-[11px] opacity-80">
                  Check-in expreso en patio
                </span>
              </button>
            </div>

            {/* Canal de pago / reporte */}
            <div>
              <span className="block text-xs font-bold text-[#111827] mb-2">
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
                    className={`min-h-[44px] rounded-[12px] px-2.5 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                      metodoAbono === item.id
                        ? 'bg-[#1F2937] text-white border-[#1F2937]'
                        : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/60'
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
                className="block text-xs font-bold text-[#111827] mb-1.5"
              >
                Número de comprobante o nota para el asesor (opcional)
              </label>
              <input
                id="comprobante-ref"
                type="text"
                value={referenciaComprobante}
                onChange={(e) => setReferenciaComprobante(e.target.value)}
                placeholder="Ej. Comprobante #948201 o llego a las 10:00 AM"
                className="w-full min-h-[48px] rounded-[12px] bg-[#EDEDED] border border-[#9CA3AF] px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#111827]"
              />
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

      {/* Barra Inferior Ergonomía Thumb-Zone (Ajustada al alto del viewport móvil) */}
      <div className="sticky bottom-2 z-30 rounded-[26px] bg-white/95 backdrop-blur-xl border border-[#9CA3AF]/50 px-4 py-3 shadow-[0_14px_34px_-8px_rgba(17,24,39,0.2)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
            Paso {paso} de 4 · {pasoMetaActual.subtitulo}
          </span>
          <p className="font-display text-lg sm:text-xl font-black text-[#111827] tabular-nums truncate">
            {formatCop(cotizacion.totalAlquiler)}
            <span className="ml-1.5 text-xs font-semibold text-[#4B5563]">
              ({cotizacion.diasAlquiler} {cotizacion.diasAlquiler === 1 ? 'día' : 'días'})
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

          <button
            type="button"
            onClick={avanzarPaso}
            className="ios-press-bounce min-h-[48px] rounded-full bg-[#111827] hover:bg-[#1F2937] text-white px-6 py-3 text-xs sm:text-sm font-bold shadow-fab inline-flex items-center gap-2 cursor-pointer"
          >
            <span>
              {paso === 1 && 'Confirmar fechas'}
              {paso === 2 && 'Ver resumen'}
              {paso === 3 && 'Continuar al abono'}
              {paso === 4 && 'Enviar solicitud'}
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
        </div>
      </div>
    </div>
  );
}
