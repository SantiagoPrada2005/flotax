import { useState, useEffect, useRef } from 'react';
import { isStandalonePwa } from '@/lib/pwa';
import FlotaxIsotype from '@/components/ui/FlotaxIsotype';
import NotificacionesBell from '@/components/notificaciones/NotificacionesBell';
import UserDropdownMenu from './UserDropdownMenu';

export interface TopBarIslandProps {
  title?: string | undefined;
  showBack?: boolean | undefined;
  backHref?: string | undefined;
  navVariant?: 'admin' | 'client' | undefined;
  className?: string | undefined;
  autenticado?: boolean | undefined;
  usuarioImagen?: string | null | undefined;
  usuarioNombre?: string | null | undefined;
  usuarioCorreo?: string | null | undefined;
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
  usuarioCorreo,
  usuarioLocalNombre,
  clavePublicaVapid,
  localCaptacionNombre,
}: TopBarIslandProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

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

  // Cierre accesible del menú desplegable (clic externo o tecla Escape)
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
            {/* Marca compacta estilo referencia */}
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

            {/* En escritorio Admin, mostramos el título conciso de la vista */}
            {isAdminVariant && cleanSectionTitle && (
              <span className="hidden md:inline-block font-display text-sm font-bold tracking-tight text-[#111827] truncate">
                {cleanSectionTitle}
              </span>
            )}
          </>
        )}
      </div>

      {/* Lado Derecho: Campana de Notificaciones + Botón de Menú de Tres Rayitas */}
      <div ref={menuContainerRef} className="relative flex items-center gap-0.5">
        <NotificacionesBell
          autenticado={autenticado}
          clavePublicaVapid={clavePublicaVapid}
          onHaptic={triggerHaptic}
        />

        {/* Botón de Menú de tres rayitas horizontales (Hamburguesa) */}
        <button
          type="button"
          aria-label={isMenuOpen ? 'Cerrar menú de usuario' : 'Abrir menú de usuario'}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          onPointerDown={triggerHaptic}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className={`ios-press-bounce relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors duration-150 ${
            isMenuOpen
              ? 'bg-[#111827] dark:bg-white/20 text-[#EDEDED]'
              : 'text-[#1F2937] dark:text-[#EDEDED] hover:bg-[#111827]/6 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white'
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

        {/* Menú Desplegable Flotante de Usuario */}
        <UserDropdownMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          autenticado={autenticado}
          usuarioNombre={usuarioNombre}
          usuarioCorreo={usuarioCorreo}
          usuarioImagen={usuarioImagen}
          usuarioLocalNombre={usuarioLocalNombre}
          onTriggerHaptic={triggerHaptic}
        />
      </div>
    </header>
  );
}
