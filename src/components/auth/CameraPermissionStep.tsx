import {
  AlertCircle,
  Camera,
  Car,
  Check,
  ChevronRight,
  Settings,
} from 'lucide-react';

export type CameraPermissionState =
  | 'idle'
  | 'checking'
  | 'granted'
  | 'denied'
  | 'unavailable';

export interface CameraPermissionStepProps {
  cameraState: CameraPermissionState;
  isPending: boolean;
  esModoCrear: boolean;
  errorMsg: string | null;
  onRequestCamera: () => void;
  onBack: () => void;
  onFinish: () => void;
}

/**
 * Paso 3 del onboarding: explicación práctica del uso de la cámara con representación visual
 * y solicitud explícita de permiso sin bloquear la creación de la flota.
 */
export function CameraPermissionStep({
  cameraState,
  isPending,
  esModoCrear,
  errorMsg,
  onRequestCamera,
  onBack,
  onFinish,
}: CameraPermissionStepProps) {
  return (
    <div className="space-y-6">
      {/* Representación visual estática de captura de vehículo en FlotaX */}
      <div className="rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface)]">
              <Car
                className="h-7 w-7 text-[var(--fx-text-primary)]"
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-[var(--fx-text-primary)]">
                Captura rápida de vehículo
              </p>
              <p className="text-xs text-[var(--fx-text-secondary)]">
                Fotografía unidades y entregas
              </p>
            </div>
          </div>

          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface)] text-[var(--fx-text-primary)]"
            aria-hidden="true"
          >
            <Camera className="h-4 w-4" />
          </span>
        </div>
      </div>

      {/* Título y explicación práctica */}
      <div className="space-y-2 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--fx-text-primary)] sm:text-[26px]">
          Tu cámara, lista para trabajar
        </h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--fx-text-secondary)]">
          Utiliza la cámara para fotografiar tus vehículos y registrar imágenes durante las inspecciones. Así tendrás un mejor control visual de tu flota.
        </p>
      </div>

      {/* Solicitud explícita de permiso y estados */}
      <div className="space-y-3">
        {cameraState === 'granted' && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500 dark:text-[#111827]">
              <Check className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
            </span>
            <span>Acceso a la cámara habilitado. Ya puedes tomar fotos cuando lo necesites.</span>
          </div>
        )}

        {cameraState === 'denied' && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
            <Settings className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold">Permiso de cámara desactivado</p>
              <p className="leading-relaxed opacity-90">
                Puedes continuar sin problema y habilitarlo más adelante desde los ajustes de permisos de tu navegador.
              </p>
            </div>
          </div>
        )}

        {cameraState === 'unavailable' && (
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] px-4 py-3 text-xs text-[var(--fx-text-secondary)] dark:bg-[#1F2937]/60">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--fx-text-primary)]" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-[var(--fx-text-primary)]">
                Cámara no disponible en este dispositivo
              </p>
              <p className="leading-relaxed">
                Puedes continuar con la creación de tu flota y tomar fotografías desde otro dispositivo cuando lo necesites.
              </p>
            </div>
          </div>
        )}

        {cameraState !== 'granted' && cameraState !== 'unavailable' && (
          <button
            type="button"
            onClick={onRequestCamera}
            disabled={cameraState === 'checking'}
            className="fx-press fx-btn-outline flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold shadow-2xs disabled:opacity-40"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            <span>
              {cameraState === 'checking'
                ? 'Solicitando permiso...'
                : 'Permitir acceso a la cámara'}
            </span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Navegación inferior: nunca bloquea la creación de la flota */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="fx-press fx-btn-outline flex min-h-[52px] w-1/3 items-center justify-center rounded-2xl py-4 text-base font-semibold disabled:opacity-40"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={isPending}
          className="fx-press fx-btn-primary flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold shadow-sm disabled:opacity-40"
        >
          {isPending ? (
            <span>Configurando tu patio...</span>
          ) : (
            <>
              <span>{esModoCrear ? 'Crear Patio' : 'Entrar a Cabina de Patio'}</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default CameraPermissionStep;
