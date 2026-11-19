import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LocationOptionSelectorModal } from '@/components/ui/LocationOptionSelectorModal';
import {
  DEPARTAMENTOS_COLOMBIA,
  obtenerCiudadesPorDepartamento,
} from '@/lib/geo/colombia';

export type LocationStep = 'departamento' | 'ciudad' | 'completada';

export interface LocationSelectionFlowProps {
  initialDepartamento?: string;
  initialCiudad?: string;
  initialStep?: LocationStep;
  onComplete: (departamento: string, ciudad: string) => void;
  onCancel: (departamento: string, ciudad: string) => void;
}

/**
 * Flujo progresivo de selección de ubicación en Colombia (Departamento -> Ciudad -> Confirmación).
 * Reemplaza el campo plano «Ciudad de operación» con estética iOS sobria y paleta canónica FlotaX.
 */
export function LocationSelectionFlow({
  initialDepartamento = '',
  initialCiudad = '',
  initialStep,
  onComplete,
  onCancel,
}: LocationSelectionFlowProps) {
  const [step, setStep] = useState<LocationStep>(
    initialStep ??
      (initialDepartamento && initialCiudad
        ? 'completada'
        : initialDepartamento
          ? 'ciudad'
          : 'departamento')
  );
  const [departamento, setDepartamento] = useState(initialDepartamento);
  const [ciudad, setCiudad] = useState(initialCiudad);
  const [selectorOpen, setSelectorOpen] = useState<'departamento' | 'ciudad' | null>(null);

  const departamentosList = useMemo(
    () => DEPARTAMENTOS_COLOMBIA.map((d) => d.nombre),
    []
  );

  const ciudadesList = useMemo(
    () => (departamento ? obtenerCiudadesPorDepartamento(departamento) : []),
    [departamento]
  );

  const handleSelectDepartamento = (nuevoDepto: string) => {
    if (nuevoDepto !== departamento) {
      setDepartamento(nuevoDepto);
      setCiudad('');
    }
  };

  const handleSelectCiudad = (nuevaCiudad: string) => {
    setCiudad(nuevaCiudad);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado superior con icono limpio sin recuadro */}
      <div className="flex flex-col items-center pt-1 text-center">
        <div className="mb-4 text-[#111827] dark:text-[#EDEDED]" aria-hidden="true">
          {step === 'completada' ? (
            <CheckCircle2 className="h-12 w-12 stroke-[1.75]" />
          ) : (
            <MapPin className="h-12 w-12 stroke-[1.75]" />
          )}
        </div>

        {step === 'departamento' && (
          <>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--fx-text-primary)] sm:text-[28px]">
              Elige tu departamento
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--fx-text-secondary)]">
              Selecciona el departamento donde operará tu flota para ofrecerte una mejor experiencia
            </p>
          </>
        )}

        {step === 'ciudad' && (
          <>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--fx-text-primary)] sm:text-[28px]">
              Elige tu ciudad
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--fx-text-secondary)]">
              Selecciona la ciudad donde estará ubicada tu flota
            </p>
          </>
        )}

        {step === 'completada' && (
          <>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--fx-text-primary)] sm:text-[28px]">
              Ubicación de tu flota
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--fx-text-secondary)]">
              Verifica tu departamento y ciudad. Puedes regresar a cualquiera de los pasos para modificarlos.
            </p>
          </>
        )}
      </div>

      {/* Pantalla 1: Seleccionar departamento */}
      {step === 'departamento' && (
        <div className="space-y-5">
          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fx-text-secondary)]">
              Departamento *
            </span>
            <button
              type="button"
              onClick={() => setSelectorOpen('departamento')}
              className="fx-press flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-input)] px-4 py-3.5 text-left transition-colors duration-120 hover:border-[var(--fx-border-focus)] dark:bg-[#1F2937]/70"
            >
              <span
                className={`truncate text-base ${
                  departamento
                    ? 'font-semibold text-[var(--fx-text-primary)]'
                    : 'text-[var(--fx-text-muted)]'
                }`}
              >
                {departamento || 'Seleccionar departamento'}
              </span>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-[var(--fx-text-muted)]"
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            <Button
              variant="primary"
              size="lg"
              disabled={!departamento}
              onClick={() => setStep('ciudad')}
              className="w-full rounded-2xl"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Button
              variant="ghost"
              size="md"
              onClick={() => onCancel(departamento, ciudad)}
              className="w-full rounded-2xl text-[var(--fx-text-secondary)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Volver al formulario</span>
            </Button>
          </div>
        </div>
      )}

      {/* Pantalla 2: Seleccionar ciudad */}
      {step === 'ciudad' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] px-4 py-3 text-xs dark:bg-[#1F2937]/50">
            <span className="text-[var(--fx-text-secondary)]">
              Departamento:{' '}
              <strong className="font-semibold text-[var(--fx-text-primary)]">
                {departamento}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setStep('departamento')}
              className="fx-press font-semibold text-[var(--fx-text-primary)] underline underline-offset-2 hover:opacity-80"
            >
              Cambiar
            </button>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fx-text-secondary)]">
              Ciudad o municipio *
            </span>
            <button
              type="button"
              onClick={() => setSelectorOpen('ciudad')}
              className="fx-press flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-input)] px-4 py-3.5 text-left transition-colors duration-120 hover:border-[var(--fx-border-focus)] dark:bg-[#1F2937]/70"
            >
              <span
                className={`truncate text-base ${
                  ciudad
                    ? 'font-semibold text-[var(--fx-text-primary)]'
                    : 'text-[var(--fx-text-muted)]'
                }`}
              >
                {ciudad || 'Seleccionar ciudad'}
              </span>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-[var(--fx-text-muted)]"
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            <Button
              variant="primary"
              size="lg"
              disabled={!ciudad}
              onClick={() => setStep('completada')}
              className="w-full rounded-2xl"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Button
              variant="ghost"
              size="md"
              onClick={() => setStep('departamento')}
              className="w-full rounded-2xl text-[var(--fx-text-secondary)]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Cambiar departamento</span>
            </Button>
          </div>
        </div>
      )}

      {/* Pantalla 3: Ubicación completada (estilo iOS grouped list) */}
      {step === 'completada' && (
        <div className="space-y-5">
          <div className="divide-y divide-[var(--fx-border-subtle)] overflow-hidden rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] dark:bg-[#1F2937]/55">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fx-text-muted)]">
                  Departamento
                </p>
                <p className="mt-0.5 truncate text-base font-semibold text-[var(--fx-text-primary)]">
                  {departamento}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('departamento')}
                className="shrink-0 rounded-xl"
              >
                Editar
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fx-text-muted)]">
                  Ciudad o municipio
                </p>
                <p className="mt-0.5 truncate text-base font-semibold text-[var(--fx-text-primary)]">
                  {ciudad}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('ciudad')}
                className="shrink-0 rounded-xl"
              >
                Editar
              </Button>
            </div>
          </div>

          <div className="pt-1">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onComplete(departamento, ciudad)}
              className="w-full rounded-2xl"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Selector modal compartido para Departamento y Ciudad */}
      <LocationOptionSelectorModal
        isOpen={selectorOpen === 'departamento'}
        title="Seleccionar departamento"
        searchPlaceholder="Buscar departamento"
        emptyMessage="No encontramos ningún departamento con ese nombre."
        options={departamentosList}
        selectedValue={departamento}
        optionVariant="department"
        onSelect={handleSelectDepartamento}
        onClose={() => setSelectorOpen(null)}
      />

      <LocationOptionSelectorModal
        isOpen={selectorOpen === 'ciudad'}
        title="Seleccionar ciudad"
        searchPlaceholder="Buscar ciudad"
        emptyMessage="No encontramos ninguna ciudad con ese nombre en este departamento."
        options={ciudadesList}
        selectedValue={ciudad}
        optionVariant="city"
        onSelect={handleSelectCiudad}
        onClose={() => setSelectorOpen(null)}
      />
    </div>
  );
}

export default LocationSelectionFlow;
