import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { localesAlquiler } from './locales';

/**
 * Relación de Clientes con Locales de Alquiler.
 * Permite:
 * 1. Conocer el local de origen donde fue captado el cliente para prevenir fugas comerciales.
 * 2. Guardar comercios favoritos o preferidos del cliente.
 * 3. Registrar el histórico de acceso / última visita a locales de la red.
 */
export const clientesLocal = sqliteTable('clientes_local', {
  id: text('id').primaryKey(),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  localId: text('local_id')
    .notNull()
    .references(() => localesAlquiler.id, { onDelete: 'cascade' }),

  // Si es true, este local es el que captó originalmente al cliente
  esLocalOrigen: integer('es_local_origen', { mode: 'boolean' }).notNull().default(false),

  // Marcado por el cliente como comercio preferido
  esPreferido: integer('es_preferido', { mode: 'boolean' }).notNull().default(false),

  // Seguimiento de actividad
  ultimaVisitaEn: integer('ultima_visita_en', { mode: 'timestamp' }),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
});

export type ClienteLocalSelect = typeof clientesLocal.$inferSelect;
export type ClienteLocalInsert = typeof clientesLocal.$inferInsert;
