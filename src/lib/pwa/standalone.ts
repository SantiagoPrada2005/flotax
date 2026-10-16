/**
 * Utilidades de dominio para detección de ejecución PWA Standalone,
 * validación de rutas internas SPA y registro del Service Worker perimetral.
 */

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const NON_SPA_PATH_PREFIXES: ReadonlyArray<string> = [
  '/api/',
  '/_actions/',
  '/_astro/',
  '/icons/',
  '/images/',
  '/fonts/',
];

const NON_SPA_EXACT_PATHS: ReadonlyArray<string> = [
  '/manifest.webmanifest',
  '/sw.js',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/robots.txt',
  '/sitemap.xml',
];

/**
 * Determina si la aplicación se está ejecutando instalada como PWA en modo
 * standalone (sin barra de navegador) tanto en iOS WebKit como en Android/Desktop.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Detectar únicamente modo instalado PWA real:
    // 1. display-mode: standalone (Android WebAPK, Chrome/Edge Desktop PWA)
    // 2. navigator.standalone en iOS WebKit (Añadido a pantalla de inicio en iPhone/iPad)
    // Evitamos deliberadamente 'display-mode: fullscreen' porque cualquier navegador web
    // estándar puesto a pantalla completa (F11 o botón verde en macOS) activaba el flag erróneamente.
    const isMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;

    const nav = window.navigator as NavigatorWithStandalone;
    const isIosStandalone = nav.standalone === true;

    return isMediaStandalone || isIosStandalone;
  } catch {
    return false;
  }
}

/**
 * Evalúa de forma pura y determinista si un enlace pertenece al mismo origen
 * y debe ser gestionado dentro del contenedor SPA sin escapar al navegador del sistema.
 */
export function isSpaInterceptableUrl(rawHref: string, currentOrigin: string): boolean {
  if (!rawHref || !currentOrigin) {
    return false;
  }

  const trimmed = rawHref.trim();
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('javascript:')
  ) {
    return false;
  }

  try {
    const parsed = new URL(trimmed, currentOrigin);
    if (parsed.origin !== currentOrigin) {
      return false;
    }

    if (NON_SPA_EXACT_PATHS.includes(parsed.pathname)) {
      return false;
    }

    for (const prefix of NON_SPA_PATH_PREFIXES) {
      if (parsed.pathname.startsWith(prefix)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Registra el Service Worker canónico (/sw.js) en la raíz del dominio.
 */
export async function registerPwaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in window.navigator)) {
    return null;
  }

  try {
    const registration = await window.navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch {
    return null;
  }
}
