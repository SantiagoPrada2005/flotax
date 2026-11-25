import { useState, useMemo, useEffect } from 'react';
import type { VehiculoItem, CategoriaVehiculo } from '@/lib/flota/types';
import type { LocalPublicoContexto } from '@/lib/flota/locales-captacion';

export interface LocalCatalogShowcaseProps {
  local: LocalPublicoContexto;
  initialVehiculos: VehiculoItem[];
  esPerimetroCerrado?: boolean | undefined;
}

export type FiltroCategoriaCircular =
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
  {
    id: 'UTILITARIO',
    label: 'Utilitario',
    renderIcon: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="1" y="4" width="15" height="12" rx="2" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="17.5" r="2.5" />
        <circle cx="18.5" cy="17.5" r="2.5" />
      </svg>
    ),
  },
];

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function formatCop(val: number): string {
  return COP_FORMATTER.format(val);
}

export function coincideCategoriaShowcase(
  vehiculo: VehiculoItem,
  categoriaActiva: FiltroCategoriaCircular
): boolean {
  if (!categoriaActiva || categoriaActiva === 'TODOS') {
    return true;
  }
  const catNorm = (vehiculo.categoria || '').trim().toUpperCase();
  const combNorm = (vehiculo.combustible || '').trim().toLowerCase();
  const etiqNorm = (vehiculo.categoriaEtiqueta || '').trim().toLowerCase();

  if (categoriaActiva === 'ELECTRICO') {
    return (
      combNorm === 'eléctrico' ||
      combNorm === 'electrico' ||
      combNorm === 'híbrido' ||
      combNorm === 'hibrido' ||
      etiqNorm.includes('eléctr') ||
      etiqNorm.includes('electr')
    );
  }

  return catNorm === categoriaActiva;
}

export default function LocalCatalogShowcase({
  local,
  initialVehiculos,
}: LocalCatalogShowcaseProps) {
  const [categoriaActiva, setCategoriaActiva] = useState<FiltroCategoriaCircular>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Solo mostrar categorías adicionales (como UTILITARIO) si hay vehículos de ese tipo o si está seleccionada,
  // manteniendo siempre visibles las categorías base (Todos, SUVs, Sedán, Motos, Eléctricos, Scooter).
  const categoriasVisibles = useMemo(() => {
    const tieneUtilitarios = initialVehiculos.some(
      (v) => (v.categoria || '').trim().toUpperCase() === 'UTILITARIO'
    );
    return CATEGORIAS_CIRCULARES.filter(
      (cat) =>
        cat.id !== 'UTILITARIO' ||
        tieneUtilitarios ||
        categoriaActiva === 'UTILITARIO'
    );
  }, [initialVehiculos, categoriaActiva]);

  // Sincronización con query param `?categoria=` si viene desde la landing o enlaces externos
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get('categoria')?.trim().toUpperCase();
    if (!catParam) return;
    if (
      catParam === 'TODOS' ||
      catParam === 'SUV' ||
      catParam === 'SEDAN' ||
      catParam === 'MOTO' ||
      catParam === 'PATINETA' ||
      catParam === 'UTILITARIO' ||
      catParam === 'ELECTRICO'
    ) {
      setCategoriaActiva(catParam);
    }
  }, []);

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

  const seleccionarCategoria = (catId: FiltroCategoriaCircular) => {
    triggerHaptic(8);
    if (catId === 'TODOS') {
      setCategoriaActiva('TODOS');
      return;
    }
    // Si toca la misma categoría activa, vuelve a 'TODOS' intuitivamente
    setCategoriaActiva((prev) => (prev === catId ? 'TODOS' : catId));
  };

  // Filtrado reactivo dentro del inventario exclusivo de este local
  const vehiculosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return initialVehiculos.filter((v) => {
      if (!coincideCategoriaShowcase(v, categoriaActiva)) {
        return false;
      }

      if (!q) return true;
      const texto = `${v.marca} ${v.modelo} ${v.placa} ${v.categoriaEtiqueta} ${v.transmision} ${v.combustible} ${v.anio}`.toLowerCase();
      return texto.includes(q);
    });
  }, [initialVehiculos, categoriaActiva, busqueda]);

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-2xl lg:max-w-6xl space-y-5 pb-8">
      {/* =====================================================================
          CABECERA IDENTITARIA DEL LOCAL (PERÍMETRO EXCLUSIVO MOBILE-FIRST)
         ===================================================================== */}
      <section className="space-y-3.5 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#111827] dark:text-[#EDEDED] leading-tight">
              {local.nombre}
            </h1>
            <p className="text-xs sm:text-sm text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
              {local.direccion
                ? `${local.direccion} · Flota verificada para entrega inmediata`
                : 'Reserva directa sin intermediarios · Flota disponible en patio'}
            </p>
          </div>
        </div>

        {/* Barra de Búsqueda Píldora iOS */}
        <div className="relative flex items-center rounded-full bg-white border border-[#9CA3AF]/40 px-4 min-h-[48px] shadow-[0_8px_24px_-6px_rgba(17,24,39,0.07)] focus-within:border-[#111827] focus-within:ring-2 focus-within:ring-[#111827]/10 transition-colors dark:bg-[#1F2937] dark:border-white/10 dark:focus-within:border-white dark:focus-within:ring-white/10">
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
            className="w-full bg-transparent text-base text-[#111827] placeholder:text-[#9CA3AF] dark:text-[#EDEDED] dark:placeholder:text-[#9CA3AF]/60"
          />
          {busqueda ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(6);
                setBusqueda('');
              }}
              aria-label="Limpiar búsqueda"
              className="fx-press flex h-8 w-8 items-center justify-center rounded-full bg-[#EDEDED] text-[#4B5563] hover:text-[#111827] shrink-0 ml-1 cursor-pointer dark:bg-white/10 dark:text-[#EDEDED] dark:hover:bg-white/20"
            >
              ✕
            </button>
          ) : (
            <button
              type="button"
              onClick={abrirBuscadorGlobal}
              aria-label="Abrir buscador avanzado"
              title="Filtros rápidos"
              className="fx-press flex h-9 w-9 items-center justify-center rounded-full bg-[#EDEDED]/80 text-[#111827] hover:bg-[#EDEDED] shrink-0 ml-1 cursor-pointer dark:bg-white/10 dark:text-[#EDEDED] dark:border dark:border-white/15 dark:hover:bg-white/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="8" x2="16" y1="12" y2="12" />
                <line x1="11" x2="13" y1="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Selector Horizontal de Categorías Circulares iOS */}
        <div
          role="tablist"
          aria-label="Categorías de vehículos del local"
          className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 overflow-x-auto no-scrollbar px-1 pt-1.5 pb-1.5"
        >
          {categoriasVisibles.map((cat) => {
            const isActive = categoriaActiva === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-pressed={isActive}
                onClick={() => seleccionarCategoria(cat.id)}
                className="fx-press group flex flex-col items-center gap-1.5 shrink-0 min-w-[56px] cursor-pointer rounded-2xl py-0.5"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full border transition-colors duration-150 ${
                    isActive
                      ? 'bg-[#111827] text-[#EDEDED] border-[#111827] shadow-[0_8px_18px_-4px_rgba(17,24,39,0.34)] ring-2 ring-[#111827]/20 dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED] dark:ring-white/25'
                      : 'bg-white text-[#111827] border-[#9CA3AF]/40 group-hover:border-[#111827] group-hover:bg-[#EDEDED]/60 dark:bg-[#1F2937] dark:text-[#EDEDED] dark:border-white/15 dark:group-hover:border-white/40 dark:group-hover:bg-white/10'
                  }`}
                >
                  {cat.renderIcon(isActive)}
                </div>
                <span
                  className={`text-[11px] tracking-tight transition-colors duration-150 ${
                    isActive
                      ? 'font-extrabold text-[#111827] dark:text-[#EDEDED]'
                      : 'font-medium text-[#4B5563] group-hover:text-[#111827] dark:text-[#9CA3AF] dark:group-hover:text-[#EDEDED]'
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
          ENCABEZADO DE SELECCIÓN DE PATIO: ÚNICAMENTE «TODOS» (SIN DESTACADOS)
         ===================================================================== */}
      {vehiculosFiltrados.length > 0 && (
        <div className="flex items-center justify-between gap-2 px-1 pt-0.5">
          <h2 className="font-display text-sm sm:text-base font-extrabold tracking-tight text-[#111827] dark:text-[#EDEDED]">
            {busqueda
              ? `Resultados (${vehiculosFiltrados.length})`
              : 'Selección de Patio'}
          </h2>

          {!busqueda && (
            <div
              role="tablist"
              aria-label="Modo de visualización"
              className="inline-flex items-center rounded-full bg-[#EDEDED] p-1 border border-[#9CA3AF]/25 shadow-2xs dark:bg-white/10 dark:border-white/15"
            >
              <button
                type="button"
                role="tab"
                aria-selected={categoriaActiva === 'TODOS'}
                onClick={() => {
                  triggerHaptic(8);
                  setCategoriaActiva('TODOS');
                }}
                className="fx-press min-h-[34px] px-4 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer bg-[#111827] text-[#EDEDED] shadow-xs dark:bg-white dark:text-[#111827]"
              >
                Todos
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          ESTADO VACÍO SI EL FILTRO NO TIENE COINCIDENCIAS EN ESTE LOCAL
         ===================================================================== */}
      {vehiculosFiltrados.length === 0 ? (
        <div className="rounded-[28px] bg-white border border-[#9CA3AF]/35 p-8 text-center shadow-xs space-y-4 dark:bg-[#1F2937] dark:border-white/10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] dark:bg-white/10 dark:text-[#EDEDED]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-[#111827] dark:text-[#EDEDED]">
              Sin unidades en esta categoría
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5563] dark:text-[#9CA3AF] max-w-sm mx-auto">
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
            className="fx-press min-h-[44px] inline-flex items-center justify-center rounded-full bg-[#111827] px-6 py-2.5 text-xs font-bold text-[#EDEDED] hover:bg-[#1F2937] cursor-pointer dark:bg-white dark:text-[#111827] dark:hover:bg-[#EDEDED]"
          >
            Ver toda la flota del local
          </button>
        </div>
      ) : (
        /* =====================================================================
            VISTA GENERAL «TODOS»: FOTOGRAFÍA BORDE A BORDE SIN DOBLE RECUADRO
           ===================================================================== */
        <section aria-label="Inventario Completo" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {vehiculosFiltrados.map((v) => (
              <a
                key={v.id}
                href={`/vehiculos/${v.id}`}
                data-astro-prefetch="tap"
                onClick={() => triggerHaptic(8)}
                className="fx-pressable group rounded-[26px] bg-white border border-[#9CA3AF]/35 shadow-2xs hover:border-[#111827] dark:bg-[#1F2937] dark:border-white/10 dark:hover:border-white/30 transition-colors flex flex-col justify-between overflow-hidden"
              >
                {/* Fotografía 16:9 a sangre ocupando todo el ancho y esquinas superiores de la tarjeta */}
                <div className="relative w-full aspect-video overflow-hidden">
                  <img
                    src={v.imagenUrl}
                    alt={`${v.marca} ${v.modelo}`}
                    className="h-full w-full object-cover object-center block"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                {/* Información y tarifa de la unidad */}
                <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB] truncate">
                        {v.categoriaEtiqueta} · {v.anio}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {v.estado === 'DISPONIBLE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDEDED] text-[#111827] border border-[#9CA3AF]/35 dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15">
                            <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
                            <span>Disponible</span>
                          </span>
                        )}
                        {v.estado === 'RESERVADO' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDEDED] text-[#4B5563] border border-[#9CA3AF]/35 dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15">
                            Reservado
                          </span>
                        )}
                        {v.estado === 'MANTENIMIENTO' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDEDED] text-[#4B5563] border border-[#9CA3AF]/35 dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15">
                            Taller
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-display text-base sm:text-lg font-extrabold text-[#111827] dark:text-[#EDEDED] truncate">
                      {v.marca} {v.modelo}
                    </h3>

                    <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                      {v.transmision} · {v.combustible} · {v.capacidadPasajeros} puestos
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-[#EDEDED] dark:border-white/10 pt-2.5">
                    <p className="font-mono tabular-nums text-sm sm:text-base font-black text-[#111827] dark:text-[#EDEDED]">
                      {formatCop(v.precioDia)}
                      <span className="font-sans text-[11px] font-normal text-[#4B5563] dark:text-[#9CA3AF]">
                        {' '}
                        / día
                      </span>
                    </p>

                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
                      <span>Ver unidad</span>
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Banner de Invitación: Crea tu propio alquiler de vehículos */}
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#111827] via-[#1F2937] to-[#111827] p-5 text-white border border-white/10 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-md">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                  <span>✨</span>
                  <span>Pon tu flota en servicio</span>
                </div>
                <h4 className="font-display text-base sm:text-lg font-black text-white leading-tight">
                  ¿Tienes vehículos o quieres crear tu propio alquiler?
                </h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Publica tu catálogo, recibe reservas directas, gestiona inspecciones periciales y depósitos de garantía con FlotaX.
                </p>
              </div>
              <a
                href="/admin/onboarding?modo=crear"
                onClick={() => triggerHaptic(8)}
                className="fx-pressable w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#111827] shadow-sm hover:bg-[#EDEDED] shrink-0 transition-colors"
              >
                <span>Crea tu alquiler</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
