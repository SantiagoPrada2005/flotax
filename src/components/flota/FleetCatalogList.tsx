import { useState, useMemo } from 'react';
import type { VehiculoItem } from '@/lib/flota/types';
import BrandFilterBar, { KNOWN_BRANDS } from './BrandFilterBar';
import VehicleCatalogCard from './VehicleCatalogCard';

export interface FleetCatalogListProps {
  initialVehiculos: VehiculoItem[];
}

export default function FleetCatalogList({ initialVehiculos }: FleetCatalogListProps) {
  const [selectedBrand, setSelectedBrand] = useState('ALL');

  // Extraer dinámicamente las marcas únicas presentes en los vehículos
  const dynamicBrands = useMemo(() => {
    const marcas = new Set<string>();
    for (const v of initialVehiculos) {
      if (v.marca && v.marca.trim()) {
        marcas.add(v.marca.trim());
      }
    }
    return Array.from(marcas);
  }, [initialVehiculos]);

  const filteredVehiculos = useMemo(() => {
    if (!selectedBrand || selectedBrand === 'ALL') {
      return initialVehiculos;
    }

    const brandNorm = selectedBrand.toLowerCase().trim();

    return initialVehiculos.filter((vehiculo) => {
      const carMarcaNorm = (vehiculo.marca || '').toLowerCase().trim();
      const carCatNorm = (vehiculo.categoria || '').toLowerCase().trim();

      // Caso especial Motos / Yamaha
      if (brandNorm === 'yamaha' || brandNorm === 'motos') {
        return carMarcaNorm.includes('yamaha') || carCatNorm === 'moto';
      }

      // Caso especial Patinetas / Volt Striker
      if (brandNorm === 'volt striker' || brandNorm === 'volt') {
        return carMarcaNorm.includes('volt') || carCatNorm === 'patineta';
      }

      // Coincidencia por fabricante
      return (
        carMarcaNorm === brandNorm ||
        carMarcaNorm.includes(brandNorm) ||
        brandNorm.includes(carMarcaNorm)
      );
    });
  }, [initialVehiculos, selectedBrand]);

  const currentLabel = useMemo(() => {
    if (selectedBrand === 'ALL') return 'Todos';
    const known = KNOWN_BRANDS[selectedBrand];
    return known?.label ?? selectedBrand;
  }, [selectedBrand]);

  return (
    <div className="space-y-6">
      {/* 1. Carrusel / Barra de Marcas con Logos Vectoriales Dinámicos */}
      <BrandFilterBar
        activeBrand={selectedBrand}
        onSelectBrand={(brandId) => setSelectedBrand(brandId)}
        availableBrands={dynamicBrands}
      />

      {/* 2. Encabezado de la Sección y Contador Reactivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 px-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#18181B]">
              Flota disponible
            </h2>
            {selectedBrand !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#18181B] text-white shadow-2xs">
                <span>{currentLabel}</span>
                <button
                  type="button"
                  onClick={() => setSelectedBrand('ALL')}
                  className="hover:opacity-75 cursor-pointer text-zinc-300 hover:text-white leading-none"
                  title="Quitar filtro"
                  aria-label="Quitar filtro"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#71717A] mt-0.5">
            Listos para entrega inmediata y reserva perimetral
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <span className="font-mono text-xs font-semibold text-[#71717A] bg-white border border-[#E4E4E7] px-3.5 py-1.5 rounded-full shadow-2xs">
            {filteredVehiculos.length} {filteredVehiculos.length === 1 ? 'unidad' : 'unidades'}
          </span>
          {selectedBrand !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedBrand('ALL')}
              className="text-xs font-semibold text-[#71717A] hover:text-[#18181B] underline underline-offset-2 transition cursor-pointer"
            >
              Restablecer
            </button>
          )}
        </div>
      </div>

      {/* 3. Cuadrícula de Vehículos Adaptativa (Móvil: 1 col, Tablet: 2 cols, PC: 3-4 cols) */}
      {filteredVehiculos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredVehiculos.map((vehiculo) => (
            <VehicleCatalogCard key={vehiculo.id} vehiculo={vehiculo} />
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] bg-white border border-[#E4E4E7] p-8 sm:p-12 text-center shadow-xs space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-[#18181B]">
              No hay vehículos de esta marca
            </h3>
            <p className="text-sm text-[#71717A] max-w-md mx-auto">
              Actualmente no encontramos unidades disponibles para el fabricante seleccionado en este patio.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setSelectedBrand('ALL')}
              className="inline-flex items-center gap-2 rounded-full bg-[#18181B] px-5 py-2.5 text-xs font-bold text-white hover:bg-black transition cursor-pointer"
            >
              Ver toda la flota
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
