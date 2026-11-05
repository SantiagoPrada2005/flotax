import type {
  MantenimientoVehiculoSelect,
  MantenimientoVehiculoInsert,
  TipoMantenimientoVehiculo,
  EstadoMantenimientoVehiculo,
  EstadoVehiculo,
} from '@/db/schema';

export type {
  MantenimientoVehiculoSelect,
  MantenimientoVehiculoInsert,
  TipoMantenimientoVehiculo,
  EstadoMantenimientoVehiculo,
  EstadoVehiculo,
};

export interface CrearMantenimientoParams {
  vehiculoId: string;
  localId: string;
  creadoPorId: string;
  tipo: TipoMantenimientoVehiculo;
  etiqueta: string;
  descripcion?: string | undefined;
  tallerProveedor?: string | undefined;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  kilometrajeRegistro?: number | undefined;
  costoTotal?: number | undefined;
  estado?: EstadoMantenimientoVehiculo | undefined;
}

export interface ActualizarEstadoMantenimientoParams {
  id: string;
  localId: string;
  nuevoEstado: EstadoMantenimientoVehiculo;
  kilometrajeFinal?: number | undefined;
  costoFinal?: number | undefined;
  hoyISO?: string | undefined;
  vehiculoId?: string | undefined;
}

export interface AdvertenciaReservaSolapada {
  id: string;
  codigo: string;
  clienteNombre: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface ResultadoCrearMantenimiento {
  orden: MantenimientoVehiculoSelect;
  advertenciasReservas: AdvertenciaReservaSolapada[];
}

export interface ResultadoActualizarEstadoMantenimiento {
  orden: MantenimientoVehiculoSelect;
  nuevoEstadoVehiculo: EstadoVehiculo;
}
