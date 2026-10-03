import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const rolesValidos = [
  'SUPER_ADMIN',
  'ADMIN',
  'OPERATIVO',
  'AUDITOR_FINANCIERO',
] as const;

export type RolUsuario = (typeof rolesValidos)[number];

/**
 * Administradores del sistema. La columna `rol` es la autoridad canónica del
 * rol del usuario; la matriz de permisos vive en `src/lib/auth/rbac.ts`.
 * El hash de la contraseña NUNCA se expone al cliente: usar `UsuarioAdminPublico`
 * (derivado de `usuarioAdminSelect`) para proyecciones seguras.
 */
export const usuarioAdmin = sqliteTable('usuarios_admin', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  correo: text('correo').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  rol: text('rol', { enum: rolesValidos }).notNull().default('OPERATIVO'),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
});

/** Tipo canónico para lecturas de la tabla `usuarios_admin` (incluye hash). */
export type UsuarioAdminSelect = typeof usuarioAdmin.$inferSelect;

/** Tipo canónico para inserciones (passwordHash requerido). */
export type UsuarioAdminInsert = typeof usuarioAdmin.$inferInsert;

/**
 * Proyección segura: la porción de `UsuarioAdminSelect` que es segura exponer al
 * cliente o a componentes de UI. Omite el hash de la contraseña.
 */
export type UsuarioAutenticado = Pick<
  UsuarioAdminSelect,
  'id' | 'nombre' | 'correo' | 'rol' | 'activo'
>;
