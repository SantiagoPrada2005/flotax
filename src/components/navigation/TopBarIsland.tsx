import { useState, useEffect, useRef } from 'react';
import { navigate } from 'astro:transitions/client';
import { isStandalonePwa, openInstallPromptModal } from '@/lib/pwa';
import FlotaxIsotype from '@/components/ui/FlotaxIsotype';
import NotificacionesBell from '@/components/notificaciones/NotificacionesBell';

export interface TopBarIslandProps {
  title?: string | undefined;
  showBack?: boolean | undefined;
  backHref?: string | undefined;
  navVariant?: 'admin' | 'client' | undefined;
  className?: string | undefined;
  autenticado?: boolean | undefined;
  usuarioImagen?: string | null | undefined;
  usuarioNombre?: string | null | undefined;
  usuarioLocalNombre?: string | null | undefined;
  tieneAccesoAdmin?: boolean | undefined;
  clavePublicaVapid?: string | undefined;
  localCaptacionNombre?: string | undefined;
}

export default function TopBarIsland({
  title = 'FlotaX',
  showBack = false,
  backHref = '/',
  navVariant = 'client',
  className = '',
  autenticado = false,
  usuarioImagen,
  usuarioNombre,
  usuarioLocalNombre,
  tieneAccesoAdmin = false,
  clavePublicaVapid,
  localCaptacionNombre,
}: TopBarIslandProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const iniciales = (usuarioNombre || 'FX')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const isAdminVariant = navVariant === 'admin';
  const brandLabel = localCaptacionNombre || 'FlotaX';
  const brandHref = isAdminVariant ? '/admin' : '/catalogo';

  const cleanSectionTitle = title
    .replace(/^FlotaX\s*[—–-]\s*/i, '')
    .replace(/\s*\|\s*FlotaX$/i, '')
    .trim();

  useEffect(() => {
    setIsStandalone(isStandalonePwa());
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    const handleInstalled = () => setIsStandalone(true);
    const handleRouteSync = () => setIsMenuOpen(false);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('appinstalled', handleInstalled);
    document.addEventListener('astro:page-load', handleRouteSync);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('appinstalled', handleInstalled);
      document.removeEventListener('astro:page-load', handleRouteSync);
    };
  }, []);

  // Cierre accesible del menú progresivo (clic externo o tecla Escape)
  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        menuContainerRef.current &&
        target instanceof Node &&
        !menuContainerRef.current.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {
        // Ignorar en dispositivos sin API de vibración
      }
    }
  };

  const irARuta = (ruta: string) => {
    triggerHaptic();
    setIsMenuOpen(false);
    void navigate(ruta);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between px-3.5 sm:px-6 transition-all duration-200 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-xl border-b border-[#9CA3AF]/25 shadow-[0_4px_18px_-8px_rgba(17,24,39,0.08)]'
          : 'bg-[#EDEDED]/85 backdrop-blur-md border-b border-transparent'
      } ${className}`}
    >
      {/* Lado Izquierdo: Navegación Atrás o Marca Minimalista */}
      <div className="flex min-w-0 items-center gap-2">
        {showBack ? (
          <a
            href={backHref}
            aria-label="Volver"
            onPointerDown={triggerHaptic}
            className="ios-press-bounce -ml-2 inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-full px-2 text-[#111827] transition-colors hover:bg-[#111827]/6"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px] shrink-0"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="font-display text-sm font-bold tracking-tight text-[#111827] truncate max-w-[180px] sm:max-w-[260px]">
              {brandLabel}
            </span>
          </a>
        ) : (
          <>
            {/* Marca compacta estilo referencia (siempre en cliente; solo móvil en admin donde ya existe Sidebar desktop) */}
            <a
              href={brandHref}
              data-astro-prefetch="tap"
              onPointerDown={triggerHaptic}
              className={`ios-press-bounce inline-flex min-h-[44px] items-center gap-2 rounded-xl pr-2 text-[#111827] transition-opacity hover:opacity-85 ${
                isAdminVariant ? 'md:hidden' : 'flex'
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-[#111827] text-[#EDEDED] shadow-2xs">
                <FlotaxIsotype size={13} fillColor="#EDEDED" />
              </span>
              <span className="font-display text-[15px] font-extrabold tracking-tight text-[#111827] truncate max-w-[190px]">
                {brandLabel}
              </span>
            </a>

            {/* En escritorio Admin, la Sidebar ya exhibe el isotipo; mostramos el título conciso de la vista */}
            {isAdminVariant && cleanSectionTitle && (
              <span className="hidden md:inline-block font-display text-sm font-bold tracking-tight text-[#111827] truncate">
                {cleanSectionTitle}
              </span>
            )}
          </>
        )}
      </div>

      {/* Lado Derecho: Iconos Pequeños Minimalistas + Progressive Disclosure (Campana + Menú) */}
      <div ref={menuContainerRef} className="relative flex items-center gap-0.5">
        <NotificacionesBell
          autenticado={autenticado}
          clavePublicaVapid={clavePublicaVapid}
          onHaptic={triggerHaptic}
        />

        {/* Disparador de Progressive Disclosure: agrupa Perfil, Accesos y PWA Install fuera de la barra */}
        <button
          type="button"
          aria-label={isMenuOpen ? 'Cerrar menú de opciones' : 'Abrir menú de opciones'}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          onPointerDown={triggerHaptic}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className={`ios-press-bounce relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 ${
            isMenuOpen
              ? 'bg-[#111827] text-[#EDEDED]'
              : 'text-[#1F2937] hover:bg-[#111827]/6 hover:text-[#111827]'
          }`}
        >
          {isMenuOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[18px] w-[18px]"
              aria-hidden="true"
            >
              <line x1="4" x2="20" y1="7" y2="7" />
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="17" y2="17" />
            </svg>
          )}

          {!isStandalone && !isMenuOpen && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2.5 h-1.5 w-1.5 rounded-full bg-[#4B5563]"
            />
          )}
        </button>

        {/* Nivel 2 (Progressive Disclosure): Popover de Cuenta, Cambio de Vista e Instalación */}
        {isMenuOpen && (
          <div
            role="menu"
            aria-label="Opciones rápidas de usuario y aplicación"
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 rounded-[22px] border border-[#9CA3AF]/35 bg-white/96 p-2 shadow-[0_20px_44px_-10px_rgba(17,24,39,0.22)] backdrop-blur-2xl"
          >
            {/* Bloque 1: Identidad / Perfil */}
            {autenticado ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => irARuta('/perfil')}
                className="ios-press-bounce flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-2.5 rounded-[15px] px-3 py-2 text-left transition-colors hover:bg-[#EDEDED]/80"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-[11px] font-bold text-[#EDEDED]">
                    {usuarioImagen && !avatarError ? (
                      <img
                        src={usuarioImagen}
                        alt={usuarioNombre || 'Perfil'}
                        referrerPolicy="no-referrer"
                        onError={() => setAvatarError(true)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{iniciales}</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#111827]">
                      {usuarioNombre || 'Mi perfil'}
                    </p>
                    <p className="truncate text-[11px] font-medium text-[#4B5563]">
                      {usuarioLocalNombre || 'Cuenta y documentos'}
                    </p>
                  </div>
                </div>

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 shrink-0 text-[#9CA3AF]"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                onClick={() => irARuta('/login')}
                className="ios-press-bounce flex min-h-[46px] w-full cursor-pointer items-center justify-between rounded-[15px] px-3 py-2 text-left text-xs font-bold text-[#111827] transition-colors hover:bg-[#EDEDED]/80"
              >
                <span>Iniciar sesión</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-[#4B5563]"
                  aria-hidden="true"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" x2="3" y1="12" y2="12" />
                </svg>
              </button>
            )}

            {/* Bloque 2: Accesos Contextuales */}
            {(tieneAccesoAdmin || autenticado) && (
              <div className="mt-1 border-t border-[#EDEDED] pt-1 space-y-0.5">
                {tieneAccesoAdmin && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => irARuta(isAdminVariant ? '/catalogo' : '/admin')}
                    className="ios-press-bounce flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-[14px] px-3 py-2 text-left text-xs font-semibold text-[#1F2937] transition-colors hover:bg-[#EDEDED]/75 hover:text-[#111827]"
                  >
                    <span>
                      {isAdminVariant ? 'Ver catálogo público' : 'Panel operativo'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 text-[#4B5563]"
                      aria-hidden="true"
                    >
                      <path d="M7 17 17 7" />
                      <path d="M7 7h10v10" />
                    </svg>
                  </button>
                )}

                {autenticado && !isAdminVariant && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => irARuta('/reservas')}
                    className="ios-press-bounce flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-[14px] px-3 py-2 text-left text-xs font-semibold text-[#1F2937] transition-colors hover:bg-[#EDEDED]/75 hover:text-[#111827]"
                  >
                    <span>Mis reservas</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 text-[#4B5563]"
                      aria-hidden="true"
                    >
                      <rect width="18" height="18" x="3" y="4" rx="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Bloque 3: Instalación PWA bajo demanda (solo fuera de modo standalone) */}
            {!isStandalone && (
              <div className="mt-1.5 border-t border-[#EDEDED] pt-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    triggerHaptic();
                    setIsMenuOpen(false);
                    openInstallPromptModal();
                  }}
                  className="ios-press-bounce flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-[14px] bg-[#111827] px-3.5 py-2 text-xs font-bold text-[#EDEDED] transition-colors hover:bg-[#1F2937]"
                >
                  <span>Instalar aplicación</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
