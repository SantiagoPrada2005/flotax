import { useState, useTransition } from 'react';
import { actions } from 'astro:actions';
import type { VehiculoItem, CategoriaVehiculo, EstadoVehiculo } from '@/lib/flota/types';

export interface FleetInventoryManagerProps {
  initialVehiculos: VehiculoItem[];
}

const CATEGORIAS: Array<{ id: CategoriaVehiculo | 'TODAS'; label: string }> = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'SEDAN', label: 'Sedán' },
  { id: 'SUV', label: 'SUV' },
  { id: 'MOTO', label: 'Moto' },
  { id: 'PATINETA', label: 'Patineta' },
  { id: 'UTILITARIO', label: 'Utilitario' },
];

export default function FleetInventoryManager({ initialVehiculos }: FleetInventoryManagerProps) {
  const [vehiculos, setVehiculos] = useState<VehiculoItem[]>(initialVehiculos);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaVehiculo | 'TODAS'>('TODAS');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<EstadoVehiculo | 'TODOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
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

  // Filtrado de lista
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
    // Actualización optimista
    const estadoPrevio = vehiculos.find((v) => v.id === id)?.estado;
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
          // Revertir optimismo
          if (estadoPrevio) {
            setVehiculos((prev) =>
              prev.map((v) => (v.id === id ? { ...v, estado: estadoPrevio } : v))
            );
          }
          mostrarToast('No se pudo actualizar el estado de la unidad.', 'err');
          return;
        }

        mostrarToast(`Estado de la unidad actualizado a ${nuevoEstado}.`);
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
    <div className="space-y-4">
      {/* Toast Notification */}
      {mensajeToast && (
        <div
          role="status"
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold shadow-lg transition-all animate-bounce ${
            mensajeToast.tipo === 'ok'
              ? 'bg-[#111827] text-white border border-[#4B5563]'
              : 'bg-rose-900 text-white border border-rose-700'
          }`}
        >
          {mensajeToast.tipo === 'ok' ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-rose-300">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          )}
          <span>{mensajeToast.texto}</span>
        </div>
      )}

      {/* Tarjetas Bento de Resumen y Métricas Rápidas */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setEstadoSeleccionado('DISPONIBLE')}
          className={`text-left rounded-2xl p-3 border transition-all ${
            estadoSeleccionado === 'DISPONIBLE'
              ? 'bg-[#111827] text-white border-[#111827] shadow-md'
              : 'bg-white text-[#111827] border-[#9CA3AF]/30 hover:border-[#4B5563]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${estadoSeleccionado === 'DISPONIBLE' ? 'text-emerald-400' : 'text-emerald-700'}`}>
              Disponibles
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
          <p className="mt-1 font-display text-2xl font-black">{conteos.disponibles}</p>
          <span className={`text-[10px] ${estadoSeleccionado === 'DISPONIBLE' ? 'text-gray-300' : 'text-[#4B5563]'}`}>
            Listas para entrega
          </span>
        </button>

        <button
          type="button"
          onClick={() => setEstadoSeleccionado('RESERVADO')}
          className={`text-left rounded-2xl p-3 border transition-all ${
            estadoSeleccionado === 'RESERVADO'
              ? 'bg-[#111827] text-white border-[#111827] shadow-md'
              : 'bg-white text-[#111827] border-[#9CA3AF]/30 hover:border-[#4B5563]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${estadoSeleccionado === 'RESERVADO' ? 'text-blue-300' : 'text-blue-700'}`}>
              En Alquiler
            </span>
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
          </div>
          <p className="mt-1 font-display text-2xl font-black">{conteos.enAlquiler}</p>
          <span className={`text-[10px] ${estadoSeleccionado === 'RESERVADO' ? 'text-gray-300' : 'text-[#4B5563]'}`}>
            Contratos activos
          </span>
        </button>

        <button
          type="button"
          onClick={() => setEstadoSeleccionado('MANTENIMIENTO')}
          className={`text-left rounded-2xl p-3 border transition-all ${
            estadoSeleccionado === 'MANTENIMIENTO'
              ? 'bg-[#111827] text-white border-[#111827] shadow-md'
              : 'bg-white text-[#111827] border-[#9CA3AF]/30 hover:border-[#4B5563]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${estadoSeleccionado === 'MANTENIMIENTO' ? 'text-amber-300' : 'text-amber-700'}`}>
              Mantenimiento
            </span>
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
          </div>
          <p className="mt-1 font-display text-2xl font-black">{conteos.mantenimiento}</p>
          <span className={`text-[10px] ${estadoSeleccionado === 'MANTENIMIENTO' ? 'text-gray-300' : 'text-[#4B5563]'}`}>
            En taller o revisión
          </span>
        </button>

        <button
          type="button"
          onClick={() => setEstadoSeleccionado('FUERA_SERVICIO')}
          className={`text-left rounded-2xl p-3 border transition-all ${
            estadoSeleccionado === 'FUERA_SERVICIO'
              ? 'bg-[#111827] text-white border-[#111827] shadow-md'
              : 'bg-white text-[#111827] border-[#9CA3AF]/30 hover:border-[#4B5563]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${estadoSeleccionado === 'FUERA_SERVICIO' ? 'text-rose-300' : 'text-rose-700'}`}>
              Fuera Servicio
            </span>
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
          </div>
          <p className="mt-1 font-display text-2xl font-black">{conteos.fueraServicio}</p>
          <span className={`text-[10px] ${estadoSeleccionado === 'FUERA_SERVICIO' ? 'text-gray-300' : 'text-[#4B5563]'}`}>
            Inactivas / Bajas
          </span>
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="rounded-2xl bg-white p-3.5 border border-[#9CA3AF]/30 shadow-xs space-y-3">
        {/* Input de Búsqueda con regla 16px font-size para iOS */}
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por placa, modelo o marca..."
            className="w-full rounded-xl bg-[#EDEDED]/50 pl-10 pr-4 py-2.5 text-base text-[#111827] placeholder-[#9CA3AF] border border-transparent focus:border-[#4B5563] focus:bg-white focus:outline-none transition-all"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B5563] hover:text-[#111827]"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Píldoras de Categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoriaSeleccionada(cat.id)}
              className={`min-h-[36px] whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                categoriaSeleccionada === cat.id
                  ? 'bg-[#111827] text-white shadow-xs'
                  : 'bg-[#EDEDED] text-[#4B5563] hover:bg-[#9CA3AF]/30'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filtro de Estado Activo y Botón Todos */}
        <div className="flex items-center justify-between pt-1 border-t border-[#EDEDED] text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#4B5563]">Filtro estado:</span>
            <button
              type="button"
              onClick={() => setEstadoSeleccionado('TODOS')}
              className={`font-semibold px-2 py-0.5 rounded-md ${
                estadoSeleccionado === 'TODOS'
                  ? 'bg-[#111827] text-white'
                  : 'text-[#4B5563] hover:text-[#111827]'
              }`}
            >
              Todos ({vehiculos.length})
            </button>
          </div>
          <span className="font-mono text-[11px] text-[#4B5563]">
            {vehiculosFiltrados.length} encontrados
          </span>
        </div>
      </div>

      {/* Lista de Unidades */}
      <div className="space-y-3">
        {vehiculosFiltrados.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 border border-[#9CA3AF]/30 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EDEDED] text-[#4B5563]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-[#111827]">No se encontraron vehículos</p>
              <p className="text-xs text-[#4B5563] mt-0.5">
                No hay unidades que coincidan con los filtros seleccionados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setBusqueda('');
                setCategoriaSeleccionada('TODAS');
                setEstadoSeleccionado('TODOS');
              }}
              className="inline-flex min-h-[44px] items-center rounded-xl bg-[#111827] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1F2937]"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          vehiculosFiltrados.map((vehiculo) => {
            const isElectrico =
              vehiculo.combustible === 'Eléctrico' || vehiculo.combustible === 'Híbrido';

            return (
              <div
                key={vehiculo.id}
                className="rounded-2xl bg-white p-4 border border-[#9CA3AF]/30 shadow-xs hover:border-[#4B5563]/40 transition space-y-3 overflow-hidden"
              >
                {/* Cabecera de la Unidad: Foto + Datos Principales */}
                <div className="flex items-start gap-3">
                  <div className="relative h-18 w-24 shrink-0 overflow-hidden rounded-xl bg-[#EDEDED] flex items-center justify-center">
                    <img
                      src={vehiculo.imagenUrl}
                      alt={`${vehiculo.marca} ${vehiculo.modelo}`}
                      className="h-full w-full object-contain p-1"
                      loading="lazy"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-black tracking-wide text-[#111827] bg-[#EDEDED] px-2 py-0.5 rounded border border-[#9CA3AF]/40">
                        {vehiculo.placa}
                      </span>
                      {vehiculo.destacado && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          ★ Destacado
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-sm text-[#111827] truncate mt-1">
                      {vehiculo.marca} {vehiculo.modelo}
                    </h3>

                    <div className="flex items-center gap-2 text-[11px] text-[#4B5563] mt-0.5">
                      <span>{vehiculo.anio}</span>
                      <span>•</span>
                      <span>{vehiculo.categoriaEtiqueta}</span>
                      <span>•</span>
                      <span>{isElectrico ? '⚡ Eléctrico' : '⛽ ' + vehiculo.combustible}</span>
                    </div>
                  </div>
                </div>

                {/* Métricas Operativas: Tarifa, Depósito, Odómetro */}
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#EDEDED]/40 p-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-[#4B5563]">Tarifa / día</span>
                    <p className="font-bold text-[#111827] truncate">
                      {formatPrecio(vehiculo.precioDia)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#4B5563]">Garantía</span>
                    <p className="font-bold text-[#111827] truncate">
                      {formatPrecio(vehiculo.depositoGarantia)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#4B5563]">Odómetro</span>
                    <p className="font-bold text-[#111827] truncate">
                      {vehiculo.kilometraje.toLocaleString('es-CO')} km
                    </p>
                  </div>
                </div>

                {/* Fila 1 Operativa: Selector Rápido de Estado */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EDEDED]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563] shrink-0">
                      Estado:
                    </span>
                    <select
                      value={vehiculo.estado}
                      disabled={isPending}
                      onChange={(e) =>
                        cambiarEstadoRapido(vehiculo.id, e.target.value as EstadoVehiculo)
                      }
                      className="rounded-lg border border-[#9CA3AF]/40 bg-white px-2 py-1 text-xs font-bold text-[#111827] focus:border-[#4B5563] focus:outline-none cursor-pointer"
                    >
                      <option value="DISPONIBLE">🟢 Disponible</option>
                      <option value="RESERVADO">🔵 En Alquiler</option>
                      <option value="MANTENIMIENTO">🟠 Mantenimiento</option>
                      <option value="FUERA_SERVICIO">🔴 Fuera de Servicio</option>
                    </select>
                  </div>

                  <span className="font-mono text-[10px] text-[#9CA3AF] shrink-0">
                    {vehiculo.transmision}
                  </span>
                </div>

                {/* Fila 2 Acciones: Botones Proporcionales (100% contenidos dentro del recuadro) */}
                <div className="flex items-center gap-2 w-full pt-0.5">
                  {/* Botón Ver Ficha */}
                  <a
                    href={`/vehiculos/${vehiculo.id}`}
                    title="Ver ficha pública del cliente"
                    className="h-10 px-3 flex items-center justify-center gap-1.5 rounded-xl bg-[#EDEDED] text-[#4B5563] hover:text-[#111827] hover:bg-[#9CA3AF]/30 transition shrink-0 border border-[#9CA3AF]/30 active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span className="text-xs font-semibold">Ver</span>
                  </a>

                  {/* Botón Modificar (Acción Principal, expandido proporcionalmente) */}
                  <a
                    href={`/admin/flota/${vehiculo.id}/editar`}
                    className="h-10 flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-xl bg-[#111827] hover:bg-[#1F2937] px-3 text-xs font-bold text-white shadow-xs transition active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                    <span className="truncate">Modificar</span>
                  </a>

                  {/* Botón Retirar de la Flota */}
                  <button
                    type="button"
                    title="Retirar de la flota"
                    onClick={() => setVehiculoAEliminar(vehiculo)}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition active:scale-95 shrink-0 border border-rose-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Confirmación para Retirar / Dar de baja */}
      {vehiculoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 border border-[#9CA3AF]/40 shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
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
              <p className="mt-1 text-xs text-[#4B5563]">
                Está a punto de dar de baja la unidad{' '}
                <strong className="text-[#111827]">
                  {vehiculoAEliminar.marca} {vehiculoAEliminar.modelo} ({vehiculoAEliminar.placa})
                </strong>
                . Ya no estará disponible para alquiler ni catálogo.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVehiculoAEliminar(null)}
                className="min-h-[44px] rounded-xl px-4 py-2 text-xs font-semibold text-[#4B5563] hover:bg-[#EDEDED] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminar}
                className="min-h-[44px] rounded-xl bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800 transition active:scale-95"
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
