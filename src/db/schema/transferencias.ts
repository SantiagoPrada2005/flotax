import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { localesAlquiler } from './locales';

/**
 * Registro inmutable de transferencias de titularidad de locales de alquiler.
 * Permite trazabilidad legal y auditoría de cambios de dueño.
 */
export const historialTransferenciasLocal = sqliteTable('historial_transferencias_local', {
  id: text('id').primaryKey(),
  localId: text('local_id')
    .notNull()
    .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
  duenoAnteriorId: text('dueno_anterior_id')
    .notNull()
    .references(() => user.id),
  nuevoDuenoId: text('nuevo_dueno_id')
    .notNull()
    .references(() => user.id),
  motivo: text('motivo'),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
});

export type HistorialTransferenciaSelect = typeof historialTransferenciasLocal.$inferSelect;
export type HistorialTransferenciaInsert = typeof historialTransferenciasLocal.$inferInsert;
