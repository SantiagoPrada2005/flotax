import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { movimientosCaja } from './caja';
import { localesAlquiler } from './locales';
import { reservas } from './reservas';
import { vehiculos } from './vehiculos';

export const tiposMantenimientoVehiculo = [
  'PREVENTIVO',
  'CORRECTIVO_NOVEDAD',
  'ALISTAMIENTO',
  'BLOQUEO_OPERATIVO',
] as const;
export type TipoMantenimientoVehiculo = (typeof tiposMantenimientoVehiculo)[number];

export const estadosMantenimientoVehiculo = [
  'PROGRAMADO',
  'EN_TALLER',
  'COMPLETADO',
  'CANCELADO',
] as const;
export type EstadoMantenimientoVehiculo = (typeof estadosMantenimientoVehiculo)[number];

/**
 * Órdenes de Mantenimiento, Alistamiento y Bloqueos Operativos de Vehículos.
 * Responsabilidad única: Controlar la programación e historial técnico de taller
 * y bloquear las fechas correspondientes en el calendario de disponibilidad.
 */
export const mantenimientosVehiculo = sqliteTable(
  'mantenimientos_vehiculo',
  {
    id: text('id').primaryKey(),
    localId: text('local_id')
      .notNull()
      .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id, { onDelete: 'cascade' }),
    reservaOrigenId: text('reserva_origen_id').references(() => reservas.id),

    tipo: text('tipo', { enum: tiposMantenimientoVehiculo })
      .notNull()
      .default('PREVENTIVO'),
    estado: text('estado', { enum: estadosMantenimientoVehiculo })
      .notNull()
      .default('PROGRAMADO'),
    etiqueta: text('etiqueta').notNull(), // Ej: 'Inspección y alistamiento técnico'
    descripcion: text('descripcion'),
    tallerProveedor: text('taller_proveedor'),

    // Rango de bloqueo en calendario (YYYY-MM-DD)
    fechaInicio: text('fecha_inicio').notNull(),
    fechaFin: text('fecha_fin').notNull(),

    kilometrajeRegistro: integer('kilometraje_registro'),
    costoTotal: integer('costo_total').notNull().default(0), // en COP
    movimientoCajaId: text('movimiento_caja_id').references(
      () => movimientosCaja.id
    ),

    creadoPorId: text('creado_por_id')
      .notNull()
      .references(() => user.id),
    creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
    actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('mantenimientos_vehiculo_fechas_idx').on(
      t.vehiculoId,
      t.estado,
      t.fechaInicio,
      t.fechaFin
    ),
    index('mantenimientos_local_estado_idx').on(t.localId, t.estado),
  ]
);

export type MantenimientoVehiculoSelect = typeof mantenimientosVehiculo.$inferSelect;
export type MantenimientoVehiculoInsert = typeof mantenimientosVehiculo.$inferInsert;
