import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { localesAlquiler } from './locales';

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
  categoria: text('categoria').notNull(), // 'SEDAN' | 'SUV' | 'MOTO' | 'PATINETA' | 'UTILITARIO'
  categoriaEtiqueta: text('categoria_etiqueta').notNull(),
  placa: text('placa').notNull().unique(),
  estado: text('estado').notNull().default('DISPONIBLE'), // 'DISPONIBLE' | 'RESERVADO' | 'MANTENIMIENTO' | 'FUERA_SERVICIO'
  precioDia: integer('precio_dia').notNull(),
  depositoGarantia: integer('deposito_garantia').notNull(),
  transmision: text('transmision').notNull(), // 'Automática' | 'Manual' | 'Eléctrica'
  combustible: text('combustible').notNull(), // 'Gasolina' | 'Diésel' | 'Eléctrico' | 'Híbrido'
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
