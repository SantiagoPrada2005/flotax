import {
  Check,
  ClipboardList,
  FileCheck,
  FilePenLine,
  FileText,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import type { VehiculoWizardData } from './types';
import { VEHICLE_STATUS_ICONS, WIZARD_ICON_STROKE } from './wizard-icons';

export interface Step7PatioProps {
  data: VehiculoWizardData;
  errors?: Record<string, string> | undefined;
  onChange: (updates: Partial<VehiculoWizardData>) => void;
}

const ESTADOS_PATIO: {
  id: 'DISPONIBLE' | 'RESERVADO' | 'MANTENIMIENTO';
  etiqueta: string;
  desc: string;
}[] = [
  { id: 'DISPONIBLE', etiqueta: 'Disponible', desc: 'Listo en patio para asignación inmediata a clientes.' },
  { id: 'RESERVADO', etiqueta: 'Reservado', desc: 'Asignado previamente a una reserva programada.' },
  { id: 'MANTENIMIENTO', etiqueta: 'En Mantenimiento', desc: 'En alistamiento mecánico, lavado o peritaje técnico.' },
];

const DOCUMENTOS_CHECKLIST: ReadonlyArray<{
  key: keyof Pick<
    VehiculoWizardData,
    'soatVigente' | 'tarjetaPropiedad' | 'tecnicoMecanica' | 'kitCarretera'
  >;
  label: string;
  icon: LucideIcon;
}> = [
  { key: 'soatVigente', label: 'SOAT Vigente y Registrado', icon: ShieldCheck },
  { key: 'tarjetaPropiedad', label: 'Tarjeta de Propiedad Original', icon: FileText },
  { key: 'tecnicoMecanica', label: 'Revisión Técnico-Mecánica al día', icon: FileCheck },
  { key: 'kitCarretera', label: 'Kit de Carretera y Llave', icon: KeyRound },
];

export default function Step7Patio({
  data,
  errors = {},
  onChange,
}: Step7PatioProps) {
  return (
    <div className="w-full space-y-4">
      {/* Encabezado Hero */}
      <div className="space-y-1">
        <span className="font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block">
          Paso 07 · Documentación y Patio
        </span>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-[#EDEDED] leading-[1.12]">
          Prepara su documentación
        </h1>
      </div>

      {/* Contenedor Inmersivo de Máximo 3 Entradas */}
      <div className="rounded-[24px] border border-[#9CA3AF]/40 bg-white p-4 sm:p-6 shadow-xs space-y-4 dark:bg-[#1F2937] dark:border-white/10">
        {/* Entrada 1: Estado Operativo Inicial */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
              <SlidersHorizontal
                className="h-3.5 w-3.5 shrink-0 text-[#4B5563] dark:text-[#9CA3AF]"
                strokeWidth={WIZARD_ICON_STROKE}
                aria-hidden="true"
              />
              <span>Estado Operativo</span>
            </label>
            <span className="font-mono text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
              Disponibilidad inmediata
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ESTADOS_PATIO.map((item) => {
              const isSelected = data.estado === item.id;
              const StatusIcon = VEHICLE_STATUS_ICONS[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ estado: item.id })}
                  className={`ios-press-bounce rounded-xl px-3 py-2.5 border text-left transition cursor-pointer flex flex-col justify-between ${isSelected
                    ? 'bg-[#111827] text-white border-[#111827] shadow-xs dark:bg-white dark:text-[#111827] dark:border-white'
                    : 'bg-[#EDEDED]/50 text-[#111827] border-[#9CA3AF]/40 hover:bg-white hover:border-[#111827] dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/20 dark:hover:border-white/40 dark:hover:text-white'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 min-w-0 font-display font-bold text-xs sm:text-sm leading-tight">
                      <StatusIcon
                        className="h-4 w-4 shrink-0"
                        strokeWidth={WIZARD_ICON_STROKE}
                        aria-hidden="true"
                      />
                      <span>{item.etiqueta}</span>
                    </span>
                    <span
                      className={`h-3.5 w-3.5 shrink-0 rounded-full border flex items-center justify-center text-[9px] font-bold ${isSelected
                        ? 'border-white bg-white text-[#111827] dark:border-[#111827] dark:bg-[#111827] dark:text-white'
                        : 'border-[#9CA3AF] dark:border-white/30'
                        }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5" strokeWidth={2.75} aria-hidden="true" />}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-1 leading-snug ${isSelected ? 'text-gray-300 dark:text-gray-600' : 'text-[#4B5563] dark:text-[#9CA3AF]'
                      }`}
                  >
                    {item.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {errors.estado && (
            <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
              {errors.estado}
            </p>
          )}
        </div>

        {/* Entrada 2: Cumplimiento Documental */}
        <div className="space-y-2 border-t border-[#EDEDED] dark:border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
              <ClipboardList
                className="h-3.5 w-3.5 shrink-0 text-[#4B5563] dark:text-[#9CA3AF]"
                strokeWidth={WIZARD_ICON_STROKE}
                aria-hidden="true"
              />
              <span>Requisitos Documentales</span>
            </span>
            <span className="font-mono text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
              Checklist legal de entrega
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DOCUMENTOS_CHECKLIST.map((doc) => {
              const active = Boolean(data[doc.key]);
              const DocIcon = doc.icon;
              return (
                <button
                  key={doc.key}
                  type="button"
                  onClick={() => onChange({ [doc.key]: !active } as Partial<VehiculoWizardData>)}
                  className={`ios-press-bounce rounded-2xl px-4 py-3 border text-left transition flex items-center justify-between gap-3 cursor-pointer ${active
                    ? 'bg-white border-[#111827] text-[#111827] shadow-xs dark:bg-white/15 dark:border-white dark:text-white'
                    : 'bg-[#EDEDED]/40 border-[#9CA3AF]/30 text-[#4B5563] hover:bg-[#EDEDED] dark:bg-white/5 dark:border-white/10 dark:text-[#9CA3AF] dark:hover:bg-white/10'
                    }`}
                >
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <DocIcon
                      className={`h-4 w-4 shrink-0 ${
                        active
                          ? 'text-[#111827] dark:text-white'
                          : 'text-[#4B5563] dark:text-[#9CA3AF]'
                      }`}
                      strokeWidth={WIZARD_ICON_STROKE}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-xs font-semibold">
                      {doc.label}
                    </span>
                  </span>
                  <span
                    className={`h-5 w-5 shrink-0 rounded-lg border flex items-center justify-center text-xs font-bold transition ${active
                      ? 'bg-[#111827] text-white border-[#111827] dark:bg-white dark:text-[#111827] dark:border-white'
                      : 'border-[#9CA3AF]/60 bg-white dark:border-white/20 dark:bg-white/10'
                      }`}
                  >
                    {active && <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />}
                  </span>
                </button>
              );
            })}
          </div>

          {errors.estado && (
            <p className="mt-1 text-xs font-bold text-rose-600 dark:text-rose-400">
              {errors.estado}
            </p>
          )}
        </div>

        {/* Entrada 3: Observaciones */}
        <div className="space-y-2 border-t border-[#EDEDED] dark:border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <label
              htmlFor="textarea-descripcion-patio"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]"
            >
              <FilePenLine
                className="h-3.5 w-3.5 shrink-0 text-[#4B5563] dark:text-[#9CA3AF]"
                strokeWidth={WIZARD_ICON_STROKE}
                aria-hidden="true"
              />
              <span>Observaciones</span>
            </label>
            <span className="font-mono text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
              Opcional
            </span>
          </div>

          <textarea
            id="textarea-descripcion-patio"
            rows={2}
            value={data.descripcion}
            onChange={(e) => onChange({ descripcion: e.target.value })}
            placeholder="Detalles sobre accesorios o especificaciones especiales de patio..."
            className="w-full rounded-2xl bg-[#EDEDED]/50 px-4 py-3 font-sans text-sm text-[#111827] placeholder-[#9CA3AF] border border-transparent focus:border-[#111827] focus:bg-white focus:outline-none transition-all resize-none dark:bg-[#111827] dark:text-[#EDEDED] dark:placeholder-[#9CA3AF]/60 dark:border-white/10 dark:focus:border-white dark:focus:bg-[#111827]"
          />
        </div>
      </div>
    </div>
  );
}
