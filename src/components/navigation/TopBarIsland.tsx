import { useState, useEffect } from 'react';

export interface TopBarIslandProps {
  title?: string | undefined;
  showBack?: boolean | undefined;
  backHref?: string | undefined;
  className?: string | undefined;
}

export default function TopBarIsland({
  title = 'FlotaX',
  showBack = false,
  backHref = '/',
  className = '',
}: TopBarIslandProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {
        // Ignorar si el navegador bloquea vibración
      }
    }
  };

  const pillClass = isScrolled
    ? 'ios-floating-pill border-white/60 shadow-[0_12px_28px_-6px_rgba(17,24,39,0.18)]'
    : 'ios-floating-pill border-white/40 shadow-[0_8px_20px_-4px_rgba(17,24,39,0.10)]';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 pointer-events-none flex h-16 items-center justify-between px-4 sm:px-6 transition-all duration-300 ${
        isScrolled ? 'pt-1' : 'pt-2'
      } ${className}`}
    >
      {/* Left Floating Controls */}
      <div className="pointer-events-auto flex items-center gap-2.5">
        {showBack ? (
          <a
            href={backHref}
            aria-label="Volver"
            onPointerDown={triggerHaptic}
            className={`ios-press-bounce flex h-11 w-11 items-center justify-center rounded-full text-[#111827] border ${pillClass}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 transition-transform duration-200 group-active:-translate-x-0.5"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </a>
        ) : (
          <>
            {/* Mobile Native Floating Menu Icon */}
            <button
              type="button"
              aria-label="Menú principal"
              onPointerDown={triggerHaptic}
              className={`ios-press-bounce flex h-11 w-11 items-center justify-center rounded-full text-[#111827] border md:hidden ${pillClass}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <line x1="4" x2="20" y1="7" y2="7" />
                <line x1="4" x2="16" y1="12" y2="12" />
                <line x1="4" x2="12" y1="17" y2="17" />
              </svg>
            </button>

            {/* Desktop Contextual Title Pill */}
            {title && (
              <div
                className={`hidden items-center gap-2 rounded-full px-4 py-2 border transition-all duration-300 md:flex ${pillClass}`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                  {title}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Floating Controls */}
      <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5">
        {/* Live Fleet Status Pill on tablet/desktop */}
        <div
          className={`hidden items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#1F2937] border transition-all duration-300 sm:flex ${pillClass}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
          </span>
          <span className="font-mono text-[11px] font-bold">En Vivo</span>
        </div>

        {/* Quick Search button */}
        <button
          type="button"
          aria-label="Buscar unidades"
          onPointerDown={triggerHaptic}
          className={`ios-press-bounce flex h-11 w-11 items-center justify-center rounded-full text-[#4B5563] hover:text-[#111827] border ${pillClass}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4.5 w-4.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>

        {/* Notifications Button with Dynamic Island Badge */}
        <button
          type="button"
          aria-label="Notificaciones"
          onPointerDown={triggerHaptic}
          className={`ios-press-bounce relative flex h-11 w-11 items-center justify-center rounded-full text-[#4B5563] hover:text-[#111827] border ${pillClass}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4.5 w-4.5"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span className="absolute right-2.5 top-2.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 ring-2 ring-white" />
          </span>
        </button>

        {/* User Profile Avatar */}
        <a
          href="/perfil"
          aria-label="Perfil de usuario"
          onPointerDown={triggerHaptic}
          className="ios-press-bounce flex h-11 w-11 items-center justify-center rounded-full bg-[#111827] text-white border-2 border-white shadow-[0_6px_16px_rgba(17,24,39,0.25)] text-xs font-bold"
        >
          FX
        </a>
      </div>
    </header>
  );
}
