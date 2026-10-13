import { Fragment, useEffect, useRef } from 'react';
import type { NotificacionSelect } from '@/db/schema';
import { grupoTemporal } from '@/lib/time/client-time';
import NotificacionItem from './NotificacionItem';
import { NotificacionesError, NotificacionesSkeleton, NotificacionesVacio } from './NotificacionesEstados';
import type { FiltroNotificaciones } from './useNotificaciones';

interface ListaNotificacionesProps {
  items: NotificacionSelect[];
  filtro: FiltroNotificaciones;
  cargando: boolean;
  cargandoMas: boolean;
  error: boolean;
  hayMas: boolean;
  onReintentar: () => void;
  onCargarMas: () => void;
  onAbrir: (notificacion: NotificacionSelect) => void;
}

/** Lista agrupada por Hoy / Ayer / Anteriores con scroll infinito y estados completos. */
export default function ListaNotificaciones({
  items,
  filtro,
  cargando,
  cargandoMas,
  error,
  hayMas,
  onReintentar,
  onCargarMas,
  onAbrir,
}: ListaNotificacionesProps) {
  const centinela = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const nodo = centinela.current;
    if (!nodo || !hayMas) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) onCargarMas();
      },
      { rootMargin: '120px' }
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [hayMas, onCargarMas, items.length]);

  if (error && items.length === 0) return <NotificacionesError onReintentar={onReintentar} />;
  if (cargando && items.length === 0) return <NotificacionesSkeleton />;
  if (items.length === 0) return <NotificacionesVacio filtro={filtro} />;

  const ahora = new Date();
  let grupoActual = '';

  return (
    <ul className="space-y-1 px-1" aria-live="polite">
      {items.map((notificacion) => {
        const grupo = grupoTemporal(notificacion.creadaEn, ahora);
        const mostrarEncabezado = grupo !== grupoActual;
        grupoActual = grupo;
        return (
          <Fragment key={notificacion.id}>
            {mostrarEncabezado && (
              <li
                role="presentation"
                className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-[#9CA3AF]"
              >
                {grupo}
              </li>
            )}
            <NotificacionItem notificacion={notificacion} ahora={ahora} onAbrir={onAbrir} />
          </Fragment>
        );
      })}
      {hayMas && (
        <li ref={centinela} className="py-3 text-center text-xs text-[#9CA3AF]">
          {cargandoMas ? 'Cargando…' : ''}
        </li>
      )}
    </ul>
  );
}
