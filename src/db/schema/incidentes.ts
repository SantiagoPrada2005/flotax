import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/** Dominios canónicos de la gobernanza de errores. */
export const nivelesIncidente = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'] as const;
export type NivelIncidente = (typeof nivelesIncidente)[number];

export const estadosIncidente = ['ABIERTO', 'MITIGADO', 'RESUELTO'] as const;
export type EstadoIncidente = (typeof estadosIncidente)[number];

/**
 * Incidentes del Sistema y Alertas Tempranas (Gobernanza de Errores y Monitoreo).
 * Permite la persistencia y deduplicación global de errores entre isolates de Cloudflare Workers,
 * controlando ventanas de enfriamiento y previniendo tormentas de correos a desarrolladores.
 */
export const incidentesSistema = sqliteTable('incidentes_sistema', {
  id: text('id').primaryKey(),
  fingerprint: text('fingerprint').notNull().unique(),
  nivel: text('nivel', { enum: nivelesIncidente }).notNull(),
  mensaje: text('mensaje').notNull(),
  modulo: text('modulo'),
  ocurrencias: integer('ocurrencias').notNull().default(1),
  primeraVez: integer('primera_vez', { mode: 'timestamp' }).notNull(),
  ultimaVez: integer('ultima_vez', { mode: 'timestamp' }).notNull(),
  ultimoCorreoEn: integer('ultimo_correo_en', { mode: 'timestamp' }),
  estado: text('estado', { enum: estadosIncidente }).notNull().default('ABIERTO'),
  metadata: text('metadata'), // JSON sanitizado con contexto, request info y error serializado
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
});

export type IncidenteSistemaSelect = typeof incidentesSistema.$inferSelect;
export type IncidenteSistemaInsert = typeof incidentesSistema.$inferInsert;
