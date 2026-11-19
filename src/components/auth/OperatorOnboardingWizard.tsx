import { useState, useTransition, type SyntheticEvent } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import {
  Briefcase,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { LocationSelectionFlow } from './LocationSelectionFlow';
import { TwoEnvironmentsTutorial } from './TwoEnvironmentsTutorial';
import {
  CameraPermissionStep,
  type CameraPermissionState,
} from './CameraPermissionStep';
import { formatearUbicacionOperativa } from '@/lib/geo/colombia';

export interface OperatorOnboardingWizardProps {
  nombreOperador: string;
  nombreLocal: string;
  rolOperador: string;
  modoInicial?: 'crear' | 'induccion' | undefined;
}

export default function OperatorOnboardingWizard({
  nombreOperador,
  nombreLocal: initialNombreLocal,
  rolOperador: initialRolOperador,
  modoInicial = 'induccion',
}: OperatorOnboardingWizardProps) {
  const [pasoActual, setPasoActual] = useState<1 | 2 | 3>(1);
  const [cameraState, setCameraState] = useState<CameraPermissionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Estados para creación de nuevo patio
  const [nombrePatio, setNombrePatio] = useState('');
  const [departamentoPatio, setDepartamentoPatio] = useState('');
  const [ciudadPatio, setCiudadPatio] = useState('');
  const [telefonoPatio, setTelefonoPatio] = useState('');
  const [mostrandoFlujoUbicacion, setMostrandoFlujoUbicacion] = useState(false);

  const esModoCrear = modoInicial === 'crear';
  const nombreLocal = esModoCrear ? (nombrePatio.trim() || 'Mi Patio de Alquiler') : initialNombreLocal;
  const rolOperador = esModoCrear ? 'DUEÑO' : initialRolOperador;
  const ubicacionFormateada =
    departamentoPatio && ciudadPatio
      ? formatearUbicacionOperativa(ciudadPatio, departamentoPatio)
      : '';

  const handleProbarCamara = async () => {
    setCameraState('checking');
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        stream.getTracks().forEach((track) => track.stop());
        setCameraState('granted');
      } else {
        setCameraState('unavailable');
      }
    } catch (err) {
      if (
        err instanceof DOMException &&
        (err.name === 'NotFoundError' ||
          err.name === 'DevicesNotFoundError' ||
          err.name === 'NotReadableError' ||
          err.name === 'OverconstrainedError')
      ) {
        setCameraState('unavailable');
      } else {
        setCameraState('denied');
      }
    }
  };

  const handlePaso1Siguiente = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (esModoCrear) {
      if (nombrePatio.trim().length < 3) {
        setErrorMsg('El nombre de tu negocio o patio debe tener al menos 3 caracteres.');
        return;
      }
      if (!departamentoPatio.trim() || !ciudadPatio.trim()) {
        setErrorMsg('Por favor selecciona el departamento y la ciudad donde operará tu flota.');
        return;
      }
    }
    setErrorMsg(null);
    setPasoActual(2);
  };

  const handleFinalizar = () => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        if (esModoCrear) {
          const result = await actions.portal.crearPatioOperativo({
            nombre: nombrePatio.trim(),
            ciudad: formatearUbicacionOperativa(ciudadPatio, departamentoPatio),
            telefono: telefonoPatio.trim() || undefined,
          });

          if (result.error) {
            setErrorMsg(result.error.message || 'No fue posible crear el patio.');
            return;
          }

          if (result.data?.rutaDestino) {
            navigate(result.data.rutaDestino);
          }
        } else {
          const result = await actions.portal.finalizarOnboardingOperativo();

          if (result.error) {
            setErrorMsg(result.error.message || 'No fue posible finalizar la inducción.');
            return;
          }

          if (result.data?.rutaDestino) {
            navigate(result.data.rutaDestino);
          }
        }
      } catch (err) {
        setErrorMsg('Error al conectar con el servidor.');
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:py-10">
      {/* Indicador de Pasos Móvil (oculto en el tutorial interactivo para evitar doble indicador) */}
      {pasoActual !== 2 && (
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1.5 rounded-full transition-colors duration-200 ${
                  step === pasoActual
                    ? 'w-8 bg-[#111827] dark:bg-[#EDEDED]'
                    : step < pasoActual
                    ? 'w-4 bg-[#4B5563] dark:bg-[#9CA3AF]'
                    : 'w-4 bg-[#D1D5DB] dark:bg-white/15'
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wide text-[var(--fx-text-secondary)]">
            Paso {pasoActual} de 3
          </span>
        </div>
      )}

      {/* Contenedor Principal */}
      <div className="rounded-[28px] border border-[var(--fx-border-card)] bg-[var(--fx-bg-surface)] p-6 shadow-lg sm:p-8 dark:border-white/10 dark:bg-[#111827]/90 dark:backdrop-blur-xl dark:shadow-2xl">
        {/* PASO 1: Creación de Patio o Bienvenida de Equipo */}
        {pasoActual === 1 && esModoCrear && mostrandoFlujoUbicacion ? (
          <LocationSelectionFlow
            initialDepartamento={departamentoPatio}
            initialCiudad={ciudadPatio}
            onComplete={(depto, city) => {
              setDepartamentoPatio(depto);
              setCiudadPatio(city);
              setErrorMsg(null);
              setMostrandoFlujoUbicacion(false);
            }}
            onCancel={(depto, city) => {
              if (depto) setDepartamentoPatio(depto);
              if (city || depto !== departamentoPatio) setCiudadPatio(city);
              setMostrandoFlujoUbicacion(false);
            }}
          />
        ) : null}

        {pasoActual === 1 && !(esModoCrear && mostrandoFlujoUbicacion) && (
          <form onSubmit={handlePaso1Siguiente} className="space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-[#EDEDED] dark:border dark:border-white/15 dark:bg-[#1F2937]">
              <Users className="h-6 w-6 stroke-[1.75]" aria-hidden="true" />
            </div>

            {esModoCrear ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--fx-text-primary)] dark:bg-white/6">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Rol: Dueño del patio</span>
                  </span>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--fx-text-primary)] sm:text-3xl">
                    Alquila tus vehículos
                  </h1>
                  <p className="text-sm leading-relaxed text-[var(--fx-text-secondary)]">
                    Configura tu sede o negocio de alquiler. Podrás publicar vehículos, fijar tarifas y gestionar clientes.
                  </p>
                </div>

                <div className="space-y-3.5 pt-2">
                  <div>
                    <label htmlFor="nombrePatio" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fx-text-secondary)]">
                      Nombre de tu patio o negocio *
                    </label>
                    <input
                      id="nombrePatio"
                      type="text"
                      required
                      placeholder="Ej. Rentas del Valle, Flota Express..."
                      value={nombrePatio}
                      onChange={(e) => setNombrePatio(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-input)] px-4 py-3.5 text-base text-[var(--fx-text-primary)] placeholder:text-[var(--fx-text-muted)] transition-colors duration-120 focus:border-[var(--fx-border-focus)] dark:bg-[#1F2937]/70"
                    />
                  </div>

                  <div>
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fx-text-secondary)]">
                      Ubicación de operación *
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setMostrandoFlujoUbicacion(true);
                      }}
                      className="fx-press flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-input)] px-4 py-3.5 text-left transition-colors duration-120 hover:border-[var(--fx-border-focus)] dark:bg-[#1F2937]/70"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <MapPin
                          className={`h-4 w-4 shrink-0 ${
                            ubicacionFormateada
                              ? 'text-[var(--fx-text-primary)]'
                              : 'text-[var(--fx-text-muted)]'
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          className={`truncate text-base ${
                            ubicacionFormateada
                              ? 'font-semibold text-[var(--fx-text-primary)]'
                              : 'text-[var(--fx-text-muted)]'
                          }`}
                        >
                          {ubicacionFormateada || 'Seleccionar departamento y ciudad'}
                        </span>
                      </span>
                      <ChevronRight
                        className="h-5 w-5 shrink-0 text-[var(--fx-text-muted)]"
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <div>
                    <label htmlFor="telefonoPatio" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--fx-text-secondary)]">
                      Teléfono de contacto de la sede (opcional)
                    </label>
                    <input
                      id="telefonoPatio"
                      type="tel"
                      placeholder="Ej. +57 300 123 4567"
                      value={telefonoPatio}
                      onChange={(e) => setTelefonoPatio(e.target.value)}
                      className="w-full rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-input)] px-4 py-3.5 text-base text-[var(--fx-text-primary)] placeholder:text-[var(--fx-text-muted)] transition-colors duration-120 focus:border-[var(--fx-border-focus)] dark:bg-[#1F2937]/70"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] px-3 py-1 text-xs font-semibold text-[var(--fx-text-primary)] dark:bg-white/6">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{nombreLocal}</span>
                  </span>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--fx-text-primary)] sm:text-3xl">
                    ¡Bienvenido al equipo, {nombreOperador}!
                  </h1>
                  <p className="text-sm leading-relaxed text-[var(--fx-text-secondary)]">
                    Has sido asignado a esta sede con el rol de{' '}
                    <strong className="font-semibold text-[var(--fx-text-primary)]">{rolOperador}</strong>.
                  </p>
                </div>

                <div className="space-y-2 rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] p-4 text-xs text-[var(--fx-text-secondary)] dark:bg-[#1F2937]/50">
                  <div className="flex items-center gap-2 font-semibold text-[var(--fx-text-primary)]">
                    <Briefcase className="h-4 w-4" aria-hidden="true" />
                    <span>Tus responsabilidades principales:</span>
                  </div>
                  <ul className="list-disc space-y-1.5 pl-5">
                    <li>Gestión de solicitudes de alquiler y verificación de conductores.</li>
                    <li>Registros fotográficos de entrega y devolución para documentar cada vehículo.</li>
                    <li>Monitoreo del estado físico y kilometraje de la flota de vehículos.</li>
                  </ul>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-300">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="fx-press fx-btn-primary flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold shadow-sm"
            >
              <span>Continuar</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        )}

        {/* PASO 2: Tutorial Interactivo "Dos entornos, una sola cuenta" */}
        {pasoActual === 2 && (
          <TwoEnvironmentsTutorial
            onBackToStep1={() => setPasoActual(1)}
            onComplete={() => setPasoActual(3)}
          />
        )}

        {/* PASO 3: Permisos de Cámara */}
        {pasoActual === 3 && (
          <CameraPermissionStep
            cameraState={cameraState}
            isPending={isPending}
            esModoCrear={esModoCrear}
            errorMsg={errorMsg}
            onRequestCamera={handleProbarCamara}
            onBack={() => setPasoActual(2)}
            onFinish={handleFinalizar}
          />
        )}
      </div>
    </div>
  );
}
