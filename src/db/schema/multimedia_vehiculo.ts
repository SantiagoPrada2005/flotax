import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { contratosAlquiler } from './contratos';
import { localesAlquiler } from './locales';
import { mantenimientosVehiculo } from './mantenimientos';
import { reservas } from './reservas';
import { vehiculos } from './vehiculos';

export const tiposMedioMultimedia = ['IMAGEN', 'VIDEO'] as const;
export type TipoMedioMultimedia = (typeof tiposMedioMultimedia)[number];

export const etapasMultimediaVehiculo = [
  'CATALOGO_ESTUDIO',
  'ENTREGA_SALIDA',
  'DEVOLUCION_RETORNO',
  'REPORTE_EN_RUTA',
  'MANTENIMIENTO_TALLER',
] as const;
export type EtapaMultimediaVehiculo = (typeof etapasMultimediaVehiculo)[number];

export const zonasEvidenciaVehiculo = [
  'EXTERIOR_FRONTAL',
  'EXTERIOR_LATERAL_IZQ',
  'EXTERIOR_LATERAL_DER',
  'EXTERIOR_TRASERO',
  'EXTERIOR_TECHO',
  'LLANTAS_RINES',
  'INTERIOR_CABINA',
  'INTERIOR_ASIENTOS',
  'BAUL_EQUIPAJE',
  'PANTALLA_TABLERO_ODOMETRO',
  'NIVEL_COMBUSTIBLE_BATERIA',
  'MOTOR_CAPO',
  'KIT_CARRETERA_ACCESORIOS',
  'VIDEO_RECORRIDO_360',
  'DETALLE_NOVEDAD_DANO',
  'ANGULO_ESTUDIO_360',
] as const;
export type ZonaEvidenciaVehiculo = (typeof zonasEvidenciaVehiculo)[number];

export const angulosEstudioVehiculo = [
  'ESTUDIO_3_4',
  'PERFIL_DINAMICO',
  'CABINA_CONFORT',
  'TREN_MOTRIZ',
] as const;
export type AnguloEstudioVehiculo = (typeof angulosEstudioVehiculo)[number];

/**
 * Historial Longitudinal Fotográfico y de Video en Cloudflare R2 (BUCKET_MULTIMEDIA) por Vehículo.
 * Responsabilidad única: Preservar de forma cronológica e inmutable todas las imágenes y videos
 * de cada unidad a través del tiempo y de cada reserva/alquiler (catálogo, entrega, devolución,
 * exterior, interior, pantalla/odómetro y daños), incluyendo miniaturas (poster_r2_key) para videos.
 */
export const multimediaVehiculo = sqliteTable(
  'multimedia_vehiculo',
  {
    id: text('id').primaryKey(),
    localId: text('local_id')
      .notNull()
      .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id, { onDelete: 'cascade' }),

    // Vínculos contextuales opcionales según la etapa en la que se capturó la evidencia
    reservaId: text('reserva_id').references(() => reservas.id, {
      onDelete: 'set null',
    }),
    contratoId: text('contrato_id').references(() => contratosAlquiler.id, {
      onDelete: 'set null',
    }),
    inspeccionId: text('inspeccion_id'), // ID del acta en inspecciones_periciales
    mantenimientoId: text('mantenimiento_id').references(
      () => mantenimientosVehiculo.id,
      { onDelete: 'set null' }
    ),

    // Clasificación pericial del recurso
    tipoMedio: text('tipo_medio', { enum: tiposMedioMultimedia })
      .notNull()
      .default('IMAGEN'),
    etapaOperativa: text('etapa_operativa', {
      enum: etapasMultimediaVehiculo,
    }).notNull(),
    zonaEvidencia: text('zona_evidencia', {
      enum: zonasEvidenciaVehiculo,
    }).notNull(),
    anguloEstudio: text('angulo_estudio', { enum: angulosEstudioVehiculo }),
    esPortadaCatalogo: integer('es_portada_catalogo', { mode: 'boolean' })
      .notNull()
      .default(false),
    ordenVisual: integer('orden_visual').notNull().default(0),

    // Metadatos en Cloudflare R2 y soporte de streaming/miniaturas para video
    r2Key: text('r2_key').notNull().unique(),
    posterR2Key: text('poster_r2_key'), // Miniatura WebP/JPEG para carga instantánea de videos
    mimeType: text('mime_type').notNull(), // ej. 'image/webp', 'video/mp4', 'video/webm'
    tamanoBytes: integer('tamano_bytes').notNull().default(0),
    anchoPx: integer('ancho_px'),
    altoPx: integer('alto_px'),
    duracionSegundos: real('duracion_segundos'), // Exclusivo para tipoMedio === 'VIDEO'
    sha256Hash: text('sha256_hash'), // Huella de integridad probatoria

    // Contexto operativo en el instante de la toma
    medidorUsoMomento: integer('medidor_uso_momento'), // Odómetro (km) u horómetro en ese instante
    observacion: text('observacion'),
    subidoPorId: text('subido_por_id').references(() => user.id),
    capturadoEn: integer('capturado_en', { mode: 'timestamp' }).notNull(),
    creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('multimedia_vehiculo_historial_idx').on(t.vehiculoId, t.capturadoEn),
    index('multimedia_vehiculo_reserva_etapa_idx').on(
      t.reservaId,
      t.etapaOperativa,
      t.zonaEvidencia
    ),
    index('multimedia_vehiculo_catalogo_idx').on(
      t.vehiculoId,
      t.etapaOperativa,
      t.ordenVisual
    ),
  ]
);

export type MultimediaVehiculoSelect = typeof multimediaVehiculo.$inferSelect;
export type MultimediaVehiculoInsert = typeof multimediaVehiculo.$inferInsert;
