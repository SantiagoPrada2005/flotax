import { useState } from 'react';
import type { VehiculoItem } from '@/lib/flota';

export interface RentalVehicleHeroProps {
  vehiculo: VehiculoItem;
  galeriaImagenes?: string[] | undefined;
  compact?: boolean | undefined;
}

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

export default function RentalVehicleHero({
  vehiculo,
  galeriaImagenes,
  compact = false,
}: RentalVehicleHeroProps) {
  const imagenes =
    galeriaImagenes && galeriaImagenes.length > 0
      ? galeriaImagenes
      : [vehiculo.imagenUrl];

  const [indiceFoto, setIndiceFoto] = useState(0);
  const tieneGaleria = imagenes.length > 1;
  const fotoActual = imagenes[indiceFoto] ?? vehiculo.imagenUrl;

  if (compact) {
    return (
      <div className="flex items-center gap-3.5 rounded-[24px] bg-white border border-[#9CA3AF]/45 p-3 shadow-xs dark:bg-[#1F2937] dark:border-white/12">
        <div className="relative w-24 sm:w-28 aspect-video shrink-0 overflow-hidden rounded-[14px] bg-[#111827] flex items-center justify-center p-1.5">
          <img
            src={vehiculo.imagenUrl}
            alt={`${vehiculo.marca} ${vehiculo.modelo}`}
            className="h-full w-full object-contain object-center block"
            loading="eager"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-[10px] font-bold tracking-wider text-[#111827] bg-[#EDEDED] border border-[#9CA3AF]/45 px-2 py-0.5 rounded-md dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15">
              {vehiculo.placa}
            </span>
            <span className="font-mono text-[10px] font-bold text-[#4B5563] dark:text-[#D1D5DB] truncate">
              {vehiculo.categoriaEtiqueta} · {vehiculo.anio}
            </span>
          </div>
          <h2 className="mt-0.5 font-display text-sm sm:text-base font-extrabold tracking-tight text-[#111827] dark:text-[#EDEDED] truncate">
            {vehiculo.marca} {vehiculo.modelo}
          </h2>
        </div>
        <div className="text-right shrink-0 pr-1">
          <p className="font-display text-sm font-black text-[#111827] dark:text-[#EDEDED] tabular-nums">
            {formatCop(vehiculo.precioDia)}
          </p>
          <span className="text-[10px] font-medium text-[#4B5563] dark:text-[#D1D5DB]">
            / día
          </span>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Presentación del vehículo"
      className="overflow-hidden rounded-[28px] bg-white border border-[#9CA3AF]/45 shadow-xs dark:bg-[#1F2937] dark:border-white/12"
    >
      {/* Fotografía protagonista 16:9 de borde a borde */}
      <div className="relative w-full aspect-video rounded-t-[27px] overflow-hidden">
        <img
          src={fotoActual}
          alt={`${vehiculo.marca} ${vehiculo.modelo}`}
          className="h-full w-full object-cover object-center block"
          loading="eager"
          decoding="async"
        />

        {tieneGaleria && (
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between pointer-events-none">
            <button
              type="button"
              onClick={() =>
                setIndiceFoto((prev) => (prev - 1 + imagenes.length) % imagenes.length)
              }
              aria-label="Fotografía anterior"
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#111827]/75 text-white backdrop-blur-md border border-white/20 hover:bg-[#111827] cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="h-4 w-4"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-[#111827]/75 px-2.5 py-1 backdrop-blur-md border border-white/15">
              {imagenes.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setIndiceFoto(idx)}
                  aria-label={`Ver imagen ${idx + 1} de ${imagenes.length}`}
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-150 cursor-pointer ${
                    idx === indiceFoto ? 'w-4 bg-white' : 'w-1.5 bg-white/45'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIndiceFoto((prev) => (prev + 1) % imagenes.length)}
              aria-label="Fotografía siguiente"
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#111827]/75 text-white backdrop-blur-md border border-white/20 hover:bg-[#111827] cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="h-4 w-4"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Identificación, Tarjetas Compactas y Descripción */}
      <div className="p-4 sm:p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] font-bold tracking-wider text-[#111827] bg-[#EDEDED] border border-[#9CA3AF]/45 px-2.5 py-0.5 rounded-lg dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15">
                {vehiculo.placa}
              </span>
              <span className="font-mono text-[11px] font-bold text-[#111827] bg-[#EDEDED] border border-[#9CA3AF]/45 px-2.5 py-0.5 rounded-full dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/20">
                {vehiculo.categoriaEtiqueta}
              </span>
              <span className="font-mono text-[11px] font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
                {vehiculo.anio}
              </span>
            </div>

            <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#111827] dark:text-[#EDEDED] leading-tight">
              {vehiculo.marca} {vehiculo.modelo}
            </h1>
          </div>

          <div className="text-right shrink-0">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
              Tarifa
            </span>
            <p className="font-display text-lg sm:text-xl font-black text-[#111827] dark:text-white tabular-nums leading-tight">
              {formatCop(vehiculo.precioDia)}
            </p>
            <span className="text-[11px] font-medium text-[#4B5563] dark:text-[#D1D5DB]">
              por día
            </span>
          </div>
        </div>

        {/* Tarjetas compactas agrupadas con características reales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-2xl bg-[#EDEDED] border border-[#9CA3AF]/40 px-3 py-2 dark:bg-[#111827] dark:border-white/12">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
              Transmisión
            </span>
            <p className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED] truncate">
              {vehiculo.transmision}
            </p>
          </div>

          <div className="rounded-2xl bg-[#EDEDED] border border-[#9CA3AF]/40 px-3 py-2 dark:bg-[#111827] dark:border-white/12">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
              Combustible
            </span>
            <p className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED] truncate">
              {vehiculo.combustible}
            </p>
          </div>

          <div className="rounded-2xl bg-[#EDEDED] border border-[#9CA3AF]/40 px-3 py-2 dark:bg-[#111827] dark:border-white/12">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
              Odómetro
            </span>
            <p className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums truncate">
              {vehiculo.kilometraje.toLocaleString('es-CO')} km
            </p>
          </div>

          <div className="rounded-2xl bg-[#EDEDED] border border-[#9CA3AF]/40 px-3 py-2 dark:bg-[#111827] dark:border-white/12">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
              Garantía
            </span>
            <p className="mt-0.5 font-display text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums truncate">
              {formatCop(vehiculo.depositoGarantia)}
            </p>
          </div>
        </div>

        {vehiculo.descripcion && (
          <p className="text-xs sm:text-sm text-[#4B5563] dark:text-[#D1D5DB] leading-relaxed">
            {vehiculo.descripcion}
          </p>
        )}
      </div>
    </section>
  );
}
