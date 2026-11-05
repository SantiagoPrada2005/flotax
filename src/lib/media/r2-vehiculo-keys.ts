import type {
  AnguloEstudioVehiculo,
  EtapaMultimediaVehiculo,
  TipoDocumentoVehiculo,
  ZonaEvidenciaVehiculo,
} from '@/db/schema';

export interface ParametrosClaveHistorialR2 {
  localId: string;
  vehiculoId: string;
  etapaOperativa: EtapaMultimediaVehiculo;
  zonaEvidencia: ZonaEvidenciaVehiculo;
  extension: 'webp' | 'jpg' | 'png' | 'mp4' | 'webm' | 'mov';
  reservaCodigo?: string | undefined;
  anguloEstudio?: AnguloEstudioVehiculo | undefined;
  esPosterVideo?: boolean | undefined;
  timestampMs?: number | undefined;
}

function limpiarSegmento(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Construye una clave jerárquica determinista en Cloudflare R2 (`BUCKET_MULTIMEDIA`)
 * para el historial longitudinal fotográfico y de video de un vehículo.
 *
 * Estructura canónica:
 * - Catálogo/Estudio: `locales/{localId}/vehiculos/{vehiculoId}/catalogo/{angulo}_{ts}.{ext}`
 * - Historial por Alquiler: `locales/{localId}/vehiculos/{vehiculoId}/historial/{YYYY-MM}/{reservaCodigo}/{etapa}/{zona}_{ts}.{ext}`
 */
export function construirClaveR2MultimediaVehiculo(
  params: ParametrosClaveHistorialR2
): string {
  const ts = params.timestampMs ?? Date.now();
  const fecha = new Date(ts);
  const anioMes = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;

  const localSeg = limpiarSegmento(params.localId) || 'local-general';
  const vehSeg = limpiarSegmento(params.vehiculoId) || 'vehiculo';
  const zonaSeg = limpiarSegmento(params.zonaEvidencia);
  const sufijoPoster = params.esPosterVideo ? '_poster' : '';

  if (params.etapaOperativa === 'CATALOGO_ESTUDIO') {
    const anguloSeg = limpiarSegmento(params.anguloEstudio ?? params.zonaEvidencia);
    return `locales/${localSeg}/vehiculos/${vehSeg}/catalogo/${anguloSeg}_${ts}${sufijoPoster}.${params.extension}`;
  }

  const contextoSeg = limpiarSegmento(params.reservaCodigo ?? 'operacion-patio');
  const etapaSeg = limpiarSegmento(params.etapaOperativa);

  return `locales/${localSeg}/vehiculos/${vehSeg}/historial/${anioMes}/${contextoSeg}/${etapaSeg}/${zonaSeg}_${ts}${sufijoPoster}.${params.extension}`;
}

/**
 * Construye una clave jerárquica en Cloudflare R2 para soportes documentales de una unidad
 * (SOAT, Revisión Técnico-Mecánica, Tarjeta de Propiedad, Póliza Todo Riesgo).
 */
export function construirClaveR2DocumentoVehiculo(params: {
  localId: string;
  vehiculoId: string;
  tipoDocumento: TipoDocumentoVehiculo;
  extension: 'pdf' | 'webp' | 'jpg' | 'png';
  timestampMs?: number | undefined;
}): string {
  const ts = params.timestampMs ?? Date.now();
  const localSeg = limpiarSegmento(params.localId) || 'local-general';
  const vehSeg = limpiarSegmento(params.vehiculoId) || 'vehiculo';
  const docSeg = limpiarSegmento(params.tipoDocumento);

  return `locales/${localSeg}/vehiculos/${vehSeg}/documentos/${docSeg}_${ts}.${params.extension}`;
}

/**
 * Resuelve la URL pública o perimetral para consumir un recurso almacenado en `BUCKET_MULTIMEDIA`.
 * Si la clave ya es una URL externa o un asset estático local (`/landing/...`), la preserva intacta.
 */
export function resolverUrlMultimediaR2(r2KeyOrUrl: string): string {
  const limpio = r2KeyOrUrl.trim();
  if (
    limpio.startsWith('http://') ||
    limpio.startsWith('https://') ||
    limpio.startsWith('/')
  ) {
    return limpio;
  }
  return `/api/multimedia/${limpio}`;
}
