import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { navigate } from 'astro:transitions/client';
import type { VehiculoItem, BloqueNoDisponible } from '@/lib/flota/types';
import type {
  MantenimientoVehiculoSelect,
  EstadoVehiculo,
  AdvertenciaReservaSolapada,
} from '@/lib/mantenimientos/types';
import AvailabilityHeader from './AvailabilityHeader';
import AvailabilityOverviewView from './AvailabilityOverviewView';
import MaintenanceWizardFlow from './MaintenanceWizardFlow';
import CompleteMaintenanceModal from './CompleteMaintenanceModal';

export interface VehicleAvailabilityIslandProps {
  vehiculo: VehiculoItem;
  hoyISO: string;
  bloquesIniciales?: BloqueNoDisponible[] | undefined;
  ordenesIniciales?: MantenimientoVehiculoSelect[] | undefined;
}

type ModoVista = 'TABLERO' | 'WIZARD';

interface ToastNotificacion {
  mensaje: string;
  tipo: 'ok' | 'adv' | 'err';
}

export default function VehicleAvailabilityIsland({
  vehiculo,
  hoyISO,
  bloquesIniciales = [],
  ordenesIniciales = [],
}: VehicleAvailabilityIslandProps) {
  const [modo, setModo] = useState<ModoVista>('TABLERO');
  const [ordenSeleccionadaParaCierre, setOrdenSeleccionadaParaCierre] =
    useState<MantenimientoVehiculoSelect | null>(null);

  // Estados locales optimistas
  const [vehiculoActual, setVehiculoActual] = useState<VehiculoItem>(vehiculo);
  const [ordenes, setOrdenes] = useState<MantenimientoVehiculoSelect[]>(ordenesIniciales);
  const [bloques, setBloques] = useState<BloqueNoDisponible[]>(bloquesIniciales);

  // Selección de fechas compartida con el wizard
  const [rangoSeleccionado, setRangoSeleccionado] = useState<{
    inicio: string | null;
    fin: string | null;
  }>({ inicio: null, fin: null });

  // Notificaciones Toast operativas
  const [toast, setToast] = useState<ToastNotificacion | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarToast = useCallback(
    (mensaje: string, tipo: 'ok' | 'adv' | 'err' = 'ok', duracionMs = 5000) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setToast({ mensaje, tipo });
      timeoutRef.current = setTimeout(() => {
        setToast(null);
        timeoutRef.current = null;
      }, duracionMs);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Orden activa en taller (si existe alguna con estado EN_TALLER)
  const ordenTallerActiva = useMemo(
    () => ordenes.find((o) => o.estado === 'EN_TALLER') ?? null,
    [ordenes]
  );

  // Manejador optimista tras crear una orden en el Wizard
  const manejarExitoCreacionMantenimiento = useCallback(
    (
      nuevaOrden: MantenimientoVehiculoSelect,
      advertencias?: AdvertenciaReservaSolapada[]
    ) => {
      // 1. Agregar nueva orden al historial técnico
      setOrdenes((prev) => {
        const filtradas = prev.filter((o) => o.id !== nuevaOrden.id);
        return [nuevaOrden, ...filtradas];
      });

      // 2. Insertar bloque en la franja de disponibilidad
      const nuevoBloque: BloqueNoDisponible = {
        id: `blq-mant-${nuevaOrden.id}`,
        vehiculoId: vehiculoActual.id,
        fechaInicio: nuevaOrden.fechaInicio,
        fechaFin: nuevaOrden.fechaFin,
        motivo: 'MANTENIMIENTO',
        etiqueta: nuevaOrden.etiqueta,
      };
      setBloques((prev) => [...prev, nuevoBloque]);

      // 3. Si la orden entra en taller de inmediato, actualizar estado del vehículo
      if (
        nuevaOrden.estado === 'EN_TALLER' ||
        (nuevaOrden.fechaInicio <= hoyISO && nuevaOrden.fechaFin >= hoyISO)
      ) {
        setVehiculoActual((prev) => ({
          ...prev,
          estado: 'MANTENIMIENTO',
        }));
      }

      // 4. Feedback operativo mediante Toast
      if (advertencias && advertencias.length > 0) {
        mostrarToast(
          `Mantenimiento registrado. ¡Atención! Existen ${advertencias.length} reserva(s) en conflicto con estas fechas de taller.`,
          'adv',
          8000
        );
      } else {
        mostrarToast('Mantenimiento y bloqueo programado con éxito.', 'ok', 4000);
      }

      // 5. Retornar al tablero
      setModo('TABLERO');
      setRangoSeleccionado({ inicio: null, fin: null });
    },
    [hoyISO, mostrarToast, vehiculoActual.id]
  );

  // Manejador optimista tras registrar salida de taller en el modal
  const manejarExitoSalidaTaller = useCallback(
    (
      ordenActualizada: MantenimientoVehiculoSelect,
      nuevoEstadoVehiculo: EstadoVehiculo
    ) => {
      // 1. Reemplazar la orden completada en el historial
      setOrdenes((prev) =>
        prev.map((o) => (o.id === ordenActualizada.id ? ordenActualizada : o))
      );

      // 2. Liberar el bloque de indisponibilidad
      setBloques((prev) =>
        prev.filter(
          (b) =>
            !(
              b.motivo === 'MANTENIMIENTO' &&
              (b.id === ordenActualizada.id ||
                b.id === `blq-mant-${ordenActualizada.id}` ||
                (b.fechaInicio === ordenActualizada.fechaInicio &&
                  b.etiqueta === ordenActualizada.etiqueta))
            )
        )
      );

      // 3. Actualizar odómetro y estado del vehículo
      setVehiculoActual((prev) => ({
        ...prev,
        estado: nuevoEstadoVehiculo,
        kilometraje: ordenActualizada.kilometrajeRegistro ?? prev.kilometraje,
      }));

      // 4. Feedback operativo mediante Toast
      const estadoEtiqueta =
        nuevoEstadoVehiculo === 'DISPONIBLE'
          ? 'DISPONIBLE en patio'
          : nuevoEstadoVehiculo;

      mostrarToast(
        `Salida de taller registrada exitosamente. Vehículo conmutado a ${estadoEtiqueta}.`,
        'ok',
        5000
      );

      // 5. Cerrar modal de salida
      setOrdenSeleccionadaParaCierre(null);
    },
    [mostrarToast]
  );

  return (
    <div className="w-full">
      {/* Toast Notificación Flotante con Invarianza Cromática */}
      {toast && (
        <aside
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold shadow-2xl border transition-all animate-fade-in max-w-md ${
            toast.tipo === 'ok'
              ? 'bg-[#111827] text-[#EDEDED] border-status-success/60 ring-1 ring-status-success/30'
              : toast.tipo === 'adv'
              ? 'bg-[#1F2937] text-amber-200 border-amber-400/80 ring-1 ring-amber-400/30'
              : 'bg-[#111827] text-rose-200 border-rose-500/80 ring-1 ring-rose-500/30'
          }`}
        >
          <span className="text-base shrink-0" aria-hidden="true">
            {toast.tipo === 'ok' ? '✓' : toast.tipo === 'adv' ? '⚠️' : '✕'}
          </span>
          <span className="leading-snug text-left">{toast.mensaje}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-auto min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs opacity-70 hover:opacity-100 rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </aside>
      )}

      {/* Modo 1: Wizard Inmersivo Typeform */}
      {modo === 'WIZARD' ? (
        <MaintenanceWizardFlow
          vehiculo={vehiculoActual}
          hoyISO={hoyISO}
          bloques={bloques}
          fechaInicioInicial={rangoSeleccionado.inicio}
          fechaFinInicial={rangoSeleccionado.fin}
          onCancel={() => setModo('TABLERO')}
          onSuccess={manejarExitoCreacionMantenimiento}
        />
      ) : (
        /* Modo 2: Tablero Principal de Disponibilidad y Órdenes */
        <div className="space-y-4 sm:space-y-6">
          <AvailabilityHeader
            vehiculo={vehiculoActual}
            onBack={() => {
              void navigate('/admin/flota');
            }}
          />

          <AvailabilityOverviewView
            vehiculo={vehiculoActual}
            hoyISO={hoyISO}
            bloques={bloques}
            ordenActiva={ordenTallerActiva}
            ordenesHistorial={ordenes}
            onProgramarMantenimiento={() => setModo('WIZARD')}
            onRegistrarSalidaTaller={(ord) => setOrdenSeleccionadaParaCierre(ord)}
            fechaInicioSeleccionada={rangoSeleccionado.inicio}
            fechaFinSeleccionada={rangoSeleccionado.fin}
            onCambiarRango={(inicio, fin) =>
              setRangoSeleccionado({ inicio, fin })
            }
          />

          <CompleteMaintenanceModal
            isOpen={Boolean(ordenSeleccionadaParaCierre)}
            orden={ordenSeleccionadaParaCierre}
            vehiculo={vehiculoActual}
            onClose={() => setOrdenSeleccionadaParaCierre(null)}
            onSuccess={manejarExitoSalidaTaller}
          />
        </div>
      )}
    </div>
  );
}
