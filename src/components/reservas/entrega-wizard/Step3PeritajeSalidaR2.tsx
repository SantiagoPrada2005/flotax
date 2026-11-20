import { useState } from 'react';
import type { EntregaWizardData } from './types';
import type { EstadoPuntoR2, ReservaClienteItem } from '@/lib/flota';

export interface Step3PeritajeSalidaR2Props {
  reserva: ReservaClienteItem;
  data: EntregaWizardData;
  onChange: (updates: Partial<EntregaWizardData>) => void;
}

export default function Step3PeritajeSalidaR2({
  reserva,
  data,
  onChange,
}: Step3PeritajeSalidaR2Props) {
  const [puntoActivoId, setPuntoActivoId] = useState<string>(
    data.puntosR2[0]?.id ?? 'r2-carroceria'
  );

  const puntoSeleccionado =
    data.puntosR2.find((p) => p.id === puntoActivoId) ?? data.puntosR2[0]!;

  const actualizarEstadoPunto = (nuevoEstado: EstadoPuntoR2) => {
    const etiqueta =
      nuevoEstado === 'NOVEDAD'
        ? 'Novedad previa anotada'
        : nuevoEstado === 'VERIFICADO'
          ? 'Verificado OK en entrega'
          : 'Original sin novedades';

    const puntosActualizados = data.puntosR2.map((p) =>
      p.id === puntoSeleccionado.id
        ? { ...p, estado: nuevoEstado, etiqueta }
        : p
    );

    const hayNovedades = puntosActualizados.some((p) => p.estado === 'NOVEDAD');
    onChange({
      puntosR2: puntosActualizados,
      estadoGeneralEntrega: hayNovedades
        ? 'CON_NOVEDAD'
        : data.estadoGeneralEntrega === 'CON_NOVEDAD'
          ? 'OPTIMO'
          : data.estadoGeneralEntrega,
    });
  };

  const actualizarDictamenPunto = (nuevoDictamen: string) => {
    const puntosActualizados = data.puntosR2.map((p) =>
      p.id === puntoSeleccionado.id ? { ...p, dictamen: nuevoDictamen } : p
    );
    onChange({ puntosR2: puntosActualizados });
  };

  return (
    <div className="w-full space-y-4">
      <div className="space-y-1">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block">
          Paso 03 · Peritaje Visual R2 de Salida
        </span>
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#EDEDED] leading-tight">
          Documenta el estado visual de entrega
        </h1>
        <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] font-medium">
          Toca cada punto sobre el vehículo para dejar constancia de carrocería y rodaje antes de entregar las llaves.
        </p>
      </div>

      <div className="rounded-[24px] border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#1F2937] overflow-hidden shadow-xs">
        {/* Escenario interactivo del vehículo: ocupa todo el recuadro de borde a borde */}
        <div className="relative w-full aspect-video overflow-hidden">
          <img
            src={reserva.vehiculo.imagenUrl}
            alt={`${reserva.vehiculo.marca} ${reserva.vehiculo.modelo}`}
            className="h-full w-full object-cover object-center block"
          />

          {data.puntosR2.map((punto) => {
            const activo = puntoSeleccionado.id === punto.id;
            const novedad = punto.estado === 'NOVEDAD';
            return (
              <button
                key={punto.id}
                type="button"
                onClick={() => setPuntoActivoId(punto.id)}
                style={{ left: punto.coordX, top: punto.coordY }}
                aria-label={`Zona R2: ${punto.zona}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full cursor-pointer transition-transform ${
                  activo
                    ? 'bg-[#111827] text-white ring-4 ring-white scale-105 z-20 dark:bg-[#EDEDED] dark:text-[#111827] dark:ring-[#111827]'
                    : novedad
                      ? 'bg-[#1F2937] text-white ring-2 ring-white z-10'
                      : 'bg-white text-[#111827] ring-2 ring-[#9CA3AF]/60 z-10 dark:bg-[#111827] dark:text-[#EDEDED] dark:ring-white/30'
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    activo
                      ? 'bg-white dark:bg-[#111827]'
                      : novedad
                        ? 'bg-white'
                        : 'bg-[#111827] dark:bg-[#EDEDED]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5 space-y-3.5">
          {/* Píldoras de selección rápida de zona */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {data.puntosR2.map((punto) => {
              const activo = puntoSeleccionado.id === punto.id;
              return (
                <button
                  key={punto.id}
                  type="button"
                  onClick={() => setPuntoActivoId(punto.id)}
                  className={`shrink-0 min-h-[40px] rounded-full px-3.5 py-1.5 text-xs font-bold border cursor-pointer ${
                    activo
                      ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                      : 'bg-[#EDEDED] dark:bg-[#111827] text-[#4B5563] dark:text-[#EDEDED] border-[#9CA3AF]/35 dark:border-white/15 hover:text-[#111827]'
                  }`}
                >
                  {punto.zona.split(' ')[0]} · {punto.estado}
                </button>
              );
            })}
          </div>

          {/* Editor del punto seleccionado */}
          <div className="rounded-[18px] bg-[#EDEDED]/65 dark:bg-[#111827] border border-[#9CA3AF]/30 dark:border-white/15 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                  {puntoSeleccionado.zona}
                </h2>
                <span className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                  {puntoSeleccionado.etiqueta}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'VERIFICADO', label: 'Verificado OK' },
                    { id: 'ORIGINAL', label: 'Original' },
                    { id: 'NOVEDAD', label: 'Con novedad' },
                  ] as const
                ).map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => actualizarEstadoPunto(op.id)}
                    className={`min-h-[40px] rounded-full px-3 py-1.5 text-[11px] font-bold border cursor-pointer ${
                      puntoSeleccionado.estado === op.id
                        ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                        : 'bg-white dark:bg-[#1F2937] text-[#4B5563] dark:text-[#EDEDED] border-[#9CA3AF]/35 dark:border-white/15'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={puntoSeleccionado.dictamen}
              onChange={(e) => actualizarDictamenPunto(e.target.value)}
              aria-label={`Dictamen de ${puntoSeleccionado.zona}`}
              className="w-full min-h-[44px] rounded-xl bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 dark:border-white/15 px-3.5 py-2 text-base text-[#111827] dark:text-[#EDEDED] focus:border-[#111827] dark:focus:border-[#EDEDED]"
            />
          </div>

          <textarea
            rows={2}
            value={data.observacionesEntrega}
            onChange={(e) => onChange({ observacionesEntrega: e.target.value })}
            placeholder="Observaciones adicionales de la entrega (opcional)..."
            aria-label="Observaciones adicionales de la entrega"
            className="w-full rounded-2xl bg-[#EDEDED]/60 dark:bg-[#111827] border border-[#9CA3AF]/40 dark:border-white/15 px-3.5 py-2.5 text-base text-[#111827] dark:text-[#EDEDED] placeholder:text-[#9CA3AF] focus:border-[#111827] dark:focus:border-[#EDEDED] focus:bg-white dark:focus:bg-[#111827]"
          />
        </div>
      </div>
    </div>
  );
}
