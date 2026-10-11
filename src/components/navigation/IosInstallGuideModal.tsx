import { useEffect, useRef, useState } from 'react';

export interface IosInstallGuideModalProps {
  readonly isOpen: boolean;
  readonly isTopRightShare: boolean;
  readonly hasDeferredPrompt: boolean;
  readonly isInstalling: boolean;
  readonly onClose: () => void;
  readonly onPrimaryInstallClick: () => void;
}

interface InstallVideoStep {
  readonly id: 1 | 2 | 3;
  readonly shortTabLabel: string;
  readonly badgeText: string;
  readonly videoSrc: string;
  readonly posterSrc: string;
  readonly titleEsEn: string;
  readonly instructionText: string;
  readonly highlightPill: string;
  readonly minLoopsBeforeAdvance: number;
}

const IOS_INSTALL_STEPS: readonly [
  InstallVideoStep,
  InstallVideoStep,
  InstallVideoStep,
] = [
  {
    id: 1,
    shortTabLabel: 'Menú y Share',
    badgeText: 'Paso 1 de 3 · En la barra de abajo',
    videoSrc: '/instructions/ios-step-1-share.mp4',
    posterSrc: '/instructions/ios-step-1-poster.jpg',
    titleEsEn: 'Toca [≡] abajo y elige Compartir (Share)',
    instructionText:
      'En la barra inferior de Safari, toca el ícono de menú [≡] y luego toca "Share" o "Compartir".',
    highlightPill: 'Share / Compartir',
    minLoopsBeforeAdvance: 2,
  },
  {
    id: 2,
    shortTabLabel: 'Agregar a inicio',
    badgeText: 'Paso 2 de 3 · En la hoja de compartir',
    videoSrc: '/instructions/ios-step-2-home.mp4',
    posterSrc: '/instructions/ios-step-2-poster.jpg',
    titleEsEn: 'Toca Ver más (∨) y Agregar a inicio',
    instructionText:
      'Toca el círculo "View More / Ver más" (∨) o desliza hacia arriba y selecciona "[+] Add to Home Screen / Agregar a inicio".',
    highlightPill: '+ Add to Home Screen',
    minLoopsBeforeAdvance: 1,
  },
  {
    id: 3,
    shortTabLabel: 'Tocar Add',
    badgeText: 'Paso 3 de 3 · Confirmar arriba',
    videoSrc: '/instructions/ios-step-3-add.mp4',
    posterSrc: '/instructions/ios-step-3-poster.jpg',
    titleEsEn: 'Toca Agregar (Add) arriba a la derecha',
    instructionText:
      'Presiona el botón "Add / Agregar" en la esquina superior derecha. ¡FlotaX quedará instalada en tu pantalla de inicio!',
    highlightPill: 'Add / Agregar',
    minLoopsBeforeAdvance: 1,
  },
];

export default function IosInstallGuideModal({
  isOpen,
  isTopRightShare,
  hasDeferredPrompt,
  isInstalling,
  onClose,
  onPrimaryInstallClick,
}: IosInstallGuideModalProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [pointerPulse, setPointerPulse] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const loopCountRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleMotionChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    mediaQuery.addEventListener('change', handleMotionChange);
    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setActiveStepIndex(0);
      setAutoAdvance(true);
      setIsZoomed(false);
      setVideoProgress(0);
      loopCountRef.current = 0;
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight') {
        setAutoAdvance(false);
        setActiveStepIndex((prev) => (prev + 1) % IOS_INSTALL_STEPS.length);
      } else if (event.key === 'ArrowLeft') {
        setAutoAdvance(false);
        setActiveStepIndex(
          (prev) => (prev - 1 + IOS_INSTALL_STEPS.length) % IOS_INSTALL_STEPS.length
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!pointerPulse) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setPointerPulse(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, [pointerPulse]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    loopCountRef.current = 0;
    setVideoProgress(0);

    const videoEl = videoRef.current;
    if (!videoEl) {
      return;
    }
    videoEl.currentTime = 0;
    if (!prefersReducedMotion) {
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Ignorar bloqueo de autoplay en modo ahorro de batería extremo
        });
      }
    }
  }, [activeStepIndex, isOpen, prefersReducedMotion]);

  if (!isOpen) {
    return null;
  }

  const currentStep = IOS_INSTALL_STEPS[activeStepIndex] ?? IOS_INSTALL_STEPS[0];

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignorar si el dispositivo no soporta vibración
      }
    }
  };

  const handleSelectStep = (index: number) => {
    triggerHaptic();
    setAutoAdvance(false);
    setActiveStepIndex(index);
  };

  const handleNextStep = () => {
    triggerHaptic();
    setAutoAdvance(false);
    setActiveStepIndex((prev) => (prev + 1) % IOS_INSTALL_STEPS.length);
  };

  const handlePrevStep = () => {
    triggerHaptic();
    setAutoAdvance(false);
    setActiveStepIndex(
      (prev) => (prev - 1 + IOS_INSTALL_STEPS.length) % IOS_INSTALL_STEPS.length
    );
  };

  const handleVideoTimeUpdate = () => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoEl.duration || Number.isNaN(videoEl.duration)) {
      return;
    }
    const totalLoops = autoAdvance ? currentStep.minLoopsBeforeAdvance : 1;
    const completedFraction =
      (loopCountRef.current + videoEl.currentTime / videoEl.duration) / totalLoops;
    setVideoProgress(Math.min(100, Math.max(0, Math.round(completedFraction * 100))));
  };

  const handleVideoEnded = () => {
    const videoEl = videoRef.current;
    loopCountRef.current += 1;

    if (autoAdvance && loopCountRef.current >= currentStep.minLoopsBeforeAdvance) {
      loopCountRef.current = 0;
      setVideoProgress(0);
      setActiveStepIndex((prev) => (prev + 1) % IOS_INSTALL_STEPS.length);
      return;
    }

    if (videoEl) {
      videoEl.currentTime = 0;
      void videoEl.play().catch(() => {});
    }
  };

  const triggerNudgePointer = () => {
    triggerHaptic();
    setPointerPulse(true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="flotax-install-sheet-title"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-[#111827]/80 backdrop-blur-xs p-2.5 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      {/* Puntero Espacial Superior Derecho (Para Chrome en iPhone o iPad) */}
      {isTopRightShare && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`fixed top-2 right-3 z-50 flex flex-col items-end animate-float ${
            pointerPulse ? 'scale-110' : ''
          } transition-transform`}
        >
          <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </div>
          <div className="mt-1 flex items-center gap-2 rounded-full bg-[#111827] border-2 border-[#EDEDED] px-3.5 py-1.5 text-xs font-extrabold text-[#EDEDED] shadow-2xl">
            <span>1. Toca</span>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#EDEDED] text-[#111827]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                className="h-3.5 w-3.5"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </span>
            <span>aquí arriba</span>
          </div>
        </div>
      )}

      {/* Tarjeta Principal con Video Guiado Paso a Paso */}
      <div
        className="w-full max-w-sm rounded-[28px] bg-[#EDEDED] border border-[#9CA3AF] p-3.5 sm:p-4 text-[#111827] shadow-2xl space-y-2.5 mb-20 sm:mb-0 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#111827] text-[#EDEDED] shadow-xs">
              <span className="font-display text-base font-black">
                F<span className="text-[#9CA3AF]">.</span>
              </span>
            </div>
            <div className="min-w-0">
              <h2
                id="flotax-install-sheet-title"
                className="truncate font-display text-sm sm:text-base font-black tracking-tight text-[#111827]"
              >
                Instalar FlotaX en tu iPhone
              </h2>
              <p className="text-[11px] font-medium text-[#4B5563]">
                Sigue este video paso a paso en tu barra de abajo:
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar guía de instalación"
            className="ios-press-bounce flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white border border-[#9CA3AF]/60 text-[#4B5563] hover:text-[#111827] cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="h-4 w-4"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {hasDeferredPrompt ? (
          <button
            type="button"
            onClick={onPrimaryInstallClick}
            disabled={isInstalling}
            className="ios-press-bounce w-full min-h-[48px] rounded-full bg-[#111827] px-5 py-3 text-sm font-extrabold text-[#EDEDED] shadow-md hover:bg-[#1F2937] transition cursor-pointer"
          >
            {isInstalling ? 'Instalando...' : 'Instalar ahora'}
          </button>
        ) : (
          <>
            {/* Selector de los 3 Pasos con Barra de Progreso Tipo Story */}
            <div
              role="tablist"
              aria-label="Pasos para instalar en iPhone"
              className="grid grid-cols-3 gap-1.5"
            >
              {IOS_INSTALL_STEPS.map((step, index) => {
                const isActive = index === activeStepIndex;
                const isCompleted = index < activeStepIndex;
                return (
                  <button
                    key={step.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleSelectStep(index)}
                    className={`ios-press-bounce relative overflow-hidden flex flex-col justify-between min-h-[44px] rounded-2xl px-2.5 py-1.5 text-left border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#111827] text-[#EDEDED] border-[#111827] shadow-xs'
                        : isCompleted
                          ? 'bg-white text-[#111827] border-[#4B5563]/50'
                          : 'bg-white/70 text-[#4B5563] border-[#9CA3AF]/50 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                          isActive
                            ? 'bg-[#EDEDED] text-[#111827]'
                            : isCompleted
                              ? 'bg-[#111827] text-[#EDEDED]'
                              : 'bg-[#9CA3AF]/40 text-[#1F2937]'
                        }`}
                      >
                        {step.id}
                      </span>
                      <span className="truncate text-[11px] font-extrabold tracking-tight">
                        {step.shortTabLabel}
                      </span>
                    </div>

                    {/* Barra de progreso inferior del paso */}
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#4B5563]/30">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${
                          isActive
                            ? 'bg-[#EDEDED]'
                            : isCompleted
                              ? 'w-full bg-[#111827]'
                              : 'w-0'
                        }`}
                        style={
                          isActive
                            ? { width: `${Math.max(12, videoProgress)}%` }
                            : undefined
                        }
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Escenario del Recorte de Video Real */}
            <div className="relative overflow-hidden rounded-[22px] bg-[#111827] border border-[#4B5563] shadow-inner">
              {/* Barra flotante superior dentro del visor de video */}
              <div className="absolute top-2.5 inset-x-2.5 z-10 flex items-center justify-between gap-2 pointer-events-none">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#111827]/90 border border-[#4B5563]/80 px-2.5 py-1 text-[11px] font-bold text-[#EDEDED] backdrop-blur-xs shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-[#EDEDED] animate-pulse" />
                  {currentStep.badgeText}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    setIsZoomed((prev) => !prev);
                  }}
                  aria-label={isZoomed ? 'Reducir tamaño del video' : 'Ampliar video'}
                  className="pointer-events-auto ios-press-bounce inline-flex min-h-[34px] items-center gap-1 rounded-full bg-[#111827]/90 border border-[#9CA3AF]/60 px-2.5 py-1 text-[11px] font-bold text-[#EDEDED] hover:bg-[#1F2937] cursor-pointer shadow-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    {isZoomed ? (
                      <>
                        <polyline points="4 14 10 14 10 20" />
                        <polyline points="20 10 14 10 14 4" />
                        <line x1="14" y1="10" x2="21" y2="3" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </>
                    ) : (
                      <>
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </>
                    )}
                  </svg>
                  <span>{isZoomed ? 'Compactar' : 'Ampliar'}</span>
                </button>
              </div>

              {/* Video recortado de alta legibilidad */}
              <div
                onClick={handleNextStep}
                className={`w-full flex items-center justify-center bg-[#111827] transition-all duration-200 cursor-pointer ${
                  isZoomed ? 'h-[310px] sm:h-[360px]' : 'h-[215px] sm:h-[250px]'
                }`}
              >
                <video
                  ref={videoRef}
                  key={currentStep.videoSrc}
                  src={currentStep.videoSrc}
                  poster={currentStep.posterSrc}
                  width={560}
                  height={716}
                  muted
                  playsInline
                  autoPlay={!prefersReducedMotion}
                  preload="auto"
                  onTimeUpdate={handleVideoTimeUpdate}
                  onEnded={handleVideoEnded}
                  className="h-full w-full object-contain select-none"
                />
              </div>

              {/* Píldora inferior dentro del video destacando el botón exacto a buscar */}
              <div className="flex items-center justify-between gap-2 bg-[#1F2937] border-t border-[#4B5563]/60 px-3 py-1.5 text-[#EDEDED]">
                <span className="text-[11px] font-medium text-[#9CA3AF]">
                  Busca en tu pantalla:
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDEDED] px-2.5 py-0.5 text-[11px] font-extrabold text-[#111827]">
                  {currentStep.highlightPill}
                </span>
              </div>
            </div>

            {/* Tarjeta de Instrucción Clara y Bilingüe (Español / Inglés) */}
            <div
              role="region"
              aria-live="polite"
              className="rounded-[20px] bg-white border border-[#9CA3AF]/60 p-3 space-y-1.5 shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111827] text-xs font-extrabold text-[#EDEDED]">
                  {currentStep.id}
                </span>
                <h3 className="text-xs sm:text-sm font-extrabold text-[#111827] leading-tight">
                  {currentStep.titleEsEn}
                </h3>
              </div>
              <p className="text-xs text-[#4B5563] leading-relaxed pl-8">
                {currentStep.instructionText}
              </p>
            </div>

            {/* Controles de Navegación Manual entre Pasos (Ergonomía 44px) */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={handlePrevStep}
                className="ios-press-bounce flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-white border border-[#9CA3AF]/70 px-4 py-2 text-xs font-bold text-[#1F2937] hover:bg-[#EDEDED] transition cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="h-4 w-4"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <span>Anterior</span>
              </button>

              {activeStepIndex === 0 ? (
                <button
                  type="button"
                  onClick={triggerNudgePointer}
                  className="ios-press-bounce flex-1 flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-[#1F2937] border border-[#4B5563] px-3 py-2 text-xs font-bold text-[#EDEDED] hover:bg-[#111827] transition cursor-pointer"
                >
                  <span>¿Dónde toco primero?</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleNextStep}
                className="ios-press-bounce flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-[#111827] px-4 py-2 text-xs font-extrabold text-[#EDEDED] hover:bg-[#1F2937] shadow-xs transition cursor-pointer"
              >
                <span>
                  {activeStepIndex === IOS_INSTALL_STEPS.length - 1
                    ? 'Repetir guía'
                    : 'Siguiente paso'}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="h-4 w-4"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Puntero Espacial Inferior (Apunta exactamente al botón ≡ de la barra de Safari) */}
      {!isTopRightShare && !hasDeferredPrompt && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleSelectStep(0);
            triggerNudgePointer();
          }}
          className={`fixed bottom-2 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center animate-float cursor-pointer ${
            pointerPulse ? 'scale-110' : ''
          } transition-transform`}
        >
          <div className="flex items-center gap-2 rounded-full bg-[#111827] border-2 border-[#EDEDED] px-4 py-1.5 text-xs font-extrabold text-[#EDEDED] shadow-2xl whitespace-nowrap">
            <span>1. Empieza tocando</span>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="h-3.5 w-3.5"
              >
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="14" y2="17" />
              </svg>
            </span>
            <span>aquí abajo en Safari</span>
          </div>
          <div className="mt-1 mr-28 flex h-8 w-8 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
