/**
 * Calentamiento de la caché HTTP de navegación.
 *
 * El `fetch` autenticado fuerza al navegador a guardar el HTML en su caché
 * privada (respetando `Cache-Control: private` y `Vary: Cookie`), de modo que el
 * siguiente `fetch` de `<ClientRouter />` se resuelva sin red.
 *
 * Solo se ejecuta en el cliente. No cachea nada por sí mismo: delega en la caché
 * HTTP del navegador.
 */

const INTERVALO_MINIMO_MS = 20_000;
const MAX_CONCURRENTES = 2;
const MAX_RUTAS_POR_CALENTAMIENTO = 2;

const ultimoCalentamiento = new Map<string, number>();
const enProceso = new Set<string>();
const cola: string[] = [];
let enVuelo = 0;

interface ConexionNavegador {
  readonly saveData?: boolean;
  readonly effectiveType?: string;
}

interface NavigatorConConexion extends Navigator {
  readonly connection?: ConexionNavegador;
}

interface DocumentoConPrerender extends Document {
  readonly prerendering?: boolean;
}

const RUTAS_ADMIN: readonly string[] = [
  '/admin',
  '/admin/reservas',
  '/admin/flota',
  '/admin/caja',
];
const RUTAS_CLIENTE: readonly string[] = ['/catalogo', '/reservas', '/perfil'];
const RUTAS_VISITANTE: readonly string[] = ['/catalogo'];

function normalizarPathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  const sinQuery = pathname.split('?')[0] ?? pathname;
  const sinBarraFinal = sinQuery.endsWith('/')
    ? sinQuery.slice(0, -1)
    : sinQuery;

  return sinBarraFinal === '' ? '/' : sinBarraFinal;
}

function estaPrerenderizando(): boolean {
  const doc: DocumentoConPrerender = document;
  return doc.prerendering === true;
}

function conexionLenta(): boolean {
  const nav: NavigatorConConexion = navigator;
  const conexion = nav.connection;

  if (!conexion) {
    return false;
  }

  if (conexion.saveData) {
    return true;
  }

  return (
    conexion.effectiveType === 'slow-2g' || conexion.effectiveType === '2g'
  );
}

/**
 * Devuelve las rutas que conviene calentar según la pantalla actual y la sesión.
 * Nunca incluye la ruta actual ni rutas de autenticación.
 */
export function rutasCalientes(
  pathname: string,
  autenticado: boolean
): string[] {
  const actual = normalizarPathname(pathname);

  if (!autenticado) {
    return RUTAS_VISITANTE.filter((ruta) => ruta !== actual);
  }

  const base = actual.startsWith('/admin') ? RUTAS_ADMIN : RUTAS_CLIENTE;

  return base.filter((ruta) => ruta !== actual);
}

export async function prefetchHtml(url: string): Promise<void> {
  if (estaPrerenderizando()) {
    return;
  }

  let destino: URL;

  try {
    destino = new URL(url, window.location.origin);
  } catch {
    return;
  }

  if (destino.origin !== window.location.origin) {
    return;
  }

  if (
    destino.pathname === window.location.pathname &&
    destino.search === window.location.search
  ) {
    return;
  }

  try {
    const respuesta = await fetch(destino.toString(), {
      credentials: 'same-origin',
      headers: { Accept: 'text/html' },
      cache: 'default',
    });

    if (!respuesta.ok || respuesta.redirected) {
      return;
    }

    const tipo = respuesta.headers.get('content-type') ?? '';

    if (!tipo.toLowerCase().includes('text/html')) {
      return;
    }

    // Consumir el cuerpo materializa la entrada en la caché HTTP del navegador.
    await respuesta.text();
  } catch {
    // El calentamiento es best-effort: nunca debe romper la navegación.
  }
}

async function procesarCola(): Promise<void> {
  if (enVuelo >= MAX_CONCURRENTES) {
    return;
  }

  const url = cola.shift();

  if (!url) {
    return;
  }

  enVuelo += 1;

  try {
    await prefetchHtml(url);
  } finally {
    enVuelo -= 1;
    enProceso.delete(url);
    ultimoCalentamiento.set(url, Date.now());
    void procesarCola();
  }
}

function encolar(url: string): void {
  if (enProceso.has(url)) {
    return;
  }

  const ultimo = ultimoCalentamiento.get(url) ?? 0;

  if (Date.now() - ultimo < INTERVALO_MINIMO_MS) {
    return;
  }

  enProceso.add(url);
  cola.push(url);
  void procesarCola();
}

/**
 * Calienta hasta dos rutas después de que la página esté ociosa. Respeta
 * `prefers-reduced-data` implícito de la Network Information API (`saveData`),
 * conexiones 2G y el modo prerender.
 */
export function prefetchRutasCalientes(
  rutas: readonly string[],
  pathname: string
): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (estaPrerenderizando() || !navigator.onLine || conexionLenta()) {
    return;
  }

  const actual = normalizarPathname(pathname);

  const candidatas = rutas
    .filter((ruta) => normalizarPathname(ruta) !== actual)
    .slice(0, MAX_RUTAS_POR_CALENTAMIENTO);

  if (candidatas.length === 0) {
    return;
  }

  const ejecutar = () => {
    for (const ruta of candidatas) {
      encolar(ruta);
    }
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(ejecutar, { timeout: 2000 });
    return;
  }

  window.setTimeout(ejecutar, 800);
}
