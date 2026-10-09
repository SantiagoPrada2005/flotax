import { useState, useDeferredValue, useEffect, useId } from 'react';
import type { CategoriaVehiculo } from '@/lib/flota/types';
import { buscarVehiculos } from '@/lib/flota/mock-vehiculos';
import VehicleSearchResultItem from './VehicleSearchResultItem';

export interface VehicleSearchSpotlightProps {
  isOpen: boolean;
  onClose: () => void;
  query?: string | undefined;
  onQueryChange?: ((q: string) => void) | undefined;
}

const CATEGORIAS: Array<{ id: CategoriaVehiculo | 'TODOS'; label: string }> = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'SEDAN', label: 'Sedanes' },
  { id: 'SUV', label: 'SUVs' },
  { id: 'MOTO', label: 'Motos' },
  { id: 'PATINETA', label: 'Patinetas' },
  { id: 'UTILITARIO', label: 'Utilitarios' },
];

export default function VehicleSearchSpotlight({
  isOpen,
  onClose,
  query: externalQuery,
  onQueryChange,
}: VehicleSearchSpotlightProps) {
  const [internalQuery, setInternalQuery] = useState('');
  const activeQuery = externalQuery !== undefined ? externalQuery : internalQuery;
  const setQuery = onQueryChange || setInternalQuery;
  const [categoria, setCategoria] = useState<CategoriaVehiculo | 'TODOS'>('TODOS');
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const deferredQuery = useDeferredValue(activeQuery);
  const listId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resultados = buscarVehiculos({
    query: deferredQuery,
    categoria,
    soloDisponibles,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscador de vehículos FlotaX"
      className="fixed inset-0 z-40 flex flex-col ios-spotlight-backdrop pt-20 px-4 sm:px-6 safe-bottom overflow-hidden animate-in fade-in duration-200"
    >
      <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col min-h-0">
        {/* Barra de Filtros Rápidos */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 no-scrollbar shrink-0">
          {CATEGORIAS.map((cat) => {
            const isActive = categoria === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoria(cat.id)}
                className={`ios-press-bounce shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${isActive
                    ? 'bg-[#111827] text-white shadow-xs'
                    : 'bg-white border border-[#9CA3AF]/40 text-[#4B5563] hover:text-[#111827]'
                  }`}
              >
                {cat.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSoloDisponibles(!soloDisponibles)}
            className={`ios-press-bounce shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition border ${soloDisponibles
                ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                : 'bg-white border-[#9CA3AF]/40 text-[#4B5563]'
              }`}
          >
            {soloDisponibles ? '✓ Solo Disponibles' : 'Disponibles ya'}
          </button>
        </div>

        {/* Encabezado contextual de resultados */}
        <div className="flex items-center justify-between py-2 shrink-0 border-b border-[#9CA3AF]/20">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
            {activeQuery.trim() ? `Resultados (${resultados.length})` : 'Flota Recomendada'}
          </p>

        </div>

        {/* Lista de Resultados con Scroll Fluido */}
        <div
          id={listId}
          className="flex-1 overflow-y-auto py-3 space-y-2.5 no-scrollbar min-h-0"
        >
          {resultados.length > 0 ? (
            resultados.map((vehiculo) => (
              <VehicleSearchResultItem
                key={vehiculo.id}
                vehiculo={vehiculo}
                onSelect={onClose}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-[#9CA3AF]/30 shadow-xs text-[#9CA3AF]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-base font-bold text-[#111827]">
                No encontramos vehículos
              </h3>
              <p className="mt-1 text-xs text-[#4B5563] max-w-xs">
                No hay resultados para "{activeQuery}". Prueba buscando por tipo ("SUV", "Moto"), placa o eliminando filtros.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategoria('TODOS');
                  setSoloDisponibles(false);
                }}
                className="mt-4 rounded-full bg-[#111827] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1F2937]"
              >
                Restablecer Búsqueda
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
