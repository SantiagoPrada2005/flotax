import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { user } from './auth';

/**
 * Locales o Sedes de Alquiler de Vehículos (Entidad Tenant).
 * Cada local tiene un único dueño responsable en cualquier momento.
 * El dueño puede transferir la propiedad del local a otro usuario del sistema.
 */
export const localesAlquiler = sqliteTable('locales_alquiler', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  slug: text('slug').notNull().unique(), // URL-friendly: ej. "rentas-medellin"
  ciudad: text('ciudad'),
  direccion: text('direccion'),
  telefono: text('telefono'),
  
  // Dueño o propietario actual del local (titular legal y operativo)
  duenoId: text('dueno_id')
    .notNull()
    .references(() => user.id),

  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
});

export type LocalAlquilerSelect = typeof localesAlquiler.$inferSelect;
export type LocalAlquilerInsert = typeof localesAlquiler.$inferInsert;
