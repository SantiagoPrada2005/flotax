import { useState, useMemo } from 'react';
import type { VehiculoItem, CategoriaVehiculo } from '@/lib/flota/types';
import type { LocalPublicoContexto } from '@/lib/flota/locales-captacion';

export interface LocalCatalogShowcaseProps {
  local: LocalPublicoContexto;
  initialVehiculos: VehiculoItem[];
  esPerimetroCerrado?: boolean | undefined;
}

type FiltroCategoriaCircular =
  | 'TODOS'
  | CategoriaVehiculo
  | 'ELECTRICO';

interface ItemCategoriaCircular {
  id: FiltroCategoriaCircular;
  label: string;
  renderIcon: (active: boolean) => React.ReactNode;
}

const CATEGORIAS_CIRCULARES: ItemCategoriaCircular[] = [
  {
    id: 'TODOS',
    label: 'Todos',
    renderIcon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
      </svg>
    ),
  },
  {
    id: 'SUV',
    label: 'SUVs',
    renderIcon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
  },
  {
    id: 'SEDAN',
    label: 'Sedán',
    renderIcon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
        <circle cx="6.5" cy="16.5" r="2.5" />
        <circle cx="16.5" cy="16.5" r="2.5" />
      </svg>
    ),
  },
  {
    id: 'MOTO',
    label: 'Motos',
    renderIcon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2" />
      </svg>
    ),
  },
  {
    id: 'ELECTRICO',
    label: 'Eléctricos',
    renderIcon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    id: 'PATINETA',
    label: 'Scooter',
    renderIcon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M8.5 18h7M15 5h3v13M6 15.5 11 9" />
      </svg>
    ),
  },
];

function formatCop(val: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);
}

export default function LocalCatalogShowcase({
  local,
  initialVehiculos,
}: LocalCatalogShowcaseProps) {
  const [categoriaActiva, setCategoriaActiva] = useState<FiltroCategoriaCircular>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<'DESTACADOS' | 'TODOS'>('DESTACADOS');
  const [unidadSpotlightId, setUnidadSpotlightId] = useState<string>(
    initialVehiculos[0]?.id ?? ''
  );

  const triggerHaptic = (ms = 8) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignorar si el dispositivo no soporta vibración
      }
    }
  };

  const abrirBuscadorGlobal = () => {
    triggerHaptic(8);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('flotax:open-search', {
          detail: { query: busqueda },
        })
      );
    }
  };

  // Filtrado reactivo dentro del inventario exclusivo de este local
  const vehiculosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return initialVehiculos.filter((v) => {
      if (categoriaActiva === 'ELECTRICO') {
        const esElec = v.combustible === 'Eléctrico' || v.combustible === 'Híbrido';
        if (!esElec) return false;
      } else if (categoriaActiva !== 'TODOS' && v.categoria !== categoriaActiva) {
        return false;
      }

      if (!q) return true;
      const texto = `${v.marca} ${v.modelo} ${v.categoriaEtiqueta} ${v.transmision} ${v.combustible} ${v.anio}`.toLowerCase();
      return texto.includes(q);
    });
  }, [initialVehiculos, categoriaActiva, busqueda]);

  // Unidad destacada activa para la Tarjeta Hero Spotlight (Pantalla 2)
  const unidadHero = useMemo(() => {
    const porId = vehiculosFiltrados.find((v) => v.id === unidadSpotlightId);
    if (porId) return porId;
    return (
      vehiculosFiltrados.find((v) => v.destacado) ??
      vehiculosFiltrados[0] ??
      initialVehiculos[0]
    );
  }, [vehiculosFiltrados, unidadSpotlightId, initialVehiculos]);

  // Unidades para el Bento Asimétrico (Pantalla 1)
  const bentoPrincipalIzq = vehiculosFiltrados[0] ?? initialVehiculos[0];
  const bentoContrasteDer =
    vehiculosFiltrados[1] ?? vehiculosFiltrados[0] ?? initialVehiculos[0];
  const bentoHorizontalAncho =
    vehiculosFiltrados[2] ?? vehiculosFiltrados[0] ?? initialVehiculos[0];

  // Unidades hermanas del mismo local para "Más de este patio" (Pantalla 2)
  const masDelPatio = useMemo(() => {
    if (!unidadHero) return vehiculosFiltrados.slice(0, 4);
    const otros = vehiculosFiltrados.filter((v) => v.id !== unidadHero.id);
    return otros.length > 0 ? otros : vehiculosFiltrados;
  }, [vehiculosFiltrados, unidadHero]);


  return (
    <div className="mx-auto w-full max-w-md sm:max-w-2xl lg:max-w-6xl space-y-6 pb-8">
      {/* =====================================================================
          CABECERA IDENTITARIA DEL LOCAL (PERÍMETRO EXCLUSIVO MOBILE-FIRST)
         ===================================================================== */}
      <section className="space-y-3.5 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#111827] leading-tight">
              {local.nombre}
            </h1>
            <p className="text-xs sm:text-sm text-[#4B5563] mt-0.5">
              {local.direccion
                ? `${local.direccion} · Flota verificada para entrega inmediata`
                : 'Reserva directa sin intermediarios · Flota disponible en patio'}
            </p>
          </div>
        </div>

        {/* Barra de Búsqueda Píldora iOS (Inspirada en Pantalla 1: "Find Your...") */}
        <div className="relative flex items-center rounded-full bg-white border border-[#9CA3AF]/40 px-4 min-h-[48px] shadow-[0_8px_24px_-6px_rgba(17,24,39,0.07)] focus-within:border-[#111827] focus-within:ring-2 focus-within:ring-[#111827]/10 transition">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4.5 w-4.5 text-[#9CA3AF] shrink-0 mr-2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={`Buscar en ${local.nombre}...`}
            aria-label={`Buscar vehículos en ${local.nombre}`}
            className="w-full bg-transparent text-base text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none"
          />
          {busqueda ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(6);
                setBusqueda('');
              }}
              aria-label="Limpiar búsqueda"
              className="ios-press-bounce flex h-8 w-8 items-center justify-center rounded-full bg-[#EDEDED] text-[#4B5563] hover:text-[#111827] shrink-0 ml-1 cursor-pointer"
            >
              ✕
            </button>
          ) : (
            <button
              type="button"
              onClick={abrirBuscadorGlobal}
              aria-label="Abrir buscador avanzado"
              title="Filtros rápidos"
              className="ios-press-bounce flex h-9 w-9 items-center justify-center rounded-full bg-[#EDEDED]/80 text-[#111827] hover:bg-[#EDEDED] shrink-0 ml-1 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="8" x2="16" y1="12" y2="12" />
                <line x1="11" x2="13" y1="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Selector Horizontal de Categorías Circulares iOS (Pantalla 1) */}
        <div
          role="tablist"
          aria-label="Categorías de vehículos del local"
          className="flex items-center justify-between sm:justify-start gap-3 sm:gap-5 overflow-x-auto no-scrollbar pt-1 pb-1"
        >
          {CATEGORIAS_CIRCULARES.map((cat) => {
            const isActive = categoriaActiva === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  triggerHaptic(8);
                  setCategoriaActiva(cat.id);
                }}
                className="ios-press-bounce group flex flex-col items-center gap-1.5 shrink-0 cursor-pointer focus:outline-none"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200 ${isActive
                    ? 'bg-[#111827] text-[#EDEDED] shadow-[0_10px_22px_-4px_rgba(17,24,39,0.38)] ring-2 ring-[#111827]/15 scale-105'
                    : 'bg-white text-[#111827] border border-[#9CA3AF]/35 hover:border-[#4B5563]'
                    }`}
                >
                  {cat.renderIcon(isActive)}
                </div>
                <span
                  className={`text-[11px] tracking-tight transition-colors ${isActive
                    ? 'font-extrabold text-[#111827]'
                    : 'font-medium text-[#4B5563]'
                    }`}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          CONTROL DE VISTA MOBILE-FIRST: SEGMENTED CONTROL (APPLE HIG)
         ===================================================================== */}
      {vehiculosFiltrados.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
          <h2 className="font-display text-sm sm:text-base font-extrabold tracking-tight text-[#111827]">
            {busqueda
              ? `Resultados (${vehiculosFiltrados.length})`
              : vista === 'TODOS'
              ? `Toda la flota (${vehiculosFiltrados.length})`
              : 'Selección de Patio'}
          </h2>

          {!busqueda && (
            <div
              role="tablist"
              aria-label="Modo de visualización"
              className="inline-flex items-center rounded-full bg-[#EDEDED] p-1 border border-[#9CA3AF]/25 shadow-2xs"
            >
              <button
                type="button"
                role="tab"
                aria-selected={vista === 'DESTACADOS'}
                onClick={() => {
                  triggerHaptic(8);
                  setVista('DESTACADOS');
                }}
                className={`ios-press-bounce min-h-[34px] px-3.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  vista === 'DESTACADOS'
                    ? 'bg-[#111827] text-[#EDEDED] shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                Destacados
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={vista === 'TODOS'}
                onClick={() => {
                  triggerHaptic(8);
                  setVista('TODOS');
                }}
                className={`ios-press-bounce min-h-[34px] px-3.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  vista === 'TODOS'
                    ? 'bg-[#111827] text-[#EDEDED] shadow-xs'
                    : 'text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                Ver todos ({vehiculosFiltrados.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          ESTADO VACÍO SI EL FILTRO NO TIENE COINCIDENCIAS EN ESTE LOCAL
         ===================================================================== */}
      {vehiculosFiltrados.length === 0 ? (
        <div className="rounded-[28px] bg-white border border-[#9CA3AF]/35 p-8 text-center shadow-xs space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-[#111827]">
              Sin unidades en esta categoría
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5563] max-w-sm mx-auto">
              En este momento {local.nombre} no tiene vehículos bajo ese filtro. Explora todas las unidades disponibles en patio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setCategoriaActiva('TODOS');
              setBusqueda('');
            }}
            className="ios-press-bounce min-h-[44px] inline-flex items-center justify-center rounded-full bg-[#111827] px-6 py-2.5 text-xs font-bold text-[#EDEDED] cursor-pointer"
          >
            Ver toda la flota del local
          </button>
        </div>
      ) : vista === 'TODOS' || Boolean(busqueda) ? (
        /* =====================================================================
            VISTA COMPLETA: GRID COMPLETO DIRECTO CON FEEDBACK VISUAL INMEDIATO
           ===================================================================== */
        <section aria-label="Inventario Completo" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {vehiculosFiltrados.map((v) => (
              <a
                key={v.id}
                href={`/vehiculos/${v.id}`}
                onClick={() => triggerHaptic(8)}
                className="group ios-press-bounce rounded-[26px] bg-white border border-[#9CA3AF]/30 p-4 shadow-2xs hover:border-[#111827]/40 transition flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                    {v.categoriaEtiqueta} · {v.anio}
                  </span>
                  <h3 className="font-display text-base font-extrabold text-[#111827] truncate">
                    {v.marca} {v.modelo}
                  </h3>
                  <p className="text-[11px] text-[#4B5563]">
                    {v.transmision} · {v.capacidadPasajeros} puestos
                  </p>
                  <p className="font-mono tabular-nums text-sm font-black text-[#111827] pt-0.5">
                    {formatCop(v.precioDia)}
                    <span className="font-sans text-[11px] font-normal text-[#4B5563]">
                      {' '}
                      / día
                    </span>
                  </p>
                </div>

                <div className="w-28 sm:w-32 shrink-0 flex items-center justify-center">
                  <img
                    src={v.imagenUrl}
                    alt={`${v.marca} ${v.modelo}`}
                    className="w-full max-h-24 object-contain group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
              </a>
            ))}
          </div>

          {!busqueda && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setVista('DESTACADOS');
                }}
                className="ios-press-bounce inline-flex min-h-[44px] items-center justify-center rounded-full bg-white border border-[#9CA3AF]/40 px-6 py-2.5 text-xs font-bold text-[#111827] hover:bg-[#EDEDED]/50 transition cursor-pointer"
              >
                ← Volver a Destacados
              </button>
            </div>
          )}
        </section>
      ) : (
        /* =====================================================================
            VISTA DESTACADOS: BENTO GRID ASIMÉTRICO + HERO SPOTLIGHT EDITORIAL
           ===================================================================== */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Columna Izquierda en Desktop / Primera Sección Móvil: Bento Grid */}
            <section
              aria-label="Selección Bento de Flota"
              className="lg:col-span-6 space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Columna Izquierda: Tarjeta Vertical Clara */}
                {bentoPrincipalIzq && (
                  <a
                    href={`/vehiculos/${bentoPrincipalIzq.id}`}
                    onClick={() => triggerHaptic(8)}
                    className="group ios-press-bounce col-span-1 flex flex-col justify-between rounded-[26px] bg-white border border-[#9CA3AF]/30 p-4 sm:p-5 shadow-[0_10px_28px_-6px_rgba(17,24,39,0.06)] hover:border-[#4B5563]/50 transition relative overflow-hidden min-h-[250px] sm:min-h-[275px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-display text-base sm:text-lg font-extrabold tracking-tight text-[#111827] leading-snug truncate">
                          {bentoPrincipalIzq.marca}
                        </h2>
                        <p className="text-xs font-semibold text-[#4B5563] truncate">
                          {bentoPrincipalIzq.modelo}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-mono tabular-nums text-xs sm:text-sm font-bold text-[#111827]">
                          {formatCop(bentoPrincipalIzq.precioDia)}
                        </p>
                        <span className="font-sans font-normal text-[10px] text-[#9CA3AF]">/día</span>
                      </div>
                    </div>

                    <div className="my-2 flex flex-1 flex-col items-center justify-center relative">
                      <img
                        src={bentoPrincipalIzq.imagenUrl}
                        alt={`${bentoPrincipalIzq.marca} ${bentoPrincipalIzq.modelo}`}
                        className="w-full max-h-32 sm:max-h-36 object-contain mx-auto transition-transform duration-300 group-hover:scale-105"
                        loading="eager"
                      />
                      <div className="h-3 w-4/5 mx-auto -mt-2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(17,24,39,0.22)_0%,_transparent_75%)]" />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#4B5563] pt-1 border-t border-[#EDEDED]">
                      <span>{bentoPrincipalIzq.transmision}</span>
                      <span className="font-mono tabular-nums font-bold text-[#111827]">
                        ★ {bentoPrincipalIzq.rating}
                      </span>
                    </div>
                  </a>
                )}

                {/* Columna Derecha: Tarjeta Oscura de Contraste Simétrica */}
                {bentoContrasteDer && (
                  <a
                    href={`/vehiculos/${bentoContrasteDer.id}`}
                    onClick={() => triggerHaptic(8)}
                    className="group ios-press-bounce col-span-1 flex flex-col justify-between rounded-[26px] bg-[#1F2937] text-[#EDEDED] p-4 sm:p-5 shadow-[0_14px_30px_-6px_rgba(17,24,39,0.28)] border border-white/10 relative overflow-hidden min-h-[250px] sm:min-h-[275px]"
                  >
                    <div
                      className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/5 blur-xl"
                      aria-hidden="true"
                    />
                    <div className="relative z-10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                        {bentoContrasteDer.categoriaEtiqueta}
                      </span>
                      <h2 className="font-display text-base sm:text-lg font-extrabold tracking-tight text-[#EDEDED] leading-tight truncate mt-0.5">
                        {bentoContrasteDer.marca} {bentoContrasteDer.modelo.split(' ')[0]}
                      </h2>
                      <p className="font-mono tabular-nums text-xs font-semibold text-[#9CA3AF] mt-0.5">
                        {formatCop(bentoContrasteDer.precioDia)}/día
                      </p>
                    </div>

                    <div className="relative z-10 my-1.5 flex items-center justify-center">
                      <img
                        src={bentoContrasteDer.imagenUrl}
                        alt={`${bentoContrasteDer.marca} ${bentoContrasteDer.modelo}`}
                        className="w-full max-h-24 sm:max-h-28 object-contain mx-auto transition-transform duration-300 group-hover:scale-105"
                        loading="eager"
                      />
                    </div>

                    <div className="relative z-10 flex items-center justify-between text-[11px] text-[#9CA3AF] pt-1 border-t border-white/10">
                      <span>{bentoContrasteDer.transmision}</span>
                      <span className="font-mono tabular-nums text-[#EDEDED] font-bold">
                        ★ {bentoContrasteDer.rating}
                      </span>
                    </div>
                  </a>
                )}

              {/* Fila Inferior Full-Width: Tarjeta Horizontal Editorial ("Statue Print Ombre Hoodie" en ref) */}
              {bentoHorizontalAncho && (
                <a
                  href={`/vehiculos/${bentoHorizontalAncho.id}`}
                  onClick={() => triggerHaptic(8)}
                  className="group ios-press-bounce col-span-2 rounded-[28px] bg-white border border-[#9CA3AF]/30 p-4 sm:p-5 shadow-[0_10px_28px_-6px_rgba(17,24,39,0.06)] hover:border-[#4B5563]/50 transition flex items-center justify-between gap-3 overflow-hidden"
                >
                  <div className="flex flex-col justify-between space-y-2.5 min-w-0 flex-1">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                        {bentoHorizontalAncho.categoriaEtiqueta} · {bentoHorizontalAncho.anio}
                      </span>
                      <h3 className="font-display text-base sm:text-xl font-black tracking-tight text-[#111827] leading-snug truncate mt-0.5">
                        {bentoHorizontalAncho.marca} {bentoHorizontalAncho.modelo}
                      </h3>
                      <p className="text-xs text-[#4B5563] mt-0.5">
                        {bentoHorizontalAncho.capacidadPasajeros} pasajeros · {bentoHorizontalAncho.combustible}
                      </p>
                    </div>

                    <div className="pt-1">
                      <span className="font-mono tabular-nums text-sm sm:text-base font-extrabold text-[#111827]">
                        {formatCop(bentoHorizontalAncho.precioDia)}
                        <span className="font-sans font-normal text-[11px] text-[#4B5563]"> / día</span>
                      </span>
                    </div>
                  </div>

                  <div className="w-36 sm:w-44 shrink-0 flex flex-col items-center justify-center">
                    <img
                      src={bentoHorizontalAncho.imagenUrl}
                      alt={`${bentoHorizontalAncho.marca} ${bentoHorizontalAncho.modelo}`}
                      className="w-full max-h-28 sm:max-h-32 object-contain transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="h-3 w-4/5 mx-auto -mt-2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(17,24,39,0.20)_0%,_transparent_75%)]" />
                  </div>
                </a>
              )}
            </div>
          </section>

          {/* =================================================================
              PANTALLA 2 (COLUMNA DERECHA EN DESKTOP / SEGUNDA SECCIÓN MÓVIL):
              HERO SPOTLIGHT OSCURO + 3 BENTO SPECS + "MÁS EN ESTE PATIO"
             ================================================================= */}
          {unidadHero && (
            <section
              aria-label="Unidad Destacada del Local"
              className="lg:col-span-6 space-y-4"
            >
              {/* 1. Tarjeta Hero Oscura ("Statue Print Hoodie $90/Available Size" en Pantalla 2) */}
              <div className="relative overflow-hidden rounded-[30px] bg-[#111827] text-[#EDEDED] p-5 sm:p-6 shadow-[0_20px_40px_-12px_rgba(17,24,39,0.45)] border border-white/10">
                <div
                  className="pointer-events-none absolute inset-0 bg-hatch-diagonal-dark opacity-20"
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-white/10 blur-2xl"
                  aria-hidden="true"
                />

                <div className="relative z-10 grid grid-cols-12 items-center gap-3">
                  <div className="col-span-7 space-y-3">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#EDEDED] backdrop-blur-md">
                      <span>★ {unidadHero.rating}</span>
                      <span>•</span>
                      <span>Destacado</span>
                    </div>

                    <div>
                      <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#EDEDED] leading-tight">
                        {unidadHero.marca}{' '}
                        <span className="block text-[#9CA3AF] font-bold text-base sm:text-lg mt-0.5">
                          {unidadHero.modelo}
                        </span>
                      </h2>

                      <p className="mt-2 font-mono tabular-nums text-base sm:text-lg font-extrabold text-[#EDEDED]">
                        {formatCop(unidadHero.precioDia)}
                        <span className="font-sans text-xs font-normal text-[#9CA3AF]">
                          {' '}
                          / día · Disponible
                        </span>
                      </p>
                    </div>

                    <div className="pt-1 flex flex-wrap items-center gap-2.5">
                      <a
                        href={`/alquilar/${unidadHero.id}`}
                        onClick={() => triggerHaptic(10)}
                        className="ios-press-bounce inline-flex min-h-[42px] items-center justify-center rounded-full bg-[#EDEDED] px-5 py-2 text-xs font-extrabold text-[#111827] shadow-md hover:bg-white transition"
                      >
                        Reservar ahora
                      </a>

                    </div>
                  </div>

                  <div className="col-span-5 flex flex-col items-center justify-center">
                    <a
                      href={`/vehiculos/${unidadHero.id}`}
                      onClick={() => triggerHaptic(8)}
                      className="block w-full focus:outline-none"
                      aria-label={`Ver ficha de ${unidadHero.marca} ${unidadHero.modelo}`}
                    >
                      <img
                        src={unidadHero.imagenUrl}
                        alt={`${unidadHero.marca} ${unidadHero.modelo}`}
                        className="w-full max-h-36 sm:max-h-44 object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.55)] transition-transform duration-300 hover:scale-105"
                      />
                    </a>
                  </div>
                </div>
              </div>

              {/* 2. Trío de Especificaciones Clave */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-[20px] bg-[#1F2937] text-[#EDEDED] p-3 flex flex-col justify-center border border-white/10 shadow-xs">
                  <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Combustible</span>
                  <p className="font-display text-xs sm:text-sm font-bold text-[#EDEDED] truncate mt-0.5">
                    {unidadHero.combustible}
                  </p>
                </div>

                <div className="rounded-[20px] bg-white text-[#111827] p-3 flex flex-col justify-center border border-[#9CA3AF]/30 shadow-2xs">
                  <span className="text-[10px] font-semibold text-[#4B5563] uppercase tracking-wider">Transmisión</span>
                  <p className="font-display text-xs sm:text-sm font-bold text-[#111827] truncate mt-0.5">
                    {unidadHero.transmision}
                  </p>
                </div>

                <div className="rounded-[20px] bg-white text-[#111827] p-3 flex flex-col justify-center border border-[#9CA3AF]/30 shadow-2xs">
                  <span className="text-[10px] font-semibold text-[#4B5563] uppercase tracking-wider">Capacidad</span>
                  <p className="font-display font-mono tabular-nums text-xs sm:text-sm font-bold text-[#111827] truncate mt-0.5">
                    {unidadHero.capacidadPasajeros} puestos
                  </p>
                </div>
              </div>

              {/* 3. Sección "Más de este patio" ("You may like more" en Pantalla 2) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between px-0.5">
                  <h3 className="font-display text-sm sm:text-base font-extrabold tracking-tight text-[#111827]">
                    Más opciones en {local.nombre}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono tabular-nums text-[11px] font-semibold text-[#4B5563]">
                      {masDelPatio.length} disp.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(6);
                        const idx = initialVehiculos.findIndex(
                          (v) => v.id === unidadHero.id
                        );
                        const next =
                          initialVehiculos[(idx + 1) % initialVehiculos.length];
                        if (next) setUnidadSpotlightId(next.id);
                      }}
                      aria-label="Siguiente unidad destacada"
                      className="ios-press-bounce flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-[#EDEDED] text-xs cursor-pointer"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {masDelPatio.slice(0, 2).map((item, idx) => {
                    const isDarkCard = idx === 0;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic(8);
                          setUnidadSpotlightId(item.id);
                        }}
                        className={`ios-press-bounce text-left rounded-[22px] p-3.5 flex items-center justify-between gap-2 transition cursor-pointer border ${isDarkCard
                          ? 'bg-[#1F2937] text-[#EDEDED] border-white/10 shadow-sm'
                          : 'bg-white text-[#111827] border-[#9CA3AF]/30 shadow-2xs'
                          }`}
                      >
                        <div className="min-w-0 flex-1 flex flex-col justify-between h-full space-y-2">
                          <div>
                            <p
                              className={`text-[10px] font-semibold truncate ${isDarkCard ? 'text-[#9CA3AF]' : 'text-[#4B5563]'
                                }`}
                            >
                              {item.marca}
                            </p>
                            <p className="font-display text-xs font-extrabold truncate">
                              {item.modelo}
                            </p>
                          </div>
                          <span
                            className={`inline-flex self-start font-mono tabular-nums text-[10px] font-bold px-2 py-0.5 rounded-full ${isDarkCard
                              ? 'bg-white/10 text-[#EDEDED]'
                              : 'bg-[#EDEDED] text-[#111827]'
                              }`}
                          >
                            {formatCop(item.precioDia)}
                          </span>
                        </div>
                        <img
                          src={item.imagenUrl}
                          alt={`${item.marca} ${item.modelo}`}
                          className="h-14 w-16 object-contain shrink-0"
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Banner Mobile para Explorar Toda la Flota desde el fin del Showcase */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setVista('TODOS');
              if (typeof window !== 'undefined') {
                window.scrollTo({ top: 140, behavior: 'smooth' });
              }
            }}
            className="ios-press-bounce min-h-[48px] w-full rounded-2xl bg-white border border-[#9CA3AF]/35 px-4 py-3 flex items-center justify-between text-xs font-extrabold text-[#111827] shadow-2xs hover:border-[#111827] transition cursor-pointer"
          >
            <span>Explorar toda la flota de {local.nombre}</span>
            <span className="font-mono text-[11px] font-bold bg-[#EDEDED] text-[#111827] px-2.5 py-0.5 rounded-full">
              {vehiculosFiltrados.length} disponibles →
            </span>
          </button>
        </div>
      </div>
    )}
  </div>
);
}
