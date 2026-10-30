import type { WizardStepId, WizardStepInfo } from './types';

export interface StepIndicatorProps {
  pasos: WizardStepInfo[];
  pasoActual: WizardStepId;
  pasoMaximoAlcanzado?: number | undefined;
  isTransitioning?: boolean | undefined;
  onSelectPaso?: ((paso: WizardStepId) => void) | undefined;
  onPrevPaso?: (() => void) | undefined;
  onCancelar?: (() => void) | undefined;
}

export default function StepIndicator({
  pasos,
  pasoActual,
  isTransitioning,
  onPrevPaso,
  onCancelar,
}: StepIndicatorProps) {
  const pasoInfo = pasos.find((p) => p.id === pasoActual) ?? pasos[0]!;

  return (
    <header className="w-full select-none">
      {/* HUD Discreto: Botón Atrás + Píldora Mono + Botón Salir */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {pasoActual > 1 && onPrevPaso ? (
            <button
              type="button"
              onClick={onPrevPaso}
              disabled={isTransitioning}
              aria-label="Volver al paso anterior"
              className="ios-press-bounce flex h-9 w-9 items-center justify-center rounded-full border border-[#9CA3AF]/60 bg-white text-[#111827] text-sm font-bold hover:bg-[#EDEDED] transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              ←
            </button>
          ) : (
            <div className="h-9 w-9" />
          )}

          <span className="rounded-full px-3.5 py-1 font-mono text-xs font-bold tracking-wider uppercase bg-white text-[#111827] border border-[#9CA3AF]/50 shadow-xs">
            PASO 0{pasoActual} / 0{pasos.length} · {pasoInfo.etiquetaCorta}
          </span>
        </div>

        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            aria-label="Cerrar y volver al inventario"
            className="ios-press-bounce flex h-9 w-9 items-center justify-center rounded-full border border-[#9CA3AF]/60 bg-white text-[#111827] text-sm font-bold hover:bg-[#EDEDED] transition shadow-xs cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
    </header>
  );
}
