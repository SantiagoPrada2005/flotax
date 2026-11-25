import type { PoliticaLocalSelect } from '@/db/schema';

export interface CoordenadasGeo {
  lat: number;
  lng: number;
}

export interface UbicacionPatio {
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  lat: number;
  lng: number;
}

export interface PoliticaDomicilioLocal {
  domicilioHabilitado: boolean;
  radioCoberturaKm: number;
  kmIncluidosDomicilio: number;
  tarifaDomicilioBase: number;
  tarifaDomicilioPorKm: number;
  zonaCoberturaEtiqueta: string;
}

export interface ResultadoEvaluacionCobertura {
  coordenadasValidas: boolean;
  dentroCobertura: boolean;
  distanciaKm: number;
  radioCoberturaKm: number;
  recargoDomicilio: number;
  zonaCoberturaEtiqueta: string;
  mensaje: string;
}

export interface EnlacesNavegacionExterna {
  googleMapsUrl: string;
  wazeUrl: string;
}

export interface ZonaReferenciaRapida {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
}

/** Coordenadas por defecto de la sede principal FlotaX (El Poblado, Medellín). */
export const PATIO_COORDENADAS_DEFECTO: Readonly<CoordenadasGeo> = {
  lat: 6.2088,
  lng: -75.5697,
};

/** Política de cobertura y recargos por defecto cuando un local aún no ha personalizado valores. */
export const POLITICA_DOMICILIO_DEFECTO: Readonly<PoliticaDomicilioLocal> = {
  domicilioHabilitado: true,
  radioCoberturaKm: 15,
  kmIncluidosDomicilio: 5,
  tarifaDomicilioBase: 0,
  tarifaDomicilioPorKm: 0,
  zonaCoberturaEtiqueta: 'Medellín y Área Metropolitana',
};

/** Puntos de referencia locales en Medellín para apoyo rápido cuando aún no hay token Mapbox activo. */
export const ZONAS_REFERENCIA_MEDELLIN: readonly ZonaReferenciaRapida[] = [
  {
    id: 'el-poblado',
    nombre: 'El Poblado · Parque Lleras',
    direccion: 'Cra. 38 #9A-15, El Poblado, Medellín',
    lat: 6.2089,
    lng: -75.5677,
  },
  {
    id: 'laureles',
    nombre: 'Laureles · Segundo Parque',
    direccion: 'Circular 73B #39B-20, Laureles, Medellín',
    lat: 6.2442,
    lng: -75.5916,
  },
  {
    id: 'envigado',
    nombre: 'Envigado · Parque Principal',
    direccion: 'Cra. 43 #37 Sur-18, Envigado, Antioquia',
    lat: 6.1711,
    lng: -75.5867,
  },
  {
    id: 'sabaneta',
    nombre: 'Sabaneta · Parque Principal',
    direccion: 'Cra. 45 #71 Sur-24, Sabaneta, Antioquia',
    lat: 6.1515,
    lng: -75.6164,
  },
];

const RADIO_TIERRA_KM = 6371;

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

/**
 * Valida que el par latitud/longitud corresponda a coordenadas WGS84 reales
 * y descarta valores no finitos o el origen nulo (0, 0).
 */
export function sonCoordenadasValidas(
  lat: unknown,
  lng: unknown
): lat is number {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
  return true;
}

/**
 * Calcula la distancia geodésica en kilómetros entre dos coordenadas usando la fórmula de Haversine.
 */
export function calcularDistanciaKmHaversine(
  origen: CoordenadasGeo,
  destino: CoordenadasGeo
): number {
  const dLat = aRadianes(destino.lat - origen.lat);
  const dLng = aRadianes(destino.lng - origen.lng);
  const lat1 = aRadianes(origen.lat);
  const lat2 = aRadianes(destino.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distancia = RADIO_TIERRA_KM * c;
  return Math.round(distancia * 100) / 100;
}

/**
 * Normaliza la política de cobertura de domicilio a partir de la fila de `politicas_local`.
 */
export function normalizarPoliticaDomicilio(
  politicaRow?: Partial<
    Pick<
      PoliticaLocalSelect,
      | 'domicilioHabilitado'
      | 'radioCoberturaKm'
      | 'kmIncluidosDomicilio'
      | 'tarifaDomicilioBase'
      | 'tarifaDomicilioPorKm'
      | 'zonaCoberturaEtiqueta'
    >
  > | null
): PoliticaDomicilioLocal {
  if (!politicaRow) {
    return { ...POLITICA_DOMICILIO_DEFECTO };
  }

  const radio =
    typeof politicaRow.radioCoberturaKm === 'number' &&
    Number.isFinite(politicaRow.radioCoberturaKm) &&
    politicaRow.radioCoberturaKm > 0
      ? politicaRow.radioCoberturaKm
      : POLITICA_DOMICILIO_DEFECTO.radioCoberturaKm;

  const kmIncluidos =
    typeof politicaRow.kmIncluidosDomicilio === 'number' &&
    Number.isFinite(politicaRow.kmIncluidosDomicilio) &&
    politicaRow.kmIncluidosDomicilio >= 0
      ? politicaRow.kmIncluidosDomicilio
      : POLITICA_DOMICILIO_DEFECTO.kmIncluidosDomicilio;

  const tarifaBase =
    typeof politicaRow.tarifaDomicilioBase === 'number' &&
    Number.isFinite(politicaRow.tarifaDomicilioBase) &&
    politicaRow.tarifaDomicilioBase >= 0
      ? Math.round(politicaRow.tarifaDomicilioBase)
      : POLITICA_DOMICILIO_DEFECTO.tarifaDomicilioBase;

  const tarifaPorKm =
    typeof politicaRow.tarifaDomicilioPorKm === 'number' &&
    Number.isFinite(politicaRow.tarifaDomicilioPorKm) &&
    politicaRow.tarifaDomicilioPorKm >= 0
      ? Math.round(politicaRow.tarifaDomicilioPorKm)
      : POLITICA_DOMICILIO_DEFECTO.tarifaDomicilioPorKm;

  return {
    domicilioHabilitado:
      politicaRow.domicilioHabilitado ?? POLITICA_DOMICILIO_DEFECTO.domicilioHabilitado,
    radioCoberturaKm: radio,
    kmIncluidosDomicilio: kmIncluidos,
    tarifaDomicilioBase: tarifaBase,
    tarifaDomicilioPorKm: tarifaPorKm,
    zonaCoberturaEtiqueta:
      politicaRow.zonaCoberturaEtiqueta?.trim() ||
      POLITICA_DOMICILIO_DEFECTO.zonaCoberturaEtiqueta,
  };
}

/**
 * Evalúa si un destino cae dentro de la zona de cobertura del patio y calcula el recargo
 * en COP aplicable según la distancia y la política de la sede.
 */
export function evaluarCoberturaDomicilio(
  destino: CoordenadasGeo,
  patio: CoordenadasGeo = PATIO_COORDENADAS_DEFECTO,
  politica: PoliticaDomicilioLocal = POLITICA_DOMICILIO_DEFECTO
): ResultadoEvaluacionCobertura {
  if (!sonCoordenadasValidas(destino.lat, destino.lng)) {
    return {
      coordenadasValidas: false,
      dentroCobertura: false,
      distanciaKm: 0,
      radioCoberturaKm: politica.radioCoberturaKm,
      recargoDomicilio: 0,
      zonaCoberturaEtiqueta: politica.zonaCoberturaEtiqueta,
      mensaje:
        'Las coordenadas de entrega no son válidas. Selecciona una dirección o ajusta el pin en el mapa.',
    };
  }

  const patioSeguro = sonCoordenadasValidas(patio.lat, patio.lng)
    ? patio
    : PATIO_COORDENADAS_DEFECTO;

  const distanciaKm = calcularDistanciaKmHaversine(patioSeguro, destino);

  if (!politica.domicilioHabilitado) {
    return {
      coordenadasValidas: true,
      dentroCobertura: false,
      distanciaKm,
      radioCoberturaKm: politica.radioCoberturaKm,
      recargoDomicilio: 0,
      zonaCoberturaEtiqueta: politica.zonaCoberturaEtiqueta,
      mensaje:
        'Esta sede no tiene entregas a domicilio habilitadas en este momento. Selecciona Retiro en Patio Principal.',
    };
  }

  if (distanciaKm > politica.radioCoberturaKm) {
    return {
      coordenadasValidas: true,
      dentroCobertura: false,
      distanciaKm,
      radioCoberturaKm: politica.radioCoberturaKm,
      recargoDomicilio: 0,
      zonaCoberturaEtiqueta: politica.zonaCoberturaEtiqueta,
      mensaje: `Esta ubicación está a ${formatearDistanciaKm(distanciaKm)} del patio y supera nuestra zona de cobertura (${formatearDistanciaKm(politica.radioCoberturaKm)} en ${politica.zonaCoberturaEtiqueta}). Ajusta el pin dentro del área o elige Retiro en Patio Principal.`,
    };
  }

  const kmAdicionales = Math.max(0, distanciaKm - politica.kmIncluidosDomicilio);
  const recargoCalculado =
    politica.tarifaDomicilioBase +
    (kmAdicionales > 0 ? Math.ceil(kmAdicionales) * politica.tarifaDomicilioPorKm : 0);

  const recargoDomicilio = Math.max(0, Math.round(recargoCalculado));

  const mensaje =
    recargoDomicilio > 0
      ? `Dirección dentro de cobertura (${formatearDistanciaKm(distanciaKm)} del patio). Incluye recargo de entrega a domicilio.`
      : `Dirección dentro de cobertura (${formatearDistanciaKm(distanciaKm)} del patio) · Sin recargo adicional.`;

  return {
    coordenadasValidas: true,
    dentroCobertura: true,
    distanciaKm,
    radioCoberturaKm: politica.radioCoberturaKm,
    recargoDomicilio,
    zonaCoberturaEtiqueta: politica.zonaCoberturaEtiqueta,
    mensaje,
  };
}

/**
 * Construye un GeoJSON Polygon aproximando un círculo geodésico de `radioKm` alrededor de `centro`,
 * para dibujar la zona de cobertura nativamente en una capa WebGL de Mapbox GL JS.
 */
export function construirPoligonoCirculoGeoJson(
  centro: CoordenadasGeo,
  radioKm: number,
  segmentos: number = 64
): {
  type: 'Feature';
  properties: Record<string, never>;
  geometry: {
    type: 'Polygon';
    coordinates: Array<Array<[number, number]>>;
  };
} {
  const pasos = Math.max(16, Math.min(128, Math.round(segmentos)));
  const radioSeguro = Math.max(0.5, radioKm);
  const anillo: Array<[number, number]> = [];
  const latRad = aRadianes(centro.lat);
  const lngRad = aRadianes(centro.lng);
  const distanciaAngular = radioSeguro / RADIO_TIERRA_KM;

  for (let i = 0; i <= pasos; i++) {
    const rumbo = (i * 2 * Math.PI) / pasos;
    const sinLat =
      Math.sin(latRad) * Math.cos(distanciaAngular) +
      Math.cos(latRad) * Math.sin(distanciaAngular) * Math.cos(rumbo);
    const latPunto = Math.asin(Math.max(-1, Math.min(1, sinLat)));
    const lngPunto =
      lngRad +
      Math.atan2(
        Math.sin(rumbo) * Math.sin(distanciaAngular) * Math.cos(latRad),
        Math.cos(distanciaAngular) - Math.sin(latRad) * Math.sin(latPunto)
      );

    anillo.push([
      (lngPunto * 180) / Math.PI,
      (latPunto * 180) / Math.PI,
    ]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [anillo],
    },
  };
}

/**
 * Construye enlaces profundos ("Cómo llegar") hacia Google Maps y Waze para una coordenada fija.
 */
export function construirEnlacesNavegacion(
  coordenadas: CoordenadasGeo
): EnlacesNavegacionExterna {
  const lat = coordenadas.lat.toFixed(6);
  const lng = coordenadas.lng.toFixed(6);

  return {
    googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=driving`,
    wazeUrl: `https://waze.com/ul?ll=${encodeURIComponent(`${lat},${lng}`)}&navigate=yes`,
  };
}

/**
 * Calcula un bounding box aproximado [minLng, minLat, maxLng, maxLat] para sesgar
 * búsquedas de autocompletado hacia el entorno del patio sin descartar bordes de cobertura.
 */
export function calcularBoundingBoxCobertura(
  centro: CoordenadasGeo,
  radioKm: number
): [number, number, number, number] {
  const margenKm = Math.max(radioKm * 1.6, 20);
  const deltaLat = margenKm / 111.32;
  const cosLat = Math.max(0.2, Math.cos(aRadianes(centro.lat)));
  const deltaLng = margenKm / (111.32 * cosLat);

  return [
    Math.max(-180, Number((centro.lng - deltaLng).toFixed(5))),
    Math.max(-90, Number((centro.lat - deltaLat).toFixed(5))),
    Math.min(180, Number((centro.lng + deltaLng).toFixed(5))),
    Math.min(90, Number((centro.lat + deltaLat).toFixed(5))),
  ];
}

export function formatearCoordenadasHumanas(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function formatearDistanciaKm(km: number): string {
  return `${new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: km < 10 ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(km)} km`;
}
