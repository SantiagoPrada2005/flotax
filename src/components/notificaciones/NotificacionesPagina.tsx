import { useCallback, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import type { NotificacionSelect } from '@/db/schema';
import ListaNotificaciones from './ListaNotificaciones';
import { useContadorNotificaciones, useListaNotificaciones, type FiltroNotificaciones } from './useNotificaciones';

/** Historial completo de notificaciones (página `/notificaciones`). */
export default function NotificacionesPagina() {
  const [filtro, setFiltro] = useState<FiltroNotificaciones>('todas');
  const { contador, setContador, refrescar } = useContadorNotificaciones(true);
  const lista = useListaNotificaciones({
    habilitado: true,
    filtro,
    contador,
    setContador,
    refrescarContador: refrescar,
  });

  const abrir = useCallback(
    (notificacion: NotificacionSelect) => {
      void lista.marcarLeida(notificacion.id);
      if (notificacion.href && notificacion.href !== '/notificaciones') void navigate(notificacion.href);
    },
    [lista]
  );

  return (
    <section className="mx-auto w-full max-w-[430px] px-4 pt-2 sm:max-w-lg" aria-labelledby="titulo-historial">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h1 id="titulo-historial" className="text-2xl font-extrabold text-[#111827]">
          Notificaciones
        </h1>
        <button
          type="button"
          onClick={() => void lista.marcarTodasLeidas()}
          disabled={contador === 0}
          className="min-h-[44px] rounded-full px-3 text-sm font-semibold text-[#4B5563] disabled:opacity-40"
        >
          Marcar todas
        </button>
      </div>

      <div className="mb-3 flex gap-2" role="group" aria-label="Filtrar notificaciones">
        {(['todas', 'sin-leer'] as const).map((valor) => (
          <button
            key={valor}
            type="button"
            aria-pressed={filtro === valor}
            onClick={() => setFiltro(valor)}
            className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold ${
              filtro === valor
                ? 'border-[#111827] bg-[#111827] text-[#EDEDED]'
                : 'border-[#4B5563] text-[#4B5563]'
            }`}
          >
            {valor === 'todas' ? 'Todas' : 'Sin leer'}
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-[#111827] p-2 pb-3">
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
          className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#1F2937] px-4 py-2 text-[#EDEDED]"
        >
          <span className="text-sm">Marcaste todas como leídas</span>
          <button
            type="button"
            onClick={() => void lista.deshacer()}
            className="min-h-[44px] px-2 text-sm font-bold underline underline-offset-4"
          >
            Deshacer
          </button>
        </div>
      )}
    </section>
  );
}
