import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { localesAlquiler } from './locales';
import { vehiculos } from './vehiculos';

export const tiposDocumentoVehiculo = [
  'SOAT',
  'TECNICO_MECANICA',
  'TARJETA_PROPIEDAD',
  'POLIZA_TODO_RIESGO',
  'LICENCIA_NAUTICA_DIMAR',
  'KIT_CARRETERA',
] as const;
export type TipoDocumentoVehiculo = (typeof tiposDocumentoVehiculo)[number];

/**
 * Documentos Legales y Normativos por Unidad de Flota.
 * Responsabilidad única: Controlar la vigencia documental (SOAT, RTM, Tarjeta de Propiedad, Pólizas)
 * y bloquear automáticamente la disponibilidad en catálogo si algún documento obligatorio vence.
 */
export const documentosVehiculo = sqliteTable(
  'documentos_vehiculo',
  {
    id: text('id').primaryKey(),
    localId: text('local_id')
      .notNull()
      .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id, { onDelete: 'cascade' }),
    tipoDocumento: text('tipo_documento', { enum: tiposDocumentoVehiculo }).notNull(),
    numeroReferencia: text('numero_referencia'),
    entidadEmisora: text('entidad_emisora'),
    fechaExpedicion: text('fecha_expedicion'), // YYYY-MM-DD
    fechaVencimiento: text('fecha_vencimiento'), // YYYY-MM-DD (NULL para ítems físicos como KIT_CARRETERA)
    vigente: integer('vigente', { mode: 'boolean' }).notNull().default(true),
    archivoR2Key: text('archivo_r2_key'), // Soporte digital en BUCKET_MULTIMEDIA
    observaciones: text('observaciones'),
    verificadoPorId: text('verificado_por_id').references(() => user.id),
    creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
    actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('documentos_vehiculo_vigencia_idx').on(
      t.vehiculoId,
      t.tipoDocumento,
      t.vigente,
      t.fechaVencimiento
    ),
  ]
);

export type DocumentoVehiculoSelect = typeof documentosVehiculo.$inferSelect;
export type DocumentoVehiculoInsert = typeof documentosVehiculo.$inferInsert;
