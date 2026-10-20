import { useState, useMemo } from 'react';
import { TextRoll } from '@/components/ui/text-roll';
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

const DEFAULT_PREVIEW_VEHICLES: VehiculoItem[] = [
  {
    id: 'veh-mercedes-eqb',
    marca: 'Mercedes-Benz',
    modelo: 'EQB 350 4MATIC Luxury',
    anio: 2024,
    categoria: 'SUV',
    categoriaEtiqueta: 'SUV Eléctrica',
    placa: 'FLX-801',
    estado: 'DISPONIBLE',
    precioDia: 280000,
    depositoGarantia: 750000,
    transmision: 'Automática',
    combustible: 'Eléctrico',
    capacidadPasajeros: 7,
    autonomiaKm: 420,
    kilometraje: 9400,
    imagenUrl: '/images/vehiculos/white-suv.webp',
    destacado: true,
    aceleracion: '3.8 s',
    velocidadMaxima: '210 km/h',
    rating: 4.8,
    autonomiaOdo: '420 km',
    tipoPropulsionIcon: 'electric',
    descripcion: 'SUV eléctrica de 7 plazas con tracción integral y asistente MBUX.',
  },
  {
    id: 'veh-bmw-m2-coupe',
    marca: 'BMW',
    modelo: 'M2 Competition Coupe',
    anio: 2024,
    categoria: 'SEDAN',
    categoriaEtiqueta: 'Coupe Deportivo',
    placa: 'BMW-240',
    estado: 'DISPONIBLE',
    precioDia: 260000,
    depositoGarantia: 900000,
    transmision: 'Automática',
    combustible: 'Gasolina',
    capacidadPasajeros: 4,
    kilometraje: 14200,
    imagenUrl: '/images/vehiculos/dark-coupe.webp',
    destacado: true,
    aceleracion: '4.2 s',
    velocidadMaxima: '250 km/h',
    rating: 4.9,
    autonomiaOdo: '14.200 km',
    tipoPropulsionIcon: 'gas',
    descripcion: 'Coupe deportivo con motor M TwinPower Turbo de 460 CV.',
  },
  {
    id: 'veh-mazda-cx30',
    marca: 'Mazda',
    modelo: 'CX-30 Grand Touring Soul',
    anio: 2024,
    categoria: 'SUV',
    categoriaEtiqueta: 'SUV Urbana',
    placa: 'MOV-304',
    estado: 'DISPONIBLE',
    precioDia: 195000,
    depositoGarantia: 500000,
    transmision: 'Automática',
    combustible: 'Gasolina',
    capacidadPasajeros: 5,
    kilometraje: 21500,
    imagenUrl: '/images/vehiculos/mazda-cx30.webp',
    destacado: true,
    aceleracion: '7.8 s',
    velocidadMaxima: '198 km/h',
    rating: 4.9,
    autonomiaOdo: '21.500 km',
    tipoPropulsionIcon: 'gas',
    descripcion: 'Diseño Kodo Soul Crystal con sonido Bose y tracción i-Activ AWD.',
  },
];

export default function LandingFleetShowcaseIsland({
  initialVehiculos,
}: LandingFleetShowcaseIslandProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoriaVehiculo | 'TODOS'>('TODOS');

  const pool = useMemo(() => {
    return initialVehiculos && initialVehiculos.length > 0
      ? initialVehiculos
      : DEFAULT_PREVIEW_VEHICLES;
  }, [initialVehiculos]);

  // Solamente 3 sugerencias de carros en la vista
  const filteredVehicles = useMemo(() => {
    const soloCarros = pool.filter(
      (v) => v.categoria !== 'MOTO' && v.categoria !== 'PATINETA'
    );

    if (selectedCategory === 'TODOS') {
      return soloCarros.slice(0, 3);
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
      {/* 1. Header con Efecto TextRoll y Subtítulo */}
      <div className="w-full flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider uppercase text-[#2E4E8F] bg-[#EEF2F6] px-3 py-1 rounded-full w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              FLOTA LISTA EN PATIO
            </span>
            <span className="text-xs text-[#9CA3AF] font-mono hidden sm:inline">
              • Entrega inmediata en &lt; 3 min
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0C1120] font-[Manrope,system-ui,sans-serif] tracking-tight">
            <span className="block sm:inline sm:mr-2">Vehículos en patio:</span>
            <span className="inline-block text-[#2E4E8F] font-black">
              <TextRoll
                duration={0.4}
                getEnterDelay={(i) => i * 0.035}
                getExitDelay={(i) => i * 0.035 + 0.12}
                repeatInterval={4000}
                className="inline-block select-none cursor-default"
              >
                Muévete con total libertad
              </TextRoll>
            </span>
          </h2>

          <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
            Elige la categoría o explora las 3 sugerencias listas en patio con peritaje pericial fotográfico y seguro incluido.
          </p>
        </div>

        {/* Enlace directo a catálogo */}
        <a
          href="/catalogo"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#0C1120] hover:text-[#2E4E8F] transition-colors group shrink-0"
        >
          <span>Ver catálogo completo ({pool.length})</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </a>
      </div>

      {/* 2. Categorías en Cards Pequeñas (Botón 'Todos' solo en color azul sin efectos) */}
      <div className="w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const isTodos = cat.id === 'TODOS';

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`group relative text-left p-3 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-300 cursor-pointer overflow-hidden border ${
                  isTodos
                    ? isSelected
                      ? 'bg-[#2E4E8F] text-white border-[#2E4E8F] shadow-sm'
                      : 'bg-[#EEF4FF] hover:bg-[#E2ECF9] text-[#2E4E8F] border-[#C8D9F2]'
                    : isSelected
                    ? 'shiny-cta bg-gradient-to-br from-[#0C1120] via-[#161B26] to-[#2E4E8F] text-white border-[#2E4E8F] shadow-[0_8px_24px_-4px_rgba(46,78,143,0.45)] ring-2 ring-[#2E4E8F]/60 scale-[1.02]'
                    : 'bg-white hover:bg-[#F8FAFC] text-[#0C1120] border-[#E8ECF3] shadow-2xs hover:border-[#2E4E8F]/40 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {/* Glow decorativo SOLO en cards que NO sean 'Todos' */}
                {isSelected && !isTodos && (
                  <div className="absolute top-0 right-0 -mr-6 -mt-6 w-16 h-16 bg-[#2E4E8F]/40 rounded-full blur-xl pointer-events-none" />
                )}

                <div className="flex items-center justify-between gap-1.5 mb-2 relative z-10">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isTodos
                        ? isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#2E4E8F]/15 text-[#2E4E8F]'
                        : isSelected
                        ? 'bg-white/15 text-[#A7C9FF]'
                        : 'bg-[#EEF2F6] text-[#2E4E8F] group-hover:bg-[#2E4E8F] group-hover:text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={cat.iconSvg} />
                    </svg>
                  </div>

                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      isTodos
                        ? isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#2E4E8F]/10 text-[#2E4E8F]'
                        : isSelected
                        ? 'bg-[#2E4E8F] text-white'
                        : 'bg-[#F4F6FA] text-[#2E4E8F] group-hover:bg-[#EEF2F6]'
                    }`}
                  >
                    {cat.price}
                  </span>
                </div>

                <div className="relative z-10">
                  <h3
                    className={`font-display font-bold text-xs sm:text-sm tracking-tight truncate ${
                      isTodos && !isSelected ? 'text-[#2E4E8F]' : ''
                    }`}
                  >
                    {cat.name}
                  </h3>
                  <p
                    className={`text-[10px] sm:text-[11px] truncate mt-0.5 ${
                      isTodos
                        ? isSelected
                          ? 'text-white/85'
                          : 'text-[#2E4E8F]/75'
                        : isSelected
                        ? 'text-[#A7C9FF]'
                        : 'text-[#6B7280]'
                    }`}
                  >
                    {cat.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Grid de Previsualización de Vehículos Listos en Patio */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#0C1120] uppercase tracking-wider font-mono">
              Unidades Disponibles {selectedCategory !== 'TODOS' && `(${selectedCategory})`}
            </span>
            <span className="text-xs text-[#9CA3AF]">
              • {filteredVehicles.length} sugeridas
            </span>
          </div>

          <a
            href={selectedCategory !== 'TODOS' ? `/catalogo?cat=${selectedCategory.toLowerCase()}` : '/catalogo'}
            className="text-xs font-semibold text-[#2E4E8F] hover:underline"
          >
            Filtrar en catálogo completo →
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredVehicles.map((v) => {
            const isElectrico =
              v.combustible === 'Eléctrico' || v.combustible === 'Híbrido';

            return (
              <article
                key={v.id}
                className="group relative bg-white rounded-[24px] overflow-hidden border border-[#E8ECF3] shadow-[0_6px_20px_-6px_rgba(12,17,32,0.06)] hover:shadow-[0_16px_36px_-8px_rgba(12,17,32,0.12)] hover:border-[#2E4E8F]/30 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Visual Central: Foto con Fondo Estudio y Chips */}
                <div className="relative w-full aspect-[16/10] bg-gradient-to-b from-[#F8FAFC] to-[#EEF2F6] overflow-hidden flex items-center justify-center p-3">
                  <img
                    src={v.imagenUrl}
                    alt={`${v.marca} ${v.modelo}`}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                  />

                  {/* Sombra de estudio */}
                  <div className="h-3 w-4/5 mx-auto absolute bottom-2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(12,17,32,0.2)_0%,_transparent_75%)] pointer-events-none" />

                  {/* Badge Estado Izquierda */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-md border border-white/80 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-[#0C1120]">Patio Norte</span>
                  </div>

                  {/* Badge Categoría Derecha */}
                  <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-[#0C1120]/80 backdrop-blur-md text-white text-[10px] font-semibold">
                    {v.categoriaEtiqueta}
                  </div>
                </div>

                {/* Detalles del Vehículo */}
                <div className="p-4 sm:p-5 flex flex-col gap-3.5 flex-1 justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[10px] font-bold text-[#4B5563] bg-[#EEF2F6] px-2 py-0.5 rounded">
                          {v.placa} • {v.anio}
                        </span>
                        <h3 className="font-display font-bold text-base sm:text-lg text-[#0C1120] tracking-tight truncate mt-1">
                          {v.marca} {v.modelo}
                        </h3>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-display font-black text-base sm:text-lg text-[#0C1120] block">
                          {formatCop(v.precioDia)}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF] block -mt-0.5">
                          /día
                        </span>
                      </div>
                    </div>

                    {/* Chips de Especificaciones Técnicas */}
                    <div className="grid grid-cols-3 gap-1.5 mt-3 py-2 border-y border-[#F4F6FA] text-center text-[11px] text-[#4B5563]">
                      <div className="bg-[#F8FAFC] py-1 px-1.5 rounded-lg truncate">
                        👤 {v.capacidadPasajeros} pas
                      </div>
                      <div className="bg-[#F8FAFC] py-1 px-1.5 rounded-lg truncate">
                        ⚙️ {v.transmision}
                      </div>
                      <div className="bg-[#F8FAFC] py-1 px-1.5 rounded-lg truncate">
                        {isElectrico ? '⚡ EV' : '⛽ ' + v.combustible}
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`/vehiculos/${v.id}`}
                      className="flex-1 h-10 flex items-center justify-center rounded-xl bg-[#EEF2F6] hover:bg-[#E0E7FF] text-[#0C1120] text-xs font-bold transition-colors"
                    >
                      Ver Ficha
                    </a>

                    <a
                      href={`/alquilar/${v.id}`}
                      className="shiny-cta flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-[#0C1120] text-white text-xs font-bold transition-all shadow-xs group/btn"
                    >
                      <span>Alquilar</span>
                      <span className="group-hover/btn:translate-x-0.5 transition-transform">→</span>
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* 4. Banner Inferior con Botón Azul Prominente para Ver Todo el Catálogo */}
      <div className="w-full rounded-3xl bg-gradient-to-r from-[#0C1120] via-[#161B26] to-[#2E4E8F] p-5 sm:p-7 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/10 relative overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-[#2E4E8F]/40 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3.5 relative z-10 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 hidden sm:flex">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>

          <div>
            <h4 className="font-display font-extrabold text-base sm:text-lg tracking-tight">
              ¿Buscas otro modelo, fechas específicas o utilitarios?
            </h4>
            <p className="text-xs sm:text-sm text-[#A7C9FF] mt-0.5">
              Explora todo el inventario con disponibilidad y cotización en tiempo real.
            </p>
          </div>
        </div>

        <a
          href="/catalogo"
          className="shiny-cta h-11 sm:h-12 px-6 sm:px-8 text-xs sm:text-sm font-bold shrink-0 relative z-10 group"
        >
          <span>
            Ver Todo el Catálogo
            <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-xs group-hover:translate-x-1 transition-transform ml-1">
              →
            </span>
          </span>
        </a>
      </div>
    </div>
  );
}
