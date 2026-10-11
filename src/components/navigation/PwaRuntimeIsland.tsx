import { useEffect, useRef, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import {
  type BeforeInstallPromptEvent,
  type PwaInstallPlatform,
  detectInstallPlatform,
  dismissInstallPromptForDays,
  isInstallPromptDismissed,
  isSpaInterceptableUrl,
  isStandalonePwa,
  markAppInstalled,
  registerPwaServiceWorker,
} from '@/lib/pwa';
import IosInstallGuideModal from './IosInstallGuideModal';

const FULLSCREEN_NO_DOCK_PATHS: ReadonlyArray<string> = [
  '/',
  '/login',
  '/registro',
];

function isDockHiddenOnPath(pathname: string): boolean {
  if (FULLSCREEN_NO_DOCK_PATHS.includes(pathname)) {
    return true;
  }
  return pathname.startsWith('/alquilar/');
}

/**
 * Isla React 19 persistida mediante transition:persist="flotax-pwa-runtime".
 * Orquesta:
 * 1. Registro del Service Worker (/sw.js) y contención SPA en modo standalone.
 * 2. Captura global de beforeinstallprompt (Android/Desktop) e instalación de 1 toque.
 * 3. Asistente visual interactivo con recortes de video reales para iOS Safari.
 */
export default function PwaRuntimeIsland() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [livePath, setLivePath] = useState('/');
  const [showBanner, setShowBanner] = useState(false);
  const [showGuideSheet, setShowGuideSheet] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [platform, setPlatform] = useState<PwaInstallPlatform>('other');

  useEffect(() => {
    void registerPwaServiceWorker();

    const syncStandaloneState = () => {
      const currentPath = window.location.pathname;
      setLivePath(currentPath);

      const standalone = isStandalonePwa();
      setIsStandalone(standalone);

      if (standalone) {
        document.documentElement.dataset.pwaStandalone = 'true';
        setShowBanner(false);
        setShowGuideSheet(false);
        if (currentPath === '/') {
          navigate('/home', { history: 'replace' });
        }
      } else {
        delete document.documentElement.dataset.pwaStandalone;
      }

      const detected = detectInstallPlatform(deferredPromptRef.current !== null);
      setPlatform(detected);
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;
      setHasDeferredPrompt(true);
      setPlatform('chromium-native');

      if (!isStandalonePwa() && !isInstallPromptDismissed()) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setHasDeferredPrompt(false);
      markAppInstalled();
      setShowBanner(false);
      setShowGuideSheet(false);
      setIsInstalling(false);
      setJustInstalled(true);
    };

    const handleOpenInstallRequest = async () => {
      if (isStandalonePwa()) {
        return;
      }

      const activePrompt = deferredPromptRef.current;
      if (activePrompt) {
        try {
          setIsInstalling(true);
          await activePrompt.prompt();
          const choice = await activePrompt.userChoice;
          if (choice.outcome === 'accepted') {
            deferredPromptRef.current = null;
            setHasDeferredPrompt(false);
            markAppInstalled();
            setShowBanner(false);
            setShowGuideSheet(false);
          }
        } catch {
          setShowGuideSheet(true);
        } finally {
          setIsInstalling(false);
        }
        return;
      }

      setShowBanner(false);
      setShowGuideSheet(true);
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

      if (anchor.target === '_blank') {
        event.preventDefault();
        navigate(rawHref);
      }
    };

    syncStandaloneState();

    let bannerTimer: ReturnType<typeof setTimeout> | undefined;
    if (!isStandalonePwa() && !isInstallPromptDismissed()) {
      bannerTimer = setTimeout(() => {
        if (!isStandalonePwa()) {
          setShowBanner(true);
        }
      }, 1000);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('flotax:open-install', handleOpenInstallRequest);
    document.addEventListener('astro:page-load', syncStandaloneState);
    document.addEventListener('click', handleDocumentClick);

    return () => {
      if (bannerTimer) {
        clearTimeout(bannerTimer);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('flotax:open-install', handleOpenInstallRequest);
      document.removeEventListener('astro:page-load', syncStandaloneState);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (!justInstalled) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setJustInstalled(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [justInstalled]);

  const handlePrimaryInstallClick = async () => {
    const activePrompt = deferredPromptRef.current;
    if (activePrompt && hasDeferredPrompt) {
      try {
        setIsInstalling(true);
        await activePrompt.prompt();
        const choice = await activePrompt.userChoice;
        if (choice.outcome === 'accepted') {
          deferredPromptRef.current = null;
          setHasDeferredPrompt(false);
          markAppInstalled();
          setShowBanner(false);
          setShowGuideSheet(false);
        } else {
          setShowBanner(false);
          dismissInstallPromptForDays(3);
        }
      } catch {
        setShowGuideSheet(true);
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    setShowBanner(false);
    setShowGuideSheet(true);
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    dismissInstallPromptForDays(7);
  };

  if (isStandalone) {
    return null;
  }

  const dockHidden = isDockHiddenOnPath(livePath);
  const bannerBottomClass = dockHidden
    ? 'bottom-4 sm:bottom-6'
    : 'bottom-[88px] md:bottom-6';

  const isTopRightShare = platform === 'ios-other';

  return (
    <>
      {/* Toast de Confirmación tras Instalar */}
      {justInstalled && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed inset-x-4 ${bannerBottomClass} z-50 mx-auto max-w-md animate-fade-up`}
        >
          <div className="flex items-center gap-3.5 rounded-[22px] bg-[#111827] p-4 text-[#EDEDED] shadow-[0_20px_44px_-8px_rgba(17,24,39,0.45)] border border-[#4B5563]/60">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1F2937] text-[#EDEDED] font-display font-black">
              ✓
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-[#EDEDED]">
                ¡FlotaX instalada en tu dispositivo!
              </p>
              <p className="text-xs text-[#9CA3AF]">
                Encuéntrala en tu pantalla de inicio para entrar directo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notificación Flotante Tipo App Nativa */}
      {showBanner && !showGuideSheet && !justInstalled && (
        <aside
          aria-label="Instalar aplicación FlotaX"
          className={`fixed inset-x-3.5 sm:inset-x-6 ${bannerBottomClass} z-45 mx-auto max-w-md animate-fade-up`}
        >
          <div className="flex items-center justify-between gap-3 rounded-[24px] bg-[#111827] p-3.5 sm:p-4 text-[#EDEDED] shadow-[0_22px_48px_-10px_rgba(17,24,39,0.45)] border border-[#4B5563]/50 ring-1 ring-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#1F2937] border border-[#4B5563]/60 shadow-inner">
                <span className="font-display text-xl font-black tracking-tight text-[#EDEDED]">
                  F<span className="text-[#9CA3AF]">.</span>
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-display text-sm font-extrabold text-[#EDEDED]">
                    Descargar FlotaX
                  </p>
                  <span className="rounded-full bg-[#1F2937] px-2 py-0.5 text-[10px] font-semibold text-[#9CA3AF] border border-[#4B5563]/40">
                    Gratis
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[#9CA3AF] leading-snug line-clamp-1">
                  Instálala en tu inicio con un toque
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handlePrimaryInstallClick}
                disabled={isInstalling}
                className="ios-press-bounce min-h-[44px] rounded-full bg-[#EDEDED] px-4 py-2 text-xs font-extrabold text-[#111827] shadow-xs transition hover:bg-white disabled:opacity-60 cursor-pointer"
              >
                {isInstalling ? 'Instalando...' : 'Instalar'}
              </button>

              <button
                type="button"
                onClick={handleDismissBanner}
                aria-label="Cerrar aviso"
                className="ios-press-bounce flex h-11 w-11 items-center justify-center rounded-full text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#EDEDED] transition cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Asistente Visual Interactivo con Recortes de Video de iOS */}
      <IosInstallGuideModal
        isOpen={showGuideSheet}
        isTopRightShare={isTopRightShare}
        hasDeferredPrompt={hasDeferredPrompt}
        isInstalling={isInstalling}
        onClose={() => setShowGuideSheet(false)}
        onPrimaryInstallClick={() => {
          void handlePrimaryInstallClick();
        }}
      />
    </>
  );
}
