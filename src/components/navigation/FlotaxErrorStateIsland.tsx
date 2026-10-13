import { useEffect, useState } from 'react';
import { navigate } from 'astro:transitions/client';

export type FlotaxErrorMode = '404' | 'offline' | '500';

export interface FlotaxErrorStateIslandProps {
  initialMode?: FlotaxErrorMode | undefined;
  requestedPath?: string | undefined;
  enableSimulator?: boolean | undefined;
}

const M1_PATH =
  'M 97.00 23.75 Q 100.05 18.00 106.55 18.00 L 251.50 18.00 Q 256.00 18.00 253.91 21.98 L 234.64 58.69 Q 231.85 64.00 225.85 64.00 L 133.90 64.00 Q 128.90 64.00 126.58 68.43 L 116.55 87.52 Q 114.46 91.50 110.80 88.89 L 79.97 66.90 Q 75.90 64.00 78.24 59.58 Z';

const M2_PATH =
  'M 63.06 88.42 Q 65.40 84.00 69.47 86.90 L 99.89 108.60 Q 103.96 111.50 101.64 115.93 L 69.74 176.69 Q 66.95 182.00 60.95 182.00 L 18.50 182.00 Q 14.00 182.00 16.09 178.02 Z';

const M3_PATH =
  'M 136.90 86.87 Q 139.45 82.00 144.95 82.00 L 237.50 82.00 Q 242.00 82.00 239.91 85.98 L 220.64 122.69 Q 217.85 128.00 211.85 128.00 L 157.92 128.00 Q 151.92 128.00 147.04 124.52 L 129.35 111.90 Q 125.28 109.00 127.60 104.57 Z';

const QUICK_DESTINATIONS: ReadonlyArray<{
  label: string;
  href: string;
}> = [
  { label: 'Catálogo', href: '/catalogo' },
  { label: 'Mis Reservas', href: '/reservas' },
  { label: 'Panel Patio', href: '/admin' },
];

const DEFAULT_CACHED_ROUTES: ReadonlyArray<string> = [
  '/catalogo',
  '/reservas',
  '/admin',
];

const TACH_STANDBY_CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const MODE_OPTIONS: ReadonlyArray<{
  id: FlotaxErrorMode;
  badge: string;
  label: string;
}> = [
  { id: '404', badge: 'HTTP 404', label: 'Fuera de Perímetro' },
  { id: 'offline', badge: 'OFFLINE', label: 'Sin Internet' },
  { id: '500', badge: 'HTTP 500', label: 'Contingencia' },
];

/**
 * Isla React 19 de Contingencia Perimetral, Error 404, Falta de Internet (Offline) y Fallo 500.
 * Diseñada en sincronía 1:1 con `design/logo.pen` (Lámina 05 — `ITI2c`) y
 * `design/exports/Contingencia 404 y Offline.html`.
 */
export default function FlotaxErrorStateIsland({
  initialMode = '404',
  requestedPath,
  enableSimulator = false,
}: FlotaxErrorStateIslandProps) {
  const [mode, setMode] = useState<FlotaxErrorMode>(initialMode);
  const [livePath, setLivePath] = useState<string>(
    requestedPath && requestedPath.length > 0 ? requestedPath : '/vehiculos/unidad-904'
  );
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isCheckingNetwork, setIsCheckingNetwork] = useState<boolean>(false);
  const [pingCountdown, setPingCountdown] = useState<number>(5);
  const [cachedRoutes, setCachedRoutes] = useState<ReadonlyArray<string>>(
    DEFAULT_CACHED_ROUTES
  );

  useEffect(() => {
    if (!requestedPath || requestedPath === '/404' || requestedPath === '/offline') {
      const current = window.location.pathname;
      if (current && current !== '/404' && current !== '/offline' && current !== '/500') {
        setLivePath(current);
      }
    } else {
      setLivePath(requestedPath);
    }

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Inspeccionar rutas HTML disponibles en el Cache Storage del Service Worker
    if ('caches' in window) {
      void window.caches
        .keys()
        .then(async (cacheNames) => {
          const discovered = new Set<string>(DEFAULT_CACHED_ROUTES);
          for (const name of cacheNames) {
            const cache = await window.caches.open(name);
            const requests = await cache.keys();
            for (const req of requests) {
              try {
                const url = new URL(req.url);
                if (
                  url.origin === window.location.origin &&
                  !url.pathname.startsWith('/_astro') &&
                  !url.pathname.startsWith('/icons') &&
                  !url.pathname.includes('.') &&
                  url.pathname !== '/offline'
                ) {
                  discovered.add(url.pathname);
                }
              } catch {
                // Ignorar URLs no válidas en caché
              }
            }
          }
          setCachedRoutes(Array.from(discovered).slice(0, 3));
        })
        .catch(() => {
          // Mantener rutas por defecto si el navegador restringe CacheStorage
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [requestedPath]);

  useEffect(() => {
    if (mode !== 'offline') {
      return undefined;
    }

    const interval = setInterval(() => {
      setPingCountdown((prev) => {
        if (prev <= 1) {
          void verifyNetworkConnection(false);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode]);

  const verifyNetworkConnection = async (navigateOnSuccess: boolean) => {
    setIsCheckingNetwork(true);
    try {
      const response = await fetch('/manifest.webmanifest', {
        method: 'GET',
        cache: 'no-store',
      });
      if (response.ok) {
        setIsOnline(true);
        if (navigateOnSuccess) {
          void navigate('/home');
        }
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsCheckingNetwork(false);
      setPingCountdown(5);
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    void navigate('/catalogo');
  };

  const handleOpenLastCached = () => {
    const firstRoute = cachedRoutes[0] ?? '/catalogo';
    void navigate(firstRoute);
  };

  const isOfflineDark = mode === 'offline';

  return (
    <section
      aria-live="polite"
      className={`min-h-[calc(100dvh-4rem)] w-full px-4 py-6 sm:px-6 md:py-10 flex flex-col items-center justify-center transition-colors duration-300 ${
        isOfflineDark
          ? 'bg-[#111827] text-[#EDEDED]'
          : 'bg-[#EDEDED] text-[#111827]'
      }`}
    >
      {/* Conmutador Interactivo de Estados (Modo Diagnóstico / Simulador Pencil) */}
      {enableSimulator && (
        <div className="mb-6 w-full max-w-[456px] rounded-[20px] border border-[#9CA3AF]/60 bg-[#111827] p-2 text-[#EDEDED] shadow-md">
          <div className="mb-1.5 flex items-center justify-between px-2.5 pt-1">
            <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#9CA3AF] uppercase">
              LÁMINA 05 · SIMULADOR DE CONTINGENCIA
            </span>
            <span className="font-mono text-[10px] font-semibold text-[#EDEDED]">
              PENCIL 1:1
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MODE_OPTIONS.map((item) => {
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`ios-press-bounce flex min-h-[44px] flex-col items-center justify-center rounded-[14px] px-2 py-1.5 text-center transition cursor-pointer ${
                    active
                      ? 'bg-[#EDEDED] text-[#111827] shadow-xs'
                      : 'bg-[#1F2937] text-[#9CA3AF] hover:text-[#EDEDED]'
                  }`}
                >
                  <span className="font-mono text-[9px] font-bold tracking-wider">
                    {item.badge}
                  </span>
                  <span className="font-body text-[11px] font-bold leading-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODO 01: ERROR 404 — UNIDAD O RUTA FUERA DE PERÍMETRO
         ===================================================================== */}
      {mode === '404' && (
        <div className="w-full max-w-[456px] flex flex-col gap-4 animate-fade-up">
          {/* Top App Bar 404 */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleGoBack}
              className="ios-press-bounce inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#9CA3AF] bg-white px-4 py-2 font-body text-xs font-bold text-[#111827] shadow-2xs cursor-pointer"
            >
              <span>←</span>
              <span>Patio FlotaX</span>
            </button>

            <span className="inline-flex min-h-[32px] items-center rounded-full bg-[#111827] px-3.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.1em] text-[#EDEDED]">
              HTTP 404 · PERÍMETRO
            </span>
          </div>

          {/* Escenario Shader CAD Radar 404 */}
          <div className="relative flex h-[228px] w-full flex-col items-center justify-between overflow-hidden rounded-[28px] border border-[#9CA3AF] bg-[#EDEDED] p-[18px]">
            {/* Retícula CAD Milimétrica + Anillos de Perímetro + Barrido Radar */}
            <svg
              aria-hidden="true"
              viewBox="0 0 456 228"
              preserveAspectRatio="xMidYMid slice"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              <defs>
                <pattern
                  id="err404-subgrid"
                  width="16"
                  height="16"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 16 0 L 0 0 0 16"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="0.45"
                    strokeOpacity="0.4"
                  />
                </pattern>
                <pattern
                  id="err404-maingrid"
                  width="64"
                  height="64"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="64" height="64" fill="url(#err404-subgrid)" />
                  <path
                    d="M 64 0 L 0 0 0 64"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="0.9"
                    strokeOpacity="0.6"
                  />
                </pattern>
                <pattern
                  id="err404-hatch"
                  width="8"
                  height="8"
                  patternTransform="rotate(-62.3)"
                  patternUnits="userSpaceOnUse"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="8"
                    stroke="#9CA3AF"
                    strokeWidth="1.4"
                    strokeOpacity="0.45"
                  />
                </pattern>
              </defs>

              <rect width="456" height="228" fill="url(#err404-maingrid)" />

              {/* Vectores Diagonales Constructivos (+62.3° y -35.5°) */}
              <line
                x1="120"
                y1="228"
                x2="336"
                y2="0"
                stroke="#4B5563"
                strokeWidth="1.1"
                strokeDasharray="5 5"
                opacity="0.65"
              />
              <line
                x1="80"
                y1="20"
                x2="376"
                y2="208"
                stroke="#4B5563"
                strokeWidth="1.1"
                strokeDasharray="5 5"
                opacity="0.65"
              />

              {/* Anillo Achurado a +62.3° */}
              <circle
                cx="228"
                cy="114"
                r="82"
                fill="url(#err404-hatch)"
              />
              <circle cx="228" cy="114" r="44" fill="#EDEDED" />

              {/* Anillos de Perímetro Concéntricos */}
              <circle
                cx="228"
                cy="114"
                r="44"
                fill="none"
                stroke="#4B5563"
                strokeWidth="1.2"
              />
              <circle
                cx="228"
                cy="114"
                r="66"
                fill="none"
                stroke="#1F2937"
                strokeWidth="1.5"
              />
              <circle
                cx="228"
                cy="114"
                r="86"
                fill="none"
                stroke="#4B5563"
                strokeWidth="1.25"
                strokeDasharray="8 6"
                className="flotax-loader-orbit"
              />

              {/* Escuadras de Calibración CAD en las 4 esquinas del objetivo */}
              <g stroke="#111827" strokeWidth="2" fill="none">
                <path d="M 118 68 L 118 46 L 142 46" />
                <path d="M 338 68 L 338 46 L 314 46" />
                <path d="M 118 160 L 118 182 L 142 182" />
                <path d="M 338 160 L 338 182 L 314 182" />
              </g>
            </svg>

            {/* HUD Superior Radar 404 */}
            <div className="relative z-10 flex w-full items-center justify-between">
              <span className="font-mono text-[10px] font-bold text-[#1F2937]">
                VEC +62.3° · SECTOR N/A
              </span>
              <span className="font-mono text-[10px] font-semibold text-[#4B5563]">
                LOC: SIN COINCIDENCIA
              </span>
            </div>

            {/* Núcleo Tipográfico 404 + Isotipo */}
            <div className="relative z-10 flex items-center gap-3.5 rounded-[22px] border-2 border-[#111827] bg-white px-6 py-3 shadow-sm">
              <svg
                viewBox="0 0 270 200"
                className="h-[40px] w-[54px] shrink-0 fill-[#111827]"
                aria-hidden="true"
              >
                <path d={M1_PATH} />
                <path d={M2_PATH} />
                <path d={M3_PATH} />
              </svg>
              <span className="font-display text-[44px] font-bold leading-none tracking-[-0.045em] text-[#111827]">
                404
              </span>
            </div>

            {/* HUD Inferior Radar 404 */}
            <div className="relative z-10 inline-flex items-center rounded-lg bg-[#111827] px-3 py-1">
              <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#EDEDED]">
                OBJETIVO FUERA DEL RADIO DE PATIO
              </span>
            </div>
          </div>

          {/* Tarjeta Mensaje y Recuperación 404 */}
          <div className="flex flex-col gap-3.5 rounded-[28px] border border-[#9CA3AF] bg-white p-5 shadow-xs">
            <h1 className="font-display text-[22px] font-bold leading-[1.15] text-[#111827]">
              Esta ruta o vehículo no está en el patio
            </h1>

            <p className="font-body text-[13px] font-medium leading-[1.45] text-[#4B5563]">
              El enlace que abriste no existe, cambió de ubicación o el código de
              reserva ya fue cerrado. Usa los accesos rápidos para retomar tu
              operación.
            </p>

            {/* Caja Ruta Solicitada */}
            <div className="flex items-center justify-between gap-2 rounded-[14px] border border-[#9CA3AF] bg-[#EDEDED] px-3.5 py-2.5">
              <span className="font-mono text-[10px] font-bold text-[#4B5563]">
                RUTA SOLICITADA
              </span>
              <span className="truncate font-mono text-[11px] font-bold text-[#111827]">
                {livePath}
              </span>
            </div>

            {/* Chips de Destinos Frecuentes */}
            <div className="grid grid-cols-3 gap-2">
              {QUICK_DESTINATIONS.map((dest) => (
                <button
                  key={dest.href}
                  type="button"
                  onClick={() => {
                    void navigate(dest.href);
                  }}
                  className="ios-press-bounce flex min-h-[44px] items-center justify-center rounded-[12px] bg-[#EDEDED] px-2.5 py-2 font-body text-[11px] font-bold text-[#111827] transition hover:bg-[#9CA3AF]/30 cursor-pointer"
                >
                  {dest.label}
                </button>
              ))}
            </div>

            {/* CTA Primario 404 (48px Touch) */}
            <button
              type="button"
              onClick={() => {
                void navigate('/catalogo');
              }}
              className="ios-press-bounce flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#111827] px-5 font-body text-[14px] font-bold text-[#EDEDED] transition hover:bg-[#1F2937] cursor-pointer"
            >
              Explorar catálogo de vehículos →
            </button>

            {/* CTA Secundario 404 (46px+ Touch) */}
            <button
              type="button"
              onClick={handleGoBack}
              className="ios-press-bounce flex min-h-[46px] w-full items-center justify-center rounded-full border border-[#9CA3AF] bg-[#EDEDED] px-5 font-body text-[13px] font-bold text-[#111827] transition hover:bg-white cursor-pointer"
            >
              Volver a la pantalla anterior
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODO 02: FALTA DE INTERNET / MODO OFFLINE (PATIO SIN COBERTURA)
         ===================================================================== */}
      {mode === 'offline' && (
        <div className="w-full max-w-[456px] flex flex-col gap-4 animate-fade-up">
          {/* Top App Bar Offline */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-[#4B5563] bg-[#1F2937] px-3.5 py-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline ? 'bg-[#EDEDED]' : 'bg-[#EDEDED] animate-pulse'
                }`}
              />
              <span className="font-mono text-[10px] font-bold tracking-[0.08em] text-[#EDEDED]">
                {isOnline
                  ? 'SEÑAL ACTIVA · EN LÍNEA'
                  : 'SIN SEÑAL · MODO AUTÓNOMO'}
              </span>
            </div>

            <span className="inline-flex min-h-[32px] items-center rounded-full bg-[#1F2937] px-3 py-1 font-mono text-[10px] font-bold text-[#9CA3AF]">
              AUTO-PING · {pingCountdown}S
            </span>
          </div>

          {/* Escenario Shader Sonar Offline */}
          <div className="relative flex h-[228px] w-full flex-col items-center justify-between overflow-hidden rounded-[28px] border border-[#4B5563] bg-[#111827] p-[18px]">
            {/* Sonar Orbital + Portadora Interrumpida + Achurado +62.3° */}
            <svg
              aria-hidden="true"
              viewBox="0 0 456 228"
              preserveAspectRatio="xMidYMid slice"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              <defs>
                <pattern
                  id="offline-dots"
                  width="18"
                  height="18"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="9" cy="9" r="1" fill="#4B5563" fillOpacity="0.45" />
                </pattern>
                <pattern
                  id="offline-hatch"
                  width="8"
                  height="8"
                  patternTransform="rotate(-62.3)"
                  patternUnits="userSpaceOnUse"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="8"
                    stroke="#1F2937"
                    strokeWidth="2"
                  />
                </pattern>
              </defs>

              <rect width="456" height="228" fill="url(#offline-dots)" />

              {/* Franja de Sombra de Portadora con Achurado +62.3° */}
              <rect
                x="24"
                y="82"
                width="408"
                height="64"
                fill="url(#offline-hatch)"
                opacity="0.7"
              />

              {/* Anillos Sonar Expansivos */}
              <circle
                cx="228"
                cy="114"
                r="52"
                fill="none"
                stroke="#4B5563"
                strokeWidth="1.2"
              />
              <circle
                cx="228"
                cy="114"
                r="82"
                fill="none"
                stroke="#9CA3AF"
                strokeWidth="1.4"
                className="flotax-loader-sonar"
              />
              <circle
                cx="228"
                cy="114"
                r="108"
                fill="none"
                stroke="#4B5563"
                strokeWidth="1"
                strokeDasharray="6 6"
              />

              {/* Onda Portadora Izquierda y Derecha Interrumpida en el Centro */}
              <path
                d="M 12 114 Q 36 92, 60 114 T 108 114 T 142 114"
                fill="none"
                stroke="#EDEDED"
                strokeWidth="2"
                strokeOpacity="0.75"
              />
              <line
                x1="146"
                y1="114"
                x2="310"
                y2="114"
                stroke="#4B5563"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <path
                d="M 314 114 Q 338 92, 362 114 T 410 114 T 444 114"
                fill="none"
                stroke="#EDEDED"
                strokeWidth="2"
                strokeOpacity="0.75"
              />
            </svg>

            {/* HUD Superior Sonar Offline */}
            <div className="relative z-10 flex w-full items-center justify-between">
              <span className="font-mono text-[10px] font-bold text-[#9CA3AF]">
                {isOnline
                  ? 'CARRIER: ENLACE ACTIVO'
                  : 'CARRIER: 0.0 KB/S · LINK DOWN'}
              </span>
              <span className="font-mono text-[10px] font-bold text-[#EDEDED]">
                SW CACHE: ACTIVO
              </span>
            </div>

            {/* Núcleo Sonar Offline */}
            <div className="relative z-10 flex items-center gap-3.5 rounded-[22px] border border-[#EDEDED] bg-[#1F2937] px-5 py-3.5 shadow-lg">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#EDEDED"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 shrink-0"
                aria-hidden="true"
              >
                <line x1="2" y1="2" x2="22" y2="22" />
                <path d="M8.5 16.5a5 5 0 0 1 7 0" />
                <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
                <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
                <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
                <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>

              <div className="flex flex-col gap-0.5">
                <span className="font-display text-[20px] font-bold leading-none text-[#EDEDED]">
                  {isOnline ? 'ENLACE LISTO' : 'ENLACE CAÍDO'}
                </span>
                <span className="font-mono text-[9px] font-bold tracking-wider text-[#9CA3AF]">
                  {isOnline
                    ? 'CONEXIÓN RESTABLECIDA EN PATIO'
                    : 'ESPERANDO RED MÓVIL / WI-FI'}
                </span>
              </div>
            </div>

            {/* HUD Inferior Sonar Offline */}
            <div className="relative z-10 inline-flex items-center rounded-lg bg-[#EDEDED] px-3 py-1">
              <span className="font-mono text-[10px] font-bold tracking-[0.1em] text-[#111827]">
                RECONEXIÓN AUTOMÁTICA AL DETECTAR SEÑAL
              </span>
            </div>
          </div>

          {/* Tarjeta Mensaje y Caché Offline */}
          <div className="flex flex-col gap-3.5 rounded-[28px] border border-[#4B5563] bg-[#1F2937] p-5 shadow-lg">
            <h1 className="font-display text-[22px] font-bold leading-[1.15] text-[#EDEDED]">
              Sin conexión a internet en este momento
            </h1>

            <p className="font-body text-[13px] font-medium leading-[1.45] text-[#9CA3AF]">
              Verifica tu señal móvil o Wi-Fi en el patio. No cierres la
              aplicación: FlotaX sincronizará la disponibilidad en cuanto regrese
              la conexión.
            </p>

            {/* Panel Vistas Guardadas en Caché PWA */}
            <div className="flex flex-col gap-2 rounded-[16px] border border-[#4B5563] bg-[#111827] p-3">
              <span className="font-mono text-[9px] font-bold tracking-[0.08em] text-[#9CA3AF]">
                VISTAS GUARDADAS EN ESTE DISPOSITIVO (CACHÉ LOCAL)
              </span>

              <div className="grid grid-cols-3 gap-2">
                {cachedRoutes.map((route) => (
                  <button
                    key={route}
                    type="button"
                    onClick={() => {
                      void navigate(route);
                    }}
                    className="ios-press-bounce flex min-h-[44px] items-center justify-center rounded-[10px] border border-[#4B5563] bg-[#1F2937] px-2.5 py-2 font-mono text-[11px] font-bold text-[#EDEDED] transition hover:border-[#EDEDED] cursor-pointer"
                  >
                    {route}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Primario Reintentar Conexión (48px Touch) */}
            <button
              type="button"
              disabled={isCheckingNetwork}
              onClick={() => {
                void verifyNetworkConnection(true);
              }}
              className="ios-press-bounce flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#EDEDED] px-5 font-body text-[14px] font-extrabold text-[#111827] transition hover:bg-white disabled:opacity-60 cursor-pointer"
            >
              {isCheckingNetwork
                ? 'Verificando enlace con el patio...'
                : 'Reintentar conexión ahora ↻'}
            </button>

            {/* CTA Secundario Offline (46px+ Touch) */}
            <button
              type="button"
              onClick={handleOpenLastCached}
              className="ios-press-bounce flex min-h-[46px] w-full items-center justify-center rounded-full border border-[#4B5563] bg-[#111827] px-5 font-body text-[13px] font-bold text-[#EDEDED] transition hover:bg-[#1F2937] cursor-pointer"
            >
              Abrir última vista guardada
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODO 03: ERROR 500 — CONTINGENCIA OPERATIVA DEL SERVIDOR
         ===================================================================== */}
      {mode === '500' && (
        <div className="w-full max-w-[456px] flex flex-col gap-4 animate-fade-up">
          {/* Top App Bar 500 */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex min-h-[38px] items-center rounded-full border border-[#9CA3AF] bg-white px-3.5 py-1.5 font-mono text-[10px] font-bold text-[#111827]">
              DATOS DE PATIO SEGUROS
            </span>

            <span className="inline-flex min-h-[32px] items-center rounded-full bg-[#1F2937] px-3.5 py-1.5 font-mono text-[10px] font-bold text-[#EDEDED]">
              HTTP 500 · GUARDIA EDGE
            </span>
          </div>

          {/* Escenario Telemetría Contingencia 500 */}
          <div className="relative flex h-[228px] w-full flex-col items-center justify-between overflow-hidden rounded-[28px] border border-[#1F2937] bg-[#111827] p-[18px]">
            {/* HUD Superior 500 */}
            <div className="relative z-10 flex w-full items-center justify-between">
              <span className="font-mono text-[10px] font-bold text-[#9CA3AF]">
                EDGE ISOLATE · GUARDIA ACTIVA
              </span>
              <span className="font-mono text-[10px] font-bold text-[#EDEDED]">
                STANDBY PREVENTIVO
              </span>
            </div>

            {/* Núcleo 500 + Escudo Operativo */}
            <div className="relative z-10 flex items-center gap-4 rounded-[22px] border border-[#4B5563] bg-[#1F2937] px-6 py-3.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#EDEDED"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-9 w-9 shrink-0"
                aria-hidden="true"
              >
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              <span className="font-display text-[44px] font-bold leading-none tracking-[-0.045em] text-[#EDEDED]">
                500
              </span>
            </div>

            {/* Tacómetro 10 Celdas Standby */}
            <div
              aria-hidden="true"
              className="relative z-10 flex items-center justify-center gap-1.5"
            >
              {TACH_STANDBY_CELLS.map((idx) => (
                <span
                  key={idx}
                  className={`inline-block h-2 w-[22px] rounded-[2px] ${
                    idx < 6
                      ? 'bg-[#EDEDED]'
                      : idx < 8
                        ? 'bg-[#9CA3AF]'
                        : 'bg-[#4B5563]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Tarjeta Mensaje y Recuperación 500 */}
          <div className="flex flex-col gap-3.5 rounded-[28px] border border-[#9CA3AF] bg-white p-5 shadow-xs">
            <h1 className="font-display text-[22px] font-bold leading-[1.15] text-[#111827]">
              Interrupción temporal en el servicio
            </h1>

            <p className="font-body text-[13px] font-medium leading-[1.45] text-[#4B5563]">
              Ocurrió un inconveniente al procesar tu solicitud. Tus reservas,
              entregas y pagos están protegidos; intenta nuevamente en unos
              segundos.
            </p>

            {/* Caja Referencia Evento 500 */}
            <div className="flex items-center justify-between gap-2 rounded-[14px] border border-[#9CA3AF] bg-[#EDEDED] px-3.5 py-2.5">
              <span className="font-mono text-[10px] font-bold text-[#4B5563]">
                INTEGRIDAD DE SESIÓN
              </span>
              <span className="font-mono text-[11px] font-bold text-[#111827]">
                VERIFICADA · SIN PÉRDIDA
              </span>
            </div>

            {/* Fila Garantías Operativas 500 */}
            <div className="grid grid-cols-3 gap-2">
              {(['Reservas OK', 'Caja Intacta', 'Sesión Activa'] as const).map(
                (tag) => (
                  <div
                    key={tag}
                    className="flex min-h-[38px] items-center justify-center rounded-[12px] bg-[#EDEDED] px-2.5 py-2 text-center font-body text-[11px] font-bold text-[#111827]"
                  >
                    {tag}
                  </div>
                )
              )}
            </div>

            {/* CTA Primario 500 (48px Touch) */}
            <button
              type="button"
              onClick={() => {
                void navigate(livePath.startsWith('/') ? livePath : '/home');
              }}
              className="ios-press-bounce flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#111827] px-5 font-body text-[14px] font-bold text-[#EDEDED] transition hover:bg-[#1F2937] cursor-pointer"
            >
              Reintentar operación ahora ↻
            </button>

            {/* CTA Secundario 500 (46px+ Touch) */}
            <button
              type="button"
              onClick={() => {
                void navigate('/home');
              }}
              className="ios-press-bounce flex min-h-[46px] w-full items-center justify-center rounded-full border border-[#9CA3AF] bg-[#EDEDED] px-5 font-body text-[13px] font-bold text-[#111827] transition hover:bg-white cursor-pointer"
            >
              Ir al inicio de FlotaX
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
