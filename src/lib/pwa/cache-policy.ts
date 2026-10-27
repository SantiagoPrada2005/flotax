/**
 * Política de caché HTTP para respuestas HTML de FlotaX.
 *
 * Objetivo: que el `fetch` de `<ClientRouter />` pueda servirse desde la caché
 * privada del navegador (sin volver a ejecutar el SSR) durante una ventana corta,
 * manteniendo el aislamiento por usuario mediante `Vary: Cookie`.
 *
 * Este módulo es puro y no depende de APIs de navegador ni de Astro: puede
 * importarse desde `src/middleware.ts` y probarse con `node:test`.
 */

/** Interruptor de rollback: en `false` el middleware fuerza `no-store` en HTML. */
export const NAV_CACHE_ENABLED = true;

export type EntornoCache = 'produccion' | 'desarrollo';

export interface PoliticaCacheHtml {
  readonly cacheControl: string;
  readonly ttlSegundos: number;
}

/**
 * `null` = no tocar la respuesta (assets, API, Actions, rutas excluidas).
 * `'no-store'` = respuesta HTML que nunca debe cachearse.
 */
export type ResultadoPoliticaCacheHtml = PoliticaCacheHtml | 'no-store' | null;

export const TTL_CACHE_HTML = {
  landing: 60,
  catalogo: 30,
  cliente: 10,
  admin: 5,
  offline: 300,
} as const;

const PREFIJOS_EXCLUIDOS: readonly string[] = [
  '/_astro/',
  '/api/',
  '/_actions/',
  '/_server-islands/',
  '/_image/',
  '/icons/',
  '/images/',
  '/fonts/',
  '/instructions/',
];

const RUTAS_EXCLUIDAS: readonly string[] = [
  '/sw.js',
  '/manifest.webmanifest',
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.svg',
  '/apple-touch-icon.png',
];

const RUTAS_SIN_CACHE: readonly string[] = [
  '/login',
  '/registro',
  '/home',
  '/404',
  '/500',
  '/error',
];

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

function esRutaExcluida(ruta: string): boolean {
  if (RUTAS_EXCLUIDAS.includes(ruta)) {
    return true;
  }

  return PREFIJOS_EXCLUIDOS.some(
    (prefijo) => ruta === prefijo.slice(0, -1) || ruta.startsWith(prefijo)
  );
}

function crearPolitica(ttl: number, swr: number): PoliticaCacheHtml {
  return {
    ttlSegundos: ttl,
    cacheControl: `private, max-age=${ttl}, stale-while-revalidate=${swr}`,
  };
}

/**
 * Resuelve la política para una ruta HTML.
 *
 * Nota: las rutas no mapeadas reciben `max-age=0, must-revalidate` como red de
 * seguridad. Si se crea una pantalla nueva y se quiere navegación instantánea,
 * debe añadirse explícitamente aquí.
 */
export function resolverPoliticaCacheHtml(
  pathname: string
): ResultadoPoliticaCacheHtml {
  const ruta = normalizarPathname(pathname);

  if (esRutaExcluida(ruta)) {
    return null;
  }

  if (RUTAS_SIN_CACHE.includes(ruta)) {
    return 'no-store';
  }

  if (ruta === '/offline') {
    return crearPolitica(TTL_CACHE_HTML.offline, TTL_CACHE_HTML.offline * 2);
  }

  if (ruta === '/') {
    return crearPolitica(TTL_CACHE_HTML.landing, TTL_CACHE_HTML.landing * 2);
  }

  if (
    ruta === '/catalogo' ||
    ruta.startsWith('/catalogo/') ||
    ruta.startsWith('/c/') ||
    ruta === '/vehiculos' ||
    ruta.startsWith('/vehiculos/')
  ) {
    return crearPolitica(TTL_CACHE_HTML.catalogo, TTL_CACHE_HTML.catalogo * 2);
  }

  if (ruta === '/admin' || ruta.startsWith('/admin/')) {
    return crearPolitica(TTL_CACHE_HTML.admin, TTL_CACHE_HTML.admin * 3);
  }

  if (
    ruta === '/reservas' ||
    ruta.startsWith('/reservas/') ||
    ruta === '/alquilar' ||
    ruta.startsWith('/alquilar/') ||
    ruta === '/perfil' ||
    ruta.startsWith('/perfil/') ||
    ruta === '/notificaciones' ||
    ruta.startsWith('/notificaciones/')
  ) {
    return crearPolitica(TTL_CACHE_HTML.cliente, TTL_CACHE_HTML.cliente * 3);
  }

  return {
    ttlSegundos: 0,
    cacheControl: 'private, max-age=0, must-revalidate',
  };
}

function esRespuestaHtml(response: Response): boolean {
  const tipo = response.headers.get('content-type') ?? '';
  return tipo.toLowerCase().includes('text/html');
}

function agregarVaryCookie(response: Response): void {
  const varyActual = response.headers.get('Vary');

  if (!varyActual) {
    response.headers.set('Vary', 'Cookie');
    return;
  }

  if (/(^|,\s*)cookie(\s*,|$)/i.test(varyActual)) {
    return;
  }

  response.headers.set('Vary', `${varyActual}, Cookie`);
}

function aplicarNoStore(response: Response): void {
  response.headers.set('Cache-Control', 'no-store');
}

/**
 * Aplica la política a una respuesta ya generada por Astro.
 *
 * - Solo actúa sobre HTML.
 * - Respuestas con `Set-Cookie` nunca se cachean.
 * - En desarrollo fuerza `no-store` para no interferir con HMR.
 */
export function aplicarPoliticaCacheHtml(
  response: Response,
  pathname: string,
  entorno: EntornoCache
): void {
  if (!esRespuestaHtml(response)) {
    return;
  }

  if (response.headers.has('Set-Cookie')) {
    aplicarNoStore(response);
    return;
  }

  if (!NAV_CACHE_ENABLED || entorno === 'desarrollo') {
    aplicarNoStore(response);
    return;
  }

  if (response.status !== 200) {
    aplicarNoStore(response);
    return;
  }

  const cacheControlActual =
    response.headers.get('Cache-Control')?.toLowerCase() ?? '';

  if (cacheControlActual.includes('no-store')) {
    return;
  }

  const politica = resolverPoliticaCacheHtml(pathname);

  if (politica === null) {
    return;
  }

  if (politica === 'no-store') {
    aplicarNoStore(response);
    return;
  }

  response.headers.set('Cache-Control', politica.cacheControl);
  agregarVaryCookie(response);
}
