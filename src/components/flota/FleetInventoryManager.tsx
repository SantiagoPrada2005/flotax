import { useState, useTransition } from 'react';
import { actions } from 'astro:actions';
import type { VehiculoItem, CategoriaVehiculo, EstadoVehiculo } from '@/lib/flota/types';

export interface FleetInventoryManagerProps {
  initialVehiculos: VehiculoItem[];
}

const CATEGORIAS: Array<{ id: CategoriaVehiculo | 'TODAS'; label: string }> = [
  { id: 'TODAS', label: 'Todas las categorías' },
  { id: 'SEDAN', label: 'Sedán' },
  { id: 'SUV', label: 'SUV' },
  { id: 'MOTO', label: 'Moto' },
  { id: 'PATINETA', label: 'Patineta' },
  { id: 'UTILITARIO', label: 'Utilitario' },
];

const ESTADOS_INFO: Record<
  EstadoVehiculo,
  { label: string; dotColor: string; bgActive: string; badgeText: string; desc: string }
> = {
  DISPONIBLE: {
    label: 'Disponible',
    dotColor: 'bg-emerald-500',
    bgActive: 'bg-emerald-500/10 text-emerald-800 border-emerald-300',
    badgeText: 'LISTA EN PATIO',
    desc: 'Listas para entrega inmediata',
  },
  RESERVADO: {
    label: 'En Alquiler',
    dotColor: 'bg-blue-500',
    bgActive: 'bg-blue-500/10 text-blue-800 border-blue-300',
    badgeText: 'CONTRATO ACTIVO',
    desc: 'En circulación con cliente',
  },
  MANTENIMIENTO: {
    label: 'Mantenimiento',
    dotColor: 'bg-amber-500',
    bgActive: 'bg-amber-500/10 text-amber-800 border-amber-300',
    badgeText: 'EN TALLER',
    desc: 'Revisión técnica o peritaje R2',
  },
  FUERA_SERVICIO: {
    label: 'Fuera de Servicio',
    dotColor: 'bg-[#4B5563]',
    bgActive: 'bg-gray-500/10 text-gray-800 border-gray-300',
    badgeText: 'INACTIVO',
    desc: 'Baja operativa o custodia',
  },
};

export default function FleetInventoryManager({ initialVehiculos }: FleetInventoryManagerProps) {
  const [vehiculos, setVehiculos] = useState<VehiculoItem[]>(initialVehiculos);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaVehiculo | 'TODAS'>('TODAS');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoVehiculo | 'TODOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [vistaModo, setVistaModo] = useState<'grid' | 'lista'>('grid');
  const [isPending, startTransition] = useTransition();
  const [mensajeToast, setMensajeToast] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [vehiculoAEliminar, setVehiculoAEliminar] = useState<VehiculoItem | null>(null);

  const mostrarToast = (texto: string, tipo: 'ok' | 'err' = 'ok') => {
    setMensajeToast({ tipo, texto });
    setTimeout(() => {
      setMensajeToast(null);
    }, 4000);
  };

  // Contadores por estado
  const conteos = {
    total: vehiculos.length,
    disponibles: vehiculos.filter((v) => v.estado === 'DISPONIBLE').length,
    enAlquiler: vehiculos.filter((v) => v.estado === 'RESERVADO').length,
    mantenimiento: vehiculos.filter((v) => v.estado === 'MANTENIMIENTO').length,
    fueraServicio: vehiculos.filter((v) => v.estado === 'FUERA_SERVICIO').length,
  };

  // Filtrado reactivo de unidades
  const vehiculosFiltrados = vehiculos.filter((v) => {
    if (categoriaSeleccionada !== 'TODAS' && v.categoria !== categoriaSeleccionada) {
      return false;
    }
    if (estadoSeleccionado !== 'TODOS' && v.estado !== estadoSeleccionado) {
      return false;
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const match =
        v.marca.toLowerCase().includes(q) ||
        v.modelo.toLowerCase().includes(q) ||
        v.placa.toLowerCase().includes(q) ||
        v.categoriaEtiqueta.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const cambiarEstadoRapido = async (id: string, nuevoEstado: EstadoVehiculo) => {
    const estadoPrevio = vehiculos.find((v) => v.id === id)?.estado;
    if (estadoPrevio === nuevoEstado) return;

    // Actualización optimista
    setVehiculos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, estado: nuevoEstado } : v))
    );

    startTransition(async () => {
      try {
        const { error, data } = await actions.flota.cambiarEstadoVehiculo({
          id,
          estado: nuevoEstado,
        });

        if (error || !data?.ok) {
          if (estadoPrevio) {
            setVehiculos((prev) =>
              prev.map((v) => (v.id === id ? { ...v, estado: estadoPrevio } : v))
            );
          }
          mostrarToast('No se pudo actualizar el estado de la unidad.', 'err');
          return;
        }

        const info = ESTADOS_INFO[nuevoEstado];
        mostrarToast(`Estado actualizado: ${info.label}.`);
      } catch {
        if (estadoPrevio) {
          setVehiculos((prev) =>
            prev.map((v) => (v.id === id ? { ...v, estado: estadoPrevio } : v))
          );
        }
        mostrarToast('Error de conexión al actualizar estado.', 'err');
      }
    });
  };

  const confirmarEliminar = async () => {
    if (!vehiculoAEliminar) return;
    const id = vehiculoAEliminar.id;
    const placa = vehiculoAEliminar.placa;
    setVehiculoAEliminar(null);

    // Optimista
    setVehiculos((prev) => prev.filter((v) => v.id !== id));

    startTransition(async () => {
      try {
        const { error, data } = await actions.flota.eliminarVehiculo({ id });
        if (error || !data?.ok) {
          mostrarToast('No se pudo retirar la unidad de la flota.', 'err');
          return;
        }
        mostrarToast(`Unidad ${placa} retirada exitosamente de la flota.`);
      } catch {
        mostrarToast('Error de red al retirar unidad.', 'err');
      }
    });
  };

  const formatPrecio = (precio: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(precio);

  return (
    <div className="space-y-6">
      {/* Toast Notification Flotante (Apple Pill Capsule) */}
      {mensajeToast && (
        <div
          role="status"
          className="fixed bottom-24 sm:bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full px-5 py-3 text-xs font-bold shadow-2xl backdrop-blur-xl border transition-all animate-fade-in bg-[#111827] text-white border-[#4B5563]"
        >
          {mensajeToast.tipo === 'ok' ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            </span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </span>
          )}
          <span>{mensajeToast.texto}</span>
        </div>
      )}

      {/* ===================================================================
          BENTO KPI METRICS: ESTADOS OPERATIVOS DE PATIO (INTERACTIVOS)
          =================================================================== */}
      <section aria-label="Métricas de patio y estado de flota">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {/* Bento 1: Disponibles */}
          <button
            type="button"
            onClick={() =>
              setEstadoSeleccionado((prev) => (prev === 'DISPONIBLE' ? 'TODOS' : 'DISPONIBLE'))
            }
            className={`ios-press-bounce text-left rounded-2xl p-3 border transition-all cursor-pointer ${estadoSeleccionado === 'DISPONIBLE'
                ? 'bg-[#111827] text-white border-[#111827] shadow-md'
                : 'bg-white text-[#111827] border-[#9CA3AF]/35 hover:border-[#111827] shadow-xs'
              }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span
                className={`font-mono text-[11px] font-bold uppercase tracking-wider ${estadoSeleccionado === 'DISPONIBLE' ? 'text-white' : 'text-[#4B5563]'
                  }`}
              >
                Disponibles
              </span>
            </div>
            <p className="mt-1 font-display text-xl sm:text-2xl font-bold tabular-nums">
              {conteos.disponibles}
            </p>
          </button>

          {/* Bento 2: En Alquiler */}
          <button
            type="button"
            onClick={() =>
              setEstadoSeleccionado((prev) => (prev === 'RESERVADO' ? 'TODOS' : 'RESERVADO'))
            }
            className={`ios-press-bounce text-left rounded-2xl p-3 border transition-all cursor-pointer ${estadoSeleccionado === 'RESERVADO'
                ? 'bg-[#111827] text-white border-[#111827] shadow-md'
                : 'bg-white text-[#111827] border-[#9CA3AF]/35 hover:border-[#111827] shadow-xs'
              }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              <span
                className={`font-mono text-[11px] font-bold uppercase tracking-wider ${estadoSeleccionado === 'RESERVADO' ? 'text-white' : 'text-[#4B5563]'
                  }`}
              >
                En Alquiler
              </span>
            </div>
            <p className="mt-1 font-display text-xl sm:text-2xl font-bold tabular-nums">
              {conteos.enAlquiler}
            </p>
          </button>

          {/* Bento 3: Mantenimiento */}
          <button
            type="button"
            onClick={() =>
              setEstadoSeleccionado((prev) => (prev === 'MANTENIMIENTO' ? 'TODOS' : 'MANTENIMIENTO'))
            }
            className={`ios-press-bounce text-left rounded-2xl p-3 border transition-all cursor-pointer ${estadoSeleccionado === 'MANTENIMIENTO'
                ? 'bg-[#111827] text-white border-[#111827] shadow-md'
                : 'bg-white text-[#111827] border-[#9CA3AF]/35 hover:border-[#111827] shadow-xs'
              }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span
                className={`font-mono text-[11px] font-bold uppercase tracking-wider ${estadoSeleccionado === 'MANTENIMIENTO' ? 'text-white' : 'text-[#4B5563]'
                  }`}
              >
                Mantenimiento
              </span>
            </div>
            <p className="mt-1 font-display text-xl sm:text-2xl font-bold tabular-nums">
              {conteos.mantenimiento}
            </p>
          </button>

          {/* Bento 4: Fuera de Servicio */}
          <button
            type="button"
            onClick={() =>
              setEstadoSeleccionado((prev) => (prev === 'FUERA_SERVICIO' ? 'TODOS' : 'FUERA_SERVICIO'))
            }
            className={`ios-press-bounce text-left rounded-2xl p-3 border transition-all cursor-pointer ${estadoSeleccionado === 'FUERA_SERVICIO'
                ? 'bg-[#111827] text-white border-[#111827] shadow-md'
                : 'bg-white text-[#111827] border-[#9CA3AF]/35 hover:border-[#111827] shadow-xs'
              }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#4B5563]"></span>
              <span
                className={`font-mono text-[11px] font-bold uppercase tracking-wider ${estadoSeleccionado === 'FUERA_SERVICIO' ? 'text-white' : 'text-[#4B5563]'
                  }`}
              >
                Fuera de Servicio
              </span>
            </div>
            <p className="mt-1 font-display text-xl sm:text-2xl font-bold tabular-nums">
              {conteos.fueraServicio}
            </p>
          </button>
        </div>
      </section>

      {/* ===================================================================
          BARRA DE CONTROL: BÚSQUEDA + PÍLDORAS DE CATEGORÍA + VISTA
          =================================================================== */}
      <section
        aria-label="Controles de búsqueda y filtros"
        className="rounded-[26px] bg-white p-4 sm:p-5 border border-[#9CA3AF]/40 shadow-xs space-y-4"
      >
        {/* Fila Superior: Buscador Apple + Switch Vista Grid/Lista */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4B5563]"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por placa, marca, modelo o tipo..."
              className="w-full rounded-2xl bg-[#EDEDED]/60 pl-11 pr-10 py-3 text-base text-[#111827] placeholder-[#9CA3AF] border border-transparent focus:border-[#111827] focus:bg-white focus:outline-none transition-all"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="ios-press-bounce absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full bg-[#9CA3AF]/30 p-1 text-xs text-[#111827] hover:bg-[#9CA3AF]/50 cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>

          {/* Toggle de Visualización Grid vs Lista */}
          <div className="hidden sm:flex items-center rounded-2xl bg-[#EDEDED] p-1 border border-[#9CA3AF]/30 shrink-0">
            <button
              type="button"
              onClick={() => setVistaModo('grid')}
              aria-label="Vista de cuadrícula"
              className={`ios-press-bounce flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition cursor-pointer ${vistaModo === 'grid'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#4B5563] hover:text-[#111827]'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setVistaModo('lista')}
              aria-label="Vista de lista"
              className={`ios-press-bounce flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition cursor-pointer ${vistaModo === 'lista'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#4B5563] hover:text-[#111827]'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <line x1="8" x2="21" y1="6" y2="6" />
                <line x1="8" x2="21" y1="12" y2="12" />
                <line x1="8" x2="21" y1="18" y2="18" />
                <line x1="3" x2="3.01" y1="6" y2="6" />
                <line x1="3" x2="3.01" y1="12" y2="12" />
                <line x1="3" x2="3.01" y1="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Fila Media: Píldoras de Categoría (Apple Tags Carousel) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoriaSeleccionada(cat.id)}
              className={`ios-press-bounce min-h-[38px] whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition cursor-pointer ${categoriaSeleccionada === cat.id
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'bg-[#EDEDED] text-[#111827] hover:bg-[#9CA3AF]/35'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/*INVENTARIO DE UNIDADES: STUDIO CARDS & LIST*/}
      {vehiculosFiltrados.length === 0 ? (
        <div className="rounded-[28px] bg-white p-10 sm:p-12 border border-[#9CA3AF]/40 text-center space-y-4 shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] border border-[#9CA3AF]/30 font-mono text-xl font-bold">
            ⛶
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-[#111827]">
              No se encontraron vehículos en patio
            </h3>
            <p className="text-xs font-medium text-[#4B5563] mt-1 max-w-sm mx-auto">
              No hay unidades que coincidan con los criterios de búsqueda o filtros seleccionados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setBusqueda('');
              setCategoriaSeleccionada('TODAS');
              setEstadoSeleccionado('TODOS');
            }}
            className="ios-press-bounce inline-flex min-h-[44px] items-center rounded-full bg-[#111827] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1F2937] cursor-pointer"
          >
            Restablecer todos los filtros
          </button>
        </div>
      ) : vistaModo === 'grid' ? (
        /* Vista Cuadrícula: Studio Bento Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {vehiculosFiltrados.map((vehiculo) => {
            const estadoInfo = ESTADOS_INFO[vehiculo.estado];

            return (
              <div
                key={vehiculo.id}
                className="group relative rounded-[28px] border border-[#9CA3AF]/40 bg-white p-4 sm:p-5 shadow-xs hover:border-[#111827] hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Fila Superior: Placa en Tag Mono + Estado Operativo + Destacado */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold tracking-wider text-[#111827] bg-[#EDEDED] px-3 py-1 rounded-lg border border-[#9CA3AF]/50 shadow-2xs">
                        {vehiculo.placa}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-[#4B5563] bg-[#EDEDED]/70 px-2.5 py-1 rounded-full">
                        {vehiculo.categoriaEtiqueta}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {vehiculo.destacado && (
                        <span className="font-mono text-[10px] font-bold text-[#111827] bg-[#EDEDED] px-2.5 py-1 rounded-full border border-[#9CA3AF]/50 flex items-center gap-1">
                          <span>★</span>
                          <span>DESTACADO</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stage Visual: Estudio con Radial Gradient & Zoom Suave */}
                  <div className="relative h-40 sm:h-44 w-full rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(237,237,237,0.85)_0%,rgba(237,237,237,0.25)_70%,transparent_100%)] flex items-center justify-center p-3 my-2 border border-[#9CA3AF]/20 overflow-hidden">
                    <img
                      src={vehiculo.imagenUrl}
                      alt={`${vehiculo.marca} ${vehiculo.modelo}`}
                      className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* Título de Unidad & Ficha Técnica Básica */}
                  <div className="space-y-0.5">
                    <h3 className="font-display font-bold text-lg text-[#111827] truncate">
                      {vehiculo.marca} {vehiculo.modelo}
                    </h3>
                    <p className="font-mono text-xs text-[#4B5563]">
                      {vehiculo.anio} · {vehiculo.transmision} · {vehiculo.combustible}
                    </p>
                  </div>

                  {/* Tira Bento Operativa: Tarifa / Día, Garantía, Odómetro */}
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-[#EDEDED]/50 p-2.5 text-center border border-[#9CA3AF]/25">
                    <div>
                      <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[#4B5563]">
                        Tarifa / día
                      </span>
                      <p className="font-display font-bold text-xs sm:text-sm text-[#111827] truncate tabular-nums mt-0.5">
                        {formatPrecio(vehiculo.precioDia)}
                      </p>
                    </div>
                    <div className="border-x border-[#9CA3AF]/30 px-1">
                      <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[#4B5563]">
                        Garantía
                      </span>
                      <p className="font-display font-bold text-xs sm:text-sm text-[#111827] truncate tabular-nums mt-0.5">
                        {formatPrecio(vehiculo.depositoGarantia)}
                      </p>
                    </div>
                    <div>
                      <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-[#4B5563]">
                        Odómetro
                      </span>
                      <p className="font-display font-bold text-xs sm:text-sm text-[#111827] truncate tabular-nums mt-0.5">
                        {vehiculo.kilometraje.toLocaleString('es-CO')} km
                      </p>
                    </div>
                  </div>
                </div>

                {/* Zona Operativa Inferior: Selector Rápido de Estado + Dock de Botones */}
                <div className="mt-4 pt-3 border-t border-[#EDEDED] space-y-3">
                  {/* Selector Rápido de Estado Operativo */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${estadoInfo.dotColor}`}></span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                        Estado Patio:
                      </span>
                    </div>

                    <select
                      value={vehiculo.estado}
                      disabled={isPending}
                      onChange={(e) =>
                        cambiarEstadoRapido(vehiculo.id, e.target.value as EstadoVehiculo)
                      }
                      className="ios-press-bounce rounded-xl border border-[#9CA3AF]/40 bg-white px-2.5 py-1.5 text-xs font-bold text-[#111827] focus:border-[#111827] focus:outline-none cursor-pointer"
                    >
                      <option value="DISPONIBLE">Disponible</option>
                      <option value="RESERVADO">En Alquiler</option>
                      <option value="MANTENIMIENTO">Mantenimiento</option>
                      <option value="FUERA_SERVICIO">Fuera de Servicio</option>
                    </select>
                  </div>

                  {/* Dock de Acciones Principales */}
                  <div className="flex items-center gap-2">
                    {/* Ver Ficha Pública */}
                    <a
                      href={`/vehiculos/${vehiculo.id}`}
                      title="Ver ficha pública del vehículo"
                      className="ios-press-bounce h-10 px-3.5 flex items-center justify-center gap-1.5 rounded-full border border-[#9CA3AF]/40 bg-white hover:bg-[#EDEDED] text-[#111827] transition shrink-0 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      <span className="text-xs font-bold">Ver</span>
                    </a>

                    {/* Modificar Unidad */}
                    <a
                      href={`/admin/flota/${vehiculo.id}/editar`}
                      className="ios-press-bounce flex-1 h-10 px-4 flex items-center justify-center gap-1.5 rounded-full bg-[#111827] hover:bg-[#1F2937] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                      <span className="truncate">Modificar</span>
                    </a>

                    {/* Retirar de la Flota */}
                    <button
                      type="button"
                      title="Retirar unidad de la flota"
                      onClick={() => setVehiculoAEliminar(vehiculo)}
                      className="ios-press-bounce h-10 w-10 flex items-center justify-center rounded-full border border-[#9CA3AF]/30 bg-white hover:bg-rose-50 hover:border-rose-300 text-[#4B5563] hover:text-rose-700 transition shrink-0 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Vista Lista: Filas Compactas con Estudio Horizontal */
        <div className="space-y-3">
          {vehiculosFiltrados.map((vehiculo) => {
            const estadoInfo = ESTADOS_INFO[vehiculo.estado];

            return (
              <div
                key={vehiculo.id}
                className="group rounded-[24px] border border-[#9CA3AF]/40 bg-white p-4 shadow-xs hover:border-[#111827] hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Thumbnail Estudio */}
                  <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-2xl bg-[#EDEDED]/70 flex items-center justify-center p-2 border border-[#9CA3AF]/20">
                    <img
                      src={vehiculo.imagenUrl}
                      alt={`${vehiculo.marca} ${vehiculo.modelo}`}
                      className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#111827] bg-[#EDEDED] px-2.5 py-0.5 rounded-md border border-[#9CA3AF]/40">
                        {vehiculo.placa}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-[#4B5563]">
                        {vehiculo.categoriaEtiqueta}
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-base text-[#111827] truncate mt-1">
                      {vehiculo.marca} {vehiculo.modelo}
                    </h4>

                    <p className="font-mono text-xs text-[#4B5563]">
                      {vehiculo.anio} · {vehiculo.transmision} · {formatPrecio(vehiculo.precioDia)}/día
                    </p>
                  </div>
                </div>

                {/* Acciones y Estado en Fila */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EDEDED]">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${estadoInfo.dotColor}`}></span>
                    <select
                      value={vehiculo.estado}
                      disabled={isPending}
                      onChange={(e) =>
                        cambiarEstadoRapido(vehiculo.id, e.target.value as EstadoVehiculo)
                      }
                      className="rounded-xl border border-[#9CA3AF]/40 bg-white px-3 py-2 text-xs font-bold text-[#111827] focus:border-[#111827] focus:outline-none cursor-pointer"
                    >
                      <option value="DISPONIBLE">Disponible</option>
                      <option value="RESERVADO">En Alquiler</option>
                      <option value="MANTENIMIENTO">Mantenimiento</option>
                      <option value="FUERA_SERVICIO">Fuera de Servicio</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`/vehiculos/${vehiculo.id}`}
                      className="ios-press-bounce h-9 px-3 rounded-full border border-[#9CA3AF]/40 bg-white hover:bg-[#EDEDED] text-[#111827] text-xs font-bold flex items-center justify-center cursor-pointer"
                    >
                      Ver
                    </a>
                    <a
                      href={`/admin/flota/${vehiculo.id}/editar`}
                      className="ios-press-bounce h-9 px-4 rounded-full bg-[#111827] hover:bg-[#1F2937] text-white text-xs font-bold flex items-center justify-center cursor-pointer"
                    >
                      Modificar
                    </a>
                    <button
                      type="button"
                      onClick={() => setVehiculoAEliminar(vehiculo)}
                      className="ios-press-bounce h-9 w-9 rounded-full border border-[#9CA3AF]/30 bg-white hover:bg-rose-50 hover:border-rose-300 text-[#4B5563] hover:text-rose-700 flex items-center justify-center cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================
          MODAL DE CONFIRMACIÓN: RETIRAR UNIDAD DE PATIO
          =================================================================== */}
      {vehiculoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-6 border border-[#9CA3AF]/40 shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDEDED] text-[#111827] border border-[#9CA3AF]/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[#111827]">
                ¿Retirar unidad de la flota?
              </h3>
              <p className="mt-1 text-xs font-medium text-[#4B5563] leading-relaxed">
                Está a punto de dar de baja la unidad{' '}
                <strong className="text-[#111827]">
                  {vehiculoAEliminar.marca} {vehiculoAEliminar.modelo} ({vehiculoAEliminar.placa})
                </strong>
                . Esta unidad ya no estará disponible para reserva, check-in ni catálogo público.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setVehiculoAEliminar(null)}
                className="ios-press-bounce min-h-[44px] rounded-full px-5 py-2.5 text-xs font-bold text-[#4B5563] hover:bg-[#EDEDED] transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminar}
                className="ios-press-bounce min-h-[44px] rounded-full bg-[#111827] px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer shadow-xs"
              >
                Sí, retirar unidad
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
