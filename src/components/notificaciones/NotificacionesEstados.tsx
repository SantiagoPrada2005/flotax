import { BellOff, WifiOff } from 'lucide-react';
import type { FiltroNotificaciones } from './useNotificaciones';

export function NotificacionesSkeleton() {
  return (
    <ul className="space-y-2 px-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex min-h-[64px] items-start gap-3 rounded-2xl bg-[#1F2937]/60 px-3 py-3">
          <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[#4B5563]/50" />
          <span className="flex-1 space-y-2 pt-1">
            <span className="block h-3.5 w-3/5 animate-pulse rounded bg-[#4B5563]/50" />
            <span className="block h-3 w-4/5 animate-pulse rounded bg-[#4B5563]/30" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function NotificacionesVacio({ filtro }: { filtro: FiltroNotificaciones }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#4B5563] text-[#9CA3AF]">
        <BellOff className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <p className="text-base font-semibold text-[#EDEDED]">
        {filtro === 'sin-leer' ? 'No tienes avisos sin leer' : 'Todo al día'}
      </p>
      <p className="mt-1 max-w-[260px] text-sm text-[#9CA3AF]">
        Te avisaremos aquí cuando haya novedades en tus reservas y en tu patio.
      </p>
    </div>
  );
}

export function NotificacionesError({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center" role="alert">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#4B5563] text-[#9CA3AF]">
        <WifiOff className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <p className="text-base font-semibold text-[#EDEDED]">No pudimos cargar tus avisos</p>
      <p className="mt-1 text-sm text-[#9CA3AF]">Revisa tu conexión e inténtalo de nuevo.</p>
      <button
        type="button"
        onClick={onReintentar}
        className="mt-5 min-h-[44px] rounded-full bg-[#EDEDED] px-6 text-sm font-bold text-[#111827] active:bg-[#9CA3AF]"
      >
        Reintentar
      </button>
    </div>
  );
}
