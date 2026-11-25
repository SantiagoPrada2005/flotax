import { useMemo, useState, type ReactNode } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import {
  ZONAS_FOTOS_ALQUILER,
  etiquetaEstadoGarantia,
  etiquetaEstadoReservaCorta,
  etiquetaMetodoPago,
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
import SemaforoDocumentalPanel from './SemaforoDocumentalPanel';

export interface AdminControlCenterPanelProps {
  reserva: ReservaClienteItem;
  detalleAdmin: DetalleReservaAdminContext;
  capacidades?: CapacidadesOperacionAlquiler | undefined;
  autorizarSinDocumentos: boolean;
  onToggleAutorizarSinDocs: (val: boolean) => void;
  onDocumentosActualizados: (datos?: {
    tipoDocumento: 'CC' | 'CE' | 'PASAPORTE' | 'NIT';
    numeroDocumento: string;
    categoriaLicencia: string;
    licenciaNumero?: string | undefined;
  }) => void;
  onFotoEntregaRegistrada?: ((foto: FotoInspeccionItem) => void) | undefined;
  operacionCargando: boolean;
  errorOperacion: string | null;
  onClearError: () => void;
  onConfirmarReserva: () => void;
  onRechazarReserva: () => void;
  onCancelarReserva: () => void;
  onPausarAlquiler: () => void;
  onReanudarAlquiler: () => void;
  onProrrogarAlquiler: () => void;
  onAbrirFinalizarAlquiler: () => void;
  onAnularAlquiler: () => void;
  onReabrirReserva: () => void;
  onAbrirFactura: () => void;
}

type SeccionControlId =
  | 'resumen'
  | 'cliente'
  | 'fotos'
  | 'pagos'
  | 'fechas'
  | 'timeline';

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

const formatFechaHora = (iso: string | null | undefined): string => {
  if (!iso) return 'Pendiente';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
};

const formatFechaCorta = (iso: string | null | undefined): string => {
  if (!iso) return 'Pendiente';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y!, m! - 1, d!);
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(dt);
  }
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(dt);
};

interface AccordionSectionProps {
  id: SeccionControlId;
  titulo: string;
  resumenContraido: string;
  badge?: string | undefined;
  abierta: boolean;
  onToggle: (id: SeccionControlId) => void;
  icono: ReactNode;
  children: ReactNode;
}

function AccordionSection({
  id,
  titulo,
  resumenContraido,
  badge,
  abierta,
  onToggle,
  icono,
  children,
}: AccordionSectionProps) {
  return (
    <div className="border-b border-[#EDEDED] dark:border-white/10 last:border-b-0">
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => onToggle(id)}
        className="w-full min-h-[52px] py-3 px-1 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors bg-transparent dark:bg-transparent hover:bg-[#EDEDED]/35 dark:hover:bg-transparent rounded-[14px]"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#EDEDED] dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] border border-[#9CA3AF]/25 dark:border-white/10">
            {icono}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                {titulo}
              </span>
              {badge && (
                <span className="shrink-0 rounded-full bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF]/35 dark:border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#111827] dark:text-[#EDEDED]">
                  {badge}
                </span>
              )}
            </div>
            {!abierta && (
              <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] truncate mt-0.5">
                {resumenContraido}
              </p>
            )}
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 shrink-0 text-[#4B5563] dark:text-[#9CA3AF] transition-transform duration-150 ${
            abierta ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {abierta && <div className="pb-4 pt-1.5 px-1 space-y-3">{children}</div>}
    </div>
  );
}

export function AdminControlCenterPanel({
  reserva,
  detalleAdmin,
  capacidades,
  autorizarSinDocumentos,
  onToggleAutorizarSinDocs,
  onDocumentosActualizados,
  onFotoEntregaRegistrada,
  operacionCargando,
  errorOperacion,
  onClearError,
  onConfirmarReserva,
  onRechazarReserva,
  onCancelarReserva,
  onPausarAlquiler,
  onReanudarAlquiler,
  onProrrogarAlquiler,
  onAbrirFinalizarAlquiler,
  onAnularAlquiler,
  onReabrirReserva,
  onAbrirFactura,
}: AdminControlCenterPanelProps) {
  const [abiertas, setAbiertas] = useState<Record<SeccionControlId, boolean>>({
    resumen: true,
    cliente: false,
    fotos: false,
    pagos: false,
    fechas: false,
    timeline: false,
  });

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [subiendoZonaEntrega, setSubiendoZonaEntrega] =
    useState<ZonaEvidenciaVehiculo | null>(null);
  const [errorFotoEntrega, setErrorFotoEntrega] = useState<string | null>(null);

  const toggleSeccion = (id: SeccionControlId) => {
    setAbiertas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const { vehiculo, conductor } = reserva;
  const { contrato, garantia, fotosEntrega, pagosHistorial, revisionDevolucion } =
    detalleAdmin;

  const totalAlquiler = contrato?.totalLiquidado ?? reserva.totalAlquiler;
  const totalAbonado = contrato?.totalPagado ?? reserva.montoReportado;
  const saldoPendiente = Math.max(0, totalAlquiler - totalAbonado);
  const cobrosAdicionales = contrato?.cobrosAdicionalesLineas ?? [];

  const pagosAlquiler = useMemo(
    () =>
      pagosHistorial.filter(
        (p) =>
          p.estado === 'CONFIRMADO' &&
          p.categoria !== 'DEPOSITO_GARANTIA' &&
          p.categoria !== 'REEMBOLSO_GARANTIA'
      ),
    [pagosHistorial]
  );

  // Galería de entrega: zonas esperadas + adicionales
  const fotosAdicionalesEntrega = useMemo(
    () =>
      fotosEntrega.filter(
        (f) => !ZONAS_FOTOS_ALQUILER.some((z) => z.id === f.zonaEvidencia)
      ),
    [fotosEntrega]
  );

  const zonasConFotoCount = useMemo(
    () =>
      ZONAS_FOTOS_ALQUILER.filter((z) =>
        fotosEntrega.some((f) => f.zonaEvidencia === z.id)
      ).length,
    [fotosEntrega]
  );

  const puedeSubirFotoEntrega =
    (reserva.estado === 'CONFIRMADA' ||
      reserva.estado === 'EN_CURSO' ||
      reserva.estado === 'PAUSADA') &&
    Boolean(capacidades?.puedeEntregar);

  const manejarSubirFotoEntrega = async (
    zonaId: ZonaEvidenciaVehiculo,
    etiqueta: string,
    ordenVisual: number,
    file: File | undefined
  ) => {
    if (!file) return;
    setErrorFotoEntrega(null);
    setSubiendoZonaEntrega(zonaId);
    try {
      const comprimida = await comprimirYNormalizarImagen(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.84,
      });
      const res = await actions.reservas.registrarFotoAlquiler({
        codigo: reserva.codigo,
        etapaOperativa: 'ENTREGA_SALIDA',
        zonaEvidencia: zonaId,
        dataUrl: comprimida.base64,
        observacion: `Foto de entrega · ${etiqueta}`,
        ordenVisual,
        capturadoEnISO: new Date().toISOString(),
      });
      if (res.error || !res.data?.ok || !res.data.foto) {
        setErrorFotoEntrega(
          res.error?.message ?? 'No fue posible guardar la fotografía de entrega.'
        );
        return;
      }
      onFotoEntregaRegistrada?.(res.data.foto);
    } catch (err: unknown) {
      setErrorFotoEntrega(
        err instanceof Error
          ? err.message
          : 'Error al procesar la fotografía de entrega.'
      );
    } finally {
      setSubiendoZonaEntrega(null);
    }
  };

  const todasFotosEntregaVisor: FotoInspeccionItem[] = fotosEntrega;
  const fotoLightboxActual =
    lightboxIdx !== null ? todasFotosEntregaVisor[lightboxIdx] ?? null : null;

  // Fechas reales vs programadas
  const entregaRealISO =
    contrato?.fechaHoraEntregaRealISO ?? detalleAdmin.inspeccionEntregaFechaISO;
  const devolucionRealISO =
    contrato?.fechaHoraDevolucionRealISO ??
    detalleAdmin.inspeccionDevolucionFechaISO;
  const entregaDifiere =
    Boolean(entregaRealISO) &&
    entregaRealISO!.slice(0, 10) !== reserva.fechaInicio;
  const devolucionDifiere =
    Boolean(devolucionRealISO) &&
    devolucionRealISO!.slice(0, 10) !== reserva.fechaFin;

  // Línea de tiempo 5 etapas: Reservado, Entregado, En curso, Devuelto, Finalizado
  const etapasTimeline = useMemo(() => {
    const esCancelada =
      reserva.estado === 'CANCELADA' || reserva.estado === 'RECHAZADA';
    const fueEntregado =
      reserva.estado === 'EN_CURSO' ||
      reserva.estado === 'PAUSADA' ||
      reserva.estado === 'COMPLETADA' ||
      Boolean(entregaRealISO);
    const estaEnCurso =
      reserva.estado === 'EN_CURSO' || reserva.estado === 'PAUSADA';
    const fueDevuelto =
      reserva.estado === 'COMPLETADA' ||
      Boolean(devolucionRealISO) ||
      Boolean(reserva.evaluacionEntrega);
    const estaFinalizado = reserva.estado === 'COMPLETADA';

    return [
      {
        id: 'reservado',
        nombre: 'Reservado',
        estado: esCancelada
          ? ('PENDIENTE' as const)
          : fueEntregado || reserva.estado === 'CONFIRMADA'
            ? ('COMPLETADA' as const)
            : ('ACTUAL' as const),
        fecha: formatFechaHora(reserva.creadaEn),
      },
      {
        id: 'entregado',
        nombre: 'Entregado',
        estado: fueEntregado
          ? ('COMPLETADA' as const)
          : reserva.estado === 'CONFIRMADA'
            ? ('ACTUAL' as const)
            : ('PENDIENTE' as const),
        fecha: entregaRealISO ? formatFechaHora(entregaRealISO) : 'Pendiente',
      },
      {
        id: 'en_curso',
        nombre: 'En curso',
        estado: estaFinalizado
          ? ('COMPLETADA' as const)
          : estaEnCurso
            ? ('ACTUAL' as const)
            : ('PENDIENTE' as const),
        fecha:
          estaEnCurso || estaFinalizado
            ? entregaRealISO
              ? formatFechaCorta(entregaRealISO)
              : formatFechaCorta(reserva.fechaInicio)
            : 'Pendiente',
      },
      {
        id: 'devuelto',
        nombre: 'Devuelto',
        estado: estaFinalizado
          ? ('COMPLETADA' as const)
          : fueDevuelto
            ? ('ACTUAL' as const)
            : ('PENDIENTE' as const),
        fecha: devolucionRealISO
          ? formatFechaHora(devolucionRealISO)
          : reserva.evaluacionEntrega
            ? 'Pre-entrega reportada'
            : 'Pendiente',
      },
      {
        id: 'finalizado',
        nombre: 'Finalizado',
        estado: estaFinalizado
          ? ('COMPLETADA' as const)
          : ('PENDIENTE' as const),
        fecha: estaFinalizado
          ? formatFechaHora(
              contrato?.fechaHoraDevolucionRealISO ?? devolucionRealISO
            )
          : 'Pendiente',
      },
    ];
  }, [
    reserva,
    entregaRealISO,
    devolucionRealISO,
    contrato?.fechaHoraDevolucionRealISO,
  ]);

  const novedadesRevisionCount = revisionDevolucion.filter(
    (r) => r.estado === 'CON_NOVEDAD'
  ).length;

  return (
    <section
      aria-label="Centro de control de la reserva"
      className="flex flex-col rounded-[28px] bg-white dark:bg-[#1F2937] shadow-[0_10px_30px_-15px_rgba(17,24,39,0.08)] border border-[#9CA3AF]/30 dark:border-white/12"
    >
      <div className="px-4 sm:px-5 py-2">
        {/* 1. RESUMEN DEL ALQUILER */}
        <AccordionSection
          id="resumen"
          titulo="Resumen del alquiler"
          resumenContraido={`${vehiculo.placa} · ${conductor.nombreCompleto} · ${formatCop(totalAlquiler)}`}
          badge={etiquetaEstadoReservaCorta(reserva.estado)}
          abierta={abiertas.resumen}
          onToggle={toggleSeccion}
          icono={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
          }
        >
          <div className="rounded-[18px] bg-[#EDEDED]/60 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 p-3.5 space-y-2.5 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-sm font-extrabold text-[#111827] dark:text-[#EDEDED] truncate">
                  {vehiculo.marca} {vehiculo.modelo} · {vehiculo.placa}
                </p>
                <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] truncate">
                  Cliente:{' '}
                  <strong className="text-[#111827] dark:text-[#EDEDED]">
                    {conductor.nombreCompleto}
                  </strong>
                </p>
              </div>
              <span className="shrink-0 font-mono text-[11px] font-bold text-[#111827] dark:text-[#EDEDED]">
                #{reserva.codigo}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#9CA3AF]/20 dark:border-white/10">
              <div>
                <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                  Entrega programada
                </span>
                <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
                  {formatFechaCorta(reserva.fechaInicio)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                  Devolución programada
                </span>
                <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
                  {formatFechaCorta(reserva.fechaFin)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#9CA3AF]/20 dark:border-white/10">
              <div>
                <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                  Valor total
                </span>
                <span className="font-display text-base font-black text-[#111827] dark:text-[#EDEDED] tabular-nums">
                  {formatCop(totalAlquiler)}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                  {saldoPendiente > 0 ? 'Saldo pendiente' : 'Estado de pago'}
                </span>
                <span className="font-mono text-sm font-extrabold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                  {saldoPendiente > 0 ? formatCop(saldoPendiente) : 'Al día'}
                </span>
              </div>
            </div>
          </div>
        </AccordionSection>

        {/* 2. DATOS DEL CLIENTE */}
        <AccordionSection
          id="cliente"
          titulo="Datos del cliente"
          resumenContraido={`${conductor.nombreCompleto} · ${conductor.tipoDocumento || 'CC'} ${conductor.numeroDocumento || 'Sin doc.'}`}
          badge={`Lic. ${conductor.categoriaLicencia || 'N/A'}`}
          abierta={abiertas.cliente}
          onToggle={toggleSeccion}
          icono={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        >
          <div className="rounded-[18px] bg-[#EDEDED]/55 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 p-3.5 space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                  Nombre completo
                </span>
                <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
                  {conductor.nombreCompleto}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                  Documento
                </span>
                <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED]">
                  {conductor.numeroDocumento
                    ? `${conductor.tipoDocumento || 'CC'} ${conductor.numeroDocumento}`
                    : 'Sin registrar'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                  Categoría de licencia
                </span>
                <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
                  {conductor.categoriaLicencia
                    ? `Categoría ${conductor.categoriaLicencia}`
                    : 'Pendiente'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                  Teléfono
                </span>
                <span className="font-mono font-semibold text-[#111827] dark:text-[#EDEDED]">
                  {conductor.telefono || 'No registrado'}
                </span>
              </div>
              {conductor.correo && (
                <div className="col-span-2">
                  <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                    Correo electrónico
                  </span>
                  <span className="font-medium text-[#111827] dark:text-[#EDEDED] break-all">
                    {conductor.correo}
                  </span>
                </div>
              )}
            </div>

            {conductor.telefono && (
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={`tel:${conductor.telefono}`}
                  className="fx-press inline-flex min-h-[44px] items-center rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#1F2937] px-3.5 py-2 text-xs font-bold text-[#111827] dark:text-[#EDEDED]"
                >
                  Llamar cliente
                </a>
                {conductor.correo && (
                  <a
                    href={`mailto:${conductor.correo}`}
                    className="fx-press inline-flex min-h-[44px] items-center rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#1F2937] px-3.5 py-2 text-xs font-bold text-[#111827] dark:text-[#EDEDED]"
                  >
                    Enviar correo
                  </a>
                )}
              </div>
            )}
          </div>

          <SemaforoDocumentalPanel
            reserva={reserva}
            autorizarSinDocumentos={autorizarSinDocumentos}
            onToggleAutorizarSinDocs={onToggleAutorizarSinDocs}
            onDocumentosActualizados={onDocumentosActualizados}
          />
        </AccordionSection>

        {/* 3. FOTOS DE ENTREGA */}
        <AccordionSection
          id="fotos"
          titulo="Fotos de entrega"
          resumenContraido={
            fotosEntrega.length > 0
              ? `${zonasConFotoCount} de ${ZONAS_FOTOS_ALQUILER.length} zonas con fotografía registrada`
              : 'Sin fotografías de entrega registradas'
          }
          badge={`${fotosEntrega.length} fotos`}
          abierta={abiertas.fotos}
          onToggle={toggleSeccion}
          icono={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          }
        >
          {errorFotoEntrega && (
            <div
              role="alert"
              className="rounded-[14px] bg-[#111827] text-[#EDEDED] border border-[#4B5563] px-3 py-2 text-xs flex items-center justify-between gap-2"
            >
              <span>{errorFotoEntrega}</span>
              <button
                type="button"
                onClick={() => setErrorFotoEntrega(null)}
                className="text-[11px] font-bold text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ZONAS_FOTOS_ALQUILER.map((zona, idx) => {
              const foto = fotosEntrega.find((f) => f.zonaEvidencia === zona.id);
              const idxEnVisor = foto
                ? todasFotosEntregaVisor.findIndex((f) => f.id === foto.id)
                : -1;
              const cargando = subiendoZonaEntrega === zona.id;

              return (
                <div
                  key={zona.id}
                  className="rounded-[14px] border border-[#9CA3AF]/30 dark:border-white/12 overflow-hidden bg-[#EDEDED]/50 dark:bg-[#111827] flex flex-col justify-between"
                >
                  {foto ? (
                    <button
                      type="button"
                      onClick={() => setLightboxIdx(idxEnVisor)}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-[#111827]">
                        <img
                          src={foto.url}
                          alt={zona.etiqueta}
                          className="h-full w-full object-cover object-center"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-[11px] font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                          {zona.etiqueta}
                        </p>
                        <p className="text-[10px] text-[#4B5563] dark:text-[#9CA3AF] truncate">
                          {foto.capturadoEnISO
                            ? formatFechaHora(foto.capturadoEnISO)
                            : 'Sin fecha'}
                        </p>
                      </div>
                    </button>
                  ) : (
                    <div className="p-2.5 h-full flex flex-col justify-between min-h-[104px] gap-2">
                      <div>
                        <span className="block text-[11px] font-bold text-[#111827] dark:text-[#EDEDED]">
                          {zona.etiqueta}
                        </span>
                        <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                          Sin fotografía
                        </span>
                      </div>
                      {puedeSubirFotoEntrega && (
                        <label
                          className={`fx-press inline-flex min-h-[36px] items-center justify-center rounded-full border border-[#9CA3AF]/45 dark:border-white/15 bg-white dark:bg-[#1F2937] px-2.5 py-1 text-[10px] font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer ${
                            cargando ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <span>{cargando ? 'Subiendo...' : '+ Subir'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            disabled={cargando}
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              void manejarSubirFotoEntrega(
                                zona.id,
                                zona.etiqueta,
                                idx,
                                file
                              );
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {fotosAdicionalesEntrega.map((foto) => {
              const idxEnVisor = todasFotosEntregaVisor.findIndex(
                (f) => f.id === foto.id
              );
              const etiqueta = etiquetaZonaEvidencia(foto.zonaEvidencia);
              return (
                <div
                  key={foto.id}
                  className="rounded-[14px] border border-[#9CA3AF]/30 dark:border-white/12 overflow-hidden bg-[#EDEDED]/50 dark:bg-[#111827]"
                >
                  <button
                    type="button"
                    onClick={() => setLightboxIdx(idxEnVisor)}
                    className="w-full text-left cursor-pointer"
                  >
                    <div className="aspect-video w-full overflow-hidden bg-[#111827]">
                      <img
                        src={foto.url}
                        alt={etiqueta}
                        className="h-full w-full object-cover object-center"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                        {etiqueta}
                      </p>
                      <p className="text-[10px] text-[#4B5563] dark:text-[#9CA3AF] truncate">
                        {foto.capturadoEnISO
                          ? formatFechaHora(foto.capturadoEnISO)
                          : 'Sin fecha'}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </AccordionSection>

        {/* 4. ESTADO DEL PAGO */}
        <AccordionSection
          id="pagos"
          titulo="Estado del pago"
          resumenContraido={`Abonado ${formatCop(totalAbonado)} de ${formatCop(totalAlquiler)}`}
          badge={
            saldoPendiente > 0 ? `Saldo ${formatCop(saldoPendiente)}` : 'Al día'
          }
          abierta={abiertas.pagos}
          onToggle={toggleSeccion}
          icono={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          }
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[14px] bg-[#EDEDED]/65 dark:bg-[#111827] p-2.5 border border-[#9CA3AF]/20 dark:border-white/10">
              <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                Valor total
              </span>
              <span className="font-mono text-xs sm:text-sm font-extrabold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                {formatCop(totalAlquiler)}
              </span>
            </div>
            <div className="rounded-[14px] bg-[#EDEDED]/65 dark:bg-[#111827] p-2.5 border border-[#9CA3AF]/20 dark:border-white/10">
              <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                Abonado
              </span>
              <span className="font-mono text-xs sm:text-sm font-extrabold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                {formatCop(totalAbonado)}
              </span>
            </div>
            <div className="rounded-[14px] bg-[#EDEDED]/65 dark:bg-[#111827] p-2.5 border border-[#9CA3AF]/20 dark:border-white/10">
              <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                Pendiente
              </span>
              <span className="font-mono text-xs sm:text-sm font-extrabold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                {formatCop(saldoPendiente)}
              </span>
            </div>
          </div>

          {/* Garantía separada del pago del alquiler */}
          <div className="rounded-[14px] bg-[#EDEDED]/45 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 px-3 py-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-[#4B5563] dark:text-[#9CA3AF]">
              Garantía / depósito
            </span>
            <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums text-right">
              {garantia
                ? `${formatCop(garantia.montoRecibido)} · ${etiquetaEstadoGarantia(garantia.estado)}`
                : `${formatCop(vehiculo.depositoGarantia)} · Esperada`}
            </span>
          </div>

          {cobrosAdicionales.length > 0 && (
            <div className="space-y-1.5 text-xs">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
                Cobros adicionales ({cobrosAdicionales.length})
              </span>
              <ul className="divide-y divide-[#EDEDED] dark:divide-white/10 rounded-[14px] border border-[#9CA3AF]/25 dark:border-white/10 bg-white dark:bg-[#111827]">
                {cobrosAdicionales.map((c) => (
                  <li
                    key={c.id}
                    className="px-3 py-2 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#111827] dark:text-[#EDEDED] truncate">
                        {c.concepto} · {c.zona}
                      </p>
                      {(c.registradoPorNombre || c.registradoEnISO) && (
                        <p className="text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                          {c.registradoPorNombre ?? 'Operador'}
                          {c.registradoEnISO
                            ? ` · ${formatFechaHora(c.registradoEnISO)}`
                            : ''}
                        </p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums shrink-0">
                      {formatCop(c.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Historial individual de pagos */}
          <div className="space-y-1.5 text-xs">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
              Historial de pagos
            </span>
            {pagosAlquiler.length > 0 ? (
              <ul className="divide-y divide-[#EDEDED] dark:divide-white/10 rounded-[14px] border border-[#9CA3AF]/25 dark:border-white/10 bg-white dark:bg-[#111827]">
                {pagosAlquiler.map((p) => (
                  <li
                    key={p.id}
                    className="px-3 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#111827] dark:text-[#EDEDED] truncate">
                        {p.concepto}
                      </p>
                      <p className="text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                        {formatFechaHora(p.fechaISO)} ·{' '}
                        {etiquetaMetodoPago(p.metodoPago)}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums shrink-0">
                      {p.tipo === 'EGRESO' ? '-' : ''}
                      {formatCop(p.monto)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                {reserva.montoReportado > 0
                  ? `Abono inicial reportado al reservar: ${formatCop(reserva.montoReportado)} (${formatFechaHora(reserva.creadaEn)}).`
                  : 'Sin pagos registrados aún.'}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onAbrirFactura}
            className="fx-press w-full min-h-[44px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#111827] px-4 py-2 text-xs font-bold text-[#111827] dark:text-[#EDEDED] hover:bg-[#EDEDED] dark:hover:bg-[#1F2937] transition-colors cursor-pointer"
          >
            Ver factura y desglose completo
          </button>
        </AccordionSection>

        {/* 5. FECHAS DEL ALQUILER */}
        <AccordionSection
          id="fechas"
          titulo="Fechas del alquiler"
          resumenContraido={`${formatFechaCorta(reserva.fechaInicio)} → ${formatFechaCorta(reserva.fechaFin)}`}
          badge={
            entregaDifiere || devolucionDifiere ? 'Con variación' : undefined
          }
          abierta={abiertas.fechas}
          onToggle={toggleSeccion}
          icono={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
          }
        >
          <div className="rounded-[16px] border border-[#9CA3AF]/25 dark:border-white/10 divide-y divide-[#EDEDED] dark:divide-white/10 bg-[#EDEDED]/35 dark:bg-[#111827] text-xs">
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                Entrega programada
              </span>
              <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
                {formatFechaCorta(reserva.fechaInicio)}
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                Entrega real
              </span>
              <span className="font-semibold text-[#111827] dark:text-[#EDEDED] text-right">
                {entregaRealISO ? formatFechaHora(entregaRealISO) : 'Pendiente'}
                {entregaDifiere && (
                  <span className="ml-1.5 rounded-full bg-[#111827] dark:bg-[#EDEDED] px-1.5 py-0.5 text-[9px] font-bold text-white dark:text-[#111827]">
                    Diferente
                  </span>
                )}
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                Devolución programada
              </span>
              <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
                {formatFechaCorta(reserva.fechaFin)}
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#4B5563] dark:text-[#9CA3AF]">
                Devolución real
              </span>
              <span className="font-semibold text-[#111827] dark:text-[#EDEDED] text-right">
                {devolucionRealISO
                  ? formatFechaHora(devolucionRealISO)
                  : 'Pendiente'}
                {devolucionDifiere && (
                  <span className="ml-1.5 rounded-full bg-[#111827] dark:bg-[#EDEDED] px-1.5 py-0.5 text-[9px] font-bold text-white dark:text-[#111827]">
                    Diferente
                  </span>
                )}
              </span>
            </div>
          </div>
        </AccordionSection>

        {/* 6. ESTADO DEL PROCESO (LÍNEA DE TIEMPO) */}
        <AccordionSection
          id="timeline"
          titulo="Estado del proceso"
          resumenContraido={`Etapa actual: ${etiquetaEstadoReservaCorta(reserva.estado)}`}
          abierta={abiertas.timeline}
          onToggle={toggleSeccion}
          icono={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        >
          <ol className="relative space-y-3 pl-4 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-[#9CA3AF]/40 dark:before:bg-white/15">
            {etapasTimeline.map((et) => (
              <li
                key={et.id}
                className="relative flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`absolute -left-4 h-3 w-3 rounded-full shrink-0 border-2 ${
                      et.estado === 'COMPLETADA'
                        ? 'bg-[#111827] border-[#111827] dark:bg-[#EDEDED] dark:border-[#EDEDED]'
                        : et.estado === 'ACTUAL'
                          ? 'bg-[#4B5563] border-[#111827] ring-4 ring-[#9CA3AF]/30 dark:bg-[#EDEDED] dark:border-[#EDEDED] dark:ring-white/20'
                          : 'bg-white border-[#9CA3AF] dark:bg-[#1F2937] dark:border-[#9CA3AF]'
                    }`}
                  />
                  <span
                    className={`font-bold ${
                      et.estado === 'PENDIENTE'
                        ? 'text-[#9CA3AF]'
                        : 'text-[#111827] dark:text-[#EDEDED]'
                    }`}
                  >
                    {et.nombre}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#4B5563] dark:text-[#9CA3AF] text-right">
                  {et.fecha}
                </span>
              </li>
            ))}
          </ol>

          {revisionDevolucion.length > 0 && (
            <div className="rounded-[14px] bg-[#EDEDED]/55 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 p-3 text-xs space-y-1">
              <span className="font-bold text-[#111827] dark:text-[#EDEDED] block">
                Revisión de devolución guardada
              </span>
              <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                {revisionDevolucion.length} zonas revisadas ·{' '}
                {novedadesRevisionCount === 0
                  ? 'Sin novedades'
                  : `${novedadesRevisionCount} con novedad`}
              </p>
            </div>
          )}
        </AccordionSection>
      </div>

      {/* PIE CON ACCIONES DIRECTAS: sticky al fondo para que nunca se pierda el botón de finalizar */}
      <div className="sticky bottom-0 z-10 px-4 sm:px-5 py-3.5 border-t border-[#EDEDED] dark:border-white/10 bg-white/95 dark:bg-[#1F2937]/95 backdrop-blur-md rounded-b-[28px] shadow-[0_-8px_20px_-8px_rgba(17,24,39,0.12)] space-y-2.5">
        {errorOperacion && (
          <div
            role="alert"
            className="rounded-[16px] border border-[#9CA3AF]/40 bg-[#111827] px-4 py-3 text-xs text-[#EDEDED]"
          >
            <div className="flex items-start gap-2">
              <span className="font-bold">Atención:</span>
              <span className="flex-1">{errorOperacion}</span>
              <button
                type="button"
                onClick={onClearError}
                className="text-[11px] font-bold text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {reserva.estado === 'PENDIENTE' && (
          <div className="flex flex-wrap items-center gap-2">
            {capacidades?.puedeConfirmarRechazar && (
              <button
                type="button"
                disabled={operacionCargando}
                onClick={onRechazarReserva}
                className="fx-press min-h-[44px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-[#EDEDED] dark:bg-[#111827] px-4 py-2.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
              >
                Rechazar
              </button>
            )}
            {capacidades?.puedeConfirmarRechazar && (
              <button
                type="button"
                disabled={operacionCargando}
                onClick={onConfirmarReserva}
                className="fx-press min-h-[44px] flex-1 rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] disabled:opacity-40 cursor-pointer"
              >
                {operacionCargando
                  ? 'Confirmando...'
                  : 'Confirmar reserva y notificar'}
              </button>
            )}
          </div>
        )}

        {reserva.estado === 'CONFIRMADA' && (
          <div className="flex flex-wrap items-center gap-2">
            {capacidades?.puedeEntregar && (
              <button
                type="button"
                disabled={operacionCargando}
                onClick={() =>
                  navigate(`/admin/reservas/${reserva.codigo}/entrega`)
                }
                className="fx-press min-h-[46px] flex-1 rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] cursor-pointer"
              >
                Iniciar entrega del vehículo →
              </button>
            )}
            {capacidades?.puedeConfirmarRechazar && (
              <button
                type="button"
                disabled={operacionCargando}
                onClick={onCancelarReserva}
                className="fx-press min-h-[46px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-[#EDEDED] dark:bg-[#111827] px-4 py-2.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
              >
                Cancelar reserva
              </button>
            )}
          </div>
        )}

        {(reserva.estado === 'EN_CURSO' || reserva.estado === 'PAUSADA') && (
          <div className="space-y-2">
            {reserva.estado === 'PAUSADA' && (
              <div className="rounded-[14px] bg-[#EDEDED]/80 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 px-3 py-2 text-xs text-[#111827] dark:text-[#EDEDED]">
                Alquiler pausado temporalmente ($0 adicional).
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {reserva.estado === 'PAUSADA' && capacidades?.puedePausar ? (
                <button
                  type="button"
                  disabled={operacionCargando}
                  onClick={onReanudarAlquiler}
                  className="fx-press min-h-[44px] rounded-full bg-[#111827] dark:bg-[#EDEDED] px-3.5 py-2 text-xs font-bold text-white dark:text-[#111827] cursor-pointer"
                >
                  {operacionCargando ? 'Reanudando...' : 'Reanudar alquiler'}
                </button>
              ) : (
                capacidades?.puedePausar && (
                  <button
                    type="button"
                    disabled={operacionCargando}
                    onClick={onPausarAlquiler}
                    className="fx-press min-h-[44px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-[#EDEDED] dark:bg-[#111827] px-3.5 py-2 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
                  >
                    Pausar (+1 día $0)
                  </button>
                )
              )}

              {capacidades?.puedeProrrogarEstandar && (
                <button
                  type="button"
                  disabled={operacionCargando}
                  onClick={onProrrogarAlquiler}
                  className="fx-press min-h-[44px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-[#EDEDED] dark:bg-[#111827] px-3.5 py-2 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
                >
                  Prorrogar alquiler
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={operacionCargando}
              onClick={onAbrirFinalizarAlquiler}
              className="fx-press min-h-[46px] w-full rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] hover:bg-[#1F2937] dark:hover:bg-white transition-colors cursor-pointer"
            >
              Finalizar alquiler →
            </button>

            {capacidades?.puedeAnularContrato && (
              <button
                type="button"
                disabled={operacionCargando}
                onClick={onAnularAlquiler}
                className="min-h-[44px] w-full text-center text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#EDEDED] transition-colors cursor-pointer"
              >
                Anular contrato y alquiler
              </button>
            )}
          </div>
        )}

        {(reserva.estado === 'COMPLETADA' ||
          reserva.estado === 'RECHAZADA' ||
          reserva.estado === 'CANCELADA') && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 rounded-[16px] bg-[#EDEDED]/75 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 px-3.5 py-2.5">
              <div className="min-w-0">
                <span className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
                  {reserva.estado === 'COMPLETADA'
                    ? 'Alquiler finalizado y liquidado'
                    : reserva.estado === 'RECHAZADA'
                      ? 'Solicitud rechazada'
                      : 'Reserva cancelada'}
                </span>
                {reserva.motivoRechazo && (
                  <span className="block text-[11px] text-[#4B5563] dark:text-[#9CA3AF] truncate">
                    Motivo: {reserva.motivoRechazo}
                  </span>
                )}
              </div>

              {capacidades?.puedeAnularContrato && (
                <button
                  type="button"
                  disabled={operacionCargando}
                  onClick={onReabrirReserva}
                  className="fx-press shrink-0 min-h-[44px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#1F2937] px-3.5 py-1.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
                >
                  {operacionCargando ? 'Reabriendo...' : 'Reabrir'}
                </button>
              )}
            </div>

            {reserva.estado === 'COMPLETADA' && (
              <button
                type="button"
                onClick={onAbrirFactura}
                className="fx-press min-h-[44px] w-full rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] cursor-pointer"
              >
                Ver factura final del alquiler
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox para galería de entrega */}
      {fotoLightboxActual && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Fotografía ${etiquetaZonaEvidencia(fotoLightboxActual.zonaEvidencia)}`}
          tabIndex={-1}
          onClick={() => setLightboxIdx(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxIdx(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/90 p-4"
        >
          <div
            role="document"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="max-w-3xl w-full space-y-3 text-center"
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setLightboxIdx(null)}
                aria-label="Cerrar visor"
                className="fx-press min-h-[44px] min-w-[44px] rounded-full border border-white/25 bg-[#1F2937] text-sm font-bold text-[#EDEDED] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <img
              src={fotoLightboxActual.url}
              alt={etiquetaZonaEvidencia(fotoLightboxActual.zonaEvidencia)}
              className="max-h-[70dvh] w-auto mx-auto rounded-[18px] object-contain"
            />
            <div className="flex items-center justify-between gap-3 text-xs text-[#EDEDED]">
              <button
                type="button"
                onClick={() =>
                  setLightboxIdx((i) =>
                    i === null
                      ? null
                      : (i - 1 + todasFotosEntregaVisor.length) %
                        todasFotosEntregaVisor.length
                  )
                }
                className="fx-press min-h-[44px] rounded-full border border-white/20 bg-[#1F2937] px-4 py-2 font-bold cursor-pointer"
              >
                ← Anterior
              </button>
              <div className="min-w-0">
                <p className="font-bold truncate">
                  {etiquetaZonaEvidencia(fotoLightboxActual.zonaEvidencia)}
                </p>
                <p className="text-[11px] text-[#9CA3AF]">
                  {fotoLightboxActual.capturadoEnISO
                    ? formatFechaHora(fotoLightboxActual.capturadoEnISO)
                    : 'Sin fecha de captura'}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setLightboxIdx((i) =>
                    i === null
                      ? null
                      : (i + 1) % todasFotosEntregaVisor.length
                  )
                }
                className="fx-press min-h-[44px] rounded-full border border-white/20 bg-[#1F2937] px-4 py-2 font-bold cursor-pointer"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
