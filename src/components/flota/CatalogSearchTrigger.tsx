export default function CatalogSearchTrigger() {
  const handleOpenSearch = () => {
    if (typeof window !== 'undefined') {
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(8);
        } catch {}
      }
      window.dispatchEvent(new CustomEvent('flotax:open-search'));
    }
  };

  return (
    <div className="flex items-center gap-2.5 w-full">
      {/* Píldora de Búsqueda Suave Estilo Screen 2 */}
      <button
        type="button"
        onClick={handleOpenSearch}
        aria-label="Buscar vehículos"
        className="ios-press-bounce flex flex-1 items-center gap-3 rounded-full bg-[#F4F4F5] hover:bg-[#EAEAEB] px-4.5 py-3 text-left transition cursor-pointer"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4.5 w-4.5 text-[#71717A] shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>

        <span className="truncate text-sm text-[#71717A] font-medium">
          Buscar por marca, modelo o tipo...
        </span>

        <kbd className="hidden sm:inline-flex ml-auto font-mono text-[10px] text-[#A1A1AA] bg-white px-2 py-0.5 rounded-full border border-[#E4E4E7]">
          ⌘K
        </kbd>
      </button>

      {/* Botón Sliders de Filtro Separado Estilo Screen 2 */}
      <button
        type="button"
        onClick={handleOpenSearch}
        aria-label="Filtros avanzados"
        className="ios-press-bounce flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F4F5] hover:bg-[#EAEAEB] text-[#18181B] transition cursor-pointer"
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
          <line x1="4" x2="20" y1="8" y2="8" />
          <line x1="4" x2="20" y1="16" y2="16" />
          <circle cx="9" cy="8" r="2.5" fill="currentColor" stroke="none" />
          <circle cx="15" cy="16" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
    </div>
  );
}
