import { useCallback, useEffect, useRef, useState } from 'react';
import { actions } from 'astro:actions';
import type { NotificacionSelect } from '@/db/schema';

const CLAVE_CONTADOR = 'flotax:notificaciones:no-leidas';
const INTERVALO_SONDEO_MS = 60_000;
const TAMANO_PAGINA = 20;

export type FiltroNotificaciones = 'todas' | 'sin-leer';

/**
 * Contador de no leídas para la campana. Se refresca al volver a la pestaña,
 * cada 60 s mientras está visible y cuando el Service Worker avisa de un push nuevo.
 */
export function useContadorNotificaciones(habilitado: boolean) {
  const [contador, setContador] = useState(0);

  const refrescar = useCallback(async () => {
    const { data } = await actions.notificaciones.contarNoLeidas();
    if (!data) return;
    setContador(data.total);
    try {
      sessionStorage.setItem(CLAVE_CONTADOR, String(data.total));
    } catch {
      /* almacenamiento no disponible: se ignora */
    }
  }, []);

  useEffect(() => {
    if (!habilitado) return;

    try {
      const previo = Number(sessionStorage.getItem(CLAVE_CONTADOR));
      if (Number.isFinite(previo) && previo > 0) setContador(previo);
    } catch {
      /* almacenamiento no disponible: se ignora */
    }

    void refrescar();

    const alVolver = () => {
      if (document.visibilityState === 'visible') void refrescar();
    };
    const intervalo = window.setInterval(alVolver, INTERVALO_SONDEO_MS);
    const alMensaje = (evento: MessageEvent<{ type?: string }>) => {
      if (evento.data?.type === 'flotax:notificacion-nueva') void refrescar();
    };

    document.addEventListener('visibilitychange', alVolver);
    navigator.serviceWorker?.addEventListener('message', alMensaje);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
      navigator.serviceWorker?.removeEventListener('message', alMensaje);
    };
  }, [habilitado, refrescar]);

  return { contador, setContador, refrescar };
}

interface OpcionesLista {
  habilitado: boolean;
  filtro: FiltroNotificaciones;
  contador: number;
  setContador: (valor: number) => void;
  refrescarContador: () => Promise<void>;
}

/** Lista paginada por cursor con marcado optimista y "deshacer" de marcar todas. */
export function useListaNotificaciones({
  habilitado,
  filtro,
  contador,
  setContador,
  refrescarContador,
}: OpcionesLista) {
  const [items, setItems] = useState<NotificacionSelect[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);
  const [idsDeshacer, setIdsDeshacer] = useState<string[] | null>(null);
  const temporizadorDeshacer = useRef<number | undefined>(undefined);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(false);
    const { data, error: fallo } = await actions.notificaciones.listar({
      soloNoLeidas: filtro === 'sin-leer',
      limite: TAMANO_PAGINA,
    });
    if (fallo || !data) {
      setError(true);
    } else {
      setItems(data.items);
      setCursor(data.siguienteCursor);
    }
    setCargando(false);
  }, [filtro]);

  useEffect(() => {
    if (habilitado) void cargar();
  }, [habilitado, cargar]);

  const cargarMas = useCallback(async () => {
    if (!cursor || cargandoMas) return;
    setCargandoMas(true);
    const { data } = await actions.notificaciones.listar({
      soloNoLeidas: filtro === 'sin-leer',
      limite: TAMANO_PAGINA,
      cursor,
    });
    if (data) {
      setItems((previos) => [...previos, ...data.items]);
      setCursor(data.siguienteCursor);
    }
    setCargandoMas(false);
  }, [cursor, cargandoMas, filtro]);

  const marcarLeida = useCallback(
    async (id: string) => {
      const objetivo = items.find((n) => n.id === id);
      if (!objetivo || objetivo.leidaEn) return;
      setItems((previos) => previos.map((n) => (n.id === id ? { ...n, leidaEn: new Date() } : n)));
      setContador(Math.max(0, contador - 1));
      const { error: fallo } = await actions.notificaciones.marcarLeidas({ ids: [id] });
      if (fallo) {
        await Promise.all([cargar(), refrescarContador()]);
      }
    },
    [items, contador, setContador, cargar, refrescarContador]
  );

  const marcarTodasLeidas = useCallback(async () => {
    const ahora = new Date();
    setItems((previos) => previos.map((n) => (n.leidaEn ? n : { ...n, leidaEn: ahora })));
    setContador(0);
    const { data, error: fallo } = await actions.notificaciones.marcarTodasLeidas();
    if (fallo || !data) {
      await Promise.all([cargar(), refrescarContador()]);
      return;
    }
    if (data.ids.length === 0) return;
    setIdsDeshacer(data.ids);
    window.clearTimeout(temporizadorDeshacer.current);
    temporizadorDeshacer.current = window.setTimeout(() => setIdsDeshacer(null), 6000);
  }, [cargar, refrescarContador, setContador]);

  const deshacer = useCallback(async () => {
    if (!idsDeshacer) return;
    const ids = idsDeshacer;
    setIdsDeshacer(null);
    window.clearTimeout(temporizadorDeshacer.current);
    await actions.notificaciones.deshacerLeidas({ ids });
    await Promise.all([cargar(), refrescarContador()]);
  }, [idsDeshacer, cargar, refrescarContador]);

  useEffect(() => () => window.clearTimeout(temporizadorDeshacer.current), []);

  return {
    items,
    hayMas: cursor !== null,
    cargando,
    cargandoMas,
    error,
    puedeDeshacer: idsDeshacer !== null,
    recargar: cargar,
    cargarMas,
    marcarLeida,
    marcarTodasLeidas,
    deshacer,
  };
}
