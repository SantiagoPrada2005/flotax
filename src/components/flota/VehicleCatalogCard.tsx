import { useState } from 'react';
import type { VehiculoItem } from '@/lib/flota/types';

export interface VehicleCatalogCardProps {
  vehiculo: VehiculoItem;
}

const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export default function VehicleCatalogCard({ vehiculo }: VehicleCatalogCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const formatPrecio = (precio: number) => COP_FORMATTER.format(precio);

  const isElectrico = vehiculo.combustible === 'Eléctrico' || vehiculo.combustible === 'Híbrido';

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(8); } catch {}
    }
    setIsFavorite(!isFavorite);
  };

  return (
    <article className="fx-pressable relative flex h-full flex-col justify-between rounded-[28px] border border-[#9CA3AF]/35 bg-white dark:bg-[#1F2937] dark:border-white/10 shadow-[0_10px_30px_-5px_rgba(17,24,39,0.06)] overflow-hidden">
      {/*
        Enlace estirado: cubre toda la tarjeta, pero es hermano del botón de
        favorito (nunca su ancestro), así que no hay interactivos anidados.
      */}
      <a
        href={`/vehiculos/${vehiculo.id}`}
        data-astro-prefetch="tap"
        aria-label={`Ver ${vehiculo.marca} ${vehiculo.modelo}`}
        className="absolute inset-0 z-10 rounded-[28px]"
      />

      {/* 1. Fotografía ocupando completamente el contenedor superior sin segundo recuadro */}
      <div className="relative w-full aspect-video overflow-hidden">
        <img
          src={vehiculo.imagenUrl}
          alt={`${vehiculo.marca} ${vehiculo.modelo}`}
          className="h-full w-full object-cover object-center block"
          loading="lazy"
          decoding="async"
        />

        <button
          type="button"
          onClick={toggleFavorite}
          aria-label="Marcar como favorito"
          aria-pressed={isFavorite}
          className="fx-press group/fav absolute right-2.5 top-2.5 z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#4B5563] backdrop-blur-md transition-colors group-hover/fav:bg-white dark:bg-[#111827]/85 dark:text-[#EDEDED]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isFavorite ? '#DC2626' : 'none'}
              stroke={isFavorite ? '#DC2626' : 'currentColor'}
              strokeWidth="2"
              className="h-4 w-4 transition-colors"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          </span>
        </button>
      </div>

      {/* 2. Contenido de la Tarjeta */}
      <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-base sm:text-lg font-bold tracking-tight text-[#111827] dark:text-[#EDEDED] truncate">
              {vehiculo.marca} {vehiculo.modelo}
            </h3>

            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs text-[#4B5563] dark:text-[#9CA3AF] font-normal">
                {vehiculo.anio}
              </span>
              {vehiculo.estado === 'RESERVADO' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-[#EDEDED] text-[#4B5563] border border-[#9CA3AF]/35 dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15">
                  Reservado
                </span>
              )}
              {vehiculo.estado === 'MANTENIMIENTO' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-[#EDEDED] text-[#4B5563] border border-[#9CA3AF]/35 dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15">
                  Taller
                </span>
              )}
              {isElectrico ? (
                <span className="inline-flex items-center text-[#4B5563] dark:text-[#9CA3AF]" title="Eléctrico / Híbrido">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </span>
              ) : (
                <span className="inline-flex items-center text-[#9CA3AF]" title="Gasolina">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                    <path d="M3 22h12M4 9h10M4 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18" />
                    <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L19 6" />
                  </svg>
                </span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-display text-lg sm:text-xl font-black text-[#111827] dark:text-[#EDEDED] tabular-nums">
              {formatPrecio(vehiculo.precioDia)}
            </span>
            <span className="text-xs font-normal text-[#4B5563] dark:text-[#9CA3AF] ml-0.5">/día</span>
          </div>
        </div>

        {/* 3. Pie de Tarjeta: 4 Columnas Limpias por Espaciado Óptico */}
        <div className="mt-4 pt-3.5 border-t border-[#EDEDED] dark:border-white/10 grid grid-cols-4 gap-2 text-center">
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] sm:text-[11px] font-normal text-[#4B5563] dark:text-[#9CA3AF] lowercase">0-100 km/h</span>
            <span className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
              {vehiculo.aceleracion}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] sm:text-[11px] font-normal text-[#4B5563] dark:text-[#9CA3AF] lowercase">tipo</span>
            <span className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED] uppercase">
              {vehiculo.categoria}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] sm:text-[11px] font-normal text-[#4B5563] dark:text-[#9CA3AF] lowercase">puestos</span>
            <span className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
              {vehiculo.capacidadPasajeros}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] sm:text-[11px] font-normal text-[#4B5563] dark:text-[#9CA3AF] lowercase">rating</span>
            <span className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED] inline-flex items-center justify-center gap-0.5">
              <span>★</span> {vehiculo.rating}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
