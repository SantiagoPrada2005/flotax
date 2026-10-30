import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { user } from './auth';

/** Dominios canónicos del proceso KYC pericial. */
export const tiposDocumentoIdentidad = ['CC', 'CE', 'PASAPORTE', 'NIT'] as const;
export type TipoDocumentoIdentidad = (typeof tiposDocumentoIdentidad)[number];

export const estadosVerificacion = [
  'PENDIENTE',
  'EN_REVISION',
  'APROBADO',
  'RECHAZADO',
] as const;
export type EstadoVerificacion = (typeof estadosVerificacion)[number];

/**
 * Tabla de Verificaciones Periciales de Identidad y Licencia de Conducir (KYC FlotaX).
 * Almacena el estado de validación y las claves de objetos fotográficos en Cloudflare R2 (BUCKET_MULTIMEDIA).
 */
export const verificacionesIdentidad = sqliteTable('verificaciones_identidad', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  // 1. Datos y fotos del Documento de Identidad (Cédula / Pasaporte / etc.)
  tipoDocumento: text('tipo_documento', { enum: tiposDocumentoIdentidad }).notNull(),
  numeroDocumento: text('numero_documento').notNull(),
  documentoFrenteKey: text('documento_frente_key'), // Clave en Cloudflare R2
  documentoDorsoKey: text('documento_dorso_key'),   // Clave en Cloudflare R2

  // 2. Datos y fotos de la Licencia de Conducir
  licenciaNumero: text('licencia_numero'),
  licenciaCategoria: text('licencia_categoria'),     // 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
  licenciaVencimiento: text('licencia_vencimiento'), // YYYY-MM-DD
  licenciaFrenteKey: text('licencia_frente_key'),   // Clave en Cloudflare R2
  licenciaDorsoKey: text('licencia_dorso_key'),     // Clave en Cloudflare R2

  // 3. Estado pericial de aprobación
  estado: text('estado', { enum: estadosVerificacion }).notNull().default('PENDIENTE'),
  motivoRechazo: text('motivo_rechazo'),
  verificadoEn: integer('verificado_en', { mode: 'timestamp' }),

  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
});

export type VerificacionIdentidad = typeof verificacionesIdentidad.$inferSelect;
export type NuevaVerificacionIdentidad = typeof verificacionesIdentidad.$inferInsert;
