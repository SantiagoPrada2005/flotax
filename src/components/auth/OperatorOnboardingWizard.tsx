import { useState, useTransition, type SyntheticEvent } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';

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
  const [cameraState, setCameraState] = useState<'idle' | 'checking' | 'granted' | 'denied'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Estados para creación de nuevo patio
  const [nombrePatio, setNombrePatio] = useState('');
  const [ciudadPatio, setCiudadPatio] = useState('');
  const [telefonoPatio, setTelefonoPatio] = useState('');

  const esModoCrear = modoInicial === 'crear';
  const nombreLocal = esModoCrear ? (nombrePatio.trim() || 'Mi Patio de Alquiler') : initialNombreLocal;
  const rolOperador = esModoCrear ? 'DUEÑO' : initialRolOperador;

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
        setCameraState('denied');
      }
    } catch (err) {
      setCameraState('denied');
    }
  };

  const handlePaso1Siguiente = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (esModoCrear) {
      if (nombrePatio.trim().length < 3) {
        setErrorMsg('El nombre de tu negocio o patio debe tener al menos 3 caracteres.');
        return;
      }
      if (ciudadPatio.trim().length < 2) {
        setErrorMsg('Por favor ingresa la ciudad donde operará tu flota.');
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
            ciudad: ciudadPatio.trim(),
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
      {/* Indicador de Pasos Móvil */}
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === pasoActual
                  ? 'w-8 bg-[#111827]'
                  : step < pasoActual
                  ? 'w-4 bg-[#4B5563]'
                  : 'w-4 bg-[#EDEDED]'
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-xs font-semibold uppercase text-[#4B5563]">
          Paso {pasoActual} de 3
        </span>
      </div>

      {/* Contenedor Principal */}
      <div className="rounded-[28px] bg-white p-6 sm:p-8 border border-[#9CA3AF]/30 shadow-lg">
        {/* PASO 1: Creación de Patio o Bienvenida de Equipo */}
        {pasoActual === 1 && (
          <form onSubmit={handlePaso1Siguiente} className="space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>

            {esModoCrear ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#111827]/5 px-3 py-1 text-xs font-bold text-[#111827]">
                    ⭐ Rol: DUEÑO DEL PATIO
                  </span>
                  <h1 className="font-display text-2xl font-black text-[#111827] sm:text-3xl">
                    Alquila tus vehículos
                  </h1>
                  <p className="text-sm text-[#4B5563]">
                    Configura tu sede o negocio de alquiler. Podrás publicar vehículos, fijar tarifas y gestionar clientes.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label htmlFor="nombrePatio" className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                      Nombre de tu patio o negocio *
                    </label>
                    <input
                      id="nombrePatio"
                      type="text"
                      required
                      placeholder="Ej. Rentas del Valle, Flota Express..."
                      value={nombrePatio}
                      onChange={(e) => setNombrePatio(e.target.value)}
                      className="w-full rounded-2xl border border-[#9CA3AF]/40 px-4 py-3.5 text-base text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#111827] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label htmlFor="ciudadPatio" className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                      Ciudad de operación *
                    </label>
                    <input
                      id="ciudadPatio"
                      type="text"
                      required
                      placeholder="Ej. Medellín, Bogotá, Cali..."
                      value={ciudadPatio}
                      onChange={(e) => setCiudadPatio(e.target.value)}
                      className="w-full rounded-2xl border border-[#9CA3AF]/40 px-4 py-3.5 text-base text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#111827] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label htmlFor="telefonoPatio" className="block text-xs font-bold uppercase tracking-wider text-[#4B5563] mb-1">
                      Teléfono de contacto de la sede (opcional)
                    </label>
                    <input
                      id="telefonoPatio"
                      type="tel"
                      placeholder="Ej. +57 300 123 4567"
                      value={telefonoPatio}
                      onChange={(e) => setTelefonoPatio(e.target.value)}
                      className="w-full rounded-2xl border border-[#9CA3AF]/40 px-4 py-3.5 text-base text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#111827] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#111827]/5 px-3 py-1 text-xs font-bold text-[#111827]">
                    📍 {nombreLocal}
                  </span>
                  <h1 className="font-display text-2xl font-black text-[#111827] sm:text-3xl">
                    ¡Bienvenido al equipo, {nombreOperador}!
                  </h1>
                  <p className="text-sm text-[#4B5563] leading-relaxed">
                    Has sido asignado a esta sede con el rol de{' '}
                    <strong className="text-[#111827] font-semibold">{rolOperador}</strong>.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F9FAFB] p-4 border border-[#9CA3AF]/20 space-y-2 text-xs text-[#4B5563]">
                  <div className="flex items-center gap-2 font-medium text-[#111827]">
                    <span>🛠️</span>
                    <span>Tus responsabilidades principales:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>Gestión de solicitudes de alquiler y verificación de conductores.</li>
                    <li>Actas de entrega y devolución con peritaje fotográfico en Cloudflare R2.</li>
                    <li>Monitoreo del estado físico y kilometraje de la flota de vehículos.</li>
                  </ul>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-xl bg-red-50 p-2.5 text-xs font-medium text-red-700 border border-red-200">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="ios-press-bounce flex w-full items-center justify-center gap-2 rounded-2xl bg-[#111827] py-4 text-base font-bold text-white shadow-md hover:bg-[#1F2937]"
            >
              <span>Continuar</span>
              <span>→</span>
            </button>
          </form>
        )}

        {/* PASO 2: Modelo Mental de 2 Entornos */}
        {pasoActual === 2 && (
          <div className="space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="8" x2="16" y1="21" y2="21" />
                <line x1="12" x2="12" y1="17" y2="21" />
              </svg>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                Paradigma FlotaX
              </span>
              <h2 className="font-display text-2xl font-black text-[#111827] sm:text-3xl">
                Dos entornos, una sola cuenta
              </h2>
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Podrás alternar en cualquier momento entre alquilar vehículos para tu uso personal y gestionar tu negocio de patio.
              </p>
            </div>

            {/* Comparativa Visual */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-[#9CA3AF]/30 p-4 space-y-2 bg-[#F9FAFB]">
                <div className="font-bold text-[#111827] flex items-center gap-1.5">
                  <span>🚗</span>
                  <span>Modo Personal</span>
                </div>
                <p className="text-[#4B5563]">
                  Para cuando tú quieras alquilar un auto o moto para tus viajes personales.
                </p>
              </div>

              <div className="rounded-2xl border-2 border-[#111827] p-4 space-y-2 bg-white shadow-xs">
                <div className="font-bold text-[#111827] flex items-center gap-1.5">
                  <span>🛠️</span>
                  <span>Modo Operador / Dueño</span>
                </div>
                <p className="text-[#4B5563]">
                  Tu cabina de patio: control de reservas, actas periciales, cobros y flota de clientes.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#EDEDED]/50 p-3.5 text-xs text-[#4B5563] flex items-center gap-2.5">
              <span className="text-base">💡</span>
              <span>Alterna entre ambos entornos cuando quieras desde <strong>Mi Perfil</strong>.</span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPasoActual(1)}
                className="ios-press-bounce flex w-1/3 items-center justify-center rounded-2xl border border-[#9CA3AF]/40 py-4 text-base font-semibold text-[#4B5563] hover:bg-neutral-50"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => setPasoActual(3)}
                className="ios-press-bounce flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#111827] py-4 text-base font-bold text-white shadow-md hover:bg-[#1F2937]"
              >
                <span>Continuar</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Permisos de Cámara para Peritaje R2 */}
        {pasoActual === 3 && (
          <div className="space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                Herramienta Crítica
              </span>
              <h2 className="font-display text-2xl font-black text-[#111827] sm:text-3xl">
                Cámara para Peritajes Fotográficos
              </h2>
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Toda entrega y devolución requiere evidencia visual obligatoria en Cloudflare R2 para proteger tu negocio y respaldar depósitos en garantía.
              </p>
            </div>

            {/* Estado de Cámara */}
            <div className="rounded-2xl border border-[#9CA3AF]/30 p-4 space-y-3 bg-[#F9FAFB]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111827]">Acceso a la cámara</span>
                {cameraState === 'granted' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    ✓ Autorizado
                  </span>
                )}
                {cameraState === 'denied' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    Pendiente
                  </span>
                )}
                {cameraState === 'idle' && (
                  <span className="text-xs text-[#4B5563]">Sin verificar</span>
                )}
              </div>

              {cameraState !== 'granted' ? (
                <button
                  type="button"
                  onClick={handleProbarCamara}
                  disabled={cameraState === 'checking'}
                  className="ios-press-bounce flex w-full items-center justify-center gap-2 rounded-xl bg-white border border-[#9CA3AF]/40 py-3 text-xs font-bold text-[#111827] shadow-xs hover:bg-[#EDEDED]/50"
                >
                  {cameraState === 'checking' ? (
                    'Solicitando permiso...'
                  ) : (
                    <>
                      <span>📸</span>
                      <span>Autorizar cámara ahora</span>
                    </>
                  )}
                </button>
              ) : (
                <p className="text-xs text-emerald-700">
                  ¡Excelente! Tu dispositivo está listo para realizar inspecciones de 360° en patio.
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPasoActual(2)}
                disabled={isPending}
                className="ios-press-bounce flex w-1/3 items-center justify-center rounded-2xl border border-[#9CA3AF]/40 py-4 text-base font-semibold text-[#4B5563] hover:bg-neutral-50 disabled:opacity-50"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={isPending}
                className="ios-press-bounce flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#111827] py-4 text-base font-bold text-white shadow-md hover:bg-[#1F2937] disabled:opacity-50"
              >
                {isPending ? (
                  <span>Configurando tu patio...</span>
                ) : (
                  <>
                    <span>{esModoCrear ? 'Crear Patio y Comenzar' : 'Entrar a Cabina de Patio'}</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
