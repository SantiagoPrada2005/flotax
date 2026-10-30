import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { localesAlquiler } from './locales';

/** Dominios canónicos de la flota. Única fuente de verdad para columnas, Zod y UI. */
export const categoriasVehiculo = [
  'SEDAN',
  'SUV',
  'MOTO',
  'PATINETA',
  'UTILITARIO',
] as const;
export type CategoriaVehiculo = (typeof categoriasVehiculo)[number];

export const estadosVehiculo = [
  'DISPONIBLE',
  'RESERVADO',
  'MANTENIMIENTO',
  'FUERA_SERVICIO',
] as const;
export type EstadoVehiculo = (typeof estadosVehiculo)[number];

export const transmisionesVehiculo = [
  'Automática',
  'Manual',
  'Eléctrica',
] as const;
export type TransmisionVehiculo = (typeof transmisionesVehiculo)[number];

export const combustiblesVehiculo = [
  'Gasolina',
  'Diésel',
  'Eléctrico',
  'Híbrido',
] as const;
export type CombustibleVehiculo = (typeof combustiblesVehiculo)[number];

/**
 * Tabla de Vehículos de la Flota (Cloudflare D1 / SQLite).
 * Administra las unidades operativas disponibles para alquiler,
 * sus especificaciones periciales, estado en patio y tarifas.
 */
export const vehiculos = sqliteTable('vehiculos', {
  id: text('id').primaryKey(),
  localId: text('local_id').references(() => localesAlquiler.id),
  marca: text('marca').notNull(),
  modelo: text('modelo').notNull(),
  anio: integer('anio').notNull(),
  categoria: text('categoria', { enum: categoriasVehiculo }).notNull(),
  categoriaEtiqueta: text('categoria_etiqueta').notNull(),
  placa: text('placa').notNull().unique(),
  estado: text('estado', { enum: estadosVehiculo }).notNull().default('DISPONIBLE'),
  precioDia: integer('precio_dia').notNull(),
  depositoGarantia: integer('deposito_garantia').notNull(),
  transmision: text('transmision', { enum: transmisionesVehiculo }).notNull(),
  combustible: text('combustible', { enum: combustiblesVehiculo }).notNull(),
  capacidadPasajeros: integer('capacidad_pasajeros').notNull(),
  autonomiaKm: integer('autonomia_km'),
  kilometraje: integer('kilometraje').notNull(),
  imagenUrl: text('imagen_url').notNull(),
  destacado: integer('destacado', { mode: 'boolean' }).notNull().default(false),
  descripcion: text('descripcion').notNull(),
  aceleracion: text('aceleracion'),
  velocidadMaxima: text('velocidad_maxima'),
  rating: real('rating'),
  autonomiaOdo: text('autonomia_odo'),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
});

export type VehiculoSelect = typeof vehiculos.$inferSelect;
export type VehiculoInsert = typeof vehiculos.$inferInsert;
