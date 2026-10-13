import {
  Bell,
  CalendarCheck,
  CalendarX,
  FileWarning,
  Megaphone,
  RotateCcw,
  Truck,
  UserPlus,
  Wallet,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import type { NotificacionSelect } from '@/db/schema';
import { tipoNotificacionSchema, type TipoNotificacion } from '@/lib/notificaciones/tipos';
import { formatTiempoRelativo } from '@/lib/time/client-time';

const ICONOS: Record<TipoNotificacion, LucideIcon> = {
  SOLICITUD_NUEVA: Inbox,
  RESERVA_CONFIRMADA: CalendarCheck,
  RESERVA_RECHAZADA: CalendarX,
  ABONO_REGISTRADO: Wallet,
  ENTREGA_PROGRAMADA: Truck,
  DEVOLUCION_PROXIMA: RotateCcw,
  DOCUMENTO_POR_VENCER: FileWarning,
  INVITACION_RECIBIDA: UserPlus,
  ANUNCIO_PLATAFORMA: Megaphone,
};

function iconoDeTipo(tipo: string): LucideIcon {
  const valido = tipoNotificacionSchema.safeParse(tipo);
  return valido.success ? ICONOS[valido.data] : Bell;
}

interface NotificacionItemProps {
  notificacion: NotificacionSelect;
  ahora: Date;
  onAbrir: (notificacion: NotificacionSelect) => void;
}

/**
 * Una notificación = un hecho + una acción: tocar la fila navega al recurso y la marca como leída.
 * El estado "sin leer" se comunica con punto + peso tipográfico + fondo, no solo con color.
 */
export default function NotificacionItem({ notificacion, ahora, onAbrir }: NotificacionItemProps) {
  const Icono = iconoDeTipo(notificacion.tipo);
  const sinLeer = notificacion.leidaEn === null;
  const urgente = notificacion.prioridad === 'URGENTE';

  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir(notificacion)}
        className={`flex min-h-[64px] w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors active:bg-[#4B5563]/40 ${
          sinLeer ? 'bg-[#1F2937]' : 'bg-transparent hover:bg-[#1F2937]/60'
        }`}
      >
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
            sinLeer ? 'border-[#4B5563] bg-[#111827] text-[#EDEDED]' : 'border-[#4B5563]/50 text-[#9CA3AF]'
          }`}
          aria-hidden="true"
        >
          <Icono className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={`truncate text-[15px] leading-tight ${
                sinLeer ? 'font-semibold text-[#EDEDED]' : 'font-medium text-[#9CA3AF]'
              }`}
            >
              {notificacion.titulo}
            </span>
            {urgente && sinLeer && (
              <span className="shrink-0 rounded-full border border-[#EDEDED]/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#EDEDED]">
                Urgente
              </span>
            )}
          </span>
          {notificacion.detalle && (
            <span className="mt-1 line-clamp-2 block text-sm leading-snug text-[#9CA3AF]">
              {notificacion.detalle}
            </span>
          )}
          <span className="mt-1.5 block text-xs text-[#9CA3AF]/80">
            {formatTiempoRelativo(notificacion.creadaEn, ahora)}
          </span>
        </span>

        {sinLeer && (
          <>
            <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#EDEDED]" aria-hidden="true" />
            <span className="sr-only">Sin leer</span>
          </>
        )}
      </button>
    </li>
  );
}
