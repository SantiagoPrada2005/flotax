import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_TIEMPOS_ALQUILER_PROCESO,
  resolverYOrdenarAlquileres,
  type AlquilerEnProcesoItem,
  type EstadoAlquilerEnProceso,
  type EstadoPasoContrato,
  type PasoProcesoContrato,
  type TiemposConfigAlquilerEnProceso,
} from '@/lib/dashboard/alquileres-proceso';

export {
  DEFAULT_TIEMPOS_ALQUILER_PROCESO,
  resolverYOrdenarAlquileres,
  type AlquilerEnProcesoItem,
  type EstadoAlquilerEnProceso,
  type EstadoPasoContrato,
  type PasoProcesoContrato,
  type TiemposConfigAlquilerEnProceso,
};

export type AlquilerEnProcesoResponse =
  | {
      readonly ok: true;
      readonly alquileres: readonly AlquilerEnProcesoItem[];
      readonly tiemposConfig?: TiemposConfigAlquilerEnProceso | undefined;
      readonly actualizadoEn: string;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };

export const MOCK_ALQUILERES_EN_PROCESO: readonly AlquilerEnProcesoItem[] = [
  {
    id: 'mock-alq-01',
    codigoContrato: 'CTR-849210',
    clienteNombre: 'Carlos Andrés Mejía',
    clienteDocumento: '1.037.648.291',
    placa: 'MOV-304',
    imagenUrl: '/images/vehiculos/mazda-cx30.webp',
    estado: 'EN_PROCESO',
    etapaActualResumen: 'Peritaje fotográfico en patio',
    esperandoRespuestaDesde: new Date(Date.now() - 2 * 3600_000).toISOString(),
    pasosProceso: [
      {
        id: 'kyc',
        titulo: '1. Verificación C.C. y Licencia',
        detalle: 'Identidad validada',
        estado: 'COMPLETADO',
      },
      {
        id: 'abono',
        titulo: '2. Abono y Depósito de Garantía',
        detalle: 'Recibido en caja',
        estado: 'COMPLETADO',
      },
      {
        id: 'peritaje',
        titulo: '3. Inspección Pericial Fotográfica',
        detalle: 'Capturando evidencia en patio',
        estado: 'EN_PROCESO',
      },
      {
        id: 'firma',
        titulo: '4. Firma de Contrato y Entrega',
        detalle: 'Pendiente de firma final',
        estado: 'PENDIENTE',
      },
    ],
  },
  {
    id: 'mock-alq-02',
    codigoContrato: 'CTR-849198',
    clienteNombre: 'Julián David Osorio',
    clienteDocumento: '1.017.239.840',
    placa: 'FLX-801',
    imagenUrl: '/images/vehiculos/white-suv.webp',
    estado: 'PAUSADO',
    etapaActualResumen: 'Sin respuesta de firma (+12h)',
    esperandoRespuestaDesde: new Date(Date.now() - 14 * 3600_000).toISOString(),
    pasosProceso: [
      {
        id: 'kyc',
        titulo: '1. Verificación C.C. y Licencia',
        detalle: 'Identidad validada',
        estado: 'COMPLETADO',
      },
      {
        id: 'abono',
        titulo: '2. Abono y Depósito de Garantía',
        detalle: 'Abono inicial registrado',
        estado: 'COMPLETADO',
      },
      {
        id: 'peritaje',
        titulo: '3. Inspección Pericial Fotográfica',
        detalle: 'Peritaje R2 completado',
        estado: 'COMPLETADO',
      },
      {
        id: 'firma',
        titulo: '4. Firma de Contrato y Entrega',
        detalle: 'Pausado: +14h esperando respuesta final',
        estado: 'PAUSADO',
      },
    ],
  },
  {
    id: 'mock-alq-03',
    codigoContrato: 'CTR-849204',
    clienteNombre: 'Laura Sofía Restrepo',
    clienteDocumento: '1.152.461.903',
    placa: 'BMW-240',
    imagenUrl: '/images/vehiculos/dark-coupe.webp',
    estado: 'COMPLETADO',
    etapaActualResumen: 'Contrato activo • Llaves entregadas',
    completadoEn: new Date(Date.now() - 1.5 * 3600_000).toISOString(),
    pasosProceso: [
      {
        id: 'kyc',
        titulo: '1. Verificación C.C. y Licencia',
        detalle: 'Identidad validada',
        estado: 'COMPLETADO',
      },
      {
        id: 'abono',
        titulo: '2. Abono y Depósito de Garantía',
        detalle: 'Liquidado 100%',
        estado: 'COMPLETADO',
      },
      {
        id: 'peritaje',
        titulo: '3. Inspección Pericial Fotográfica',
        detalle: 'Acta R2 sellada',
        estado: 'COMPLETADO',
      },
      {
        id: 'firma',
        titulo: '4. Firma de Contrato y Entrega',
        detalle: 'Completado (se oculta a las 4h)',
        estado: 'COMPLETADO',
      },
    ],
  },
];

const ESTILOS_ESTADO: Record<
  EstadoAlquilerEnProceso,
  { readonly label: string; readonly badgeClass: string; readonly dotClass: string }
> = {
  PAUSADO: {
    label: 'Pausado',
    badgeClass: 'bg-[#111827] border-[#4B5563] text-[#EDEDED]',
    dotClass: 'bg-[#9CA3AF]',
  },
  EN_PROCESO: {
    label: 'En proceso',
    badgeClass: 'bg-[#1F2937] border-[#4B5563]/50 text-[#EDEDED]',
    dotClass: 'bg-[#EDEDED]',
  },
  COMPLETADO: {
    label: 'Completado',
    badgeClass: 'bg-[#EDEDED] border-[#9CA3AF]/60 text-[#111827]',
    dotClass: 'bg-[#111827]',
  },
};

const ESTILOS_PASO: Record<
  EstadoPasoContrato,
  { readonly circleClass: string; readonly textClass: string; readonly badgeText: string }
> = {
  COMPLETADO: {
    circleClass: 'bg-[#EDEDED] border-[#9CA3AF]/60 text-[#111827]',
    textClass: 'text-[#EDEDED]',
    badgeText: 'Listo',
  },
  EN_PROCESO: {
    circleClass: 'bg-[#1F2937] border-[#4B5563] text-[#EDEDED]',
    textClass: 'text-[#EDEDED]',
    badgeText: 'Actual',
  },
  PAUSADO: {
    circleClass: 'bg-[#111827] border-[#4B5563] text-[#9CA3AF]',
    textClass: 'text-[#9CA3AF]',
    badgeText: 'Detenido',
  },
  PENDIENTE: {
    circleClass: 'bg-[#111827] border-[#4B5563]/40 text-[#9CA3AF]',
    textClass: 'text-[#9CA3AF]',
    badgeText: 'Pendiente',
  },
};

export function obtenerPasosProcesoContrato(
  item: AlquilerEnProcesoItem
): readonly PasoProcesoContrato[] {
  if (item.pasosProceso && item.pasosProceso.length > 0) {
    return item.pasosProceso;
  }

  if (item.estado === 'COMPLETADO') {
    return [
      { id: 'kyc', titulo: '1. Verificación C.C. y Licencia', detalle: 'Validado', estado: 'COMPLETADO' },
      { id: 'abono', titulo: '2. Abono y Depósito de Garantía', detalle: 'Confirmado', estado: 'COMPLETADO' },
      { id: 'peritaje', titulo: '3. Inspección Pericial Fotográfica', detalle: 'Acta R2 lista', estado: 'COMPLETADO' },
      {
        id: 'firma',
        titulo: '4. Devolución y Cierre',
        detalle: item.completadoEn
          ? `Cerrado: ${new Date(item.completadoEn).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`
          : item.etapaActualResumen ?? 'Contrato cerrado',
        estado: 'COMPLETADO',
      },
    ];
  }

  if (item.estado === 'PAUSADO') {
    return [
      { id: 'kyc', titulo: '1. Verificación C.C. y Licencia', detalle: 'Validado', estado: 'COMPLETADO' },
      { id: 'abono', titulo: '2. Abono y Depósito de Garantía', detalle: 'Confirmado', estado: 'COMPLETADO' },
      { id: 'peritaje', titulo: '3. Inspección Pericial Fotográfica', detalle: 'Completado', estado: 'COMPLETADO' },
      {
        id: 'firma',
        titulo: '4. Estado del alquiler',
        detalle:
          item.etapaActualResumen ?? 'Alquiler pausado por acuerdo mutuo ($0 sobrecosto)',
        estado: 'PAUSADO',
      },
    ];
  }

  return [
    { id: 'kyc', titulo: '1. Verificación C.C. y Licencia', detalle: 'Validado', estado: 'COMPLETADO' },
    { id: 'abono', titulo: '2. Abono y Depósito de Garantía', detalle: 'Confirmado', estado: 'COMPLETADO' },
    { id: 'peritaje', titulo: '3. Inspección Pericial Fotográfica', detalle: 'En curso en patio', estado: 'EN_PROCESO' },
    { id: 'firma', titulo: '4. Firma de Contrato y Entrega', detalle: 'Pendiente', estado: 'PENDIENTE' },
  ];
}

export interface AlquilerEnProcesoCardProps {
  readonly initialAlquileres?: readonly AlquilerEnProcesoItem[] | undefined;
  readonly endpointUrl?: string | undefined;
  readonly pollingIntervalMs?: number | undefined;
  readonly tiemposConfig?: TiemposConfigAlquilerEnProceso | undefined;
}

export default function AlquilerEnProcesoCard({
  initialAlquileres = [],
  endpointUrl = '/api/alquileres/en-proceso',
  pollingIntervalMs = 30_000,
  tiemposConfig = DEFAULT_TIEMPOS_ALQUILER_PROCESO,
}: AlquilerEnProcesoCardProps) {
  const [rawAlquileres, setRawAlquileres] =
    useState<readonly AlquilerEnProcesoItem[]>(initialAlquileres);
  const [configActiva, setConfigActiva] =
    useState<TiemposConfigAlquilerEnProceso>(tiemposConfig);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );

  useEffect(() => {
    setRawAlquileres(initialAlquileres);
  }, [initialAlquileres]);

  useEffect(() => {
    let activeController: AbortController | null = null;
    const consultar = async () => {
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      try {
        const res = await fetch(endpointUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) return;
        const payload: unknown = await res.json();
        if (typeof payload === 'object' && payload !== null && 'alquileres' in payload && Array.isArray(payload.alquileres)) {
          setRawAlquileres(payload.alquileres);
          if (
            'tiemposConfig' in payload &&
            typeof payload.tiemposConfig === 'object' &&
            payload.tiemposConfig !== null &&
            'ocultarCompletadoHoras' in payload.tiemposConfig &&
            typeof payload.tiemposConfig.ocultarCompletadoHoras === 'number' &&
            'pausadoSinRespuestaHoras' in payload.tiemposConfig &&
            typeof payload.tiemposConfig.pausadoSinRespuestaHoras === 'number'
          ) {
            setConfigActiva({
              ocultarCompletadoHoras: payload.tiemposConfig.ocultarCompletadoHoras,
              pausadoSinRespuestaHoras: payload.tiemposConfig.pausadoSinRespuestaHoras,
            });
          }
        }
      } catch {
        // Conserva último estado en caso de red intermitente
      }
    };
    const id = window.setInterval(() => void consultar(), pollingIntervalMs);
    return () => {
      window.clearInterval(id);
      activeController?.abort();
    };
  }, [endpointUrl, pollingIntervalMs]);

  const alquileresVisibles = useMemo(
    () => resolverYOrdenarAlquileres(rawAlquileres, configActiva),
    [rawAlquileres, configActiva]
  );

  const toggleContrato = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section
      aria-label="Alquiler en proceso"
      className="relative overflow-hidden rounded-[28px] bg-[#111827] p-4 text-white shadow-xl sm:p-5"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold tracking-tight text-white">
            Alquiler en proceso
          </h2>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#1F2937] border border-[#4B5563]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#EDEDED]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EDEDED]" />
            <span>{alquileresVisibles.length}</span>
          </span>
        </div>

        {alquileresVisibles.length === 0 ? (
          <div className="mt-3 rounded-[18px] bg-[#1F2937] border border-[#4B5563]/35 px-4 py-5 text-center">
            <p className="text-sm font-semibold text-[#EDEDED]">
              Sin alquileres en proceso
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2.5" role="list">
            {alquileresVisibles.map((item) => {
              const meta = ESTILOS_ESTADO[item.estado];
              const isExpanded = expandedIds.has(item.id);
              const pasos = obtenerPasosProcesoContrato(item);
              const completadosCount = pasos.filter(
                (p) => p.estado === 'COMPLETADO'
              ).length;

              return (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-[20px] bg-[#1F2937] border border-[#4B5563]/35"
                >
                  <button
                    type="button"
                    onClick={() => toggleContrato(item.id)}
                    aria-expanded={isExpanded}
                    className="fx-pressable flex w-full items-center gap-3 p-2.5 text-left sm:p-3"
                  >
                    <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#EDEDED] p-1.5 sm:h-22 sm:w-28">
                      <img
                        src={item.imagenUrl}
                        alt={`Vehículo ${item.placa}`}
                        loading="lazy"
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
                          <span>{meta.label}</span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9CA3AF]">
                          <span>{isExpanded ? 'Ocultar' : 'Proceso'}</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`h-3.5 w-3.5 transition-transform duration-150 ${
                              isExpanded ? 'rotate-180 text-white' : ''
                            }`}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="font-display text-sm font-bold text-white truncate">
                          {item.clienteNombre}
                        </p>
                        <span className="font-mono text-[11px] font-medium text-[#9CA3AF]">
                          C.C. {item.clienteDocumento}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-[#9CA3AF]">
                            Placa:
                          </span>
                          <span className="inline-flex items-center rounded-md bg-[#111827] border border-[#4B5563]/50 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-[#EDEDED]">
                            {item.placa}
                          </span>
                        </div>

                        <span className="font-mono text-[10px] font-semibold text-[#9CA3AF]">
                          {completadosCount}/{pasos.length} etapas
                        </span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[#4B5563]/35 bg-[#111827]/60 px-3 pb-3 pt-2.5">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-bold text-[#EDEDED]">
                          {item.codigoContrato ?? `Contrato #${item.placa}`}
                        </span>
                        {item.estado === 'PAUSADO' ? (
                          <span className="text-[11px] font-medium text-[#9CA3AF]">
                            {item.etapaActualResumen ?? 'Alquiler pausado por acuerdo'}
                          </span>
                        ) : item.estado === 'COMPLETADO' ? (
                          <span className="text-[11px] font-medium text-[#EDEDED]">
                            {item.completadoEn
                              ? `Cerrado el ${new Date(item.completadoEn).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`
                              : item.etapaActualResumen ?? 'Contrato completado'}
                          </span>
                        ) : item.etapaActualResumen ? (
                          <span className="text-[11px] font-medium text-[#9CA3AF]">
                            {item.etapaActualResumen}
                          </span>
                        ) : null}
                      </div>

                      <ol className="space-y-1.5">
                        {pasos.map((paso) => {
                          const estiloPaso = ESTILOS_PASO[paso.estado];
                          return (
                            <li
                              key={paso.id}
                              className="flex items-center justify-between gap-2 rounded-xl bg-[#1F2937]/90 border border-[#4B5563]/30 px-2.5 py-1.5"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${estiloPaso.circleClass}`}
                                >
                                  {paso.estado === 'COMPLETADO'
                                    ? '✓'
                                    : paso.estado === 'PAUSADO'
                                      ? '!'
                                      : '•'}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-white truncate">
                                    {paso.titulo}
                                  </p>
                                  <p className="text-[11px] text-[#9CA3AF] truncate">
                                    {paso.detalle}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${estiloPaso.textClass}`}
                              >
                                {estiloPaso.badgeText}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
