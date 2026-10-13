import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { localesAlquiler } from './locales';

export const prioridadesNotificacion = ['NORMAL', 'URGENTE'] as const;
export type PrioridadNotificacion = (typeof prioridadesNotificacion)[number];

export const alcancesNotificacion = ['USUARIO', 'LOCAL', 'LOCAL_ROLES', 'PLATAFORMA'] as const;
export type AlcanceNotificacion = (typeof alcancesNotificacion)[number];

/**
 * Bandeja de notificaciones in-app (fan-out on write: una fila por destinatario).
 * `localId = null` => aviso personal (modo cliente); con valor => aviso del patio (modo operador).
 * `alcance` registra el scope con el que se emitió, solo con fines de auditoría.
 */
export const notificaciones = sqliteTable(
  'notificaciones',
  {
    id: text('id').primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    localId: text('local_id').references(() => localesAlquiler.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    alcance: text('alcance', { enum: alcancesNotificacion }).notNull(),
    prioridad: text('prioridad', { enum: prioridadesNotificacion }).notNull().default('NORMAL'),
    titulo: text('titulo').notNull(),
    detalle: text('detalle'),
    href: text('href'),
    dedupeKey: text('dedupe_key'),
    leidaEn: integer('leida_en', { mode: 'timestamp' }),
    creadaEn: integer('creada_en', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('notificaciones_bandeja_idx').on(t.usuarioId, t.leidaEn, t.creadaEn),
    uniqueIndex('notificaciones_dedupe_idx').on(t.usuarioId, t.dedupeKey),
  ]
);

/**
 * Suscripciones Web Push (una por dispositivo/navegador de cada usuario).
 */
export const suscripcionesPush = sqliteTable(
  'suscripciones_push',
  {
    id: text('id').primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    agente: text('agente'),
    creadaEn: integer('creada_en', { mode: 'timestamp' }).notNull(),
  },
  (t) => [index('suscripciones_push_usuario_idx').on(t.usuarioId)]
);

export type NotificacionSelect = typeof notificaciones.$inferSelect;
export type NotificacionInsert = typeof notificaciones.$inferInsert;
export type SuscripcionPushSelect = typeof suscripcionesPush.$inferSelect;
export type SuscripcionPushInsert = typeof suscripcionesPush.$inferInsert;
