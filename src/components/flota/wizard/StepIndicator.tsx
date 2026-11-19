import { ArrowLeft } from 'lucide-react';
import type { WizardStepId, WizardStepInfo } from './types';

export interface StepIndicatorProps {
  pasos: WizardStepInfo[];
  pasoActual: WizardStepId;
  pasoMaximoAlcanzado?: number | undefined;
  isTransitioning?: boolean | undefined;
  showReturnToConfirmation?: boolean | undefined;
  onSelectPaso?: ((paso: WizardStepId) => void) | undefined;
  onPrevPaso?: (() => void) | undefined;
  onReturnToConfirmation?: (() => void) | undefined;
  onCancelar?: (() => void) | undefined;
}

export default function StepIndicator({
  pasos,
  pasoActual,
  isTransitioning,
  showReturnToConfirmation,
  onPrevPaso,
  onReturnToConfirmation,
  onCancelar,
}: StepIndicatorProps) {
  const pasoInfo = pasos.find((p) => p.id === pasoActual) ?? pasos[0]!;

  return (
    <header className="w-full select-none">
      {/* HUD Discreto: Botón Atrás + Píldora Mono + Volver a confirmación + Botón Salir */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {pasoActual > 1 && onPrevPaso ? (
            <button
              type="button"
              onClick={onPrevPaso}
              disabled={isTransitioning}
              aria-label="Volver al paso anterior"
              className="fx-press flex h-9 w-9 items-center justify-center rounded-full border border-[#9CA3AF]/60 bg-white text-[#111827] text-sm font-bold hover:bg-[#EDEDED] transition-colors shadow-xs cursor-pointer disabled:opacity-50 dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/20"
            >
              ←
            </button>
          ) : (
            <div className="h-9 w-9" />
          )}

          <span className="rounded-full px-3.5 py-1 font-mono text-xs font-bold tracking-wider uppercase bg-white text-[#111827] border border-[#9CA3AF]/50 shadow-xs dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15">
            PASO 0{pasoActual} / 0{pasos.length} · {pasoInfo.etiquetaCorta}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {showReturnToConfirmation && onReturnToConfirmation && (
            <button
              type="button"
              onClick={onReturnToConfirmation}
              disabled={isTransitioning}
              className="fx-press inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[#111827]/35 bg-white px-3.5 py-1.5 font-display text-xs font-bold text-[#111827] shadow-xs transition-colors hover:bg-[#EDEDED] cursor-pointer disabled:opacity-50 dark:border-white/25 dark:bg-[#1F2937] dark:text-[#EDEDED] dark:hover:bg-white/15"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Volver a la confirmación</span>
            </button>
          )}

          {onCancelar && (
            <button
              type="button"
              onClick={onCancelar}
              aria-label="Cerrar y volver al inventario"
              className="fx-press flex h-9 w-9 items-center justify-center rounded-full border border-[#9CA3AF]/60 bg-white text-[#111827] text-sm font-bold hover:bg-[#EDEDED] transition-colors shadow-xs cursor-pointer dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/20"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
