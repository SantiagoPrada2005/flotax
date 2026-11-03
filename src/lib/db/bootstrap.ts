import type { D1Database } from '@cloudflare/workers-types';
import { logFalloD1 } from './diagnostics';

let isBootstrapped = false;

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS user (
	id text PRIMARY KEY NOT NULL,
	name text NOT NULL,
	email text NOT NULL,
	email_verified integer DEFAULT false NOT NULL,
	image text,
	created_at integer NOT NULL,
	updated_at integer NOT NULL,
	telefono text,
	tipo_documento text,
	numero_documento text,
	es_super_admin integer DEFAULT false NOT NULL,
	local_origen_id text,
	activo integer DEFAULT true NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS user_email_unique ON user (email);

CREATE TABLE IF NOT EXISTS session (
	id text PRIMARY KEY NOT NULL,
	expires_at integer NOT NULL,
	token text NOT NULL,
	created_at integer NOT NULL,
	updated_at integer NOT NULL,
	ip_address text,
	user_agent text,
	user_id text NOT NULL,
	FOREIGN KEY (user_id) REFERENCES user(id) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS session_token_unique ON session (token);

CREATE TABLE IF NOT EXISTS account (
	id text PRIMARY KEY NOT NULL,
	account_id text NOT NULL,
	provider_id text NOT NULL,
	user_id text NOT NULL,
	access_token text,
	refresh_token text,
	id_token text,
	access_token_expires_at integer,
	refresh_token_expires_at integer,
	scope text,
	password text,
	created_at integer NOT NULL,
	updated_at integer NOT NULL,
	FOREIGN KEY (user_id) REFERENCES user(id) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS verification (
	id text PRIMARY KEY NOT NULL,
	identifier text NOT NULL,
	value text NOT NULL,
	expires_at integer NOT NULL,
	created_at integer NOT NULL,
	updated_at integer NOT NULL
);

CREATE TABLE IF NOT EXISTS locales_alquiler (
	id text PRIMARY KEY NOT NULL,
	nombre text NOT NULL,
	slug text NOT NULL,
	ciudad text,
	direccion text,
	telefono text,
	dueno_id text NOT NULL,
	activo integer DEFAULT true NOT NULL,
	creado_en integer NOT NULL,
	actualizado_en integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS locales_alquiler_slug_unique ON locales_alquiler (slug);

CREATE TABLE IF NOT EXISTS miembros_local (
	id text PRIMARY KEY NOT NULL,
	local_id text NOT NULL,
	usuario_id text NOT NULL,
	rol text NOT NULL,
	activo integer DEFAULT true NOT NULL,
	onboarding_completado integer DEFAULT false NOT NULL,
	creado_en integer NOT NULL
);

CREATE TABLE IF NOT EXISTS vehiculos (
	id text PRIMARY KEY NOT NULL,
	local_id text,
	marca text NOT NULL,
	modelo text NOT NULL,
	anio integer NOT NULL,
	categoria text NOT NULL,
	categoria_etiqueta text NOT NULL,
	placa text NOT NULL,
	estado text DEFAULT 'DISPONIBLE' NOT NULL,
	precio_dia integer NOT NULL,
	deposito_garantia integer NOT NULL,
	transmision text NOT NULL,
	combustible text NOT NULL,
	capacidad_pasajeros integer NOT NULL,
	autonomia_km integer,
	kilometraje integer NOT NULL,
	imagen_url text NOT NULL,
	destacado integer DEFAULT false NOT NULL,
	descripcion text NOT NULL,
	aceleracion text,
	velocidad_maxima text,
	rating real,
	autonomia_odo text,
	activo integer DEFAULT true NOT NULL,
	creado_en integer NOT NULL,
	actualizado_en integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS vehiculos_placa_unique ON vehiculos (placa);
`;

/**
 * Garantiza que las tablas esenciales de Better Auth y el sistema existan en D1.
 * Ejecuta CREATE TABLE IF NOT EXISTS de forma idempotente sólo si es necesario.
 */
export async function ensureD1Schema(d1: D1Database): Promise<void> {
  if (isBootstrapped) return;

  try {
    const tableCheck = await d1
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user'")
      .first<{ name: string }>();

    if (!tableCheck?.name) {
      await d1.exec(BOOTSTRAP_SQL);
    }
    isBootstrapped = true;
  } catch (error) {
    // Si d1 no soporta sqlite_master o falla en dev, continuar defensivamente
    logFalloD1('ensureD1Schema.exec', error);
  }
}
