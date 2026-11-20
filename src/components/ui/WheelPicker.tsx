import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

export interface WheelPickerProps<T extends string | number> {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  formatLabel?: (item: T) => string;
  visibleCount?: number;
  itemHeight?: number;
  infinite?: boolean;
  className?: string;
}

/**
 * Selector vertical reutilizable estilo rueda iOS con desplazamiento aparentemente infinito.
 * Soporta gestos táctiles, rueda del mouse, trackpad, clic directo y teclado (ArrowUp/ArrowDown).
 * Adaptado al sistema de temas Claro/Oscuro de FlotaX sin colores vibrantes externos.
 */
export function WheelPicker<T extends string | number>({
  items,
  value,
  onChange,
  ariaLabel,
  formatLabel,
  visibleCount = 5,
  itemHeight = 44,
  infinite = true,
  className = '',
}: WheelPickerProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const snapTimerRef = useRef<number | null>(null);
  const isInternalScrollRef = useRef(false);
  const lastEmittedRef = useRef<T>(value);

  const count = items.length;
  const shouldLoop = infinite && count >= 3;
  const copies = shouldLoop ? 3 : 1;
  const middleOffset = shouldLoop ? count : 0;
  const halfVisible = Math.floor(visibleCount / 2);
  const containerHeight = visibleCount * itemHeight;

  const selectedBaseIndex = useMemo(() => {
    const idx = items.indexOf(value);
    return idx >= 0 ? idx : 0;
  }, [items, value]);

  const [floatIndex, setFloatIndex] = useState<number>(middleOffset + selectedBaseIndex);

  const renderedItems = useMemo(() => {
    if (count === 0) return [];
    const list: Array<{ item: T; virtualIndex: number; baseIndex: number }> = [];
    for (let copy = 0; copy < copies; copy++) {
      for (let i = 0; i < count; i++) {
        const item = items[i];
        if (item !== undefined) {
          list.push({
            item,
            virtualIndex: copy * count + i,
            baseIndex: i,
          });
        }
      }
    }
    return list;
  }, [copies, count, items]);

  // Posicionar inicialmente y sincronizar cuando `value` cambia externamente
  useEffect(() => {
    const el = containerRef.current;
    if (!el || count === 0) return;

    const currentVirtual = Math.round(el.scrollTop / itemHeight);
    const currentBase = ((currentVirtual % count) + count) % count;

    if (currentBase !== selectedBaseIndex || el.scrollTop === 0) {
      const targetVirtual = middleOffset + selectedBaseIndex;
      isInternalScrollRef.current = true;
      el.scrollTop = targetVirtual * itemHeight;
      setFloatIndex(targetVirtual);
      lastEmittedRef.current = value;
      window.requestAnimationFrame(() => {
        isInternalScrollRef.current = false;
      });
    }
  }, [count, itemHeight, middleOffset, selectedBaseIndex, value]);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current !== null) {
        window.clearTimeout(snapTimerRef.current);
      }
    };
  }, []);

  const commitIndex = useCallback(
    (virtualIdx: number) => {
      if (count === 0) return;
      const baseIdx = ((virtualIdx % count) + count) % count;
      const nextItem = items[baseIdx];
      if (nextItem !== undefined && nextItem !== lastEmittedRef.current) {
        lastEmittedRef.current = nextItem;
        onChange(nextItem);
      }
    },
    [count, items, onChange]
  );

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el || count === 0 || isInternalScrollRef.current) return;

    let rawVirtual = el.scrollTop / itemHeight;

    // Reposicionamiento silencioso en los extremos para efecto infinito sin saltos visuales
    if (shouldLoop) {
      if (rawVirtual < count * 0.5) {
        isInternalScrollRef.current = true;
        el.scrollTop += count * itemHeight;
        rawVirtual = el.scrollTop / itemHeight;
        window.requestAnimationFrame(() => {
          isInternalScrollRef.current = false;
        });
      } else if (rawVirtual >= count * 2.5) {
        isInternalScrollRef.current = true;
        el.scrollTop -= count * itemHeight;
        rawVirtual = el.scrollTop / itemHeight;
        window.requestAnimationFrame(() => {
          isInternalScrollRef.current = false;
        });
      }
    }

    setFloatIndex(rawVirtual);

    const nearest = Math.round(rawVirtual);
    commitIndex(nearest);

    if (snapTimerRef.current !== null) {
      window.clearTimeout(snapTimerRef.current);
    }
    snapTimerRef.current = window.setTimeout(() => {
      const targetEl = containerRef.current;
      if (!targetEl) return;
      const finalNearest = Math.round(targetEl.scrollTop / itemHeight);
      const targetTop = finalNearest * itemHeight;
      if (Math.abs(targetEl.scrollTop - targetTop) > 0.5) {
        targetEl.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
      commitIndex(finalNearest);
    }, 110);
  };

  const scrollToVirtualIndex = (virtualIdx: number) => {
    const el = containerRef.current;
    if (!el || count === 0) return;
    const clamped = shouldLoop
      ? virtualIdx
      : Math.max(0, Math.min(count - 1, virtualIdx));
    el.scrollTo({ top: clamped * itemHeight, behavior: 'smooth' });
    commitIndex(clamped);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (count === 0) return;
    const el = containerRef.current;
    const currentVirtual = el ? Math.round(el.scrollTop / itemHeight) : middleOffset + selectedBaseIndex;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        scrollToVirtualIndex(currentVirtual - 1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        scrollToVirtualIndex(currentVirtual + 1);
        break;
      case 'PageUp':
        event.preventDefault();
        scrollToVirtualIndex(currentVirtual - 5);
        break;
      case 'PageDown':
        event.preventDefault();
        scrollToVirtualIndex(currentVirtual + 5);
        break;
      case 'Home':
        event.preventDefault();
        scrollToVirtualIndex(middleOffset);
        break;
      case 'End':
        event.preventDefault();
        scrollToVirtualIndex(middleOffset + count - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-subtle)] select-none dark:bg-[#111827] ${className}`.trim()}
      style={{ height: `${containerHeight}px` }}
    >
      {/* Banda central discreta para destacar el elemento seleccionado */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-3 left-3 z-10 rounded-xl border-y border-[var(--fx-border-subtle)] bg-[var(--fx-bg-hover)]"
        style={{
          top: `${halfVisible * itemHeight}px`,
          height: `${itemHeight}px`,
        }}
      />

      {/* Columna desplazable con snap vertical y máscara de opacidad en extremos */}
      <div
        ref={containerRef}
        role="listbox"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-activedescendant={`wheel-item-${middleOffset + selectedBaseIndex}`}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="no-scrollbar relative z-20 h-full w-full overflow-y-auto overscroll-contain touch-pan-y"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: `${halfVisible * itemHeight}px`,
          paddingBottom: `${halfVisible * itemHeight}px`,
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
        }}
      >
        {renderedItems.map(({ item, virtualIndex }) => {
          const distance = Math.abs(virtualIndex - floatIndex);
          const isCenter = distance < 0.45;
          const opacity =
            distance < 0.5 ? 1 : distance < 1.5 ? 0.58 : distance < 2.5 ? 0.28 : 0.14;
          const scale = distance < 0.5 ? 1 : distance < 1.5 ? 0.92 : 0.84;
          const label = formatLabel ? formatLabel(item) : String(item);

          return (
            <button
              key={`${virtualIndex}-${String(item)}`}
              id={`wheel-item-${virtualIndex}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={isCenter}
              onClick={() => scrollToVirtualIndex(virtualIndex)}
              className={`flex w-full cursor-pointer items-center justify-center font-mono transition-opacity duration-120 ${
                isCenter
                  ? 'text-xl font-bold text-[#111827] dark:text-[#EDEDED]'
                  : 'text-base font-medium text-[var(--fx-text-secondary)]'
              }`}
              style={{
                height: `${itemHeight}px`,
                scrollSnapAlign: 'center',
                opacity,
                transform: `scale(${scale})`,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default WheelPicker;
