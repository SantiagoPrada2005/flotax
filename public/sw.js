/**
 * FlotaX — Service Worker Canónico para Edge SSR (Astro 7 + Cloudflare Workers)
 *
 * Estrategia de Caché Diferenciada:
 * 1. BYPASS ESTRICTO: Peticiones no-GET, /api/* (Better Auth / Webhooks) y /_actions/* (Astro Actions).
 * 2. CACHE-FIRST: Assets estáticos inmutables (/_astro/*, /icons/*, /images/*, fuentes).
 * 3. NETWORK-FIRST: Navegaciones HTML SSR (garantiza sesión RBAC e inventario D1 en tiempo real).
 */

const CACHE_VERSION = 'flotax-static-v2';

const PRECACHE_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/offline',
];

const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="#111827" />
  <title>Sin conexión a internet — Modo Autónomo · FlotaX</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px 16px;
      background-color: #111827;
      color: #EDEDED;
      font-family: "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    }
    .shell {
      width: 100%;
      max-width: 456px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .pill-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 36px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: #1F2937;
      border: 1px solid #4B5563;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #EDEDED;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #EDEDED;
      animation: pulseDot 1.6s ease-in-out infinite;
    }
    .pill-ping {
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 6px 12px;
      border-radius: 9999px;
      background: #1F2937;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px;
      font-weight: 700;
      color: #9CA3AF;
    }
    .sonar-stage {
      position: relative;
      height: 220px;
      width: 100%;
      border-radius: 28px;
      background: #111827;
      border: 1px solid #4B5563;
      padding: 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      overflow: hidden;
    }
    .sonar-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .sonar-ring {
      transform-origin: 228px 110px;
      animation: sonarWave 2.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
    }
    .hud-row {
      position: relative;
      z-index: 2;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px;
      font-weight: 700;
    }
    .core-badge {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 14px;
      background: #1F2937;
      border: 1.5px solid #EDEDED;
      border-radius: 22px;
      padding: 14px 22px;
    }
    .core-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #EDEDED;
    }
    .core-sub {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 9px;
      font-weight: 700;
      color: #9CA3AF;
      margin-top: 2px;
    }
    .hud-bottom {
      position: relative;
      z-index: 2;
      background: #EDEDED;
      color: #111827;
      border-radius: 8px;
      padding: 5px 12px;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .card {
      width: 100%;
      background: #1F2937;
      border: 1px solid #4B5563;
      border-radius: 28px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      line-height: 1.15;
      color: #EDEDED;
    }
    p {
      font-size: 13px;
      line-height: 1.45;
      color: #9CA3AF;
    }
    .cache-box {
      background: #111827;
      border: 1px solid #4B5563;
      border-radius: 16px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .cache-label {
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #9CA3AF;
    }
    .cache-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .cache-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      border-radius: 10px;
      background: #1F2937;
      border: 1px solid #4B5563;
      color: #EDEDED;
      text-decoration: none;
      font-family: "JetBrains Mono", ui-monospace, monospace;
      font-size: 11px;
      font-weight: 700;
    }
    .btn-primary {
      width: 100%;
      min-height: 48px;
      border: none;
      border-radius: 9999px;
      background: #EDEDED;
      color: #111827;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
    }
    .btn-secondary {
      width: 100%;
      min-height: 46px;
      border: 1px solid #4B5563;
      border-radius: 9999px;
      background: #111827;
      color: #EDEDED;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    @keyframes pulseDot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.35; }
    }
    @keyframes sonarWave {
      0% { transform: scale(0.65); opacity: 0.7; }
      100% { transform: scale(1.35); opacity: 0; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="topbar">
      <div class="pill-status">
        <span class="dot"></span>
        <span>SIN SEÑAL · MODO AUTÓNOMO</span>
      </div>
      <div class="pill-ping" id="ping-label">AUTO-PING · 5S</div>
    </div>

    <div class="sonar-stage">
      <svg class="sonar-bg" viewBox="0 0 456 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <circle cx="228" cy="110" r="50" fill="none" stroke="#4B5563" stroke-width="1.2" />
        <circle cx="228" cy="110" r="80" fill="none" stroke="#9CA3AF" stroke-width="1.5" class="sonar-ring" />
        <circle cx="228" cy="110" r="106" fill="none" stroke="#4B5563" stroke-width="1" stroke-dasharray="6 6" />
        <path d="M 12 110 Q 36 88, 60 110 T 108 110 T 142 110" fill="none" stroke="#EDEDED" stroke-width="2" stroke-opacity="0.75" />
        <line x1="146" y1="110" x2="310" y2="110" stroke="#4B5563" stroke-width="1.5" stroke-dasharray="4 4" />
        <path d="M 314 110 Q 338 88, 362 110 T 410 110 T 444 110" fill="none" stroke="#EDEDED" stroke-width="2" stroke-opacity="0.75" />
      </svg>

      <div class="hud-row">
        <span style="color:#9CA3AF">CARRIER: 0.0 KB/S · LINK DOWN</span>
        <span style="color:#EDEDED">SW CACHE: ACTIVO</span>
      </div>

      <div class="core-badge">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EDEDED" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M8.5 16.5a5 5 0 0 1 7 0" />
          <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
          <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
          <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
          <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <div>
          <div class="core-title">ENLACE CAÍDO</div>
          <div class="core-sub">ESPERANDO RED MÓVIL / WI-FI</div>
        </div>
      </div>

      <div class="hud-bottom">RECONEXIÓN AUTOMÁTICA AL DETECTAR SEÑAL</div>
    </div>

    <div class="card">
      <h1>Sin conexión a internet en este momento</h1>
      <p>Verifica tu señal móvil o Wi-Fi en el patio. No cierres la aplicación: FlotaX sincronizará la disponibilidad en cuanto regrese la conexión.</p>

      <div class="cache-box">
        <span class="cache-label">VISTAS GUARDADAS EN ESTE DISPOSITIVO (CACHÉ LOCAL)</span>
        <div class="cache-grid">
          <a class="cache-pill" href="/catalogo">/catalogo</a>
          <a class="cache-pill" href="/reservas">/reservas</a>
          <a class="cache-pill" href="/admin">/admin</a>
        </div>
      </div>

      <button type="button" class="btn-primary" onclick="window.location.reload()">Reintentar conexión ahora ↻</button>
      <button type="button" class="btn-secondary" onclick="window.history.length > 1 ? window.history.back() : (window.location.href = '/catalogo')">Abrir última vista guardada</button>
    </div>
  </div>
  <script>
    window.addEventListener('online', function () {
      window.location.reload();
    });
    var sec = 5;
    var el = document.getElementById('ping-label');
    setInterval(function () {
      sec = sec <= 1 ? 5 : sec - 1;
      if (el) el.textContent = 'AUTO-PING · ' + sec + 'S';
      if (sec === 5 && navigator.onLine) {
        window.location.reload();
      }
    }, 1000);
  </script>
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
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && isSameOrigin) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }
          const offlineCachedRoute = await caches.match('/offline');
          if (offlineCachedRoute) {
            return offlineCachedRoute;
          }
          return new Response(OFFLINE_FALLBACK_HTML, {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
  }
});

/**
 * Web Push: muestra la notificación del sistema y avisa a las pestañas abiertas
 * para que refresquen el contador de la campana.
 */
self.addEventListener('push', (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = {};
  }

  const titulo = datos.titulo || 'FlotaX';
  const opciones = {
    body: datos.detalle || 'Tienes una novedad en FlotaX.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: datos.id || 'flotax-notificacion',
    renotify: Boolean(datos.urgente),
    data: { href: datos.href || '/notificaciones' },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(titulo, opciones),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
        ventanas.forEach((ventana) => ventana.postMessage({ type: 'flotax:notificacion-nueva' }));
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.href || '/notificaciones', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((ventana) => new URL(ventana.url).origin === self.location.origin);
      if (abierta) {
        return abierta.focus().then(() => abierta.navigate(destino));
      }
      return self.clients.openWindow(destino);
    })
  );
});
