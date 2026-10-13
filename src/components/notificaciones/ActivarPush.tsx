import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { actions } from 'astro:actions';
import {
  estadoPermisoPush,
  obtenerSuscripcionPush,
  suscribirDispositivoPush,
  type EstadoPermisoPush,
} from '@/lib/pwa';

const CLAVE_SINCRONIZADO = 'flotax:push:sincronizado';

interface ActivarPushProps {
  clavePublicaVapid: string | undefined;
}

/**
 * Invitación contextual para activar avisos del sistema. El permiso se pide únicamente
 * tras un toque del usuario (los navegadores bloquean los permisos solicitados "en frío").
 * Si el permiso ya fue concedido, re-sincroniza en silencio la suscripción de este dispositivo.
 */
export default function ActivarPush({ clavePublicaVapid }: ActivarPushProps) {
  const [estado, setEstado] = useState<EstadoPermisoPush>('no-soportado');
  const [trabajando, setTrabajando] = useState(false);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const actual = estadoPermisoPush();
    setEstado(actual);
    if (actual !== 'concedido' || sessionStorage.getItem(CLAVE_SINCRONIZADO)) return;
    void (async () => {
      const suscripcion = await obtenerSuscripcionPush();
      if (!suscripcion) return;
      const { error } = await actions.notificaciones.suscribirPush(suscripcion);
      if (!error) sessionStorage.setItem(CLAVE_SINCRONIZADO, '1');
    })();
  }, []);

  if (!clavePublicaVapid || estado !== 'pendiente') return null;

  const activar = async () => {
    setTrabajando(true);
    setFallo(false);
    try {
      const suscripcion = await suscribirDispositivoPush(clavePublicaVapid);
      setEstado(estadoPermisoPush());
      if (!suscripcion) return;
      const { error } = await actions.notificaciones.suscribirPush(suscripcion);
      if (error) setFallo(true);
      else sessionStorage.setItem(CLAVE_SINCRONIZADO, '1');
    } catch {
      setFallo(true);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="mx-4 mb-2 flex items-center gap-3 rounded-2xl border border-[#4B5563] bg-[#1F2937] p-3">
      <BellRing className="h-5 w-5 shrink-0 text-[#EDEDED]" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm leading-snug text-[#9CA3AF]">
        {fallo ? 'No pudimos activar los avisos. Inténtalo de nuevo.' : 'Recibe avisos aunque la app esté cerrada.'}
      </p>
      <button
        type="button"
        onClick={() => void activar()}
        disabled={trabajando}
        className="min-h-[44px] shrink-0 rounded-full bg-[#EDEDED] px-4 text-sm font-bold text-[#111827] active:bg-[#9CA3AF] disabled:opacity-60"
      >
        {trabajando ? 'Activando…' : 'Activar'}
      </button>
    </div>
  );
}
