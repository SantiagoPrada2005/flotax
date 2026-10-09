import { useState, useRef, useEffect } from 'react';
import VehicleSearchSpotlight from '../flota/VehicleSearchSpotlight';

export interface TopBarSearchProps {
  isScrolled: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export default function TopBarSearch({
  isScrolled,
  isOpen,
  onOpen,
  onClose,
}: TopBarSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerHaptic = (ms = 8) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignorar si el navegador bloquea vibración
      }
    }
  };

  // Escuchar evento personalizado y atajo de teclado Cmd+K para abrir el buscador
  useEffect(() => {
    const handleGlobalOpen = (e: Event) => {
      triggerHaptic(10);
      onOpen();
      if (e instanceof CustomEvent && e.detail?.query) {
        setQuery(e.detail.query);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        triggerHaptic(10);
        onOpen();
      }
    };

    window.addEventListener('flotax:open-search', handleGlobalOpen);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('flotax:open-search', handleGlobalOpen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpen]);

  // Foco automático al abrir y bloqueo de scroll en el body
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 60);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const pillClass = isScrolled
    ? 'ios-floating-pill border-white/60 shadow-[0_12px_28px_-6px_rgba(17,24,39,0.18)]'
    : 'ios-floating-pill border-white/40 shadow-[0_8px_20px_-4px_rgba(17,24,39,0.10)]';

  const handleClose = () => {
    triggerHaptic(6);
    onClose();
    setQuery('');
  };

  return (
    <>
      {/* Botón Circular en Reposo */}
      {!isOpen && (
        <button
          type="button"
          aria-label="Buscar vehículos"
          onClick={() => {
            triggerHaptic(8);
            onOpen();
          }}
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
      )}

      {/* Cápsula de Búsqueda Expandida tipo iOS 27 */}
      {isOpen && (
        <div className="fixed inset-x-3 sm:inset-x-6 top-2 h-11 z-50 flex items-center gap-2.5 animate-in fade-in duration-200">
          <div
            className={`flex-1 h-11 flex items-center px-3.5 gap-2.5 rounded-full border border-white/80 ${pillClass} ios-search-morph shadow-[0_14px_32px_-6px_rgba(17,24,39,0.22)]`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4.5 w-4.5 text-[#4B5563] shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por auto, moto, placa o tipo..."
              className="flex-1 bg-transparent text-base text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none min-w-0"
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Limpiar texto"
                className="ios-press-bounce flex h-6 w-6 items-center justify-center rounded-full bg-[#9CA3AF]/30 text-[#4B5563] hover:text-[#111827]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="ios-press-bounce shrink-0 px-2.5 py-1 text-sm font-semibold text-[#111827] hover:text-[#4B5563] active:opacity-60 transition"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Overlay a Pantalla Completa con Resultados */}
      <VehicleSearchSpotlight
        isOpen={isOpen}
        onClose={handleClose}
        query={query}
        onQueryChange={setQuery}
      />
    </>
  );
}
