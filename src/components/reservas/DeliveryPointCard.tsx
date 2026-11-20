import { useState } from 'react';
import {
  formatearCoordenadasHumanas,
  formatearDistanciaKm,
  PATIO_COORDENADAS_DEFECTO,
} from '@/lib/ubicacion';
import MapboxCanvas from '@/components/alquiler/MapboxCanvas';

export interface DeliveryPointCardProps {
  modalidadEntrega: 'PATIO_PRINCIPAL' | 'DOMICILIO_MEDELLIN';
  sedeNombre: string;
  direccionEntrega?: string | null | undefined;
  entregaLatitud?: number | null | undefined;
  entregaLongitud?: number | null | undefined;
  entregaReferencia?: string | null | undefined;
  distanciaEntregaKm?: number | null | undefined;
  recargoEntregaDomicilio?: number | undefined;
  mapboxPublicToken?: string | null | undefined;
  vista?: 'admin' | 'cliente' | undefined;
  onAviso?: ((mensaje: string) => void) | undefined;
}

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

export default function DeliveryPointCard({
  modalidadEntrega,
  sedeNombre,
  direccionEntrega,
  entregaLatitud,
  entregaLongitud,
  entregaReferencia,
  distanciaEntregaKm,
  recargoEntregaDomicilio = 0,
  mapboxPublicToken = null,
  vista = 'admin',
  onAviso,
}: DeliveryPointCardProps) {
  const esDomicilio = modalidadEntrega === 'DOMICILIO_MEDELLIN';
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const latEfectiva = esDomicilio
    ? entregaLatitud
    : PATIO_COORDENADAS_DEFECTO.lat;
  const lngEfectiva = esDomicilio
    ? entregaLongitud
    : PATIO_COORDENADAS_DEFECTO.lng;

  const tieneCoords =
    typeof latEfectiva === 'number' &&
    typeof lngEfectiva === 'number' &&
    Number.isFinite(latEfectiva) &&
    Number.isFinite(lngEfectiva);

  const coordsTexto = tieneCoords
    ? formatearCoordenadasHumanas(latEfectiva, lngEfectiva)
    : null;

  const copiarCoordenadas = async () => {
    if (!coordsTexto || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(coordsTexto);
      setCopiado(true);
      onAviso?.('Coordenadas de entrega copiadas al portapapeles');
      window.setTimeout(() => setCopiado(false), 2200);
    } catch {
      onAviso?.('No se pudieron copiar las coordenadas');
    }
  };

  return (
    <div className="rounded-[22px] border border-[#9CA3AF]/50 bg-[#EDEDED]/70 p-4 space-y-3 dark:border-white/15 dark:bg-[#111827]/85">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
            {esDomicilio
              ? vista === 'admin'
                ? 'Punto de entrega a domicilio · Asesor de flota'
                : 'Punto de entrega a domicilio'
              : vista === 'admin'
                ? 'Punto de retiro en patio · Asesor de flota'
                : 'Punto de retiro en patio'}
          </span>
          <p className="mt-0.5 text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
            {esDomicilio
              ? direccionEntrega || 'Dirección por confirmar con el cliente'
              : `${sedeNombre} · Cra. 43A #11 Sur-50, El Poblado, Medellín`}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {esDomicilio && distanciaEntregaKm != null && (
            <span className="rounded-full border border-[#9CA3AF]/50 bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-[#111827] tabular-nums dark:border-white/15 dark:bg-[#1F2937] dark:text-[#EDEDED]">
              {formatearDistanciaKm(distanciaEntregaKm)}
            </span>
          )}
          <span className="rounded-full bg-[#111827] px-2.5 py-1 font-mono text-[11px] font-bold text-white tabular-nums dark:bg-[#EDEDED] dark:text-[#111827]">
            {esDomicilio && recargoEntregaDomicilio > 0
              ? `+ ${formatCop(recargoEntregaDomicilio)}`
              : esDomicilio
                ? 'Domicilio · Sin recargo'
                : 'Retiro en patio · $0'}
          </span>
        </div>
      </div>

      {esDomicilio && entregaReferencia && (
        <p className="rounded-[12px] border border-[#9CA3AF]/40 bg-white px-3 py-2 text-xs text-[#4B5563] dark:border-white/12 dark:bg-[#1F2937] dark:text-[#D1D5DB]">
          <strong className="text-[#111827] dark:text-[#EDEDED]">Referencia: </strong>
          {entregaReferencia}
        </p>
      )}

      {coordsTexto && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[#9CA3AF]/40 bg-white px-3 py-2 dark:border-white/12 dark:bg-[#1F2937]">
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
              {esDomicilio ? 'Coordenadas exactas (Ley 1581)' : 'Coordenadas sede Patio'}
            </span>
            <span className="font-mono text-xs font-bold text-[#111827] tabular-nums dark:text-[#EDEDED]">
              {coordsTexto}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                void copiarCoordenadas();
              }}
              className="fx-press min-h-[44px] rounded-[10px] border border-[#9CA3AF]/60 bg-[#EDEDED] px-3 py-1.5 text-xs font-bold text-[#111827] hover:bg-[#9CA3AF]/25 cursor-pointer dark:border-white/15 dark:bg-[#111827] dark:text-[#EDEDED] dark:hover:bg-white/10"
            >
              {copiado ? 'Copiadas ✓' : 'Copiar'}
            </button>

            <button
              type="button"
              aria-expanded={mostrarMapa}
              onClick={() => setMostrarMapa((prev) => !prev)}
              className="fx-press min-h-[44px] rounded-[10px] bg-[#111827] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#1F2937] cursor-pointer dark:bg-[#EDEDED] dark:text-[#111827] dark:hover:bg-white"
            >
              {mostrarMapa ? 'Ocultar mapa' : 'Ver en mapa'}
            </button>
          </div>
        </div>
      )}

      {mostrarMapa && tieneCoords && (
        <MapboxCanvas
          accessToken={mapboxPublicToken}
          mode="patio"
          patioCoords={{ lat: latEfectiva, lng: lngEfectiva }}
          patioNombre={
            esDomicilio
              ? direccionEntrega || `Entrega · ${sedeNombre}`
              : `${sedeNombre} · Patio Principal`
          }
          patioDireccion={
            esDomicilio
              ? entregaReferencia ?? direccionEntrega
              : 'Cra. 43A #11 Sur-50, El Poblado, Medellín'
          }
          heightClass="h-[230px]"
        />
      )}
    </div>
  );
}
