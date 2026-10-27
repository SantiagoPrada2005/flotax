import type { VehiculoSelect, CategoriaVehiculo } from '@/db/schema';

export type {
  CategoriaVehiculo,
  EstadoVehiculo,
  TransmisionVehiculo,
  CombustibleVehiculo,
} from '@/db/schema';

/** Columnas de `vehiculos` que el modelo de vista reutiliza tal cual. */
type ColumnasVehiculoItem = Pick<
  VehiculoSelect,
  | 'id'
  | 'marca'
  | 'modelo'
  | 'anio'
  | 'categoria'
  | 'categoriaEtiqueta'
  | 'placa'
  | 'estado'
  | 'precioDia'
  | 'depositoGarantia'
  | 'transmision'
  | 'combustible'
  | 'capacidadPasajeros'
  | 'kilometraje'
  | 'imagenUrl'
  | 'descripcion'
>;

/**
 * Modelo de vista de una unidad de flota.
 *
 * Deriva del schema Drizzle. Sólo declara lo que el mapper (`mapD1ToVehiculoItem`)
 * transforma: las columnas nullable que él rellena con defaults y los campos
 * calculados que no existen en `vehiculos`.
 */
export type VehiculoItem = ColumnasVehiculoItem & {
  localId?: string | undefined;
  localSlug?: string | undefined;
  autonomiaKm?: number | undefined;
  destacado?: boolean | undefined;
  aceleracion: string;
  velocidadMaxima: string;
  rating: number;
  autonomiaOdo: string;
  marcaLogo?: string | undefined;
  tipoPropulsionIcon?: 'electric' | 'gas' | 'hybrid' | undefined;
};

export interface FiltrosBusquedaVehiculo {
  query?: string | undefined;
  categoria?: CategoriaVehiculo | 'TODOS' | undefined;
  soloDisponibles?: boolean | undefined;
  localId?: string | undefined;
}

export type MotivoBloqueoDisponibilidad = 'RESERVADO' | 'MANTENIMIENTO';

export interface BloqueNoDisponible {
  id: string;
  vehiculoId: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD (inclusive)
  motivo: MotivoBloqueoDisponibilidad;
  etiqueta: string;
}

export interface FranjaDisponible {
  id: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD (inclusive)
  diasDisponibles: number;
  etiquetaCorta: string; // ej: "10 Oct – 16 Oct"
}

export type EstadoDiaCalendario =
  | 'PASADO'
  | 'DISPONIBLE'
  | 'RESERVADO'
  | 'MANTENIMIENTO';

export interface DiaCalendarioItem {
  fechaISO: string;       // YYYY-MM-DD
  numeroDia: number;      // 1..31
  diaSemanaIndice: number; // 0 (Lun) .. 6 (Dom)
  diaSemanaCorto: string; // "LUN", "MAR", etc.
  estado: EstadoDiaCalendario;
  etiquetaBloqueo?: string | undefined;
  franjaId?: string | undefined;
}

export interface CotizacionAlquiler {
  vehiculoId: string;
  fechaInicio: string;
  fechaFin: string;
  diasAlquiler: number;
  precioDia: number;
  subtotalTarifa: number;
  coberturaPericial: number;
  depositoGarantia: number;
  totalAlquiler: number;
  abonoMinimoReserva: number;
}

