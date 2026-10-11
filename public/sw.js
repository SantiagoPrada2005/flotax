/**
 * FlotaX — Service Worker Canónico para Edge SSR (Astro 7 + Cloudflare Workers)
 *
 * Estrategia de Caché Diferenciada:
 * 1. BYPASS ESTRICTO: Peticiones no-GET, /api/* (Better Auth / Webhooks) y /_actions/* (Astro Actions).
 * 2. CACHE-FIRST: Assets estáticos inmutables (/_astro/*, /icons/*, /images/*, fuentes).
 * 3. NETWORK-FIRST: Navegaciones HTML SSR (garantiza sesión RBAC e inventario D1 en tiempo real).
 */

const CACHE_VERSION = 'flotax-static-v1';

const PRECACHE_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#EDEDED" />
  <title>Sin conexión — FlotaX</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background-color: #EDEDED;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif;
    }
    .card {
      width: 100%;
      max-width: 380px;
      background: #FFFFFF;
      border: 1px solid #9CA3AF;
      border-radius: 24px;
      padding: 28px 24px;
      text-align: center;
    }
    .badge {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: #111827;
      color: #EDEDED;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 20px;
      margin-bottom: 16px;
    }
    h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; color: #111827; }
    p { font-size: 14px; line-height: 1.5; color: #4B5563; margin-bottom: 20px; }
    button {
      width: 100%;
      min-height: 48px;
      border: none;
      border-radius: 9999px;
      background: #111827;
      color: #EDEDED;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
    }
    button:active { background: #1F2937; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">F</div>
    <h1>Sin conexión a internet</h1>
    <p>Verifica tu señal móvil o Wi-Fi en el patio para sincronizar la disponibilidad de la flota en tiempo real.</p>
    <button type="button" onclick="window.location.reload()">Reintentar conexión</button>
  </div>
</body>
</html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((staleKey) => caches.delete(staleKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAssetPathname(pathname) {
  return (
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/images/') ||
    pathname === '/favicon.svg' ||
    pathname === '/apple-touch-icon.png' ||
    pathname === '/manifest.webmanifest'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. Nunca interceptar mutaciones ni métodos distintos de GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isFontAsset =
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (!isSameOrigin && !isFontAsset) {
    return;
  }

  // 2. Bypass estricto para endpoints de API (Better Auth, OAuth) y Astro Server Actions
  if (
    isSameOrigin &&
    (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_actions/'))
  ) {
    return;
  }

  // 3. Cache-First para assets estáticos inmutables y fuentes tipográficas
  if ((isSameOrigin && isStaticAssetPathname(url.pathname)) || isFontAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. Network-First para documentos HTML y transiciones de ClientRouter
  const acceptHeader = request.headers.get('accept') || '';
  if (request.mode === 'navigate' || acceptHeader.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedPage = await caches.match(request);
        if (cachedPage) {
          return cachedPage;
        }
        return new Response(OFFLINE_FALLBACK_HTML, {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      })
    );
  }
});
