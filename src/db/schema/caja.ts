import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { localesAlquiler } from './locales';
import { user } from './auth';
import { vehiculos } from './vehiculos';

/**
 * Cuentas Financieras (Cajas físicas de efectivo, cuentas bancarias, billeteras digitales).
 */
export const cuentasFinancieras = sqliteTable('cuentas_financieras', {
  id: text('id').primaryKey(),
  localId: text('local_id')
    .notNull()
    .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  tipo: text('tipo').notNull(), // 'CAJA_EFECTIVO' | 'BANCO' | 'BILLETERA_DIGITAL'
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
  tipo: text('tipo').notNull(), // 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA'
  categoria: text('categoria').notNull(),
  concepto: text('concepto').notNull(),
  monto: integer('monto').notNull(), // en COP
  metodoPago: text('metodo_pago').notNull(), // 'efectivo' | 'transferencia' | 'tarjeta' | 'especie' | 'otro'
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
  estado: text('estado').notNull().default('CONFIRMADO'), // 'BORRADOR' | 'PENDIENTE' | 'CONFIRMADO' | 'ANULADO'
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
  estado: text('estado').notNull().default('ABIERTA'), // 'ABIERTA' | 'CERRADA'
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
  estado: text('estado').notNull(), // 'PENDIENTE_RECIBIR' | 'RECIBIDO_CUSTODIA' | 'EN_REVISION' | 'PENDIENTE_DEVOLUCION' | 'DEVUELTO_PARCIAL' | 'DEVUELTO_TOTAL' | 'APLICADO_CARGOS'
  cuentaId: text('cuenta_id')
    .references(() => cuentasFinancieras.id),
  metodoPago: text('metodo_pago'),
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
  entidad: text('entidad').notNull(), // 'MOVIMIENTO' | 'SESION_CAJA' | 'GARANTIA' | 'CUENTA'
  entidadId: text('entidad_id').notNull(),
  accion: text('accion').notNull(), // 'CREAR' | 'MODIFICAR' | 'ANULAR' | 'REVERTIR' | 'CERRAR_CAJA' | 'DEVOLVER_GARANTIA' | 'TRANSFERENCIA'
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
