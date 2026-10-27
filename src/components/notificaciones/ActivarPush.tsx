import { useEffect, useState } from 'react';
import { BellRing, BellOff, Check } from 'lucide-react';
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
 * Invitación contextual para activar y probar avisos del sistema.
 * - Si está 'pendiente': pide permiso tras un toque del usuario.
 * - Si está 'concedido': permite enviar una notificación de prueba al dispositivo actual.
 * - Si está 'denegado' o 'no-soportado': informa la acción correctiva.
 */
export default function ActivarPush({ clavePublicaVapid }: ActivarPushProps) {
  const [estado, setEstado] = useState<EstadoPermisoPush>('no-soportado');
  const [trabajando, setTrabajando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [enviandoPrueba, setEnviandoPrueba] = useState(false);
  const [mensajePrueba, setMensajePrueba] = useState<string | null>(null);

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

  if (!clavePublicaVapid) return null;

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

  const enviarPrueba = async () => {
    setEnviandoPrueba(true);
    setMensajePrueba(null);
    try {
      // Reaseguramos suscripción antes del envío
      const suscripcion = await obtenerSuscripcionPush();
      if (suscripcion) {
        await actions.notificaciones.suscribirPush(suscripcion);
      }
      const { error } = await actions.notificaciones.enviarPrueba();
      if (error) {
        setMensajePrueba('No se pudo enviar la prueba. Inténtalo de nuevo.');
      } else {
        setMensajePrueba('¡Notificación enviada! Si bloqueas tu pantalla o sales de la app, verás la alerta en tu dispositivo.');
      }
    } catch {
      setMensajePrueba('Error de conexión al enviar la prueba.');
    } finally {
      setEnviandoPrueba(false);
    }
  };

  if (estado === 'concedido') {
    return (
      <div className="mx-4 mb-2 flex flex-col gap-2 rounded-2xl border border-[#4B5563] bg-[#1F2937] p-3 text-[#EDEDED]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[#EDEDED] border border-[#4B5563]">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#EDEDED]">Avisos push activos</p>
              <p className="truncate text-xs text-[#9CA3AF]">Este dispositivo recibe alertas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void enviarPrueba()}
            disabled={enviandoPrueba}
            className="min-h-[44px] shrink-0 rounded-full bg-[#EDEDED] px-3.5 text-xs font-bold text-[#111827] active:bg-[#9CA3AF] disabled:opacity-60"
          >
            {enviandoPrueba ? 'Enviando…' : 'Enviar prueba'}
          </button>
        </div>
        {mensajePrueba && (
          <p className="text-xs leading-relaxed text-[#EDEDED] bg-[#111827] rounded-xl p-2.5 border border-[#4B5563]">
            {mensajePrueba}
          </p>
        )}
      </div>
    );
  }

  if (estado === 'pendiente') {
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

  if (estado === 'denegado') {
    return (
      <div className="mx-4 mb-2 flex items-center gap-3 rounded-2xl border border-[#4B5563] bg-[#1F2937] p-3 text-[#9CA3AF]">
        <BellOff className="h-5 w-5 shrink-0 text-[#9CA3AF]" aria-hidden="true" />
        <p className="text-xs leading-snug">
          Notificaciones bloqueadas en tu navegador. Habilítalas en los ajustes del dispositivo para recibir alertas.
        </p>
      </div>
    );
  }

  // Si no está soportado en iOS Safari regular (fuera de PWA)
  const esIos = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (esIos) {
    return (
      <div className="mx-4 mb-2 flex items-center gap-3 rounded-2xl border border-[#4B5563] bg-[#1F2937] p-3 text-[#9CA3AF]">
        <BellRing className="h-5 w-5 shrink-0 text-[#EDEDED]" aria-hidden="true" />
        <p className="text-xs leading-snug">
          En iPhone/iPad, para recibir notificaciones agrega FlotaX a tu pantalla de inicio (Compartir &gt; Agregar al inicio).
        </p>
      </div>
    );
  }

  return null;
}
