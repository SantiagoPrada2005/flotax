import { useEffect, useRef, useState, type TouchEvent } from 'react';
import {
  Building2,
  Calendar,
  Camera,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';

export interface TwoEnvironmentsTutorialProps {
  onBackToStep1: () => void;
  onComplete: () => void;
}

interface SlideContent {
  readonly id: number;
  readonly title: string;
  readonly description: string;
}

const SLIDES: readonly SlideContent[] = [
  {
    id: 0,
    title: 'Una cuenta, dos entornos',
    description: 'Todo lo que necesitas, conectado en un solo lugar.',
  },
  {
    id: 1,
    title: 'Tu espacio personal',
    description: 'Explora vehículos disponibles y gestiona tus reservas personales.',
  },
  {
    id: 2,
    title: 'Administra tu negocio',
    description: 'Controla tu flota, entregas con cámara y reservas en tiempo real.',
  },
  {
    id: 3,
    title: 'Cambia de entorno fácilmente',
    description: 'Alterna entre tu perfil y tu patio sin cerrar sesión.',
  },
] as const;

/**
 * Tutorial interactivo de incorporación «Dos entornos, una sola cuenta».
 * Prioriza demostraciones visuales animadas de la interfaz real de FlotaX,
 * con un único indicador de progreso y divulgación progresiva.
 */
export function TwoEnvironmentsTutorial({
  onBackToStep1,
  onComplete,
}: TwoEnvironmentsTutorialProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [slide1Env, setSlide1Env] = useState<'personal' | 'negocio'>('personal');
  const [slide2Booked, setSlide2Booked] = useState(false);
  const [slide3Captured, setSlide3Captured] = useState(false);
  const [slide4Env, setSlide4Env] = useState<'personal' | 'negocio'>('negocio');

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const totalSlides = SLIDES.length;
  const isFirst = activeSlide === 0;
  const isLast = activeSlide === totalSlides - 1;
  const current: SlideContent = SLIDES[activeSlide] ?? {
    id: 0,
    title: 'Una cuenta, dos entornos',
    description: 'Todo lo que necesitas, conectado en un solo lugar.',
  };

  // Micro-demostración sutil en cada slide (sin auto-avance de diapositivas)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setSlide2Booked(true);
      setSlide3Captured(true);
      return;
    }

    if (activeSlide === 0) {
      const interval = window.setInterval(() => {
        setSlide1Env((prev) => (prev === 'personal' ? 'negocio' : 'personal'));
      }, 2400);
      return () => window.clearInterval(interval);
    }

    if (activeSlide === 1) {
      setSlide2Booked(false);
      const timer = window.setTimeout(() => setSlide2Booked(true), 700);
      return () => window.clearTimeout(timer);
    }

    if (activeSlide === 2) {
      setSlide3Captured(false);
      const timer = window.setTimeout(() => setSlide3Captured(true), 750);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [activeSlide]);

  const handlePrev = () => {
    if (isFirst) {
      onBackToStep1();
      return;
    }
    setActiveSlide((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setActiveSlide((prev) => Math.min(totalSlides - 1, prev + 1));
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    if (Math.abs(deltaX) < 42) return;

    if (deltaX < 0 && !isLast) {
      setActiveSlide((prev) => Math.min(totalSlides - 1, prev + 1));
    } else if (deltaX > 0 && !isFirst) {
      setActiveSlide((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="touch-pan-y select-none space-y-6"
    >
      {/* 1. Indicador de progreso único y discreto */}
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex flex-1 items-center gap-1.5"
          role="tablist"
          aria-label="Progreso del tutorial"
        >
          {SLIDES.map((slide, index) => {
            const isCurrent = index === activeSlide;
            const isPast = index < activeSlide;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-label={`Diapositiva ${index + 1} de ${totalSlides}: ${slide.title}`}
                onClick={() => setActiveSlide(index)}
                className="fx-press flex h-7 flex-1 items-center"
              >
                <span
                  className={`block h-1 w-full rounded-full transition-colors duration-200 ${
                    isCurrent
                      ? 'bg-[#111827] dark:bg-[#EDEDED]'
                      : isPast
                        ? 'bg-[#4B5563] dark:bg-[#9CA3AF]'
                        : 'bg-[#9CA3AF]/30 dark:bg-white/15'
                  }`}
                />
              </button>
            );
          })}
        </div>
        <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--fx-text-muted)]">
          {activeSlide + 1}/{totalSlides}
        </span>
      </div>

      {/* 2. Demostración visual protagonista (sin tarjetas anidadas innecesarias) */}
      <div className="flex min-h-[248px] items-center justify-center py-2">
        {/* SLIDE 1: Una cuenta, dos entornos con transición animada */}
        {activeSlide === 0 && (
          <div className="w-full max-w-sm space-y-4">
            {/* Cuenta anclada persistente */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-[#EDEDED] dark:border dark:border-white/15 dark:bg-[#1F2937]">
                  <User className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold text-[var(--fx-text-primary)]">
                  Misma cuenta activa
                </span>
              </div>
              <span className="rounded-full bg-[#111827]/8 px-2.5 py-1 font-mono text-[11px] font-semibold text-[var(--fx-text-primary)] dark:bg-white/10">
                {slide1Env === 'personal' ? 'Personal' : 'Negocio'}
              </span>
            </div>

            {/* Vista UI que transiciona suavemente entre Personal y Negocio */}
            <div className="overflow-hidden rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] p-4 transition-colors duration-300">
              {slide1Env === 'personal' ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-[#EDEDED] dark:border dark:border-white/15 dark:bg-[#1F2937]">
                      <Car className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-bold text-[var(--fx-text-primary)]">
                        Catálogo de vehículos
                      </p>
                      <p className="text-xs text-[var(--fx-text-secondary)]">
                        Reserva para tus viajes personales
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    Disponible
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-[#EDEDED] dark:border dark:border-white/15 dark:bg-[#1F2937]">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-bold text-[var(--fx-text-primary)]">
                        Cabina de patio
                      </p>
                      <p className="text-xs text-[var(--fx-text-secondary)]">
                        12 unidades · 4 alquileres activos
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#111827] px-2.5 py-1 text-[10px] font-bold text-[#EDEDED] dark:border dark:border-white/15 dark:bg-[#1F2937]">
                    Operando
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SLIDE 2: Tu espacio personal (demo de catálogo y reserva) */}
        {activeSlide === 1 && (
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111827] text-[#EDEDED] dark:border dark:border-white/15 dark:bg-[#1F2937]">
                  <Car className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-sm font-bold text-[var(--fx-text-primary)]">
                    Mazda CX-30 Touring
                  </p>
                  <p className="text-xs text-[var(--fx-text-secondary)]">
                    Automático · \$180.000 / día
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors duration-300 ${
                  slide2Booked
                    ? 'bg-[#111827] text-[#EDEDED] dark:border dark:border-white/15 dark:bg-[#1F2937]'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {slide2Booked ? 'Reservado' : 'Disponible'}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface)] px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-xs font-medium text-[var(--fx-text-secondary)]">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <span>22 – 25 Nov · 3 días</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold transition-opacity duration-300 ${
                  slide2Booked
                    ? 'text-[var(--fx-text-primary)] opacity-100'
                    : 'text-[var(--fx-text-muted)] opacity-60'
                }`}
              >
                {slide2Booked && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                <span>{slide2Booked ? 'Confirmada' : 'Seleccionar'}</span>
              </span>
            </div>
          </div>
        )}

        {/* SLIDE 3: Administra tu negocio (demo de inspección con cámara y estado) */}
        {activeSlide === 2 && (
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--fx-text-muted)]">
                  Inspección en patio
                </p>
                <p className="font-display text-sm font-bold text-[var(--fx-text-primary)]">
                  Vehículo · Placa KLM-482
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors duration-300 ${
                  slide3Captured
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                }`}
              >
                {slide3Captured ? 'En curso' : 'Pendiente'}
              </span>
            </div>

            {/* Demostración de captura fotográfica en inspección */}
            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface)] p-3">
              <button
                type="button"
                onClick={() => setSlide3Captured((prev) => !prev)}
                aria-label="Simular captura fotográfica de inspección"
                className={`fx-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
                  slide3Captured
                    ? 'bg-[#111827] text-[#EDEDED] dark:border dark:border-white/20 dark:bg-[#1F2937]'
                    : 'bg-[#EDEDED] text-[#111827] dark:bg-white/10 dark:text-[#EDEDED]'
                }`}
              >
                {slide3Captured ? (
                  <Check className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Camera className="h-5 w-5" aria-hidden="true" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--fx-text-primary)]">
                  {slide3Captured ? 'Evidencia fotográfica lista' : 'Capturar foto de entrega'}
                </p>
                <p className="text-[11px] text-[var(--fx-text-secondary)]">
                  {slide3Captured ? '4 de 4 ángulos guardados' : 'Toca el botón de cámara'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 4: Cambia de entorno fácilmente (selector interactivo en vivo) */}
        {activeSlide === 3 && (
          <div className="w-full max-w-sm space-y-3">
            <div
              role="group"
              aria-label="Cambiar entorno de demostración"
              className="grid grid-cols-2 gap-1.5 rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] p-1.5"
            >
              <button
                type="button"
                aria-pressed={slide4Env === 'personal'}
                onClick={() => setSlide4Env('personal')}
                className={`fx-press flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors duration-150 ${
                  slide4Env === 'personal'
                    ? 'bg-[#111827] text-[#EDEDED] shadow-2xs dark:border dark:border-white/15 dark:bg-[#1F2937]'
                    : 'text-[var(--fx-text-secondary)] hover:text-[var(--fx-text-primary)]'
                }`}
              >
                <User className="h-4 w-4" aria-hidden="true" />
                <span>Personal</span>
              </button>

              <button
                type="button"
                aria-pressed={slide4Env === 'negocio'}
                onClick={() => setSlide4Env('negocio')}
                className={`fx-press flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors duration-150 ${
                  slide4Env === 'negocio'
                    ? 'bg-[#111827] text-[#EDEDED] shadow-2xs dark:border dark:border-white/15 dark:bg-[#1F2937]'
                    : 'text-[var(--fx-text-secondary)] hover:text-[var(--fx-text-primary)]'
                }`}
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
                <span>Negocio</span>
              </button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] px-4 py-3.5 transition-colors duration-200">
              <div>
                <p className="font-display text-sm font-bold text-[var(--fx-text-primary)]">
                  {slide4Env === 'personal' ? 'Portal de Cliente' : 'Cabina de Patio'}
                </p>
                <p className="text-xs text-[var(--fx-text-secondary)]">
                  {slide4Env === 'personal'
                    ? 'Explora y reserva vehículos para ti'
                    : 'Gestiona tu flota, actas y cobros'}
                </p>
              </div>
              <span className="rounded-full bg-[#111827]/8 px-2.5 py-1 text-[10px] font-semibold text-[var(--fx-text-primary)] dark:bg-white/10">
                Sin cerrar sesión
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3 y 4. Título corto + Descripción breve */}
      <div className="space-y-1.5 text-center">
        <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--fx-text-primary)] sm:text-[26px]">
          {current.title}
        </h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--fx-text-secondary)]">
          {current.description}
        </p>
      </div>

      {/* 5. Navegación inferior */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={handlePrev}
          className="fx-press fx-btn-outline flex min-h-[52px] w-1/3 items-center justify-center gap-1.5 rounded-2xl py-3.5 text-base font-semibold"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span>Anterior</span>
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="fx-press fx-btn-primary flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold shadow-sm"
        >
          <span>{isLast ? 'Entendido' : 'Siguiente'}</span>
          {isLast ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

export default TwoEnvironmentsTutorial;
