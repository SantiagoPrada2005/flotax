import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { localesAlquiler } from './locales';
import { categoriasLicenciaConduccion, reservas } from './reservas';
import { vehiculos } from './vehiculos';
import { tiposDocumentoIdentidad } from './verificaciones';

export const estadosPagoContrato = [
  'PENDIENTE',
  'PARCIAL',
  'PAGADO',
  'EN_MORA',
] as const;
export type EstadoPagoContrato = (typeof estadosPagoContrato)[number];

export const estadosContratoAlquiler = [
  'BORRADOR',
  'VIGENTE',
  'CERRADO_PAZ_Y_SALVO',
  'CERRADO_CON_SALDO',
  'INCUMPLIMIENTO_PENAL',
  'ANULADO',
] as const;
export type EstadoContratoAlquiler = (typeof estadosContratoAlquiler)[number];

/**
 * Contratos de Arrendamiento de Vehículo Automotor y Liquidación Waybill (Relación 1:1 con reservas).
 * Responsabilidad única: Instrumento jurídico de traslado de guarda material (Cláusula 4),
 * autorización de fotomultas (Sentencias C-038/20 y C-321/22), telemetría contractual y liquidación final.
 */
export const contratosAlquiler = sqliteTable(
  'contratos_alquiler',
  {
    id: text('id').primaryKey(),
    numeroContrato: text('numero_contrato').notNull().unique(), // Ej: 'CTR-849210'
    reservaId: text('reserva_id')
      .notNull()
      .unique()
      .references(() => reservas.id, { onDelete: 'cascade' }),
    localId: text('local_id')
      .notNull()
      .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id),
    clienteId: text('cliente_id').references(() => user.id),

    // Identificación jurídica del Arrendatario (Cláusula Preliminar y Sexta)
    arrendatarioNombre: text('arrendatario_nombre').notNull(),
    arrendatarioTipoDocumento: text('arrendatario_tipo_documento', {
      enum: tiposDocumentoIdentidad,
    }).notNull(),
    arrendatarioNumeroDocumento: text('arrendatario_numero_documento').notNull(),
    arrendatarioCiudadExpedicion: text('arrendatario_ciudad_expedicion'),
    arrendatarioLicenciaNumero: text('arrendatario_licencia_numero').notNull(),
    arrendatarioLicenciaCategoria: text('arrendatario_licencia_categoria', {
      enum: categoriasLicenciaConduccion,
    }).notNull(),
    arrendatarioDomicilio: text('arrendatario_domicilio'),
    arrendatarioTelefono: text('arrendatario_telefono').notNull(),
    arrendatarioCorreo: text('arrendatario_correo').notNull(),

    // Consentimientos legales obligatorios
    ley1581Aceptada: integer('ley_1581_aceptada', { mode: 'boolean' })
      .notNull()
      .default(true),
    trasladoFotomultasAceptado: integer('traslado_fotomultas_aceptado', {
      mode: 'boolean',
    })
      .notNull()
      .default(true),
    pagareBlancoFirmado: integer('pagare_blanco_firmado', { mode: 'boolean' })
      .notNull()
      .default(false),

    // Vigencia material y telemetría de salida/retorno (Cláusulas 1, 3 y 8)
    fechaHoraEntregaReal: integer('fecha_hora_entrega_real', { mode: 'timestamp' }),
    fechaHoraDevolucionPactada: integer('fecha_hora_devolucion_pactada', {
      mode: 'timestamp',
    }).notNull(),
    fechaHoraDevolucionReal: integer('fecha_hora_devolucion_real', {
      mode: 'timestamp',
    }),
    medidorUsoEntrega: integer('medidor_uso_entrega').notNull(), // km u horas de motor al entregar
    medidorUsoRetorno: integer('medidor_uso_retorno'), // km u horas de motor al recibir
    nivelEnergiaEntregaPct: integer('nivel_energia_entrega_pct').notNull().default(100),
    nivelEnergiaRetornoPct: integer('nivel_energia_retorno_pct'),

    // Liquidación Financiera Waybill en COP (Cláusulas 2, 3, 6 y 8)
    canonDiarioPactado: integer('canon_diario_pactado').notNull(),
    subtotalCanon: integer('subtotal_canon').notNull(),
    coberturaPericial: integer('cobertura_pericial').notNull().default(0),
    cargosMora: integer('cargos_mora').notNull().default(0),
    cargosNovedadesDanos: integer('cargos_novedades_danos').notNull().default(0),
    cargosCombustibleLavado: integer('cargos_combustible_lavado').notNull().default(0),
    totalLiquidado: integer('total_liquidado').notNull(),
    totalPagado: integer('total_pagado').notNull().default(0),
    saldoPendiente: integer('saldo_pendiente').notNull(),
    estadoPago: text('estado_pago', { enum: estadosPagoContrato })
      .notNull()
      .default('PARCIAL'),
    estadoContrato: text('estado_contrato', { enum: estadosContratoAlquiler })
      .notNull()
      .default('VIGENTE'),

    // Soportes criptográficos y documentales en Cloudflare R2
    firmaArrendadorR2Key: text('firma_arrendador_r2_key'),
    firmaArrendatarioR2Key: text('firma_arrendatario_r2_key'),
    contratoPdfR2Key: text('contrato_pdf_r2_key'),

    creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
    actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('contratos_local_estado_idx').on(
      t.localId,
      t.estadoContrato,
      t.estadoPago
    ),
    index('contratos_vehiculo_idx').on(t.vehiculoId, t.creadoEn),
  ]
);

export type ContratoAlquilerSelect = typeof contratosAlquiler.$inferSelect;
export type ContratoAlquilerInsert = typeof contratosAlquiler.$inferInsert;
