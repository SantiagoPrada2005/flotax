import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Compass, MapPin, Search, X } from 'lucide-react';
import { IconButton } from './IconButton';
import { normalizarTextoBusqueda } from '@/lib/geo/colombia';

export interface LocationOptionSelectorModalProps {
  isOpen: boolean;
  title: string;
  searchPlaceholder: string;
  emptyMessage?: string;
  options: readonly string[];
  selectedValue: string;
  optionVariant: 'department' | 'city';
  onSelect: (value: string) => void;
  onClose: () => void;
}

/**
 * Selector modal/sheet nativo reutilizable para departamentos y ciudades de Colombia.
 * Cumple con la gobernanza de temas Claro/Oscuro, ergonomía móvil (>= 44px touch targets,
 * inputs >= 16px) y contrato de estados de interacción (RUL-FLX-023 / RUL-FLX-024).
 */
export function LocationOptionSelectorModal({
  isOpen,
  title,
  searchPlaceholder,
  emptyMessage = 'No se encontraron coincidencias.',
  options,
  selectedValue,
  optionVariant,
  onSelect,
  onClose,
}: LocationOptionSelectorModalProps) {
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizarTextoBusqueda(query);
    if (!normalizedQuery) return options;
    return options.filter((item) =>
      normalizarTextoBusqueda(item).includes(normalizedQuery)
    );
  }, [options, query]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar selector"
        onClick={onClose}
        className="fixed inset-0 bg-[#090E1A]/60 backdrop-blur-xs"
      />
      <div className="relative z-10 flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-[var(--fx-border-card)] bg-[var(--fx-bg-surface)] shadow-2xl sm:max-h-[75vh] sm:max-w-md sm:rounded-[28px] dark:border-white/12 dark:bg-[#111827]">
        {/* Indicador visual tipo sheet en móvil */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-[var(--fx-border-subtle)]" />
        </div>

        {/* Encabezado */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--fx-border-subtle)] px-5 py-4">
          <h2 className="font-display text-lg font-bold text-[var(--fx-text-primary)]">
            {title}
          </h2>
          <IconButton
            aria-label="Cerrar selector"
            variant="ghost"
            size="md"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </div>

        {/* Buscador integrado */}
        <div className="border-b border-[var(--fx-border-subtle)] px-5 py-3">
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3.5 h-4 w-4 text-[var(--fx-text-muted)]"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="min-h-[44px] w-full rounded-xl border border-[var(--fx-border-subtle)] bg-[var(--fx-bg-surface-input)] py-2.5 pr-10 pl-10 text-base text-[var(--fx-text-primary)] placeholder:text-[var(--fx-text-muted)] transition-colors duration-150 focus:border-[var(--fx-border-focus)] dark:bg-[#1F2937]/80"
            />
            {query.length > 0 && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => {
                  setQuery('');
                  searchInputRef.current?.focus();
                }}
                className="fx-press absolute right-2 flex h-8 w-8 items-center justify-center rounded-full text-[var(--fx-text-muted)] hover:bg-[var(--fx-bg-hover)] hover:text-[var(--fx-text-primary)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de opciones con desplazamiento vertical */}
        <div
          role="listbox"
          aria-label={title}
          className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 safe-bottom"
        >
          {filteredOptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <p className="text-sm font-medium text-[var(--fx-text-secondary)]">
                {emptyMessage}
              </p>
              {query.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="fx-press mt-3 rounded-full border border-[var(--fx-border-subtle)] px-4 py-2 text-xs font-semibold text-[var(--fx-text-primary)] hover:bg-[var(--fx-bg-hover)]"
                >
                  Mostrar todos
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--fx-border-subtle)]/60">
              {filteredOptions.map((option) => {
                const isSelected = option === selectedValue;
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelect(option);
                      onClose();
                    }}
                    className={`fx-press flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left transition-colors duration-120 ${
                      isSelected
                        ? 'bg-[#111827]/8 font-semibold text-[#111827] dark:bg-white/12 dark:text-[#EDEDED]'
                        : 'text-[var(--fx-text-primary)] hover:bg-[var(--fx-bg-hover)] active:bg-[var(--fx-bg-active)]'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isSelected
                            ? 'bg-[#111827] text-[#EDEDED] dark:bg-[#EDEDED] dark:text-[#111827]'
                            : 'bg-[var(--fx-bg-surface-elevated)] text-[var(--fx-text-secondary)] dark:bg-white/8'
                        }`}
                        aria-hidden="true"
                      >
                        {optionVariant === 'city' ? (
                          <MapPin className="h-4 w-4" />
                        ) : (
                          <Compass className="h-4 w-4" />
                        )}
                      </span>
                      <span className="truncate text-base">{option}</span>
                    </span>

                    {isSelected && (
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#111827] text-[#EDEDED] dark:bg-[#EDEDED] dark:text-[#111827]"
                        aria-hidden="true"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LocationOptionSelectorModal;
