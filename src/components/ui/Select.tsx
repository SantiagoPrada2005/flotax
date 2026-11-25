import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption<T extends string = string> {
  readonly value: T;
  readonly label: string;
  readonly badge?: string | undefined;
  readonly disabled?: boolean | undefined;
}

export interface SelectProps<T extends string = string> {
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly label?: string | undefined;
  readonly ariaLabel?: string | undefined;
  readonly value: T;
  readonly defaultValue?: T | undefined;
  readonly options: readonly SelectOption<T>[];
  readonly onChange: (nextValue: T) => void;
  readonly disabled?: boolean | undefined;
  readonly dropDirection?: 'down' | 'up' | 'auto' | undefined;
  readonly display?: 'floating' | 'inline' | undefined;
  readonly variant?: 'surface' | 'subtle' | 'ghost' | undefined;
  readonly size?: 'sm' | 'md' | undefined;
  readonly className?: string | undefined;
  readonly triggerClassName?: string | undefined;
}

interface PortalPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  resolvedDirection: 'down' | 'up';
}

function resolveCurrentThemeIsDark(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  return (
    root.classList.contains('dark') ||
    root.getAttribute('data-theme') === 'dark'
  );
}

/**
 * Componente Select / Dropdown Canónico de FlotaX (Tier 1 UI Primitive).
 * - Reemplaza los `<select>` nativos del navegador con una lista desplegable
 *   que respeta la identidad visual de FlotaX (bordes redondeados, paleta canónica,
 *   tipografía 16px anti-zoom en móvil y estados de interacción RUL-FLX-024).
 * - Cuando se renderiza en modo flotante (`display="floating"`), monta el menú
 *   en un Portal con sincronización explícita de tema (`dark` / `data-theme`)
 *   para no ser recortado por modales (`overflow-y-auto` / `overflow-hidden`)
 *   y conservar el Modo Oscuro e identidad visual en todo momento.
 */
export function Select<T extends string = string>({
  id,
  name,
  label,
  ariaLabel,
  value,
  defaultValue,
  options,
  onChange,
  disabled = false,
  dropDirection = 'auto',
  display = 'floating',
  variant = 'surface',
  size = 'md',
  className = '',
  triggerClassName = '',
}: SelectProps<T>) {
  const isInline = display === 'inline';
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(false);
  const [portalPos, setPortalPos] = useState<PortalPosition | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const generatedId = useId();
  const triggerId = id ?? `fx-select-${generatedId}`;
  const listboxId = `fx-listbox-${generatedId}`;

  const selectedOption =
    options.find((opt) => opt.value === value) ?? options[0];

  const isDefaultState =
    (defaultValue !== undefined && value === defaultValue) || value === '';

  const enabledIndices = options
    .map((opt, idx) => (opt.disabled ? -1 : idx))
    .filter((idx) => idx >= 0);

  const updatePortalGeometry = useCallback(() => {
    if (isInline || !triggerRef.current || typeof window === 'undefined') {
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const estimatedHeight = Math.min(248, Math.max(88, options.length * 40 + 12));

    let resolvedDirection: 'down' | 'up' = 'down';
    if (dropDirection === 'up') {
      resolvedDirection = 'up';
    } else if (dropDirection === 'down') {
      resolvedDirection = 'down';
    } else if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      resolvedDirection = 'up';
    }

    const maxHeight = Math.max(
      120,
      Math.min(
        248,
        resolvedDirection === 'up' ? spaceAbove - 6 : spaceBelow - 6
      )
    );

    const width = Math.max(rect.width, 140);
    const left = Math.min(
      Math.max(8, rect.left),
      Math.max(8, viewportWidth - width - 8)
    );
    const top =
      resolvedDirection === 'up' ? rect.top - 6 : rect.bottom + 6;

    setPortalPos({
      top,
      left,
      width,
      maxHeight,
      resolvedDirection,
    });
  }, [dropDirection, isInline, options.length]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    setIsDarkTheme(resolveCurrentThemeIsDark());
    updatePortalGeometry();
  }, [isOpen, updatePortalGeometry]);

  useEffect(() => {
    if (!isOpen) return;

    const syncTheme = () => {
      setIsDarkTheme(resolveCurrentThemeIsDark());
    };

    const observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(syncTheme)
        : null;

    if (observer && typeof document !== 'undefined') {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme'],
      });
    }

    if (isInline) {
      return () => observer?.disconnect();
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        containerRef.current?.contains(target) ||
        listboxRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleViewportChange = () => {
      updatePortalGeometry();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      observer?.disconnect();
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, isInline, updatePortalGeometry]);

  const openDropdown = () => {
    if (disabled || enabledIndices.length === 0) return;
    const currentIndex = options.findIndex(
      (opt) => opt.value === value && !opt.disabled
    );
    setFocusedIdx(
      currentIndex >= 0 ? currentIndex : (enabledIndices[0] ?? 0)
    );
    setIsDarkTheme(resolveCurrentThemeIsDark());
    setIsOpen(true);
  };

  const moveFocus = (delta: 1 | -1) => {
    if (enabledIndices.length === 0) return;
    const currentPos = enabledIndices.indexOf(focusedIdx);
    const nextPos =
      currentPos === -1
        ? 0
        : (currentPos + delta + enabledIndices.length) % enabledIndices.length;
    const nextIdx = enabledIndices[nextPos];
    if (nextIdx !== undefined) {
      setFocusedIdx(nextIdx);
    }
  };

  const handleTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) => {
    if (disabled || enabledIndices.length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }
      moveFocus(event.key === 'ArrowDown' ? 1 : -1);
    } else if ((event.key === 'Enter' || event.key === ' ') && isOpen) {
      event.preventDefault();
      const targetOption = options[focusedIdx];
      if (targetOption && !targetOption.disabled) {
        onChange(targetOption.value);
        setIsOpen(false);
      }
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const variantClasses =
    variant === 'ghost'
      ? isOpen
        ? 'bg-transparent text-[#111827] dark:text-[#EDEDED] font-semibold'
        : 'bg-transparent text-[#1F2937] dark:text-[#EDEDED] font-semibold hover:text-[#111827] dark:hover:text-white'
      : variant === 'subtle'
        ? isOpen
          ? 'border border-[#111827] dark:border-[#EDEDED] bg-white dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] font-semibold ring-2 ring-[#111827]/10 dark:ring-white/15'
          : 'border border-[#9CA3AF]/40 dark:border-white/15 bg-[#EDEDED]/75 dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] font-semibold hover:border-[#111827]/60 dark:hover:border-white/35'
        : isOpen
          ? 'border border-[#111827] dark:border-[#EDEDED] bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED] font-semibold ring-2 ring-[#111827]/10 dark:ring-white/15 shadow-2xs'
          : isDefaultState
            ? 'border border-[#9CA3AF]/45 dark:border-white/15 bg-white dark:bg-[#1F2937] text-[#4B5563] dark:text-[#D1D5DB] font-medium hover:border-[#111827]/60 dark:hover:border-white/35 hover:text-[#111827] dark:hover:text-[#EDEDED]'
            : 'border border-[#9CA3AF]/45 dark:border-white/20 bg-white dark:bg-[#1F2937] text-[#111827] dark:text-[#EDEDED] font-semibold hover:border-[#111827]/60 dark:hover:border-white/35';

  const sizeClasses =
    variant === 'ghost'
      ? 'min-h-[40px] px-1.5 py-1 text-base sm:text-sm rounded-xl'
      : size === 'sm'
        ? 'min-h-[38px] px-3 py-1.5 text-base sm:text-xs rounded-[12px]'
        : 'min-h-[40px] px-3.5 py-2 text-base sm:text-sm rounded-[13px]';

  const renderListboxContent = () => (
    <div
      ref={listboxRef}
      id={listboxId}
      role="listbox"
      aria-label={ariaLabel ?? label ?? 'Opciones disponibles'}
      data-theme={isDarkTheme ? 'dark' : 'light'}
      style={
        !isInline && portalPos
          ? {
              position: 'fixed',
              top:
                portalPos.resolvedDirection === 'up'
                  ? undefined
                  : `${portalPos.top}px`,
              bottom:
                portalPos.resolvedDirection === 'up'
                  ? `${window.innerHeight - portalPos.top}px`
                  : undefined,
              left: `${portalPos.left}px`,
              width: `${portalPos.width}px`,
              maxHeight: `${portalPos.maxHeight}px`,
            }
          : undefined
      }
      className={`${isDarkTheme ? 'dark' : ''} flex flex-col gap-1 overflow-y-auto overscroll-contain rounded-2xl border border-[var(--fx-dropdown-border)] bg-[var(--fx-dropdown-bg)] p-1.5 text-[var(--fx-dropdown-item-text)] ${
        isInline
          ? 'relative mt-1.5 max-h-60 shadow-2xs'
          : 'z-[90] shadow-[var(--fx-dropdown-shadow)]'
      }`}
    >
      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        const isFocused = idx === focusedIdx;
        const isOptDisabled = Boolean(opt.disabled);

        return (
          <button
            key={opt.value}
            type="button"
            role="option"
            disabled={isOptDisabled}
            aria-selected={isSelected}
            aria-disabled={isOptDisabled || undefined}
            onMouseEnter={() => {
              if (!isOptDisabled) setFocusedIdx(idx);
            }}
            onClick={() => {
              if (isOptDisabled) return;
              onChange(opt.value);
              setIsOpen(false);
              triggerRef.current?.focus();
            }}
            className={`fx-press flex min-h-[36px] w-full items-center justify-between gap-2.5 rounded-[10px] px-3 py-1.5 text-left text-[13px] leading-snug transition-colors ${
              isOptDisabled
                ? 'bg-transparent dark:bg-transparent opacity-40 cursor-not-allowed text-[#9CA3AF]'
                : isSelected
                  ? 'bg-[#111827] text-[#EDEDED] dark:bg-[#EDEDED] dark:text-[#111827] font-bold cursor-pointer'
                  : isFocused
                    ? 'bg-[#EDEDED] dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] font-semibold cursor-pointer'
                    : 'bg-transparent dark:bg-transparent text-[#111827] dark:text-[#EDEDED] hover:bg-[#EDEDED]/75 dark:hover:bg-[#111827] font-medium cursor-pointer'
            }`}
          >
            <span className="truncate">{opt.label}</span>

            <span className="flex shrink-0 items-center gap-2">
              {opt.badge && (
                <span
                  className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                    isSelected
                      ? 'bg-white/20 text-white dark:bg-[#111827]/15 dark:text-[#111827]'
                      : 'bg-[#EDEDED] dark:bg-white/12 text-[#4B5563] dark:text-[#D1D5DB]'
                  }`}
                >
                  {opt.badge}
                </span>
              )}
              {isSelected && (
                <Check
                  className="h-4 w-4 shrink-0 text-current stroke-[2.5]"
                  aria-hidden="true"
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={containerRef}
      onKeyDown={(event) => {
        if (isInline && isOpen && event.key === 'Escape') {
          setIsOpen(false);
        }
      }}
      className={`relative ${isInline ? '' : isOpen ? 'z-40' : 'z-10'} ${className}`.trim()}
    >
      {label && (
        <label
          htmlFor={triggerId}
          className="mb-1 block text-[11px] font-semibold text-[#4B5563] dark:text-[#D1D5DB]"
        >
          {label}
        </label>
      )}

      {name && <input type="hidden" name={name} value={value} />}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel ?? label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => {
          if (disabled) return;
          if (isOpen) {
            setIsOpen(false);
          } else {
            openDropdown();
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`fx-press flex w-full items-center justify-between gap-2 text-left transition-colors select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${triggerClassName}`.trim()}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <span className="truncate">{selectedOption?.label ?? ''}</span>
          {selectedOption?.badge && !isDefaultState && (
            <span className="shrink-0 rounded-md bg-[#EDEDED] dark:bg-white/12 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
              {selectedOption.badge}
            </span>
          )}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
            isOpen
              ? 'rotate-180 text-[#111827] dark:text-[#EDEDED]'
              : 'text-[#4B5563] dark:text-[#9CA3AF]'
          }`}
        />
      </button>

      {isOpen &&
        options.length > 0 &&
        (isInline || typeof document === 'undefined'
          ? renderListboxContent()
          : createPortal(renderListboxContent(), document.body))}
    </div>
  );
}

export default Select;
