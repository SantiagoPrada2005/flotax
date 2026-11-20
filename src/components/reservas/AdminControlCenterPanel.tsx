import { useMemo, useState, type ReactNode } from 'react';
import { navigate } from 'astro:transitions/client';
import type { ReservaClienteItem } from '@/lib/flota';
import type { CapacidadesOperacionAlquiler } from '@/lib/auth/capacidades-alquiler';
import type {
  DetalleReservaAdminContext,
  FotoInspeccionItem,
} from '@/lib/flota/detalle-reserva-admin';
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
  | 'inspeccion'
  | 'pagos'
  | 'fechas'
  | 'timeline';

const ZONAS_GALERIA_ENTREGA: Array<{ id: ZonaEvidenciaVehiculo; etiqueta: string }> = [
  { id: 'EXTERIOR_FRONTAL', etiqueta: 'Frente' },
  { id: 'EXTERIOR_LATERAL_DER', etiqueta: 'Lateral derecho' },
  { id: 'EXTERIOR_LATERAL_IZQ', etiqueta: 'Lateral izquierdo' },
  { id: 'EXTERIOR_TRASERO', etiqueta: 'Parte trasera' },
  { id: 'INTERIOR_CABINA', etiqueta: 'Interior' },
  { id: 'PANTALLA_TABLERO_ODOMETRO', etiqueta: 'Tablero y odómetro' },
];

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

function etiquetaEstadoReserva(estado: ReservaClienteItem['estado']): string {
  switch (estado) {
    case 'PENDIENTE':
      return 'Reservado (Pendiente)';
    case 'CONFIRMADA':
      return 'Reservado · Confirmado';
    case 'EN_CURSO':
      return 'En curso';
    case 'PAUSADA':
      return 'En pausa';
    case 'COMPLETADA':
      return 'Finalizado';
    case 'CANCELADA':
      return 'Cancelado';
    case 'RECHAZADA':
      return 'Rechazado';
  }
}

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
        className="w-full py-3.5 px-1 flex items-center justify-between gap-3 text-left cursor-pointer group"
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

      {abierta && <div className="pb-4 pt-1 px-1 space-y-3">{children}</div>}
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
    inspeccion: false,
    pagos: false,
    fechas: false,
    timeline: false,
  });

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const toggleSeccion = (id: SeccionControlId) => {
    setAbiertas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const { vehiculo, conductor } = reserva;
  const { contrato, garantia, fotosEntrega, pagosHistorial } = detalleAdmin;

  const totalAlquiler = contrato?.totalLiquidado ?? reserva.totalAlquiler;
  const totalAbonado = contrato?.totalPagado ?? reserva.montoReportado;
  const saldoPendiente = Math.max(0, totalAlquiler - totalAbonado);

  const pagosAlquiler = useMemo(
    () =>
      pagosHistorial.filter(
        (p) =>
          p.categoria !== 'DEPOSITO_GARANTIA' &&
          p.categoria !== 'REEMBOLSO_GARANTIA'
      ),
    [pagosHistorial]
  );

  // Galería de entrega: zonas esperadas + adicionales
  const fotosAdicionalesEntrega = useMemo(
    () =>
      fotosEntrega.filter(
        (f) => !ZONAS_GALERIA_ENTREGA.some((z) => z.id === f.zonaEvidencia)
      ),
    [fotosEntrega]
  );

  const todasFotosEntregaVisor: FotoInspeccionItem[] = fotosEntrega;
  const fotoLightboxActual =
    lightboxIdx !== null ? todasFotosEntregaVisor[lightboxIdx] ?? null : null;

  // Fechas reales vs programadas
  const entregaRealISO = detalleAdmin.inspeccionEntregaFechaISO ?? contrato?.fechaHoraEntregaRealISO;
  const devolucionRealISO =
    detalleAdmin.inspeccionDevolucionFechaISO ?? contrato?.fechaHoraDevolucionRealISO;
  const entregaDifiere =
    Boolean(entregaRealISO) &&
    entregaRealISO!.slice(0, 10) !== reserva.fechaInicio;
  const devolucionDifiere =
    Boolean(devolucionRealISO) &&
    devolucionRealISO!.slice(0, 10) !== reserva.fechaFin;

  // Línea de tiempo 5 etapas reales
  const etapasTimeline = useMemo(() => {
    const esCancelada =
      reserva.estado === 'CANCELADA' || reserva.estado === 'RECHAZADA';
    const fueEntregado =
      reserva.estado === 'EN_CURSO' ||
      reserva.estado === 'PAUSADA' ||
      reserva.estado === 'COMPLETADA' ||
      Boolean(entregaRealISO);
    const estaEnCurso = reserva.estado === 'EN_CURSO' || reserva.estado === 'PAUSADA';
    const fueDevuelto =
      reserva.estado === 'COMPLETADA' || Boolean(devolucionRealISO);
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
        fecha: estaEnCurso || estaFinalizado ? formatFechaCorta(reserva.fechaInicio) : 'Pendiente',
      },
      {
        id: 'devuelto',
        nombre: 'Devuelto',
        estado: fueDevuelto ? ('COMPLETADA' as const) : ('PENDIENTE' as const),
        fecha: devolucionRealISO ? formatFechaHora(devolucionRealISO) : 'Pendiente',
      },
      {
        id: 'finalizado',
        nombre: 'Finalizado',
        estado: estaFinalizado ? ('COMPLETADA' as const) : ('PENDIENTE' as const),
        fecha: estaFinalizado
          ? formatFechaHora(devolucionRealISO ?? contrato?.fechaHoraDevolucionRealISO)
          : 'Pendiente',
      },
    ];
  }, [reserva, entregaRealISO, devolucionRealISO, contrato?.fechaHoraDevolucionRealISO]);

  return (
    <section
      aria-label="Centro de control de la reserva"
      className="rounded-[28px] bg-white dark:bg-[#1F2937] p-4 sm:p-5 shadow-[0_10px_30px_-15px_rgba(17,24,39,0.08)] border border-[#E5E4DF]/80 dark:border-white/12 divide-y-0"
    >
      {/* 1. RESUMEN DEL ALQUILER */}
      <AccordionSection
        id="resumen"
        titulo="Resumen del alquiler"
        resumenContraido={`${vehiculo.placa} · ${conductor.nombreCompleto} · ${formatCop(totalAlquiler)}`}
        badge={etiquetaEstadoReserva(reserva.estado)}
        abierta={abiertas.resumen}
        onToggle={toggleSeccion}
        icono={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
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
                Cliente: <strong className="text-[#111827] dark:text-[#EDEDED]">{conductor.nombreCompleto}</strong>
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
            {saldoPendiente > 0 && (
              <div className="text-right">
                <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                  Saldo pendiente
                </span>
                <span className="font-mono text-sm font-extrabold text-[#111827] dark:text-[#EDEDED] tabular-nums">
                  {formatCop(saldoPendiente)}
                </span>
              </div>
            )}
          </div>
        </div>
      </AccordionSection>

      {/* 2. INFORMACIÓN DEL CLIENTE */}
      <AccordionSection
        id="cliente"
        titulo="Información del cliente"
        resumenContraido={`${conductor.nombreCompleto} · ${conductor.tipoDocumento} ${conductor.numeroDocumento}`}
        badge={`Lic. ${conductor.categoriaLicencia}`}
        abierta={abiertas.cliente}
        onToggle={toggleSeccion}
        icono={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        }
      >
        <div className="rounded-[18px] bg-[#EDEDED]/55 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 p-3.5 space-y-2.5 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">Nombre completo</span>
              <span className="font-bold text-[#111827] dark:text-[#EDEDED]">{conductor.nombreCompleto}</span>
            </div>
            <div>
              <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">Documento</span>
              <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED]">
                {conductor.tipoDocumento} {conductor.numeroDocumento}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">Licencia</span>
              <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
                Categoría {conductor.categoriaLicencia}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">Contacto</span>
              <span className="font-mono font-semibold text-[#111827] dark:text-[#EDEDED]">
                {conductor.telefono || 'No registrado'}
              </span>
            </div>
          </div>

          {conductor.telefono && (
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={`tel:${conductor.telefono}`}
                className="fx-press inline-flex min-h-[40px] items-center rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#1F2937] px-3.5 py-1.5 text-[11px] font-bold text-[#111827] dark:text-[#EDEDED]"
              >
                Llamar cliente
              </a>
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

      {/* 3. INSPECCIÓN Y FOTOGRAFÍAS DE ENTREGA */}
      <AccordionSection
        id="inspeccion"
        titulo="Inspección y fotografías de entrega"
        resumenContraido={
          fotosEntrega.length > 0
            ? `${fotosEntrega.length} fotografía${fotosEntrega.length === 1 ? '' : 's'} registrada${fotosEntrega.length === 1 ? '' : 's'}`
            : 'Sin fotografías de entrega registradas'
        }
        badge={`${fotosEntrega.length} fotos`}
        abierta={abiertas.inspeccion}
        onToggle={toggleSeccion}
        icono={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
          </svg>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {ZONAS_GALERIA_ENTREGA.map((zona) => {
            const foto = fotosEntrega.find((f) => f.zonaEvidencia === zona.id);
            const idxEnVisor = foto
              ? todasFotosEntregaVisor.findIndex((f) => f.id === foto.id)
              : -1;
            return (
              <div
                key={zona.id}
                className="rounded-[14px] border border-[#9CA3AF]/30 dark:border-white/12 overflow-hidden bg-[#EDEDED]/50 dark:bg-[#111827]"
              >
                {foto ? (
                  <button
                    type="button"
                    onClick={() => setLightboxIdx(idxEnVisor)}
                    className="w-full text-left cursor-pointer group"
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
                  <div className="p-2.5 h-full flex flex-col justify-between min-h-[92px]">
                    <span className="text-[11px] font-bold text-[#4B5563] dark:text-[#9CA3AF]">
                      {zona.etiqueta}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF]">Sin fotografía</span>
                  </div>
                )}
              </div>
            );
          })}

          {fotosAdicionalesEntrega.map((foto) => {
            const idxEnVisor = todasFotosEntregaVisor.findIndex((f) => f.id === foto.id);
            return (
              <div
                key={foto.id}
                className="rounded-[14px] border border-[#9CA3AF]/30 dark:border-white/12 overflow-hidden bg-[#EDEDED]/50 dark:bg-[#111827]"
              >
                <button
                  type="button"
                  onClick={() => setLightboxIdx(idxEnVisor)}
                  className="w-full text-left cursor-pointer group"
                >
                  <div className="aspect-video w-full overflow-hidden bg-[#111827]">
                    <img
                      src={foto.url}
                      alt={foto.zonaEvidencia}
                      className="h-full w-full object-cover object-center"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                      {foto.zonaEvidencia.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-[#4B5563] dark:text-[#9CA3AF] truncate">
                      {foto.capturadoEnISO ? formatFechaHora(foto.capturadoEnISO) : 'Sin fecha'}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </AccordionSection>

      {/* 5. ESTADO DE PAGOS */}
      <AccordionSection
        id="pagos"
        titulo="Estado de pagos"
        resumenContraido={`Abonado ${formatCop(totalAbonado)} de ${formatCop(totalAlquiler)}`}
        badge={saldoPendiente > 0 ? `Saldo ${formatCop(saldoPendiente)}` : 'Al día'}
        abierta={abiertas.pagos}
        onToggle={toggleSeccion}
        icono={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
        }
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-[14px] bg-[#EDEDED]/65 dark:bg-[#111827] p-2.5 border border-[#9CA3AF]/20 dark:border-white/10">
            <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">Total alquiler</span>
            <span className="font-mono text-xs sm:text-sm font-extrabold text-[#111827] dark:text-[#EDEDED] tabular-nums">
              {formatCop(totalAlquiler)}
            </span>
          </div>
          <div className="rounded-[14px] bg-[#EDEDED]/65 dark:bg-[#111827] p-2.5 border border-[#9CA3AF]/20 dark:border-white/10">
            <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">Abonado</span>
            <span className="font-mono text-xs sm:text-sm font-extrabold text-[#111827] dark:text-[#EDEDED] tabular-nums">
              {formatCop(totalAbonado)}
            </span>
          </div>
          <div className="rounded-[14px] bg-[#EDEDED]/65 dark:bg-[#111827] p-2.5 border border-[#9CA3AF]/20 dark:border-white/10">
            <span className="block text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">Pendiente</span>
            <span className="font-mono text-xs sm:text-sm font-extrabold text-[#111827] dark:text-[#EDEDED] tabular-nums">
              {formatCop(saldoPendiente)}
            </span>
          </div>
        </div>

        {/* Garantía separada del pago del alquiler */}
        <div className="rounded-[14px] bg-[#EDEDED]/45 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 px-3 py-2 flex items-center justify-between text-xs">
          <span className="text-[#4B5563] dark:text-[#9CA3AF]">Garantía / depósito</span>
          <span className="font-mono font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
            {garantia ? `${formatCop(garantia.montoRecibido)} (${garantia.estado})` : formatCop(vehiculo.depositoGarantia)}
          </span>
        </div>

        {/* Historial individual de pagos */}
        <div className="space-y-1.5 text-xs">
          <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
            Historial de transacciones
          </span>
          {pagosAlquiler.length > 0 ? (
            <ul className="divide-y divide-[#EDEDED] dark:divide-white/10 rounded-[14px] border border-[#9CA3AF]/25 dark:border-white/10 bg-white dark:bg-[#111827]">
              {pagosAlquiler.map((p) => (
                <li key={p.id} className="px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#111827] dark:text-[#EDEDED] truncate">
                      {p.concepto}
                    </p>
                    <p className="text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                      {formatFechaHora(p.fechaISO)} · {p.metodoPago}
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
              Sin movimientos de caja registrados aún.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onAbrirFactura}
          className="fx-press w-full min-h-[44px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#111827] px-4 py-2 text-xs font-bold text-[#111827] dark:text-[#EDEDED] hover:bg-[#EDEDED] dark:hover:bg-[#1F2937] cursor-pointer"
        >
          Consultar factura y desglose completo
        </button>
      </AccordionSection>

      {/* 6. FECHAS DEL ALQUILER */}
      <AccordionSection
        id="fechas"
        titulo="Fechas del alquiler"
        resumenContraido={`${formatFechaCorta(reserva.fechaInicio)} → ${formatFechaCorta(reserva.fechaFin)}`}
        badge={entregaDifiere || devolucionDifiere ? 'Con variación' : undefined}
        abierta={abiertas.fechas}
        onToggle={toggleSeccion}
        icono={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
        }
      >
        <div className="rounded-[16px] border border-[#9CA3AF]/25 dark:border-white/10 divide-y divide-[#EDEDED] dark:divide-white/10 bg-[#EDEDED]/35 dark:bg-[#111827] text-xs">
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#4B5563] dark:text-[#9CA3AF]">Entrega programada</span>
            <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
              {formatFechaCorta(reserva.fechaInicio)}
            </span>
          </div>
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#4B5563] dark:text-[#9CA3AF]">Entrega real</span>
            <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
              {entregaRealISO ? formatFechaHora(entregaRealISO) : 'Pendiente'}
              {entregaDifiere && ' (Diferencia)'}
            </span>
          </div>
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#4B5563] dark:text-[#9CA3AF]">Devolución programada</span>
            <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
              {formatFechaCorta(reserva.fechaFin)}
            </span>
          </div>
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="text-[#4B5563] dark:text-[#9CA3AF]">Devolución real</span>
            <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
              {devolucionRealISO ? formatFechaHora(devolucionRealISO) : 'Pendiente'}
              {devolucionDifiere && ' (Diferencia)'}
            </span>
          </div>
        </div>
      </AccordionSection>

      {/* 7. ESTADO DEL PROCESO (LÍNEA DE TIEMPO) */}
      <AccordionSection
        id="timeline"
        titulo="Estado del proceso"
        resumenContraido={`Etapa actual: ${etiquetaEstadoReserva(reserva.estado)}`}
        abierta={abiertas.timeline}
        onToggle={toggleSeccion}
        icono={
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        }
      >
        <ol className="space-y-2.5 pl-1">
          {etapasTimeline.map((et) => (
            <li key={et.id} className="flex items-start justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span
                  className={`h-3 w-3 rounded-full shrink-0 border ${
                    et.estado === 'COMPLETADA'
                      ? 'bg-[#111827] border-[#111827] dark:bg-[#EDEDED] dark:border-[#EDEDED]'
                      : et.estado === 'ACTUAL'
                        ? 'bg-status-warning border-status-warning ring-4 ring-status-warning/20'
                        : 'bg-transparent border-[#9CA3AF]'
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
      </AccordionSection>

      {/* ACCIONES DIRECTAS DEL ALQUILER */}
      <div className="pt-3.5 mt-1 border-t border-[#EDEDED] dark:border-white/10 space-y-2.5">
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
                className="min-h-[44px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-[#EDEDED] dark:bg-[#111827] px-4 py-2.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
              >
                Rechazar
              </button>
            )}
            {capacidades?.puedeConfirmarRechazar && (
              <button
                type="button"
                disabled={operacionCargando}
                onClick={onConfirmarReserva}
                className="min-h-[44px] flex-1 rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] disabled:opacity-50 cursor-pointer"
              >
                {operacionCargando ? 'Confirmando...' : 'Confirmar reserva y notificar'}
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
                onClick={() => navigate(`/admin/reservas/${reserva.codigo}/entrega`)}
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
                className="min-h-[46px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-[#EDEDED] dark:bg-[#111827] px-4 py-2.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
              >
                Cancelar reserva
              </button>
            )}
          </div>
        )}

        {(reserva.estado === 'EN_CURSO' || reserva.estado === 'PAUSADA') && (
          <div className="space-y-2.5">
            {reserva.estado === 'PAUSADA' && (
              <div className="rounded-[14px] bg-[#EDEDED]/80 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 p-3 text-xs text-[#111827] dark:text-[#EDEDED]">
                Alquiler pausado temporalmente ($0 adicional).
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {reserva.estado === 'PAUSADA' && capacidades?.puedePausar ? (
                <button
                  type="button"
                  disabled={operacionCargando}
                  onClick={onReanudarAlquiler}
                  className="min-h-[44px] rounded-full bg-[#111827] dark:bg-[#EDEDED] px-3.5 py-2 text-xs font-bold text-white dark:text-[#111827] cursor-pointer"
                >
                  {operacionCargando ? 'Reanudando...' : 'Reanudar alquiler'}
                </button>
              ) : (
                capacidades?.puedePausar && (
                  <button
                    type="button"
                    disabled={operacionCargando}
                    onClick={onPausarAlquiler}
                    className="min-h-[44px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-[#EDEDED] dark:bg-[#111827] px-3.5 py-2 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
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
                  className="min-h-[44px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-[#EDEDED] dark:bg-[#111827] px-3.5 py-2 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
                >
                  Prorrogar alquiler
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={operacionCargando}
              onClick={onAbrirFinalizarAlquiler}
              className="fx-press min-h-[46px] w-full rounded-full bg-[#111827] dark:bg-[#EDEDED] px-5 py-2.5 text-xs font-bold text-white dark:text-[#111827] hover:bg-[#1F2937] dark:hover:bg-white cursor-pointer"
            >
              Finalizar alquiler (Inspección comparativa) →
            </button>

            {capacidades?.puedeAnularContrato && (
              <button
                type="button"
                disabled={operacionCargando}
                onClick={onAnularAlquiler}
                className="min-h-[40px] w-full text-center text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#EDEDED] cursor-pointer"
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
                  className="shrink-0 min-h-[40px] rounded-full border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#1F2937] px-3.5 py-1.5 text-xs font-bold text-[#111827] dark:text-[#EDEDED] cursor-pointer"
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
            <img
              src={fotoLightboxActual.url}
              alt={fotoLightboxActual.zonaEvidencia}
              className="max-h-[75dvh] w-auto mx-auto rounded-[18px] object-contain"
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
                className="min-h-[44px] rounded-full border border-white/20 bg-[#1F2937] px-4 py-2 font-bold cursor-pointer"
              >
                ← Anterior
              </button>
              <div className="min-w-0">
                <p className="font-bold truncate">
                  {fotoLightboxActual.zonaEvidencia.replace(/_/g, ' ')}
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
                    i === null ? null : (i + 1) % todasFotosEntregaVisor.length
                  )
                }
                className="min-h-[44px] rounded-full border border-white/20 bg-[#1F2937] px-4 py-2 font-bold cursor-pointer"
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
