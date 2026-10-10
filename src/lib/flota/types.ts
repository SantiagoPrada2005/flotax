export type CategoriaVehiculo = 'SEDAN' | 'SUV' | 'MOTO' | 'PATINETA' | 'UTILITARIO';

export type EstadoVehiculo = 'DISPONIBLE' | 'RESERVADO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';

export interface VehiculoItem {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  categoria: CategoriaVehiculo;
  categoriaEtiqueta: string;
  placa: string;
  estado: EstadoVehiculo;
  precioDia: number;
  depositoGarantia: number;
  transmision: 'Automática' | 'Manual' | 'Eléctrica';
  combustible: 'Gasolina' | 'Diésel' | 'Eléctrico' | 'Híbrido';
  capacidadPasajeros: number;
  autonomiaKm?: number | undefined;
  kilometraje: number;
  imagenUrl: string;
  destacado?: boolean | undefined;
  descripcion: string;
  // Métricas del diseño de referencia móvil (Pantalla 1 y 3)
  aceleracion: string;         // ej: "3.8 s" (0-100 km/h)
  velocidadMaxima: string;     // ej: "210 km/h" o "155 mph"
  rating: number;              // ej: 4.8
  autonomiaOdo: string;        // ej: "480 km" o "18.400 km"
  marcaLogo?: string | undefined;
  tipoPropulsionIcon?: 'electric' | 'gas' | 'hybrid' | undefined;
}

export interface FiltrosBusquedaVehiculo {
  query?: string | undefined;
  categoria?: CategoriaVehiculo | 'TODOS' | undefined;
  soloDisponibles?: boolean | undefined;
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

