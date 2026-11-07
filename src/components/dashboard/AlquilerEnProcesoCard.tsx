import { useEffect, useState } from 'react';
import type { EstadoReserva, ReservaSelect, VehiculoSelect } from '@/db/schema';

export interface AlquilerEnProcesoItem {
  readonly id: ReservaSelect['id'];
  readonly codigo: ReservaSelect['codigo'];
  readonly marca: VehiculoSelect['marca'];
  readonly modelo: VehiculoSelect['modelo'];
  readonly placa: VehiculoSelect['placa'];
  readonly clienteNombre: ReservaSelect['contactoNombre'];
  readonly estado: EstadoReserva;
  readonly estadoEtiqueta: string;
}

export interface AlquilerEnProcesoResponse {
  readonly ok: boolean;
  readonly alquileres: readonly AlquilerEnProcesoItem[];
  readonly actualizadoEn: string;
}

export const MOCK_ALQUILERES_EN_PROCESO: readonly AlquilerEnProcesoItem[] = [
  {
    id: 'mock-alq-01',
    codigo: 'FLX-849210',
    marca: 'Toyota',
    modelo: 'Corolla Cross XEI',
    placa: 'KLM-482',
    clienteNombre: 'Carlos Andrés Mejía',
    estado: 'EN_CURSO',
    estadoEtiqueta: 'En proceso',
  },
  {
    id: 'mock-alq-02',
    codigo: 'FLX-849215',
    marca: 'Mazda',
    modelo: 'CX-30 Grand Touring',
    placa: 'NVP-914',
    clienteNombre: 'Laura Sofía Restrepo',
    estado: 'EN_CURSO',
    estadoEtiqueta: 'En proceso',
  },
];

export interface AlquilerEnProcesoCardProps {
  readonly initialAlquileres?: readonly AlquilerEnProcesoItem[] | undefined;
  readonly endpointUrl?: string | undefined;
  readonly pollingIntervalMs?: number | undefined;
}

export default function AlquilerEnProcesoCard({
  initialAlquileres = MOCK_ALQUILERES_EN_PROCESO,
  endpointUrl = '/api/alquileres/en-proceso',
  pollingIntervalMs = 30_000,
}: AlquilerEnProcesoCardProps) {
  const [alquileres, setAlquileres] =
    useState<readonly AlquilerEnProcesoItem[]>(initialAlquileres);

  useEffect(() => {
    setAlquileres(initialAlquileres);
  }, [initialAlquileres]);

  const consultarAlquileres = async (url: string = endpointUrl) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) return;
      const payload: unknown = await response.json();
      if (
        typeof payload === 'object' &&
        payload !== null &&
        'alquileres' in payload &&
        Array.isArray(payload.alquileres)
      ) {
        setAlquileres(payload.alquileres);
      }
    } catch {
      // Ignorar fallos de red en polling
    }
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void consultarAlquileres();
    }, pollingIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [endpointUrl, pollingIntervalMs]);

  return (
    <section
      aria-label="Alquiler en proceso"
      className="relative overflow-hidden rounded-[30px] bg-[#111827] p-5 text-white shadow-xl sm:p-6"
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/5 blur-2xl"
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* Encabezado canónico y limpio sin botones artificiales */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1F2937] text-white border border-[#4B5563]/40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="h-5 w-5"
              >
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold tracking-tight text-white truncate">
                Alquiler en proceso
              </h2>
              <p className="text-xs font-medium text-[#9CA3AF] truncate">
                Monitoreo activo en tiempo real
              </p>
            </div>
          </div>

          {/* Contador de unidades activas */}
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1F2937] border border-[#4B5563]/40 px-2.5 py-1 text-[11px] font-bold text-[#EDEDED]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{alquileres.length}</span>
          </span>
        </div>

        {/* Lista de alquileres activos o estado vacío */}
        {alquileres.length === 0 ? (
          <div className="mt-4 rounded-[20px] bg-[#1F2937] border border-[#4B5563]/35 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-[#EDEDED]">
              Sin alquileres en proceso
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2.5" role="list">
            {alquileres.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-[20px] bg-[#1F2937] border border-[#4B5563]/35 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-sm font-bold text-white truncate">
                      {item.marca} {item.modelo}
                    </p>
                    <span className="inline-flex items-center rounded-md bg-[#111827] border border-[#4B5563]/50 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-[#EDEDED]">
                      {item.placa}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-[#9CA3AF] truncate">
                    Cliente: <span className="text-[#EDEDED]">{item.clienteNombre}</span>
                  </p>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{item.estadoEtiqueta}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
