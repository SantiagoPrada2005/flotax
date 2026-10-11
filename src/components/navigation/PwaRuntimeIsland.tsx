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
 * 3. Asistente visual espacial con puntero físico animado y réplica gráfica de iOS.
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
  const [pointerPulse, setPointerPulse] = useState(false);
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

  useEffect(() => {
    if (!pointerPulse) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setPointerPulse(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, [pointerPulse]);

  const triggerNudgePointer = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([12, 60, 12]);
      } catch {
        // Ignorar si no soporta vibración
      }
    }
    setPointerPulse(true);
  };

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

      {/* Asistente Visual Espacial (Réplica exacta de Safari en iPhone) */}
      {showGuideSheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="flotax-install-sheet-title"
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-[#111827]/75 backdrop-blur-xs p-3 sm:p-6 animate-fade-in"
          onClick={() => setShowGuideSheet(false)}
        >
          {/* Puntero Espacial Superior Derecho (Solo para Chrome en iPhone o iPad) */}
          {isTopRightShare && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`fixed top-2 right-3 z-50 flex flex-col items-end animate-float ${
                pointerPulse ? 'scale-110' : ''
              } transition-transform`}
            >
              <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="m18 15-6-6-6 6" />
                </svg>
              </div>
              <div className="mt-1 flex items-center gap-2 rounded-full bg-[#111827] border-2 border-[#EDEDED] px-3.5 py-1.5 text-xs font-extrabold text-[#EDEDED] shadow-2xl">
                <span>1. Toca</span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#EDEDED] text-[#111827]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </span>
                <span>aquí arriba</span>
              </div>
            </div>
          )}

          {/* Tarjeta Principal Visual (con mb-24 en móvil para no chocar con el puntero inferior) */}
          <div
            className="w-full max-w-sm rounded-[28px] bg-[#EDEDED] border border-[#9CA3AF] p-4 sm:p-5 text-[#111827] shadow-2xl space-y-3 mb-24 sm:mb-0 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera Compacta */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#111827] text-[#EDEDED] shadow-sm">
                  <span className="font-display text-lg font-black">
                    F<span className="text-[#9CA3AF]">.</span>
                  </span>
                </div>
                <div>
                  <h2
                    id="flotax-install-sheet-title"
                    className="font-display text-base font-black tracking-tight text-[#111827]"
                  >
                    Instalar FlotaX en iPhone
                  </h2>
                  <p className="text-xs text-[#4B5563]">
                    Sigue estos 3 toques en tu barra de Safari:
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideSheet(false)}
                aria-label="Cerrar"
                className="ios-press-bounce flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white border border-[#9CA3AF]/50 text-[#4B5563] hover:text-[#111827] cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="h-4 w-4"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {hasDeferredPrompt ? (
              <button
                type="button"
                onClick={handlePrimaryInstallClick}
                disabled={isInstalling}
                className="ios-press-bounce w-full min-h-[48px] rounded-full bg-[#111827] px-5 py-3 text-sm font-extrabold text-[#EDEDED] shadow-md hover:bg-[#1F2937] transition cursor-pointer"
              >
                {isInstalling ? 'Instalando...' : 'Instalar ahora'}
              </button>
            ) : (
              <div className="space-y-2.5">
                {/* PASO 1: Réplica exacta de la barra inferior de Safari (≡ flotax.innovaweb.pro ↻) */}
                <button
                  type="button"
                  onClick={triggerNudgePointer}
                  className={`w-full text-left rounded-[20px] bg-white border p-3 transition-all cursor-pointer ${
                    pointerPulse
                      ? 'border-[#111827] ring-2 ring-[#111827]'
                      : 'border-[#9CA3AF]/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111827] text-xs font-extrabold text-[#EDEDED]">
                      1
                    </span>
                    <span className="text-xs font-bold text-[#111827]">
                      {isTopRightShare
                        ? 'Toca el botón Compartir arriba a la derecha'
                        : 'Abre el menú en la barra inferior de Safari:'}
                    </span>
                  </div>

                  {/* Mockup idéntico a la barra de direcciones de Safari en iPhone */}
                  <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#EDEDED] px-2.5 py-2 border border-[#9CA3AF]/40">
                    {/* Botón < de Safari */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#9CA3AF]/50 text-[#4B5563]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        className="h-4 w-4"
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </span>

                    {/* Píldora central de Safari con el botón ≡ resaltado */}
                    <div className="flex flex-1 items-center justify-between rounded-full bg-[#9CA3AF]/60 px-2 py-1 text-[#111827]">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-[#EDEDED] shadow-md ring-2 ring-[#EDEDED] animate-pulse">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          className="h-3.5 w-3.5"
                        >
                          <line x1="4" y1="7" x2="20" y2="7" />
                          <line x1="4" y1="12" x2="20" y2="12" />
                          <line x1="4" y1="17" x2="14" y2="17" />
                        </svg>
                      </span>
                      <span className="truncate px-1.5 text-[11px] font-semibold text-[#1F2937]">
                        flotax.innovaweb.pro
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-3.5 w-3.5 shrink-0 text-[#4B5563]"
                      >
                        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                        <path d="M21 3v5h-5" />
                      </svg>
                    </div>

                    {/* Botón Pestañas de Safari */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#9CA3AF]/50 text-[#4B5563]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <rect width="12" height="12" x="8" y="8" rx="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                    </span>
                  </div>

                  {pointerPulse && (
                    <p className="mt-2 rounded-xl bg-[#111827] px-3 py-1.5 text-center text-xs font-bold text-[#EDEDED]">
                      👇 ¡Toca el ícono real de las 3 rayitas en la barra de abajo de tu iPhone!
                    </p>
                  )}
                </button>

                {/* PASO 2: Réplica exacta del menú oscuro de Safari (Share / Compartir) */}
                <div className="rounded-[20px] bg-white border border-[#9CA3AF]/50 p-3 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111827] text-xs font-extrabold text-[#EDEDED]">
                      2
                    </span>
                    <span className="text-xs font-bold text-[#111827]">
                      En el menú que se abre, toca Compartir (Share):
                    </span>
                  </div>

                  {/* Mockup idéntico al menú flotante oscuro de Safari iOS */}
                  <div className="overflow-hidden rounded-2xl bg-[#1F2937] border border-[#4B5563] text-[#EDEDED] shadow-inner">
                    <div className="flex items-center gap-3 px-3.5 py-1.5 text-[11px] text-[#9CA3AF]/70 border-b border-[#4B5563]/50">
                      <span className="inline-block h-3.5 w-3.5 rounded-full border border-[#9CA3AF]/60" />
                      <span>Translate / Traducir...</span>
                    </div>
                    <div className="flex items-center justify-between bg-[#111827] px-3.5 py-2.5 text-[#EDEDED] ring-1 ring-[#EDEDED]/40">
                      <div className="flex items-center gap-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 text-[#EDEDED]"
                        >
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                        <span className="text-xs font-extrabold tracking-tight">
                          Share / Compartir
                        </span>
                      </div>
                      <span className="rounded-full bg-[#EDEDED] px-2 py-0.5 text-[10px] font-extrabold text-[#111827]">
                        Toca aquí
                      </span>
                    </div>
                  </div>
                </div>

                {/* PASO 3: Réplica de "Agregar a inicio / Add to Home Screen [+]" */}
                <div className="rounded-[20px] bg-white border border-[#9CA3AF]/50 p-3 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111827] text-xs font-extrabold text-[#EDEDED]">
                      3
                    </span>
                    <span className="text-xs font-bold text-[#111827]">
                      Baja un poco y selecciona:
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-[#EDEDED] border border-[#9CA3AF]/70 px-3.5 py-2.5 text-[#111827]">
                    <span className="text-xs font-extrabold tracking-tight">
                      Agregar a inicio / Add to Home Screen
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 shrink-0 text-[#111827]"
                    >
                      <rect width="18" height="18" x="3" y="3" rx="4" />
                      <path d="M8 12h8" />
                      <path d="M12 8v8" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Puntero Espacial Inferior (Apunta exactamente al botón ≡ de la barra de Safari) */}
          {!isTopRightShare && !hasDeferredPrompt && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`fixed bottom-2 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center animate-float ${
                pointerPulse ? 'scale-110' : ''
              } transition-transform`}
            >
              <div className="flex items-center gap-2 rounded-full bg-[#111827] border-2 border-[#EDEDED] px-4 py-1.5 text-xs font-extrabold text-[#EDEDED] shadow-2xl whitespace-nowrap">
                <span>1. Empieza tocando</span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="h-3.5 w-3.5"
                  >
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="14" y2="17" />
                  </svg>
                </span>
                <span>aquí abajo</span>
              </div>
              <div className="mt-1 mr-28 flex h-8 w-8 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
