import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { localesAlquiler } from './locales';
import { vehiculos } from './vehiculos';
import { tiposDocumentoIdentidad } from './verificaciones';

export const estadosReserva = [
  'PENDIENTE',
  'CONFIRMADA',
  'EN_CURSO',
  'PAUSADA',
  'COMPLETADA',
  'RECHAZADA',
  'CANCELADA',
] as const;
export type EstadoReserva = (typeof estadosReserva)[number];

export const modalidadesEntregaReserva = [
  'PATIO_PRINCIPAL',
  'DOMICILIO_MEDELLIN',
] as const;
export type ModalidadEntregaReservaSchema = (typeof modalidadesEntregaReserva)[number];

export const modalidadesPagoInicial = ['ABONO_30', 'TOTAL_100'] as const;
export type ModalidadPagoInicial = (typeof modalidadesPagoInicial)[number];

export const metodosAbonoInicial = [
  'TRANSFERENCIA_PSE',
  'NEQUI_BREB',
  'CAJA_PATIO',
  'EFECTIVO',
  'TARJETA',
] as const;
export type MetodoAbonoInicial = (typeof metodosAbonoInicial)[number];

export const categoriasLicenciaConduccion = [
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
] as const;
export type CategoriaLicenciaConduccion = (typeof categoriasLicenciaConduccion)[number];

/**
 * Solicitudes y Reservas de Alquiler (Cloudflare D1 / SQLite).
 * Responsabilidad única: Gestionar la solicitud comercial del cliente o mostrador,
 * el bloqueo de fechas en el calendario de disponibilidad y el abono inicial reportado.
 */
export const reservas = sqliteTable(
  'reservas',
  {
    id: text('id').primaryKey(),
    codigo: text('codigo').notNull().unique(), // Ej: 'FLX-849210'
    localId: text('local_id')
      .notNull()
      .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id),
    clienteId: text('cliente_id').references(() => user.id),

    // Ventana temporal de reserva y modalidad de entrega
    fechaInicio: text('fecha_inicio').notNull(), // YYYY-MM-DD
    fechaFin: text('fecha_fin').notNull(), // YYYY-MM-DD
    fechaFinOriginal: text('fecha_fin_original'), // YYYY-MM-DD inicializada al crear
    fechaDevolucionReal: text('fecha_devolucion_real'), // YYYY-MM-DD al cerrar anticipada o normalmente
    diasAlquiler: integer('dias_alquiler').notNull(),
    estado: text('estado', { enum: estadosReserva }).notNull().default('PENDIENTE'),
    modalidadEntrega: text('modalidad_entrega', { enum: modalidadesEntregaReserva })
      .notNull()
      .default('PATIO_PRINCIPAL'),
    direccionEntrega: text('direccion_entrega'),
    sedeNombre: text('sede_nombre').notNull(),
    tokenAccesoPublico: text('token_acceso_publico'),

    // Snapshot de cotización inicial y abono de reserva (en COP)
    precioDiaCotizado: integer('precio_dia_cotizado').notNull(),
    subtotalTarifaCotizado: integer('subtotal_tarifa_cotizado').notNull(),
    coberturaPericialCotizada: integer('cobertura_pericial_cotizada').notNull(),
    totalCotizado: integer('total_cotizado').notNull(),
    modalidadPagoInicial: text('modalidad_pago_inicial', {
      enum: modalidadesPagoInicial,
    })
      .notNull()
      .default('ABONO_30'),
    metodoAbonoInicial: text('metodo_abono_inicial', {
      enum: metodosAbonoInicial,
    })
      .notNull()
      .default('TRANSFERENCIA_PSE'),
    montoAbonoReportado: integer('monto_abono_reportado').notNull().default(0),
    referenciaAbonoInicial: text('referencia_abono_inicial'),

    // Datos de contacto suministrados en la solicitud
    contactoNombre: text('contacto_nombre').notNull(),
    contactoTipoDocumento: text('contacto_tipo_documento', {
      enum: tiposDocumentoIdentidad,
    }),
    contactoNumeroDocumento: text('contacto_numero_documento'),
    contactoCategoriaLicencia: text('contacto_categoria_licencia', {
      enum: categoriasLicenciaConduccion,
    }),
    contactoTelefono: text('contacto_telefono').notNull(),
    contactoCorreo: text('contacto_correo'),
    ley1581Aceptada: integer('ley_1581_aceptada', { mode: 'boolean' })
      .notNull()
      .default(true),

    // Trazabilidad de aprobación, autorización sin documentos o rechazo operativo
    autorizadoSinDocumentosPorId: text('autorizado_sin_documentos_por_id').references(
      () => user.id
    ),
    notaAutorizacionDocumentos: text('nota_autorizacion_documentos'),
    motivoCancelacion: text('motivo_cancelacion'),
    canceladoPorId: text('cancelado_por_id').references(() => user.id),
    canceladoEn: integer('cancelado_en', { mode: 'timestamp' }),
    motivoRechazo: text('motivo_rechazo'),
    creadoPorId: text('creado_por_id').references(() => user.id),
    confirmadoPorId: text('confirmado_por_id').references(() => user.id),
    creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
    actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('reservas_vehiculo_fechas_idx').on(
      t.vehiculoId,
      t.estado,
      t.fechaInicio,
      t.fechaFin
    ),
    index('reservas_local_estado_idx').on(t.localId, t.estado, t.creadoEn),
    index('reservas_cliente_idx').on(t.clienteId, t.creadoEn),
  ]
);

export type ReservaSelect = typeof reservas.$inferSelect;
export type ReservaInsert = typeof reservas.$inferInsert;
