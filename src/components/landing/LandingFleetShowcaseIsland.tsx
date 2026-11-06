import { useState, useMemo } from 'react';
import { Users, Settings2, Fuel, Zap } from 'lucide-react';
import { FLOTA_CANONICA } from '@/lib/flota/mock-vehiculos';
import type { VehiculoItem, CategoriaVehiculo } from '@/lib/flota/types';

export interface LandingFleetShowcaseIslandProps {
  initialVehiculos?: VehiculoItem[];
}

interface CategoryOption {
  id: CategoriaVehiculo | 'TODOS';
  name: string;
  price: string;
  desc: string;
  iconSvg: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'TODOS',
    name: 'Todos',
    price: 'Flota 100%',
    desc: 'Entrega en 3 min',
    iconSvg: 'M4 6h16M4 12h16M4 18h16',
  },
  {
    id: 'SEDAN',
    name: 'Sedán',
    price: 'Desde $160k',
    desc: 'Confort urbano',
    iconSvg: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M5 17H3v-4l2-5h12l2 5v4h-2 M5 17h10',
  },
  {
    id: 'SUV',
    name: 'SUV',
    price: 'Desde $195k',
    desc: 'Espacio familiar',
    iconSvg: 'M19 17h2v-5l-2-4H5L3 12v5h2m0 0a2 2 0 104 0 2 2 0 00-4 0zm10 0a2 2 0 104 0 2 2 0 00-4 0zM5 8h14',
  },
  {
    id: 'MOTO',
    name: 'Moto Urbana',
    price: 'Desde $95k',
    desc: 'Cero trancones',
    iconSvg: 'M5 16a3 3 0 106 0 3 3 0 00-6 0zm10 0a3 3 0 106 0 3 3 0 00-6 0zm-7-2l3-7h3l2 4h3',
  },
  {
    id: 'PATINETA',
    name: 'Scooter EV',
    price: 'Desde $42k',
    desc: '100% eléctrico',
    iconSvg: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    id: 'UTILITARIO',
    name: 'Utilitario',
    price: 'Desde $210k',
    desc: 'Carga & logística',
    iconSvg: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8z M5 19a2 2 0 104 0 2 2 0 00-4 0zm12 0a2 2 0 104 0 2 2 0 00-4 0z',
  },
];

const DEFAULT_PREVIEW_VEHICLES: VehiculoItem[] = FLOTA_CANONICA;

export default function LandingFleetShowcaseIsland({
  initialVehiculos,
}: LandingFleetShowcaseIslandProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoriaVehiculo | 'TODOS'>('TODOS');

  const pool = useMemo(() => {
    return initialVehiculos && initialVehiculos.length > 0
      ? initialVehiculos
      : DEFAULT_PREVIEW_VEHICLES;
  }, [initialVehiculos]);

  // Filtrado reactivo por categoría
  const filteredVehicles = useMemo(() => {
    if (selectedCategory === 'TODOS') {
      const destacados = pool.filter((v) => v.destacado);
      return (destacados.length >= 3 ? destacados : pool).slice(0, 3);
    }
    const matching = pool.filter((v) => v.categoria === selectedCategory);
    return matching.slice(0, 3);
  }, [pool, selectedCategory]);

  const formatCop = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="flex flex-col gap-8 md:gap-10 w-full">
      {/* 1. Header en 2 Columnas: Título a la izquierda | Descripción y Catálogo a la derecha */}
      <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10">
        <div className="max-w-xl">
          <h2 className="text-3xl sm:text-4xl md:text-[42px] font-medium text-[#111827] dark:text-[#EDEDED] tracking-tight leading-[1.12]">
            Vehículos en patio:
            <span className="block text-[#111827] dark:text-[#EDEDED]">Muévete con total libertad</span>
          </h2>
        </div>

        <div className="max-w-md flex flex-col gap-2.5">
          <p className="text-sm sm:text-base text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
            Elige la categoría o explora las 3 sugerencias listas en patio con peritaje pericial fotográfico y seguro incluido.
          </p>
          <a
            href="/catalogo"
            className="fx-press relative inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#111827] dark:text-[#EDEDED] hover:text-[#4B5563] dark:hover:text-white w-fit after:absolute after:-top-1.5 after:-bottom-[22px] after:inset-x-0 after:content-['']"
          >
            <span>Ver catálogo completo ({pool.length})</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      {/* 2. Barra de Filtro por Categorías en Pills Minimalistas */}
      <div className="w-full">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`h-11 px-4.5 sm:px-5 flex items-center justify-center gap-2.5 rounded-full text-xs sm:text-sm font-semibold fx-press cursor-pointer border ${
                  isSelected
                    ? 'bg-[#111827] text-white border-[#111827] dark:bg-white dark:text-[#111827] dark:border-white'
                    : 'bg-[#F5F5F5] text-[#111827] border-[#E5E5E5] hover:border-[#A3A3A3] dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/10 dark:hover:border-white/30'
                }`}
              >
                <span>{cat.name}</span>
                <svg
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isSelected ? 'text-white dark:text-[#111827]' : 'text-[#6B7280] dark:text-[#9CA3AF]'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d={cat.iconSvg} />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Grid de Previsualización de Vehículos Listos en Patio */}
      <div className="w-full">
        {filteredVehicles.length === 0 ? (
          <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-[#1F2937] rounded-[42px] border border-dashed border-gray-200 dark:border-white/10">
            <p className="text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
              No hay unidades disponibles en patio para la categoría seleccionada
            </p>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1 max-w-md">
              Prueba seleccionando otra categoría o explora el catálogo completo con todas las unidades.
            </p>
            <button
              type="button"
              onClick={() => setSelectedCategory('TODOS')}
              className="mt-4 min-h-[44px] px-5 py-2.5 rounded-full bg-[#111827] text-white dark:bg-white dark:text-[#111827] text-xs font-bold hover:bg-[#1F2937] dark:hover:bg-[#EDEDED] fx-press cursor-pointer shadow-xs"
            >
              Ver todas las unidades disponibles
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredVehicles.map((v) => {
              const isElectrico =
                v.combustible === 'Eléctrico' || v.combustible === 'Híbrido';

              return (
                <article
                  key={v.id}
                  className="relative bg-white dark:bg-[#1F2937] dark:border dark:border-white/10 rounded-[42px] overflow-hidden transition-colors flex flex-col justify-between"
                >
                  {/* Visual Central: Foto con Fondo Limpio */}
                  <div className="relative w-full aspect-[16/10] bg-white dark:bg-[#18202F] rounded-t-[42px] overflow-hidden flex items-center justify-center">
                    <img
                      src={v.imagenUrl}
                      alt={`${v.marca} ${v.modelo}`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  {/* Detalles del Vehículo */}
                  <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                    <div>
                      {/* Badge de Categoría Integrado y Año */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCategory(v.categoria)}
                          title={`Filtrar por ${v.categoriaEtiqueta}`}
                          className="relative px-2.5 py-0.5 rounded-full bg-[#111827]/5 hover:bg-[#111827]/10 dark:bg-white/10 dark:hover:bg-white/20 fx-press text-[11px] font-semibold text-[#111827] dark:text-[#EDEDED] cursor-pointer after:absolute after:-top-4 after:-bottom-2 after:inset-x-0 after:content-['']"
                        >
                          {v.categoriaEtiqueta}
                        </button>
                        <span className="text-xs text-[#D1D5DB] dark:text-gray-600">•</span>
                        <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF] font-medium">
                          Modelo {v.anio}
                        </span>
                      </div>

                    {/* Headline Principal */}
                    <h3 className="font-display font-medium text-lg sm:text-xl text-[#111827] dark:text-[#EDEDED] tracking-tight leading-snug truncate">
                      {v.marca} {v.modelo}
                    </h3>

                    {/* Barra de Especificaciones Técnicas (Sin Bordes, Espaciado Puro por Flex Gaps) */}
                    <div className="flex items-center gap-4 sm:gap-5 pt-3 text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Users className="w-4 h-4 text-[#4B5563] dark:text-[#9CA3AF] shrink-0" strokeWidth={1.8} />
                        <span className="font-medium truncate">
                          {v.capacidadPasajeros} puestos
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 min-w-0">
                        <Settings2 className="w-4 h-4 text-[#4B5563] dark:text-[#9CA3AF] shrink-0" strokeWidth={1.8} />
                        <span className="font-medium truncate">
                          {v.transmision}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 min-w-0">
                        {isElectrico ? (
                          <Zap className="w-4 h-4 text-[#4B5563] dark:text-[#9CA3AF] shrink-0" strokeWidth={1.8} />
                        ) : (
                          <Fuel className="w-4 h-4 text-[#4B5563] dark:text-[#9CA3AF] shrink-0" strokeWidth={1.8} />
                        )}
                        <span className="font-medium truncate">
                          {v.combustible}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fila Inferior: Precio en flujo de lectura vertical y Acciones */}
                  <div className="flex flex-col gap-3.5 pt-1">
                    {/* Tarifa Diaria en Escala Armónica con el Título */}
                    <div className="flex items-baseline gap-1">
                      <span className="font-display font-bold text-lg sm:text-xl text-[#111827] dark:text-[#EDEDED] tracking-tight">
                        {formatCop(v.precioDia)}
                      </span>
                      <span className="text-xs text-[#6B7280] dark:text-[#9CA3AF] font-normal">/día</span>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex items-center gap-2.5">
                      <a
                        href={`/vehiculos/${v.id}`}
                        className="flex-1 h-11 flex items-center justify-center rounded-full bg-white dark:bg-white/10 border border-[#D1D5DB] dark:border-white/15 hover:border-[#111827] dark:hover:border-white text-[#111827] dark:text-white text-xs sm:text-sm font-semibold fx-press"
                      >
                        Ver Ficha
                      </a>

                      <a
                        href={`/alquilar/${v.id}`}
                        className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-full bg-[#111827] dark:bg-white hover:bg-[#1F2937] dark:hover:bg-[#EDEDED] text-white dark:text-[#111827] text-xs sm:text-sm font-semibold fx-press"
                      >
                        <span>Alquilar</span>
                        <span>→</span>
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
