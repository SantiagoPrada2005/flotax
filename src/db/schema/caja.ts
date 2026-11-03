import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { localesAlquiler } from './locales';
import { user } from './auth';
import { vehiculos } from './vehiculos';

/** Dominios canónicos de caja y finanzas. Única fuente de verdad para columnas, Zod y UI. */
export const tiposCuentaFinanciera = [
  'CAJA_EFECTIVO',
  'BANCO',
  'BILLETERA_DIGITAL',
] as const;
export type TipoCuentaFinanciera = (typeof tiposCuentaFinanciera)[number];

export const tiposMovimientoCaja = ['INGRESO', 'EGRESO', 'TRANSFERENCIA'] as const;
export type TipoMovimientoCaja = (typeof tiposMovimientoCaja)[number];

export const categoriasIngreso = [
  'PAGO_ALQUILER',
  'ABONO_CONTRATO',
  'EXTENSION_ALQUILER',
  'SERVICIOS_ADICIONALES',
  'COBRO_DANOS_MULTAS',
  'DEPOSITO_GARANTIA',
  'INGRESO_EXTRAORDINARIO',
  'OTRO_INGRESO',
] as const;
export type CategoriaIngreso = (typeof categoriasIngreso)[number];

export const categoriasEgreso = [
  'MANTENIMIENTO_REPARACION',
  'COMBUSTIBLE_OPERACION',
  'LIMPIEZA_ALISTAMIENTO',
  'SEGUROS_IMPUESTOS',
  'COMISIONES_BANCARIAS',
  'REEMBOLSO_GARANTIA',
  'COMPRAS_ADMINISTRATIVAS',
  'OTRO_EGRESO',
] as const;
export type CategoriaEgreso = (typeof categoriasEgreso)[number];

export const categoriasMovimiento = [
  ...categoriasIngreso,
  ...categoriasEgreso,
  'TRANSFERENCIA_INTERNA',
] as const;
export type CategoriaMovimiento = (typeof categoriasMovimiento)[number];

export const metodosPagoFinanciero = [
  'efectivo',
  'transferencia',
  'tarjeta',
  'especie',
  'otro',
] as const;
export type MetodoPagoFinanciero = (typeof metodosPagoFinanciero)[number];

export const estadosMovimientoCaja = [
  'BORRADOR',
  'PENDIENTE',
  'CONFIRMADO',
  'ANULADO',
] as const;
export type EstadoMovimiento = (typeof estadosMovimientoCaja)[number];

export const estadosSesionCaja = ['ABIERTA', 'CERRADA'] as const;
export type EstadoSesionCaja = (typeof estadosSesionCaja)[number];

export const estadosDepositoGarantia = [
  'PENDIENTE_RECIBIR',
  'RECIBIDO_CUSTODIA',
  'EN_REVISION',
  'PENDIENTE_DEVOLUCION',
  'DEVUELTO_PARCIAL',
  'DEVUELTO_TOTAL',
  'APLICADO_CARGOS',
] as const;
export type EstadoDepositoGarantia = (typeof estadosDepositoGarantia)[number];

export const entidadesAuditoria = [
  'MOVIMIENTO',
  'SESION_CAJA',
  'GARANTIA',
  'CUENTA',
] as const;
export type EntidadAuditoria = (typeof entidadesAuditoria)[number];

export const accionesAuditoria = [
  'CREAR',
  'MODIFICAR',
  'ANULAR',
  'REVERTIR',
  'CERRAR_CAJA',
  'DEVOLVER_GARANTIA',
  'TRANSFERENCIA',
  'RECIBIR',
] as const;
export type AccionAuditoria = (typeof accionesAuditoria)[number];

/**
 * Cuentas Financieras (Cajas físicas de efectivo, cuentas bancarias, billeteras digitales).
 */
export const cuentasFinancieras = sqliteTable('cuentas_financieras', {
  id: text('id').primaryKey(),
  localId: text('local_id')
    .notNull()
    .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  tipo: text('tipo', { enum: tiposCuentaFinanciera }).notNull(),
  saldoInicial: integer('saldo_inicial').notNull().default(0), // en COP
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
});

export type CuentaFinancieraSelect = typeof cuentasFinancieras.$inferSelect;
export type CuentaFinancieraInsert = typeof cuentasFinancieras.$inferInsert;

/**
 * Movimientos de Caja y Finanzas (Ingresos, Egresos y Transferencias Internas).
 */
export const movimientosCaja = sqliteTable('movimientos_caja', {
  id: text('id').primaryKey(),
  localId: text('local_id')
    .notNull()
    .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
  tipo: text('tipo', { enum: tiposMovimientoCaja }).notNull(),
  categoria: text('categoria', { enum: categoriasMovimiento }).notNull(),
  concepto: text('concepto').notNull(),
  monto: integer('monto').notNull(), // en COP
  metodoPago: text('metodo_pago', { enum: metodosPagoFinanciero }).notNull(),
  cuentaId: text('cuenta_id')
    .notNull()
    .references(() => cuentasFinancieras.id),
  cuentaDestinoId: text('cuenta_destino_id')
    .references(() => cuentasFinancieras.id), // Solo para transferencias internas
  contratoId: text('contrato_id'), // Código de reserva/contrato asociado (ej: 'FLX-309418')
  clienteId: text('cliente_id')
    .references(() => user.id),
  clienteNombre: text('cliente_nombre'),
  vehiculoId: text('vehiculo_id')
    .references(() => vehiculos.id),
  proveedor: text('proveedor'), // Para egresos/gastos
  referencia: text('referencia'), // Factura, voucher o comprobante bancario
  soporteUrl: text('soporte_url'),
  estado: text('estado', { enum: estadosMovimientoCaja }).notNull().default('CONFIRMADO'),
  motivoAnulacion: text('motivo_anulacion'),
  anuladoPorId: text('anulado_por_id')
    .references(() => user.id),
  anuladoEn: integer('anulado_en', { mode: 'timestamp' }),
  creadoPorId: text('creado_por_id')
    .notNull()
    .references(() => user.id),
  observaciones: text('observaciones'),
  fechaMovimiento: integer('fecha_movimiento', { mode: 'timestamp' }).notNull(),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
});

export type MovimientoCajaSelect = typeof movimientosCaja.$inferSelect;
export type MovimientoCajaInsert = typeof movimientosCaja.$inferInsert;

/**
 * Sesiones de Caja y Arqueo Diario (Apertura, Operación y Cierre de caja en patio).
 */
export const sesionesCaja = sqliteTable('sesiones_caja', {
  id: text('id').primaryKey(),
  localId: text('local_id')
    .notNull()
    .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
  cuentaId: text('cuenta_id')
    .notNull()
    .references(() => cuentasFinancieras.id),
  usuarioAperturaId: text('usuario_apertura_id')
    .notNull()
    .references(() => user.id),
  fechaApertura: integer('fecha_apertura', { mode: 'timestamp' }).notNull(),
  saldoInicialContado: integer('saldo_inicial_contado').notNull(),
  estado: text('estado', { enum: estadosSesionCaja }).notNull().default('ABIERTA'),
  usuarioCierreId: text('usuario_cierre_id')
    .references(() => user.id),
  fechaCierre: integer('fecha_cierre', { mode: 'timestamp' }),
  saldoEsperado: integer('saldo_esperado'), // Saldo calculado según movimientos de efectivo en la sesión
  saldoRealContado: integer('saldo_real_contado'), // Saldo verificado por el cajero
  diferencia: integer('diferencia'), // saldoRealContado - saldoEsperado
  motivoDiferencia: text('motivo_diferencia'),
  observaciones: text('observaciones'),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
});

export type SesionCajaSelect = typeof sesionesCaja.$inferSelect;
export type SesionCajaInsert = typeof sesionesCaja.$inferInsert;

/**
 * Depósitos de Garantía de Contratos de Alquiler.
 * El dinero recibido como fianza no se computa como ingreso operativo,
 * sino como custodia/fondo comprometido hasta su devolución o aplicación autorizada.
 */
export const depositosGarantia = sqliteTable('depositos_garantia', {
  id: text('id').primaryKey(),
  localId: text('local_id')
    .notNull()
    .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
  contratoId: text('contrato_id').notNull(),
  clienteId: text('cliente_id')
    .references(() => user.id),
  clienteNombre: text('cliente_nombre').notNull(),
  vehiculoId: text('vehiculo_id')
    .references(() => vehiculos.id),
  montoEsperado: integer('monto_esperado').notNull(),
  montoRecibido: integer('monto_recibido').notNull().default(0),
  montoRetenido: integer('monto_retenido').notNull().default(0), // Daños, deducibles o multas autorizadas
  montoDevuelto: integer('monto_devuelto').notNull().default(0),
  saldoComprometido: integer('saldo_comprometido').notNull(), // montoRecibido - montoRetenido - montoDevuelto
  estado: text('estado', { enum: estadosDepositoGarantia }).notNull(),
  cuentaId: text('cuenta_id')
    .references(() => cuentasFinancieras.id),
  metodoPago: text('metodo_pago', { enum: metodosPagoFinanciero }),
  referenciaRecepcion: text('referencia_recepcion'),
  fechaRecepcion: integer('fecha_recepcion', { mode: 'timestamp' }),
  fechaDevolucionPrevista: integer('fecha_devolucion_prevista', { mode: 'timestamp' }),
  fechaDevolucionReal: integer('fecha_devolucion_real', { mode: 'timestamp' }),
  referenciaDevolucion: text('referencia_devolucion'),
  motivoRetencion: text('motivo_retencion'),
  observaciones: text('observaciones'),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
});

export type DepositoGarantiaSelect = typeof depositosGarantia.$inferSelect;
export type DepositoGarantiaInsert = typeof depositosGarantia.$inferInsert;

/**
 * Auditoría Financiera Inmutable.
 * Registra modificaciones sensibles de montos, anulaciones, reversiones y cierres.
 */
export const auditoriaFinanciera = sqliteTable('auditoria_financiera', {
  id: text('id').primaryKey(),
  localId: text('local_id')
    .notNull()
    .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
  entidad: text('entidad', { enum: entidadesAuditoria }).notNull(),
  entidadId: text('entidad_id').notNull(),
  accion: text('accion', { enum: accionesAuditoria }).notNull(),
  montoAnterior: integer('monto_anterior'),
  montoNuevo: integer('monto_nuevo'),
  motivo: text('motivo'),
  usuarioId: text('usuario_id')
    .notNull()
    .references(() => user.id),
  detallesJson: text('detalles_json'),
  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
});

export type AuditoriaFinancieraSelect = typeof auditoriaFinanciera.$inferSelect;
export type AuditoriaFinancieraInsert = typeof auditoriaFinanciera.$inferInsert;
