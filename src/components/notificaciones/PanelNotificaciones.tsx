import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { motion, useDragControls, useReducedMotion } from 'framer-motion';
import { navigate } from 'astro:transitions/client';
import { X } from 'lucide-react';
import type { NotificacionSelect } from '@/db/schema';
import ActivarPush from './ActivarPush';
import ListaNotificaciones from './ListaNotificaciones';
import { useListaNotificaciones, type FiltroNotificaciones } from './useNotificaciones';

interface PanelNotificacionesProps {
  contador: number;
  setContador: (valor: number) => void;
  refrescarContador: () => Promise<void>;
  clavePublicaVapid: string | undefined;
  onCerrar: () => void;
}

const SELECTOR_FOCO = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function useEsMovil(): boolean {
  const [esMovil, setEsMovil] = useState(true);
  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 767px)');
    const actualizar = () => setEsMovil(consulta.matches);
    actualizar();
    consulta.addEventListener('change', actualizar);
    return () => consulta.removeEventListener('change', actualizar);
  }, []);
  return esMovil;
}

/**
 * Bottom sheet arrastrable en móvil / popover anclado en escritorio.
 * Preserva la pantalla de fondo; el historial completo vive en /notificaciones.
 */
export default function PanelNotificaciones({
  contador,
  setContador,
  refrescarContador,
  clavePublicaVapid,
  onCerrar,
}: PanelNotificacionesProps) {
  const [filtro, setFiltro] = useState<FiltroNotificaciones>('todas');
  const esMovil = useEsMovil();
  const sinMovimiento = useReducedMotion();
  const controlesArrastre = useDragControls();
  const contenedor = useRef<HTMLDivElement | null>(null);
  const botonCerrar = useRef<HTMLButtonElement | null>(null);

  const lista = useListaNotificaciones({
    habilitado: true,
    filtro,
    contador,
    setContador,
    refrescarContador,
  });

  useEffect(() => {
    botonCerrar.current?.focus();
  }, []);

  const abrir = useCallback(
    (notificacion: NotificacionSelect) => {
      void lista.marcarLeida(notificacion.id);
      onCerrar();
      if (notificacion.href) void navigate(notificacion.href);
    },
    [lista, onCerrar]
  );

  const manejarTeclado = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      onCerrar();
      return;
    }
    if (evento.key !== 'Tab' || !contenedor.current) return;
    const enfocables = [...contenedor.current.querySelectorAll<HTMLElement>(SELECTOR_FOCO)];
    const primero = enfocables[0];
    const ultimo = enfocables.at(-1);
    if (!primero || !ultimo) return;
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  };

  const duracion = sinMovimiento ? 0 : 0.28;
  const entrada = esMovil ? { y: '100%' } : { opacity: 0, y: -8, scale: 0.98 };
  const visible = esMovil ? { y: 0 } : { opacity: 1, y: 0, scale: 1 };

  return (
    <>
      <motion.button
        type="button"
        aria-label="Cerrar notificaciones"
        tabIndex={-1}
        onClick={onCerrar}
        className="fixed inset-0 z-[60] cursor-default bg-[#111827]/60 md:bg-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: duracion }}
      />

      <motion.div
        ref={contenedor}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-notificaciones"
        onKeyDown={manejarTeclado}
        initial={entrada}
        animate={visible}
        exit={entrada}
        transition={{ duration: duracion, ease: [0.32, 0.72, 0, 1] }}
        drag={esMovil ? 'y' : false}
        dragControls={controlesArrastre}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_evento, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onCerrar();
        }}
        className="fixed inset-x-0 bottom-0 z-[70] flex h-[85dvh] flex-col rounded-t-[28px] border border-[#4B5563] bg-[#111827] pb-[env(safe-area-inset-bottom)] text-[#EDEDED] shadow-[0_-12px_40px_rgba(17,24,39,0.45)] md:inset-x-auto md:bottom-auto md:right-4 md:top-[72px] md:h-auto md:max-h-[70vh] md:w-[380px] md:rounded-3xl"
      >
        <div
          className="flex shrink-0 touch-none justify-center pb-1 pt-3 md:hidden"
          onPointerDown={(evento) => controlesArrastre.start(evento)}
          aria-hidden="true"
        >
          <span className="h-1.5 w-10 rounded-full bg-[#4B5563]" />
        </div>

        <header className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-2 md:pt-4">
          <h2 id="titulo-notificaciones" className="text-lg font-bold">
            Notificaciones
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void lista.marcarTodasLeidas()}
              disabled={contador === 0}
              className="min-h-[44px] rounded-full px-3 text-sm font-semibold text-[#9CA3AF] hover:text-[#EDEDED] disabled:opacity-40"
            >
              Marcar todas
            </button>
            <button
              ref={botonCerrar}
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="flex h-11 w-11 items-center justify-center rounded-full text-[#9CA3AF] hover:text-[#EDEDED]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex shrink-0 gap-2 px-4 pb-3" role="group" aria-label="Filtrar notificaciones">
          {(['todas', 'sin-leer'] as const).map((valor) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtro === valor}
              onClick={() => setFiltro(valor)}
              className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold transition-colors ${
                filtro === valor
                  ? 'border-[#EDEDED] bg-[#EDEDED] text-[#111827]'
                  : 'border-[#4B5563] text-[#9CA3AF] hover:text-[#EDEDED]'
              }`}
            >
              {valor === 'todas' ? 'Todas' : `Sin leer${contador > 0 ? ` · ${contador > 99 ? '99+' : contador}` : ''}`}
            </button>
          ))}
        </div>

        <ActivarPush clavePublicaVapid={clavePublicaVapid} />

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
          <ListaNotificaciones
            items={lista.items}
            filtro={filtro}
            cargando={lista.cargando}
            cargandoMas={lista.cargandoMas}
            error={lista.error}
            hayMas={lista.hayMas}
            onReintentar={() => void lista.recargar()}
            onCargarMas={() => void lista.cargarMas()}
            onAbrir={abrir}
          />
        </div>

        {lista.puedeDeshacer && (
          <div
            role="status"
            className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-2xl border border-[#4B5563] bg-[#1F2937] px-4 py-2"
          >
            <span className="text-sm text-[#EDEDED]">Marcaste todas como leídas</span>
            <button
              type="button"
              onClick={() => void lista.deshacer()}
              className="min-h-[44px] px-2 text-sm font-bold text-[#EDEDED] underline underline-offset-4"
            >
              Deshacer
            </button>
          </div>
        )}

        <footer className="shrink-0 border-t border-[#4B5563]/50 p-2">
          <a
            href="/notificaciones"
            onClick={onCerrar}
            className="flex min-h-[48px] items-center justify-center rounded-2xl text-sm font-bold text-[#EDEDED] hover:bg-[#1F2937]"
          >
            Ver todas
          </a>
        </footer>
      </motion.div>
    </>
  );
}
