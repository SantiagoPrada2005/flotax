import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { localesAlquiler } from './locales';

export const rolesEmpleadoValidos = [
  'DUENO',
  'ADMIN',
  'OPERATIVO',
  'AUDITOR_FINANCIERO',
] as const;

export type RolEmpleado = (typeof rolesEmpleadoValidos)[number];

/**
 * Tabla de Miembros del Local (Personal de Trabajo y Titularidad).
 * Regla de negocio: Todo empleado o dueño debe pertenecer como mínimo a un local.
 */
export const miembrosLocal = sqliteTable('miembros_local', {
  id: text('id').primaryKey(),
  localId: text('local_id')
    .notNull()
    .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  rol: text('rol', { enum: rolesEmpleadoValidos }).notNull(),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
});

export type MiembroLocalSelect = typeof miembrosLocal.$inferSelect;
export type MiembroLocalInsert = typeof miembrosLocal.$inferInsert;
