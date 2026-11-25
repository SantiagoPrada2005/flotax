import type {
  VehiculoSelect,
  CategoriaVehiculo,
  UnidadMedidaUso,
  EspecificacionesBentoVehiculoSchema,
  ZonaEvidenciaVehiculo,
} from '@/db/schema';

export type {
  CategoriaVehiculo,
  EstadoVehiculo,
  TransmisionVehiculo,
  CombustibleVehiculo,
  UnidadMedidaUso,
  EspecificacionesBentoVehiculoSchema,
  ZonaEvidenciaVehiculo,
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

export type CategoriaGaleriaVehiculo = 'EXTERIOR' | 'INTERIOR' | 'ESTADO';

export interface PerspectivaGaleriaConfig {
  zona: ZonaEvidenciaVehiculo;
  etiqueta: string;
  descripcion: string;
  categoria: CategoriaGaleriaVehiculo;
  obligatoria: boolean;
  multiple: boolean;
  esPrincipalPorDefecto: boolean;
}

export const PERSPECTIVAS_GALERIA_VEHICULO: readonly PerspectivaGaleriaConfig[] = [
  {
    zona: 'EXTERIOR_LATERAL_IZQ',
    etiqueta: 'Fotografía lateral (Principal)',
    descripcion: 'Vista lateral principal del vehículo (obligatoria).',
    categoria: 'EXTERIOR',
    obligatoria: true,
    multiple: false,
    esPrincipalPorDefecto: true,
  },
  {
    zona: 'EXTERIOR_FRONTAL',
    etiqueta: 'Fotografía frontal',
    descripcion: 'Vista delantera completa del vehículo y placa.',
    categoria: 'EXTERIOR',
    obligatoria: false,
    multiple: false,
    esPrincipalPorDefecto: false,
  },
  {
    zona: 'EXTERIOR_TRASERO',
    etiqueta: 'Fotografía trasera',
    descripcion: 'Vista posterior, luces traseras y compuerta.',
    categoria: 'EXTERIOR',
    obligatoria: false,
    multiple: false,
    esPrincipalPorDefecto: false,
  },
  {
    zona: 'EXTERIOR_LATERAL_DER',
    etiqueta: 'Fotografía lateral opuesta',
    descripcion: 'Costado contrario para mostrar estado integral de carrocería.',
    categoria: 'EXTERIOR',
    obligatoria: false,
    multiple: false,
    esPrincipalPorDefecto: false,
  },
  {
    zona: 'INTERIOR_ASIENTOS',
    etiqueta: 'Cojinería y asientos',
    descripcion: 'Estado de los asientos delanteros, traseros y tapicería.',
    categoria: 'INTERIOR',
    obligatoria: false,
    multiple: false,
    esPrincipalPorDefecto: false,
  },
  {
    zona: 'PANTALLA_TABLERO_ODOMETRO',
    etiqueta: 'Tablero y condiciones',
    descripcion: 'Instrumentos, pantalla, volante y consola principal.',
    categoria: 'ESTADO',
    obligatoria: false,
    multiple: false,
    esPrincipalPorDefecto: false,
  },
  {
    zona: 'INTERIOR_CABINA',
    etiqueta: 'Interior adicional',
    descripcion: 'Otras vistas del interior, baúl o detalles relevantes.',
    categoria: 'INTERIOR',
    obligatoria: false,
    multiple: true,
    esPrincipalPorDefecto: false,
  },
] as const;

const ETIQUETA_CATEGORIA_FALLBACK: Record<CategoriaGaleriaVehiculo, string> = {
  EXTERIOR: 'Exterior',
  INTERIOR: 'Interior adicional',
  ESTADO: 'Tablero y estado',
};

export function obtenerCategoriaPorZona(
  zona?: ZonaEvidenciaVehiculo
): CategoriaGaleriaVehiculo {
  if (!zona) return 'EXTERIOR';
  const match = PERSPECTIVAS_GALERIA_VEHICULO.find((p) => p.zona === zona);
  if (match) return match.categoria;
  if (
    zona === 'INTERIOR_CABINA' ||
    zona === 'INTERIOR_ASIENTOS' ||
    zona === 'BAUL_EQUIPAJE'
  ) {
    return 'INTERIOR';
  }
  if (
    zona === 'LLANTAS_RINES' ||
    zona === 'MOTOR_CAPO' ||
    zona === 'DETALLE_NOVEDAD_DANO' ||
    zona === 'KIT_CARRETERA_ACCESORIOS' ||
    zona === 'PANTALLA_TABLERO_ODOMETRO' ||
    zona === 'NIVEL_COMBUSTIBLE_BATERIA'
  ) {
    return 'ESTADO';
  }
  return 'EXTERIOR';
}

export function obtenerEtiquetaPerspectivaGaleria(
  foto: Pick<VehiculoGaleriaFoto, 'zona' | 'categoria' | 'esPrincipal'>
): string {
  if (foto.esPrincipal) {
    return 'Fotografía lateral (Principal)';
  }
  if (foto.zona) {
    const match = PERSPECTIVAS_GALERIA_VEHICULO.find((p) => p.zona === foto.zona);
    if (match) return match.etiqueta;
    if (foto.zona === 'LLANTAS_RINES') return 'Estado exterior / llantas';
    if (foto.zona === 'BAUL_EQUIPAJE') return 'Baúl / equipaje';
    if (foto.zona === 'MOTOR_CAPO') return 'Motor / tren motriz';
  }
  return ETIQUETA_CATEGORIA_FALLBACK[foto.categoria];
}

export interface VehiculoGaleriaFoto {
  id: string;
  url: string;
  categoria: CategoriaGaleriaVehiculo;
  zona?: ZonaEvidenciaVehiculo | undefined;
  esPrincipal: boolean;
  orden: number;
}

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
  localNombre?: string | undefined;
  localCiudad?: string | null | undefined;
  autonomiaKm?: number | undefined;
  destacado?: boolean | undefined;
  aceleracion: string;
  velocidadMaxima: string;
  rating: number;
  autonomiaOdo: string;
  marcaLogo?: string | undefined;
  tipoPropulsionIcon?: 'electric' | 'gas' | 'hybrid' | undefined;
  color?: string | null | undefined;
  numeroMotor?: string | null | undefined;
  numeroChasis?: string | null | undefined;
  valorComercial?: number | null | undefined;
  unidadMedidaUso?: UnidadMedidaUso | undefined;
  specsBento?: EspecificacionesBentoVehiculoSchema | null | undefined;
  galeria?: VehiculoGaleriaFoto[] | undefined;
};

export interface FiltrosBusquedaVehiculo {
  query?: string | undefined;
  categoria?: CategoriaVehiculo | 'TODOS' | undefined;
  soloDisponibles?: boolean | undefined;
  localId?: string | undefined;
}

export type MotivoBloqueoDisponibilidad = 'RESERVADO' | 'MANTENIMIENTO' | 'NO_DISPONIBLE';

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
  | 'MANTENIMIENTO'
  | 'NO_DISPONIBLE';

export interface EstadoDocumentalVehiculo {
  tieneVencidos: boolean;
  faltantesSinCarga: Array<'SOAT' | 'TECNICO_MECANICA'>;
  vencidos: Array<{ tipo: string; fechaVencimiento: string }>;
  requiereRtm: boolean;
  bloqueadoPorDocumentos?: boolean | undefined;
  exentoPorLey2486?: boolean | undefined;
  motivoBloqueo?: string | null | undefined;
}

export interface DiaCalendarioItem {
  fechaISO: string;       // YYYY-MM-DD
  numeroDia: number;      // 1..31
  diaSemanaIndice: number; // 0 (Lun) .. 6 (Dom)
  diaSemanaCorto: string; // "LUN", "MAR", etc.
  estado: EstadoDiaCalendario;
  etiquetaBloqueo?: string | undefined;
  franjaId?: string | undefined;
}

export interface TramoFechasSeleccionadas {
  inicio: string;
  fin: string;
  dias: number;
}

export interface CotizacionAlquiler {
  vehiculoId: string;
  fechaInicio: string;
  fechaFin: string;
  fechasSeleccionadas?: string[] | undefined;
  diasAlquiler: number;
  precioDia: number;
  subtotalTarifa: number;
  coberturaPericial: number;
  recargoDomicilio: number;
  depositoGarantia: number;
  totalAlquiler: number;
  abonoMinimoReserva: number;
}

