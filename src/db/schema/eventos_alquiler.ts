import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { contratosAlquiler } from './contratos';
import { localesAlquiler } from './locales';
import { reservas } from './reservas';
import { vehiculos } from './vehiculos';

export const tiposEventoAlquiler = [
  'PAUSA',
  'REANUDACION',
  'PRORROGA',
  'DEVOLUCION_ANTICIPADA',
  'SOBRECOSTO_CLAUSULA',
  'AUTORIZACION_SIN_DOCS',
  'CANCELACION',
  'ANULACION',
  'REAPERTURA',
] as const;
export type TipoEventoAlquiler = (typeof tiposEventoAlquiler)[number];

export const modalidadesTarifaEvento = [
  'SIN_COSTO',
  'MISMO_PRECIO',
  'TARIFA_ESTANDAR',
  'PRECIO_PACTADO',
] as const;
export type ModalidadTarifaEvento = (typeof modalidadesTarifaEvento)[number];

/**
 * Eventos y Novedades del Ciclo de Alquiler (Cloudflare D1 / SQLite).
 * Registra mutaciones contractuales auditadas: pausas, prórrogas, devoluciones anticipadas,
 * sobrecostos de cláusula, autorizaciones sin documentos, cancelaciones y anulaciones.
 */
export const eventosAlquiler = sqliteTable(
  'eventos_alquiler',
  {
    id: text('id').primaryKey(),
    localId: text('local_id')
      .notNull()
      .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
    reservaId: text('reserva_id')
      .notNull()
      .references(() => reservas.id, { onDelete: 'cascade' }),
    contratoId: text('contrato_id').references(() => contratosAlquiler.id),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id),
    tipoEvento: text('tipo_evento', { enum: tiposEventoAlquiler }).notNull(),
    diasDelta: integer('dias_delta').notNull().default(0),
    fechaBloqueoInicio: text('fecha_bloqueo_inicio'),
    fechaBloqueoFin: text('fecha_bloqueo_fin'),
    modalidadTarifa: text('modalidad_tarifa', { enum: modalidadesTarifaEvento }),
    montoDelta: integer('monto_delta').notNull().default(0),
    clausulaOTexto: text('clausula_o_texto'),
    actorId: text('actor_id').references(() => user.id),
    activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
    creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('eventos_alquiler_reserva_idx').on(t.reservaId, t.creadoEn),
    index('eventos_alquiler_local_tipo_idx').on(t.localId, t.tipoEvento, t.creadoEn),
    index('eventos_alquiler_vehiculo_idx').on(t.vehiculoId, t.creadoEn),
  ]
);

export type EventoAlquilerSelect = typeof eventosAlquiler.$inferSelect;
export type EventoAlquilerInsert = typeof eventosAlquiler.$inferInsert;
