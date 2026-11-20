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
    <div className="w-full space-y-4">
      <div className="space-y-1">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block">
          Paso 02 · Telemetría e Inventario
        </span>
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#EDEDED] leading-tight">
          Registra la lectura inicial y el kit
        </h1>
      </div>

      {/* Bloque Telemetría */}
      <div className="rounded-[24px] border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#1F2937] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Odómetro */}
          <div className="space-y-1.5">
            <label
              htmlFor="entrega-odometro"
              className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED] block"
            >
              Odómetro de salida (km) *
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    medidorUsoEntrega: Math.max(0, data.medidorUsoEntrega - 50),
                  })
                }
                aria-label="Restar 50 km"
                className="min-h-[44px] min-w-[48px] rounded-2xl bg-[#EDEDED] dark:bg-[#111827] border border-transparent dark:border-white/15 font-mono text-sm font-bold text-[#111827] dark:text-[#EDEDED] hover:bg-[#9CA3AF]/30 dark:hover:bg-white/10 cursor-pointer"
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
                className="flex-1 min-h-[44px] rounded-2xl bg-[#EDEDED]/60 dark:bg-[#111827] px-3.5 py-2 text-center font-mono text-base font-bold text-[#111827] dark:text-[#EDEDED] border border-[#9CA3AF]/40 dark:border-white/15 focus:border-[#111827] dark:focus:border-[#EDEDED] focus:bg-white dark:focus:bg-[#111827]"
              />
              <button
                type="button"
                onClick={() =>
                  onChange({
                    medidorUsoEntrega: data.medidorUsoEntrega + 50,
                  })
                }
                aria-label="Sumar 50 km"
                className="min-h-[44px] min-w-[48px] rounded-2xl bg-[#111827] dark:bg-[#EDEDED] font-mono text-sm font-bold text-white dark:text-[#111827] hover:bg-[#1F2937] dark:hover:bg-white cursor-pointer"
              >
                +50
              </button>
            </div>
            {errors.medidorUsoEntrega && (
              <p className="text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
                {errors.medidorUsoEntrega}
              </p>
            )}
          </div>

          {/* Nivel de energía / combustible */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
                {esElectrico ? 'Nivel de batería' : 'Nivel de combustible'}
              </span>
              <span className="font-mono text-sm font-black text-[#111827] dark:text-[#EDEDED] tabular-nums">
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
                    className={`min-h-[44px] rounded-2xl font-mono text-xs font-bold cursor-pointer border ${activo
                        ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                        : 'bg-[#EDEDED]/70 dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/40 dark:border-white/15 hover:bg-white dark:hover:bg-white/10'
                      }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Checklist de salida por categoría */}
        <div className="space-y-2.5 border-t border-[#EDEDED] dark:border-white/10 pt-3.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
              Checklist físico ({reserva.vehiculo.categoria})
            </span>
            <span className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
              {data.respuestasChecklist.filter((i) => i.estado === 'BIEN').length} de{' '}
              {data.respuestasChecklist.length} conformes
            </span>
          </div>

          <div className="space-y-2">
            {data.respuestasChecklist.map((item) => (
              <div
                key={item.codigo}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-[18px] bg-[#EDEDED]/65 dark:bg-[#111827] border border-[#9CA3AF]/30 dark:border-white/10 p-3"
              >
                <span className="text-xs font-bold text-[#111827] dark:text-[#EDEDED] leading-snug">
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
                        className={`min-h-[40px] rounded-full px-3.5 py-1.5 text-[11px] font-bold border cursor-pointer ${activo
                            ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                            : 'bg-white dark:bg-[#1F2937] text-[#4B5563] dark:text-[#EDEDED] border-[#9CA3AF]/35 dark:border-white/15 hover:text-[#111827]'
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
        </div>
      </div>
    </div>
  );
}
