import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { localesAlquiler } from './locales';
import { miembrosLocal } from './miembros';

export const efectosPermisoIndividual = ['CONCEDER', 'REVOCAR'] as const;
export type EfectoPermisoIndividual = (typeof efectosPermisoIndividual)[number];

/**
 * Permisos Individuales por Miembro del Local (Overrides Granulares RBAC).
 * Responsabilidad única: Permitir conceder o revocar permisos específicos a un colaborador
 * de forma individual por encima de la matriz base de su rol en el patio.
 */
export const permisosMiembroLocal = sqliteTable(
  'permisos_miembro_local',
  {
    id: text('id').primaryKey(),
    miembroId: text('miembro_id')
      .notNull()
      .references(() => miembrosLocal.id, { onDelete: 'cascade' }),
    localId: text('local_id')
      .notNull()
      .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    permiso: text('permiso').notNull(), // Código canónico de PERMISOS (ej. 'reservas:confirmar')
    efecto: text('efecto', { enum: efectosPermisoIndividual })
      .notNull()
      .default('CONCEDER'),
    motivo: text('motivo'),
    asignadoPorId: text('asignado_por_id')
      .notNull()
      .references(() => user.id),
    creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    uniqueIndex('permisos_miembro_unico_idx').on(t.miembroId, t.permiso),
    index('permisos_miembro_usuario_local_idx').on(t.localId, t.usuarioId),
  ]
);

export type PermisoMiembroLocalSelect = typeof permisosMiembroLocal.$inferSelect;
export type PermisoMiembroLocalInsert = typeof permisosMiembroLocal.$inferInsert;
