import { useEffect } from 'react';
import { navigate } from 'astro:transitions/client';
import {
  isSpaInterceptableUrl,
  isStandalonePwa,
  registerPwaServiceWorker,
} from '@/lib/pwa';

/**
 * Isla React 19 sin renderizado visual (null) persistida mediante transition:persist.
 * Orquesta el ciclo de vida de la PWA:
 * 1. Registro del Service Worker (/sw.js).
 * 2. Sincronización del atributo data-pwa-standalone en <html> tras cada swap de ClientRouter.
 * 3. Redirección automática de la landing pública (/) hacia el router operativo (/home) en modo standalone.
 * 4. Blindaje de enlaces internos en iOS WebKit standalone para evitar fugas hacia Safari.
 */
export default function PwaRuntimeIsland() {
  useEffect(() => {
    void registerPwaServiceWorker();

    const syncStandaloneState = () => {
      const standalone = isStandalonePwa();
      if (standalone) {
        document.documentElement.dataset.pwaStandalone = 'true';
        if (window.location.pathname === '/') {
          navigate('/home', { history: 'replace' });
        }
      } else {
        delete document.documentElement.dataset.pwaStandalone;
      }
    };

    const handleDocumentClick = (event: globalThis.MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (!isStandalonePwa()) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a');
      if (!anchor) {
        return;
      }

      if (anchor.hasAttribute('download') || anchor.dataset.astroReload !== undefined) {
        return;
      }

      const rawHref = anchor.getAttribute('href');
      if (!rawHref || !isSpaInterceptableUrl(rawHref, window.location.origin)) {
        return;
      }

      // En modo standalone de iOS/Android, evitar que target="_blank" en rutas internas
      // dispare una hoja externa de Safari/Chrome y enrutar por el ClientRouter SPA.
      if (anchor.target === '_blank') {
        event.preventDefault();
        navigate(rawHref);
      }
    };

    syncStandaloneState();
    document.addEventListener('astro:page-load', syncStandaloneState);
    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('astro:page-load', syncStandaloneState);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  return null;
}
