import { useState } from 'react';
import type { EntregaWizardData } from './types';
import type { EstadoPuntoR2, ReservaClienteItem } from '@/lib/flota';
import type { EstadoGeneralInspeccion } from '@/db/schema/inspecciones';

export interface Step3PeritajeSalidaR2Props {
  reserva: ReservaClienteItem;
  data: EntregaWizardData;
  onChange: (updates: Partial<EntregaWizardData>) => void;
}

const ESTADOS_GENERALES: ReadonlyArray<{
  id: EstadoGeneralInspeccion;
  label: string;
  desc: string;
}> = [
  { id: 'IMPECABLE', label: 'Impecable', desc: 'Sin rayones ni alertas' },
  { id: 'OPTIMO', label: 'Óptimo', desc: 'Desgaste normal de uso' },
  { id: 'CON_NOVEDAD', label: 'Con novedad', desc: 'Se anotan detalles previos' },
];

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
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 03 · Peritaje Visual R2 de Salida
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          Documenta el estado visual de entrega
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[54ch]">
          Toca cada punto sobre la unidad para dejar constancia probatoria de carrocería, rodaje y telemetría antes de entregar las llaves.
        </p>
      </div>

      <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-5 sm:p-7 shadow-xs space-y-5">
        {/* Escenario interactivo del vehículo */}
        <div className="relative flex items-center justify-center rounded-[24px] bg-[#EDEDED]/75 p-4 min-h-[195px]">
          <img
            src={reserva.vehiculo.imagenUrl}
            alt={`${reserva.vehiculo.marca} ${reserva.vehiculo.modelo}`}
            className="w-full max-h-44 object-contain mx-auto drop-shadow-[0_14px_22px_rgba(17,24,39,0.16)]"
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
                    ? 'bg-[#111827] text-white ring-4 ring-white scale-105 z-20'
                    : novedad
                      ? 'bg-[#1F2937] text-white ring-2 ring-white z-10'
                      : 'bg-white text-[#111827] ring-2 ring-[#9CA3AF]/60 z-10'
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    activo || novedad ? 'bg-white' : 'bg-[#111827]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Píldoras de selección rápida de zona */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {data.puntosR2.map((punto) => {
            const activo = puntoSeleccionado.id === punto.id;
            return (
              <button
                key={punto.id}
                type="button"
                onClick={() => setPuntoActivoId(punto.id)}
                className={`shrink-0 min-h-[44px] rounded-full px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                  activo
                    ? 'bg-[#111827] text-white'
                    : 'bg-[#EDEDED] text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                {punto.zona.split(' ')[0]} · {punto.estado}
              </button>
            );
          })}
        </div>

        {/* Editor del punto seleccionado */}
        <div className="rounded-[20px] bg-[#EDEDED]/65 border border-[#9CA3AF]/30 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-bold text-[#111827]">
                {puntoSeleccionado.zona}
              </h2>
              <span className="text-[11px] font-medium text-[#4B5563]">
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
                  className={`min-h-[44px] rounded-full px-3 py-1.5 text-[11px] font-bold cursor-pointer ${
                    puntoSeleccionado.estado === op.id
                      ? 'bg-[#111827] text-white'
                      : 'bg-white text-[#4B5563]'
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
            className="w-full min-h-[44px] rounded-xl bg-white border border-[#9CA3AF]/40 px-3.5 py-2 text-base text-[#111827] focus:border-[#111827] focus:outline-none"
          />
        </div>

        {/* Estado general de salida y observaciones */}
        <div className="space-y-3 border-t border-[#EDEDED] pt-4">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] block">
            Estado general del acta de entrega
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ESTADOS_GENERALES.map((eg) => {
              const activo = data.estadoGeneralEntrega === eg.id;
              return (
                <button
                  key={eg.id}
                  type="button"
                  onClick={() => onChange({ estadoGeneralEntrega: eg.id })}
                  className={`min-h-[52px] rounded-2xl border p-3 text-left transition-colors cursor-pointer ${
                    activo
                      ? 'bg-[#111827] text-white border-[#111827]'
                      : 'bg-[#EDEDED]/60 text-[#111827] border-[#9CA3AF]/40 hover:bg-white'
                  }`}
                >
                  <span className="block text-xs font-bold">{eg.label}</span>
                  <span
                    className={`block text-[11px] ${
                      activo ? 'text-[#9CA3AF]' : 'text-[#4B5563]'
                    }`}
                  >
                    {eg.desc}
                  </span>
                </button>
              );
            })}
          </div>

          <textarea
            rows={2}
            value={data.observacionesEntrega}
            onChange={(e) => onChange({ observacionesEntrega: e.target.value })}
            placeholder="Observaciones adicionales de la entrega (opcional)..."
            aria-label="Observaciones adicionales de la entrega"
            className="w-full rounded-2xl bg-[#EDEDED]/60 border border-[#9CA3AF]/40 px-4 py-3 text-base text-[#111827] focus:border-[#111827] focus:bg-white focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
