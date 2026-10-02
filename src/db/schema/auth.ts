import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Tabla de Usuarios (Compatible con Better Auth).
 * Soporta autenticación por Google OAuth y por Correo sin contraseña (Email OTP).
 * Incluye campos personalizados de negocio (teléfono, documento, local de origen y rol global).
 */
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),

  // Datos básicos requeridos para operaciones de alquiler y peritaje
  telefono: text('telefono'),
  tipoDocumento: text('tipo_documento'), // 'CC' | 'CE' | 'PASAPORTE' | 'NIT'
  numeroDocumento: text('numero_documento'),

  // Control de plataforma y prevención de fuga de clientes
  esSuperAdmin: integer('es_super_admin', { mode: 'boolean' }).notNull().default(false),
  localOrigenId: text('local_origen_id'), // Local donde fue captado/registrado el cliente inicialmente
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
});

/**
 * Tabla de Sesiones (Manejada por Better Auth).
 */
export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

/**
 * Cuentas vinculadas a proveedores OAuth (ej. Google).
 */
export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(), // 'google', etc.
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'), // No se usa en passwordless pero requerido por schema Better Auth
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Tokens y códigos de verificación temporales (Email OTP, Magic Links, etc.).
 */
export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(), // Email o teléfono destino
  value: text('value').notNull(), // Código OTP o hash del token
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export type UserSelect = typeof user.$inferSelect;
export type UserInsert = typeof user.$inferInsert;
export type SessionSelect = typeof session.$inferSelect;
