import type { KVNamespace } from '@cloudflare/workers-types';
import {
  calcularBoundingBoxCobertura,
  evaluarCoberturaDomicilio,
  formatearCoordenadasHumanas,
  PATIO_COORDENADAS_DEFECTO,
  POLITICA_DOMICILIO_DEFECTO,
  type CoordenadasGeo,
  type PoliticaDomicilioLocal,
  type ResultadoEvaluacionCobertura,
} from './cobertura';

export interface SugerenciaDireccionMapbox {
  id: string;
  titulo: string;
  direccionCompleta: string;
  contexto: string;
  latitud: number;
  longitud: number;
  distanciaKm: number;
  dentroCobertura: boolean;
  recargoDomicilio: number;
  mensajeCobertura: string;
}

export interface ResultadoBusquedaDirecciones {
  ok: boolean;
  proveedorActivo: 'mapbox' | 'sin_token' | 'cuota_excedida' | 'error_red';
  sugerencias: SugerenciaDireccionMapbox[];
  aviso?: string | undefined;
}

export interface ResultadoGeocodificacionInversa {
  ok: boolean;
  direccion: string;
  coordenadas: CoordenadasGeo;
  cobertura: ResultadoEvaluacionCobertura;
  origenDireccion: 'mapbox' | 'coordenadas_fallback';
  aviso?: string | undefined;
}

interface MapboxGeocodeFeature {
  id?: string;
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    name?: string;
    full_address?: string;
    place_formatted?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };
}

interface MapboxGeocodeResponse {
  features?: MapboxGeocodeFeature[];
}

export const LIMITE_DIARIO_GEOCODIFICACION_DEFECTO = 2500;
const MAPBOX_GEOCODE_V6_BASE = 'https://api.mapbox.com/search/geocode/v6';
const DEFAULT_APP_REFERER = 'https://flotax.innovaweb.pro/';

function normalizarOrigenSeguro(candidato?: string | null): string | null {
  const limpio = candidato?.trim();
  if (!limpio) return null;
  try {
    const parsed = new URL(limpio);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    const esPermitido =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === 'flotax.innovaweb.pro' ||
      host.endsWith('.flotax.innovaweb.pro');
    if (!esPermitido) return null;
    return `${parsed.origin}/`;
  } catch {
    return null;
  }
}

/**
 * Resuelve un `Referer` autorizado para las llamadas perimetrales hacia Mapbox Geocoding v6
 * cuando el token público tiene restricciones por URL (URL restrictions).
 */
export function resolverRefererMapbox(
  request?: Request,
  fallbackBaseUrl?: string
): string {
  const desdeHeader =
    normalizarOrigenSeguro(request?.headers.get('referer')) ??
    normalizarOrigenSeguro(request?.headers.get('origin')) ??
    normalizarOrigenSeguro(request?.url);
  if (desdeHeader) return desdeHeader;

  const desdeFallback = normalizarOrigenSeguro(fallbackBaseUrl);
  if (desdeFallback) return desdeFallback;

  return DEFAULT_APP_REFERER;
}

/**
 * Devuelve únicamente un token público de Mapbox (`pk.*`) seguro para enviar al navegador.
 * Nunca expone tokens secretos (`sk.*`) aunque por error se carguen en `MAPBOX_PUBLIC_TOKEN`.
 */
export function resolverTokenMapboxPublico(envLike?: {
  MAPBOX_PUBLIC_TOKEN?: string | undefined;
}): string | null {
  const candidato = envLike?.MAPBOX_PUBLIC_TOKEN?.trim() ?? '';
  if (!candidato) return null;
  if (!candidato.startsWith('pk.')) return null;
  return candidato;
}

/**
 * Devuelve el token para llamadas de servidor desde Cloudflare Workers.
 * Prefiere `MAPBOX_SECRET_TOKEN` (no expuesto al cliente) y hace fallback a `MAPBOX_PUBLIC_TOKEN`.
 */
export function resolverTokenMapboxServidor(envLike?: {
  MAPBOX_SECRET_TOKEN?: string | undefined;
  MAPBOX_PUBLIC_TOKEN?: string | undefined;
}): string | null {
  const secreto = envLike?.MAPBOX_SECRET_TOKEN?.trim() ?? '';
  if (secreto) return secreto;
  const publico = envLike?.MAPBOX_PUBLIC_TOKEN?.trim() ?? '';
  return publico || null;
}

export function resolverLimiteDiarioGeocode(raw?: string): number {
  if (!raw) return LIMITE_DIARIO_GEOCODIFICACION_DEFECTO;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return LIMITE_DIARIO_GEOCODIFICACION_DEFECTO;
  }
  return Math.min(parsed, 100_000);
}

/**
 * Tope diario en capa de aplicación respaldado por Cloudflare KV (`env.SESSION`),
 * para evitar sobrecostos inesperados por abuso o picos en geocodificación.
 */
export async function verificarYConsumirCuotaDiariaMapbox(
  kv: KVNamespace | undefined,
  limiteDiario: number = LIMITE_DIARIO_GEOCODIFICACION_DEFECTO,
  fechaISO: string = new Date().toISOString().slice(0, 10)
): Promise<{ permitido: boolean; usadasHoy: number; limiteDiario: number }> {
  if (!kv) {
    return { permitido: true, usadasHoy: 0, limiteDiario };
  }

  const clave = `flotax:mapbox:geocode:${fechaISO}`;
  try {
    const actualRaw = await kv.get(clave);
    const usadas = actualRaw ? Number.parseInt(actualRaw, 10) || 0 : 0;

    if (usadas >= limiteDiario) {
      return { permitido: false, usadasHoy: usadas, limiteDiario };
    }

    const nuevoTotal = usadas + 1;
    // TTL de 36 horas para limpieza automática diaria sin intervención manual
    await kv.put(clave, String(nuevoTotal), { expirationTtl: 60 * 60 * 36 });
    return { permitido: true, usadasHoy: nuevoTotal, limiteDiario };
  } catch {
    // Nunca bloquear la operación por un fallo transitorio de KV
    return { permitido: true, usadasHoy: 0, limiteDiario };
  }
}

function extraerCoordenadasFeature(
  feature: MapboxGeocodeFeature
): CoordenadasGeo | null {
  const propLat = feature.properties?.coordinates?.latitude;
  const propLng = feature.properties?.coordinates?.longitude;
  if (
    typeof propLat === 'number' &&
    typeof propLng === 'number' &&
    Number.isFinite(propLat) &&
    Number.isFinite(propLng)
  ) {
    return { lat: propLat, lng: propLng };
  }

  const coords = feature.geometry?.coordinates;
  if (
    Array.isArray(coords) &&
    coords.length >= 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number' &&
    Number.isFinite(coords[0]) &&
    Number.isFinite(coords[1])
  ) {
    return { lat: coords[1], lng: coords[0] };
  }

  return null;
}

/**
 * Autocompletado de direcciones vía Mapbox Geocoding API v6 (solo para entrega a domicilio).
 * Evalúa cobertura y recargo de cada sugerencia en el servidor antes de responder.
 */
export async function buscarDireccionesMapbox(params: {
  consulta: string;
  patio?: CoordenadasGeo;
  politica?: PoliticaDomicilioLocal;
  token: string | null;
  referer?: string | undefined;
  kv?: KVNamespace | undefined;
  limiteDiario?: number | undefined;
  fetchImpl?: typeof fetch;
}): Promise<ResultadoBusquedaDirecciones> {
  const consultaLimpia = params.consulta.trim();
  if (consultaLimpia.length < 3) {
    return {
      ok: true,
      proveedorActivo: params.token ? 'mapbox' : 'sin_token',
      sugerencias: [],
    };
  }

  if (!params.token) {
    return {
      ok: false,
      proveedorActivo: 'sin_token',
      sugerencias: [],
      aviso:
        'El autocompletado de Mapbox se activará al configurar MAPBOX_PUBLIC_TOKEN. Mientras tanto puedes escribir tu dirección y usar tu ubicación actual.',
    };
  }

  const patio = params.patio ?? PATIO_COORDENADAS_DEFECTO;
  const politica = params.politica ?? POLITICA_DOMICILIO_DEFECTO;
  const limiteDiario = params.limiteDiario ?? LIMITE_DIARIO_GEOCODIFICACION_DEFECTO;

  const cuota = await verificarYConsumirCuotaDiariaMapbox(params.kv, limiteDiario);
  if (!cuota.permitido) {
    return {
      ok: false,
      proveedorActivo: 'cuota_excedida',
      sugerencias: [],
      aviso:
        'Alcanzamos el límite diario de búsqueda automática de direcciones. Puedes mover el pin manualmente en el mapa o usar tu ubicación actual.',
    };
  }

  const bbox = calcularBoundingBoxCobertura(patio, politica.radioCoberturaKm);
  const url = new URL(`${MAPBOX_GEOCODE_V6_BASE}/forward`);
  url.searchParams.set('q', consultaLimpia);
  url.searchParams.set('access_token', params.token);
  url.searchParams.set('autocomplete', 'true');
  url.searchParams.set('country', 'CO');
  url.searchParams.set('language', 'es');
  url.searchParams.set('limit', '5');
  url.searchParams.set('proximity', `${patio.lng},${patio.lat}`);
  url.searchParams.set('bbox', bbox.join(','));
  url.searchParams.set(
    'types',
    'address,secondary_address,street,neighborhood,locality,place'
  );

  const doFetch = params.fetchImpl ?? fetch;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (params.referer) {
    headers['Referer'] = params.referer;
  }

  try {
    const resp = await doFetch(url.toString(), { headers });

    if (!resp.ok) {
      return {
        ok: false,
        proveedorActivo: 'error_red',
        sugerencias: [],
        aviso:
          'No pudimos consultar sugerencias de dirección en este instante. Puedes ajustar el pin manualmente en el mapa.',
      };
    }

    const payload = (await resp.json()) as MapboxGeocodeResponse;
    const features = Array.isArray(payload.features) ? payload.features : [];

    const sugerencias: SugerenciaDireccionMapbox[] = [];
    for (const feature of features) {
      const coords = extraerCoordenadasFeature(feature);
      if (!coords) continue;

      const titulo =
        feature.properties?.name?.trim() ||
        feature.properties?.full_address?.trim() ||
        'Ubicación seleccionada';
      const direccionCompleta =
        feature.properties?.full_address?.trim() ||
        [feature.properties?.name, feature.properties?.place_formatted]
          .filter(Boolean)
          .join(', ') ||
        titulo;
      const contexto = feature.properties?.place_formatted?.trim() || 'Colombia';

      const cobertura = evaluarCoberturaDomicilio(coords, patio, politica);

      sugerencias.push({
        id: feature.id || `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`,
        titulo,
        direccionCompleta,
        contexto,
        latitud: coords.lat,
        longitud: coords.lng,
        distanciaKm: cobertura.distanciaKm,
        dentroCobertura: cobertura.dentroCobertura,
        recargoDomicilio: cobertura.recargoDomicilio,
        mensajeCobertura: cobertura.mensaje,
      });
    }

    return {
      ok: true,
      proveedorActivo: 'mapbox',
      sugerencias,
    };
  } catch {
    return {
      ok: false,
      proveedorActivo: 'error_red',
      sugerencias: [],
      aviso:
        'Sin conexión con el servicio de direcciones. Ajusta el pin en el mapa o escribe la dirección manualmente.',
    };
  }
}

/**
 * Geocodificación inversa (pin arrastrado o GPS actual) + validación oficial de cobertura en servidor.
 */
export async function geocodificarInversaMapbox(params: {
  latitud: number;
  longitud: number;
  patio?: CoordenadasGeo;
  politica?: PoliticaDomicilioLocal;
  token: string | null;
  referer?: string | undefined;
  kv?: KVNamespace | undefined;
  limiteDiario?: number | undefined;
  fetchImpl?: typeof fetch;
}): Promise<ResultadoGeocodificacionInversa> {
  const coordenadas: CoordenadasGeo = {
    lat: params.latitud,
    lng: params.longitud,
  };
  const patio = params.patio ?? PATIO_COORDENADAS_DEFECTO;
  const politica = params.politica ?? POLITICA_DOMICILIO_DEFECTO;
  const cobertura = evaluarCoberturaDomicilio(coordenadas, patio, politica);
  const fallbackDireccion = `Ubicación marcada (${formatearCoordenadasHumanas(coordenadas.lat, coordenadas.lng)})`;

  if (!params.token) {
    return {
      ok: true,
      direccion: fallbackDireccion,
      coordenadas,
      cobertura,
      origenDireccion: 'coordenadas_fallback',
    };
  }

  const limiteDiario = params.limiteDiario ?? LIMITE_DIARIO_GEOCODIFICACION_DEFECTO;
  const cuota = await verificarYConsumirCuotaDiariaMapbox(params.kv, limiteDiario);
  if (!cuota.permitido) {
    return {
      ok: true,
      direccion: fallbackDireccion,
      coordenadas,
      cobertura,
      origenDireccion: 'coordenadas_fallback',
      aviso:
        'Límite diario de geocodificación alcanzado. Guardaremos tus coordenadas exactas y puedes completar tu dirección escrita.',
    };
  }

  const url = new URL(`${MAPBOX_GEOCODE_V6_BASE}/reverse`);
  url.searchParams.set('longitude', String(coordenadas.lng));
  url.searchParams.set('latitude', String(coordenadas.lat));
  url.searchParams.set('access_token', params.token);
  url.searchParams.set('language', 'es');
  url.searchParams.set('limit', '1');

  const doFetch = params.fetchImpl ?? fetch;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (params.referer) {
    headers['Referer'] = params.referer;
  }

  try {
    const resp = await doFetch(url.toString(), { headers });

    if (!resp.ok) {
      return {
        ok: true,
        direccion: fallbackDireccion,
        coordenadas,
        cobertura,
        origenDireccion: 'coordenadas_fallback',
      };
    }

    const payload = (await resp.json()) as MapboxGeocodeResponse;
    const primero = payload.features?.[0];
    const direccionResuelta =
      primero?.properties?.full_address?.trim() ||
      [primero?.properties?.name, primero?.properties?.place_formatted]
        .filter(Boolean)
        .join(', ');

    if (!direccionResuelta) {
      return {
        ok: true,
        direccion: fallbackDireccion,
        coordenadas,
        cobertura,
        origenDireccion: 'coordenadas_fallback',
      };
    }

    return {
      ok: true,
      direccion: direccionResuelta,
      coordenadas,
      cobertura,
      origenDireccion: 'mapbox',
    };
  } catch {
    return {
      ok: true,
      direccion: fallbackDireccion,
      coordenadas,
      cobertura,
      origenDireccion: 'coordenadas_fallback',
    };
  }
}
