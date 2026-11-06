import { useState } from 'react';
import type { VehiculoItem } from '@/lib/flota/types';

export interface VehicleCatalogCardProps {
  vehiculo: VehiculoItem;
}

export default function VehicleCatalogCard({ vehiculo }: VehicleCatalogCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const formatPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(precio);
  };

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
    <article className="fx-pressable relative flex h-full flex-col justify-between rounded-[28px] border border-[#E4E4E7]/70 bg-white p-5 shadow-[0_10px_30px_-5px_rgba(24,24,27,0.06)] sm:p-6">
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

      {/* 1. Cabecera de la Tarjeta (Nombre, Año + Icono Combustible, Tarifa) */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base sm:text-lg font-bold tracking-tight text-[#18181B] truncate">
            {vehiculo.marca} {vehiculo.modelo}
          </h3>

          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-[#A1A1AA] font-normal">
              {vehiculo.anio}
            </span>
            {vehiculo.estado === 'RESERVADO' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-[#F4F4F5] text-[#71717A] border border-[#E4E4E7]">
                Reservado
              </span>
            )}
            {vehiculo.estado === 'MANTENIMIENTO' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-[#F4F4F5] text-[#71717A] border border-[#E4E4E7]">
                Taller
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#A1A1AA]">
            {isElectrico ? (
              <span className="inline-flex items-center text-[#71717A]" title="Eléctrico / Híbrido">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </span>
            ) : (
              <span className="inline-flex items-center text-[#A1A1AA]" title="Gasolina">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                  <path d="M3 22h12M4 9h10M4 22V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v18" />
                  <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L19 6" />
                </svg>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2.5 shrink-0">
          <div className="text-right">
            <span className="font-display text-lg sm:text-xl font-black text-[#18181B]">
              {formatPrecio(vehiculo.precioDia)}
            </span>
            <span className="text-xs font-normal text-[#71717A] ml-0.5">/día</span>
          </div>

          <button
            type="button"
            onClick={toggleFavorite}
            aria-label="Marcar como favorito"
            aria-pressed={isFavorite}
            className="fx-pressable group/fav relative z-20 -mt-2.5 -mb-1.5 -ml-1.5 -mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          >
            {/* Círculo visual de 32 px dentro de una zona táctil de 44×44 px */}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4F4F5] text-[#71717A] transition-colors group-hover/fav:bg-[#EAEAEB]">
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
      </div>

      {/* 2. Visual Central: Foto de Estudio en 3/4 con Sombra de Suelo */}
      <div className="my-3 py-1 flex flex-1 flex-col items-center justify-center relative min-h-[160px]">
        <img
          src={vehiculo.imagenUrl}
          alt={`${vehiculo.marca} ${vehiculo.modelo}`}
          className="mx-auto w-full max-h-44 object-contain sm:max-h-52"
          loading="lazy"
        />
        <div className="h-4 w-4/5 mx-auto -mt-3.5 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(24,24,27,0.20)_0%,_transparent_75%)]" />
      </div>

      {/* 3. Pie de Tarjeta: 4 Columnas Limpias por Espaciado Óptico (Sin Bordes Duros) */}
      <div className="mt-4 pt-3.5 border-t border-[#F4F4F5] grid grid-cols-4 gap-2 text-center">
        {/* Columna 1: Aceleración */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] sm:text-[11px] font-normal text-[#A1A1AA] lowercase">0-100 km/h</span>
          <span className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[#18181B]">
            {vehiculo.aceleracion}
          </span>
        </div>

        {/* Columna 2: Tipo de Vehículo */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] sm:text-[11px] font-normal text-[#A1A1AA] lowercase">tipo</span>
          <span className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[#18181B] uppercase">
            {vehiculo.categoria}
          </span>
        </div>

        {/* Columna 3: Puestos / Pasajeros */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] sm:text-[11px] font-normal text-[#A1A1AA] lowercase">puestos</span>
          <span className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[#18181B]">
            {vehiculo.capacidadPasajeros}
          </span>
        </div>

        {/* Columna 4: Rating */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-[10px] sm:text-[11px] font-normal text-[#A1A1AA] lowercase">rating</span>
          <span className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[#18181B] inline-flex items-center justify-center gap-0.5">
            <span className="text-amber-500">★</span> {vehiculo.rating}
          </span>
        </div>
      </div>
    </article>
  );
}
