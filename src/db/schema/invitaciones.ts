import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { localesAlquiler } from './locales';

export const rolesInvitacionValidos = [
  'ADMIN',
  'OPERATIVO',
  'AUDITOR_FINANCIERO',
] as const;

export type RolInvitacion = (typeof rolesInvitacionValidos)[number];

export const estadosInvitacion = [
  'PENDIENTE',
  'ACEPTADA',
  'RECHAZADA',
  'EXPIRADA',
] as const;

export type EstadoInvitacion = (typeof estadosInvitacion)[number];

/**
 * Invitaciones emitidas por el dueño o creador del local para incorporar trabajadores.
 * Contiene un token único que viaja en el enlace de invitación.
 */
export const invitacionesLocal = sqliteTable('invitaciones_local', {
  id: text('id').primaryKey(),
  localId: text('local_id')
    .notNull()
    .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  rol: text('rol', { enum: rolesInvitacionValidos }).notNull(),
  token: text('token').notNull().unique(), // Token criptográfico único
  
  // Usuario creador o dueño que originó la invitación
  invitadoPorId: text('invitado_por_id')
    .notNull()
    .references(() => user.id),

  estado: text('estado', { enum: estadosInvitacion }).notNull().default('PENDIENTE'),
  expiraEn: integer('expira_en', { mode: 'timestamp' }).notNull(),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
});

export type InvitacionLocalSelect = typeof invitacionesLocal.$inferSelect;
export type InvitacionLocalInsert = typeof invitacionesLocal.$inferInsert;
