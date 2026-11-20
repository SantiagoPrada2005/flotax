import { useState } from 'react';
import type { EntregaWizardData, EntregaWizardErrors } from './types';
import type { ReservaClienteItem } from '@/lib/flota';

export interface Step2TelemetriaYChecklistProps {
  reserva: ReservaClienteItem;
  data: EntregaWizardData;
  errors: EntregaWizardErrors;
  onChange: (updates: Partial<EntregaWizardData>) => void;
}

const NIVELES_ENERGIA = [25, 50, 75, 100] as const;

export default function Step2TelemetriaYChecklist({
  reserva,
  data,
  errors,
  onChange,
}: Step2TelemetriaYChecklistProps) {
  const [mostrarChecklist, setMostrarChecklist] = useState(false);
  const esElectrico =
    reserva.vehiculo.combustible.toLowerCase().includes('eléctr') ||
    reserva.vehiculo.categoria === 'PATINETA';

  const cambiarEstadoChecklist = (
    codigo: string,
    estado: 'BIEN' | 'CON_NOVEDAD' | 'NO_APLICA'
  ) => {
    const actualizados = data.respuestasChecklist.map((item) =>
      item.codigo === codigo ? { ...item, estado } : item
    );
    onChange({ respuestasChecklist: actualizados });
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] block">
          Paso 02 · Telemetría e Inventario
        </span>
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111827] leading-[1.12]">
          Registra la lectura inicial y el kit
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] font-medium max-w-[54ch]">
          Confirma el odómetro de salida, el nivel de {esElectrico ? 'batería' : 'combustible'} y los elementos físicos entregados con la unidad.
        </p>
      </div>

      {/* Bloque Telemetría */}
      <div className="rounded-[28px] border border-[#9CA3AF]/40 bg-white p-5 sm:p-7 shadow-xs space-y-5 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Odómetro */}
          <div className="space-y-2 min-w-0">
            <label
              htmlFor="entrega-odometro"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] block"
            >
              Odómetro de salida (km) *
            </label>
            <div className="flex items-center gap-2 w-full min-w-0">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    medidorUsoEntrega: Math.max(0, data.medidorUsoEntrega - 50),
                  })
                }
                aria-label="Restar 50 km"
                className="shrink-0 min-h-[48px] min-w-[48px] px-2.5 rounded-2xl bg-[#EDEDED] font-mono text-sm font-bold text-[#111827] hover:bg-[#9CA3AF]/30 cursor-pointer"
              >
                -50
              </button>
              <input
                id="entrega-odometro"
                type="number"
                min={0}
                value={data.medidorUsoEntrega}
                onChange={(e) =>
                  onChange({
                    medidorUsoEntrega: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="min-w-0 w-full flex-1 min-h-[48px] rounded-2xl bg-[#EDEDED]/60 px-3 py-3 text-center font-mono text-base sm:text-lg font-bold text-[#111827] border border-[#9CA3AF]/40 focus:border-[#111827] focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    medidorUsoEntrega: data.medidorUsoEntrega + 50,
                  })
                }
                aria-label="Sumar 50 km"
                className="shrink-0 min-h-[48px] min-w-[48px] px-2.5 rounded-2xl bg-[#111827] font-mono text-sm font-bold text-white hover:bg-[#1F2937] cursor-pointer"
              >
                +50
              </button>
            </div>
            {errors.medidorUsoEntrega && (
              <p className="text-xs font-bold text-[#111827]">
                {errors.medidorUsoEntrega}
              </p>
            )}
          </div>

          {/* Nivel de energía / combustible */}
          <div className="space-y-2 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827]">
                {esElectrico ? 'Nivel de batería' : 'Nivel de combustible'}
              </span>
              <span className="font-mono text-sm font-black text-[#111827] tabular-nums">
                {data.nivelEnergiaEntregaPct}%
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {NIVELES_ENERGIA.map((pct) => {
                const activo = data.nivelEnergiaEntregaPct === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => onChange({ nivelEnergiaEntregaPct: pct })}
                    className={`min-h-[48px] rounded-2xl font-mono text-xs font-bold transition-colors cursor-pointer border ${
                      activo
                        ? 'bg-[#111827] text-white border-[#111827]'
                        : 'bg-[#EDEDED]/70 text-[#111827] border-[#9CA3AF]/40 hover:bg-white'
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Checklist de salida por categoría (Progressive Disclosure) */}
        <div className="space-y-3 border-t border-[#EDEDED] pt-4">
          <button
            type="button"
            onClick={() => setMostrarChecklist((prev) => !prev)}
            className="w-full min-h-[48px] flex items-center justify-between gap-2 rounded-2xl bg-[#EDEDED]/70 border border-[#9CA3AF]/40 px-4 py-3 text-left cursor-pointer hover:bg-[#EDEDED]"
          >
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#111827] block">
                Checklist físico ({reserva.vehiculo.categoria})
              </span>
              <span className="text-[11px] font-medium text-[#4B5563]">
                {data.respuestasChecklist.filter((i) => i.estado === 'BIEN').length} de{' '}
                {data.respuestasChecklist.length} ítems conformes
              </span>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#111827] border border-[#9CA3AF]/40">
              {mostrarChecklist ? 'Ocultar −' : 'Revisar +'}
            </span>
          </button>

          {mostrarChecklist && (
            <div className="space-y-2.5 pt-1">
              {data.respuestasChecklist.map((item) => (
                <div
                  key={item.codigo}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-[20px] bg-[#EDEDED]/65 border border-[#9CA3AF]/30 p-3.5"
                >
                  <span className="text-xs font-bold text-[#111827] leading-snug">
                    {item.nombre}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {(
                      [
                        { id: 'BIEN', label: 'Bien' },
                        { id: 'CON_NOVEDAD', label: 'Novedad' },
                        { id: 'NO_APLICA', label: 'N/A' },
                      ] as const
                    ).map((op) => {
                      const activo = item.estado === op.id;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => cambiarEstadoChecklist(item.codigo, op.id)}
                          className={`min-h-[44px] rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                            activo
                              ? 'bg-[#111827] text-white'
                              : 'bg-white text-[#4B5563] hover:text-[#111827]'
                          }`}
                        >
                          {op.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
