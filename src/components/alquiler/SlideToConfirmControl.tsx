import { useCallback, useEffect, useRef, useState } from 'react';

export type SlideConfirmStatus =
  | 'disabled'
  | 'idle'
  | 'dragging'
  | 'holding'
  | 'confirmed'
  | 'loading'
  | 'error';

export interface SlideToConfirmControlProps {
  disabled: boolean;
  disabledReason?: string | undefined;
  loading: boolean;
  error?: string | null | undefined;
  label?: string | undefined;
  loadingLabel?: string | undefined;
  confirmedLabel?: string | undefined;
  holdLabel?: string | undefined;
  compact?: boolean | undefined;
  onConfirm: () => Promise<void> | void;
}

const CONFIRM_THRESHOLD = 0.8;
const HOLD_DURATION_MS = 800;
const THUMB_SIZE_PX = 46;
const TRACK_PADDING_PX = 4;

export default function SlideToConfirmControl({
  disabled,
  disabledReason,
  loading,
  error,
  label = 'Desliza para confirmar',
  loadingLabel = 'Confirmando solicitud...',
  confirmedLabel = 'Confirmado',
  holdLabel = 'Mantener presionado para confirmar',
  compact = false,
  onConfirm,
}: SlideToConfirmControlProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLButtonElement>(null);

  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef<number>(0);
  const maxTravelRef = useRef<number>(0);
  const currentOffsetRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const isHoldingRef = useRef<boolean>(false);
  const submissionLockRef = useRef<boolean>(false);

  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef<number>(0);
  const holdPointerIdRef = useRef<number | null>(null);

  const [offsetPx, setOffsetPx] = useState<number>(0);
  const [maxTravelPx, setMaxTravelPx] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);

  const measureMaxTravel = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 0;
    const innerWidth = track.clientWidth;
    const thumbWidth = thumbRef.current?.offsetWidth || THUMB_SIZE_PX;
    const travel = Math.max(0, innerWidth - thumbWidth - TRACK_PADDING_PX * 2);
    maxTravelRef.current = travel;
    setMaxTravelPx(travel);
    return travel;
  }, []);

  useEffect(() => {
    measureMaxTravel();
    const track = trackRef.current;
    if (!track || typeof window === 'undefined') return;

    const syncAfterResize = () => {
      const nextTravel = measureMaxTravel();
      if (isConfirmed || loading) {
        currentOffsetRef.current = nextTravel;
        setOffsetPx(nextTravel);
      } else if (currentOffsetRef.current > nextTravel) {
        currentOffsetRef.current = nextTravel;
        setOffsetPx(nextTravel);
      }
    };

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(syncAfterResize);
      observer.observe(track);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', syncAfterResize);
    return () => window.removeEventListener('resize', syncAfterResize);
  }, [measureMaxTravel, isConfirmed, loading]);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdPointerIdRef.current = null;
    isHoldingRef.current = false;
    setIsHolding(false);
    setHoldProgress(0);
  }, []);

  // Si falla la operación o termina el loading con error, restablecer de forma segura para reintentar
  useEffect(() => {
    if (!loading && error) {
      submissionLockRef.current = false;
      isDraggingRef.current = false;
      currentOffsetRef.current = 0;
      setIsConfirmed(false);
      setIsDragging(false);
      setOffsetPx(0);
      cancelHold();
    }
  }, [loading, error, cancelHold]);

  useEffect(() => {
    if (disabled || loading) {
      cancelHold();
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        pointerIdRef.current = null;
        currentOffsetRef.current = 0;
        setIsDragging(false);
        setOffsetPx(0);
      }
    }
  }, [disabled, loading, cancelHold]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
    };
  }, []);

  const triggerHapticSuccess = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(18);
      } catch {
        // Ignorar en dispositivos sin soporte háptico
      }
    }
  };

  const executeConfirm = useCallback(() => {
    if (disabled || loading || submissionLockRef.current) return;
    submissionLockRef.current = true;
    isDraggingRef.current = false;
    pointerIdRef.current = null;
    cancelHold();

    const travel = measureMaxTravel();
    currentOffsetRef.current = travel;
    setOffsetPx(travel);
    setIsDragging(false);
    setIsConfirmed(true);
    triggerHapticSuccess();

    Promise.resolve(onConfirm()).catch(() => {
      submissionLockRef.current = false;
      currentOffsetRef.current = 0;
      setIsConfirmed(false);
      setOffsetPx(0);
    });
  }, [disabled, loading, cancelHold, measureMaxTravel, onConfirm]);

  const executeConfirmRef = useRef(executeConfirm);
  useEffect(() => {
    executeConfirmRef.current = executeConfirm;
  }, [executeConfirm]);

  const finishDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    pointerIdRef.current = null;
    setIsDragging(false);

    const travel = maxTravelRef.current;
    const ratio = travel > 0 ? currentOffsetRef.current / travel : 0;

    if (ratio >= CONFIRM_THRESHOLD) {
      executeConfirmRef.current();
    } else {
      currentOffsetRef.current = 0;
      setOffsetPx(0);
    }
  }, []);

  // Listeners globales de respaldo mientras el usuario arrastra, para compatibilidad total mouse/touch
  useEffect(() => {
    if (!isDragging || typeof window === 'undefined') return;

    const onWindowPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;

      const travel = maxTravelRef.current;
      const rawDelta = e.clientX - startXRef.current;
      const clamped = Math.min(travel, Math.max(0, rawDelta));
      currentOffsetRef.current = clamped;
      setOffsetPx(clamped);
    };

    const onWindowPointerEnd = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
      finishDrag();
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerEnd);
    window.addEventListener('pointercancel', onWindowPointerEnd);

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerEnd);
      window.removeEventListener('pointercancel', onWindowPointerEnd);
    };
  }, [isDragging, finishDrag]);

  const handleThumbPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || loading || submissionLockRef.current || isConfirmed) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const travel = measureMaxTravel();
    if (travel <= 0) return;

    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX - currentOffsetRef.current;
    isDraggingRef.current = true;
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Fallback cubierto por listeners en window
    }
  };

  const handleThumbPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignorar
    }
    finishDrag();
  };

  const startHold = (pointerId?: number) => {
    if (
      disabled ||
      loading ||
      submissionLockRef.current ||
      isConfirmed ||
      isHoldingRef.current
    ) {
      return;
    }

    const travel = measureMaxTravel();
    isHoldingRef.current = true;
    holdPointerIdRef.current = pointerId ?? null;
    setIsHolding(true);
    holdStartRef.current = Date.now();

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const pct = Math.min(1, elapsed / HOLD_DURATION_MS);
      setHoldProgress(pct);

      const nextOffset = travel * pct;
      currentOffsetRef.current = nextOffset;
      setOffsetPx(nextOffset);

      if (pct >= 1) {
        executeConfirmRef.current();
      }
    }, 20);
  };

  const abortHold = () => {
    if (!isHoldingRef.current) return;
    cancelHold();
    if (!submissionLockRef.current && !isConfirmed) {
      currentOffsetRef.current = 0;
      setOffsetPx(0);
    }
  };

  const handleHoldPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || loading || submissionLockRef.current || isConfirmed) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignorar
    }
    startHold(e.pointerId);
  };

  const handleHoldPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (holdPointerIdRef.current !== null && e.pointerId !== holdPointerIdRef.current) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignorar
    }
    abortHold();
  };

  const handleHoldKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!e.repeat) {
        startHold();
      }
    }
  };

  const handleHoldKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      abortHold();
    }
  };

  const status: SlideConfirmStatus = loading
    ? 'loading'
    : isConfirmed
    ? 'confirmed'
    : disabled
    ? 'disabled'
    : error
    ? 'error'
    : isHolding
    ? 'holding'
    : isDragging
    ? 'dragging'
    : 'idle';

  const progress =
    maxTravelPx > 0 ? Math.min(1, Math.max(0, offsetPx / maxTravelPx)) : 0;

  const fillPercent =
    status === 'confirmed' || status === 'loading'
      ? 100
      : Math.min(100, Math.round(progress * 100));

  const displayText =
    status === 'loading'
      ? loadingLabel
      : status === 'confirmed'
      ? confirmedLabel
      : status === 'disabled'
      ? 'Autoriza arriba para habilitar'
      : status === 'holding'
      ? `Confirmando (${Math.round(holdProgress * 100)}%)...`
      : label;

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'} data-slide-status={status}>
      {/* Pista principal de deslizamiento horizontal (box-border + posición absoluta precisa) */}
      <div
        ref={trackRef}
        role="group"
        aria-label="Control de confirmación por deslizamiento"
        onContextMenu={(e) => e.preventDefault()}
        className={`box-border relative h-[56px] w-full overflow-hidden rounded-full border transition-colors duration-200 select-none ${
          status === 'confirmed' || status === 'loading'
            ? 'bg-[#111827] border-[#111827] dark:bg-[#EDEDED] dark:border-[#EDEDED]'
            : status === 'disabled'
            ? 'bg-[#EDEDED] border-[#9CA3AF]/45 opacity-60 dark:bg-[#111827] dark:border-white/10'
            : status === 'error'
            ? 'bg-[#EDEDED] border-[#DC2626] dark:bg-[#111827] dark:border-[#DC2626]'
            : 'bg-[#EDEDED] border-[#9CA3AF]/60 dark:bg-[#111827] dark:border-white/20'
        }`}
      >
        {/* Barra de progreso visual contenida dentro de la pista */}
        <div
          aria-hidden="true"
          style={{ width: `${fillPercent}%` }}
          className={`pointer-events-none absolute inset-y-0 left-0 rounded-full ${
            isDragging || isHolding
              ? ''
              : 'transition-[width] duration-200 ease-out motion-reduce:transition-none'
          } ${
            status === 'confirmed' || status === 'loading'
              ? 'bg-[#111827] dark:bg-[#EDEDED]'
              : 'bg-[#111827]/12 dark:bg-white/15'
          }`}
        />

        {/* Texto centrado absoluto (no desplaza el círculo en el flujo) */}
        <div
          aria-hidden="true"
          style={{
            opacity:
              status === 'confirmed' || status === 'loading'
                ? 1
                : Math.max(0.22, 1 - progress * 1.35),
          }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-1.5 px-14 text-center"
        >
          <span
            className={`text-xs sm:text-sm font-bold tracking-tight truncate ${
              status === 'confirmed' || status === 'loading'
                ? 'text-[#EDEDED] dark:text-[#111827]'
                : status === 'disabled'
                ? 'text-[#4B5563] dark:text-[#9CA3AF]'
                : 'text-[#111827] dark:text-[#EDEDED]'
            }`}
          >
            {displayText}
          </span>

          {status !== 'confirmed' &&
            status !== 'loading' &&
            status !== 'disabled' &&
            status !== 'holding' && (
              <span className="inline-flex items-center text-[#4B5563] dark:text-[#D1D5DB] shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="-ml-1.5 h-3.5 w-3.5 opacity-60"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            )}
        </div>

        {/* Círculo deslizante: posición absoluta estrictamente acotada al interior */}
        <button
          ref={thumbRef}
          type="button"
          disabled={disabled || loading || isConfirmed}
          onPointerDown={handleThumbPointerDown}
          onPointerUp={handleThumbPointerUp}
          onPointerCancel={handleThumbPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={
            disabled
              ? disabledReason || 'Control de confirmación deshabilitado'
              : loading
              ? loadingLabel
              : `${label}. Desliza hacia la derecha para confirmar.`
          }
          aria-disabled={disabled || loading}
          aria-busy={loading}
          style={{
            transform: `translate3d(${offsetPx}px, 0, 0)`,
          }}
          className={`absolute left-1 top-1 z-20 flex h-[46px] w-[46px] items-center justify-center rounded-full shadow-md touch-none select-none ${
            isDragging || isHolding
              ? ''
              : 'transition-transform duration-200 ease-out motion-reduce:transition-none'
          } ${
            disabled
              ? 'bg-[#9CA3AF]/70 text-white cursor-not-allowed dark:bg-white/15 dark:text-[#9CA3AF]'
              : status === 'confirmed' || status === 'loading'
              ? 'bg-[#EDEDED] text-[#111827] dark:bg-[#111827] dark:text-[#EDEDED] cursor-default'
              : 'bg-[#111827] text-[#EDEDED] dark:bg-[#EDEDED] dark:text-[#111827] cursor-grab active:cursor-grabbing'
          }`}
        >
          {status === 'loading' ? (
            <svg
              className="h-5 w-5 animate-spin motion-reduce:animate-none"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="opacity-85"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : status === 'confirmed' ? (
            /* Candado abierto */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
          ) : (
            /* Candado cerrado */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
        </button>
      </div>

      {/* Mensaje explícito cuando falta una autorización obligatoria */}
      {disabled && disabledReason && (
        <p
          role="status"
          className="text-center text-[11px] font-medium text-[#4B5563] dark:text-[#D1D5DB]"
        >
          {disabledReason}
        </p>
      )}

      {/* Alternativa accesible: Mantener presionado (mouse, táctil o teclado Enter/Espacio) */}
      <button
        type="button"
        disabled={disabled || loading || isConfirmed}
        onPointerDown={handleHoldPointerDown}
        onPointerUp={handleHoldPointerEnd}
        onPointerCancel={handleHoldPointerEnd}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={handleHoldKeyDown}
        onKeyUp={handleHoldKeyUp}
        aria-label={`${holdLabel}. Alternativa accesible al deslizamiento.`}
        aria-disabled={disabled || loading}
        className={`relative overflow-hidden min-h-[40px] w-full rounded-full border px-4 py-1.5 text-[11px] font-bold transition-colors touch-none select-none ${
          disabled || loading || isConfirmed
            ? 'border-[#9CA3AF]/35 bg-transparent text-[#4B5563] opacity-55 cursor-not-allowed dark:border-white/10 dark:text-[#9CA3AF]'
            : 'border-[#9CA3AF]/55 bg-[#EDEDED]/70 text-[#111827] hover:bg-[#EDEDED] cursor-pointer dark:border-white/15 dark:bg-[#111827] dark:text-[#EDEDED] dark:hover:bg-white/10'
        }`}
      >
        <span
          aria-hidden="true"
          style={{ width: `${Math.round(holdProgress * 100)}%` }}
          className="pointer-events-none absolute inset-y-0 left-0 bg-[#111827]/14 dark:bg-white/15"
        />
        <span className="relative z-10">
          {loading
            ? loadingLabel
            : isHolding
            ? `Mantén presionado (${Math.round(holdProgress * 100)}%)...`
            : `${holdLabel} (alternativa accesible)`}
        </span>
      </button>
    </div>
  );
}
