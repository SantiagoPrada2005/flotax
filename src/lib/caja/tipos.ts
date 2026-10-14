import type {
  CuentaFinancieraSelect,
  CuentaFinancieraInsert,
  MovimientoCajaSelect,
  MovimientoCajaInsert,
  SesionCajaSelect,
  SesionCajaInsert,
  DepositoGarantiaSelect,
  DepositoGarantiaInsert,
  AuditoriaFinancieraSelect,
} from '@/db/schema/caja';

export type {
  CuentaFinancieraSelect,
  CuentaFinancieraInsert,
  MovimientoCajaSelect,
  MovimientoCajaInsert,
  SesionCajaSelect,
  SesionCajaInsert,
  DepositoGarantiaSelect,
  DepositoGarantiaInsert,
  AuditoriaFinancieraSelect,
};

export type TipoCuentaFinanciera = 'CAJA_EFECTIVO' | 'BANCO' | 'BILLETERA_DIGITAL';

export type TipoMovimientoCaja = 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';

export type CategoriaIngreso =
  | 'PAGO_ALQUILER'
  | 'ABONO_CONTRATO'
  | 'EXTENSION_ALQUILER'
  | 'SERVICIOS_ADICIONALES'
  | 'COBRO_DANOS_MULTAS'
  | 'DEPOSITO_GARANTIA'
  | 'INGRESO_EXTRAORDINARIO'
  | 'OTRO_INGRESO';

export type CategoriaEgreso =
  | 'MANTENIMIENTO_REPARACION'
  | 'COMBUSTIBLE_OPERACION'
  | 'LIMPIEZA_ALISTAMIENTO'
  | 'SEGUROS_IMPUESTOS'
  | 'COMISIONES_BANCARIAS'
  | 'REEMBOLSO_GARANTIA'
  | 'COMPRAS_ADMINISTRATIVAS'
  | 'OTRO_EGRESO';

export type CategoriaMovimiento = CategoriaIngreso | CategoriaEgreso | 'TRANSFERENCIA_INTERNA';

export type MetodoPagoFinanciero =
  | 'efectivo'
  | 'transferencia'
  | 'tarjeta'
  | 'especie'
  | 'otro';

export type EstadoMovimiento = 'BORRADOR' | 'PENDIENTE' | 'CONFIRMADO' | 'ANULADO';

export type EstadoDepositoGarantia =
  | 'PENDIENTE_RECIBIR'
  | 'RECIBIDO_CUSTODIA'
  | 'EN_REVISION'
  | 'PENDIENTE_DEVOLUCION'
  | 'DEVUELTO_PARCIAL'
  | 'DEVUELTO_TOTAL'
  | 'APLICADO_CARGOS';

export type EstadoSesionCaja = 'ABIERTA' | 'CERRADA';

export type RangoPeriodoFinanciero =
  | 'HOY'
  | '7_DIAS'
  | 'ESTE_MES'
  | 'MES_ANTERIOR'
  | 'PERSONALIZADO';

export interface IndicadoresFinancieros {
  saldoDisponibleTotal: number;
  totalEnCuentas: number;
  saldoEfectivo: number;
  saldoBancosYTransferencias: number;
  ingresosPeriodo: number;
  egresosPeriodo: number;
  flujoNetoCajaPeriodo: number;
  cuentasPorCobrar: number;
  depositosPorDevolver: number;
  resultadoOperativoPeriodo: number;
  totalContratosActivos: number;
}

export interface PuntoGraficoFlujo {
  fecha: string;
  etiqueta: string;
  ingresos: number;
  egresos: number;
  flujoNeto: number;
}

export interface DistribucionMetodoPago {
  metodo: MetodoPagoFinanciero;
  etiqueta: string;
  total: number;
  porcentaje: number;
  cantidadMovimientos: number;
}

export interface DistribucionCategoriaGasto {
  categoria: CategoriaEgreso;
  etiqueta: string;
  total: number;
  porcentaje: number;
}

export interface AlertaFinanciera {
  id: string;
  tipo:
    | 'PAGO_VENCIDO'
    | 'CONTRATO_SALDO_PENDIENTE'
    | 'GASTO_SIN_CATEGORIA'
    | 'DIFERENCIA_ARQUEO'
    | 'GARANTIA_POR_DEVOLVER'
    | 'MOVIMIENTO_POR_REVISAR'
    | 'CAJA_ABIERTA_JORNADA';
  nivel: 'URGENTE' | 'ALERTA' | 'INFO';
  titulo: string;
  descripcion: string;
  montoAsociado?: number | undefined;
  entidadId?: string | undefined;
  accionTexto: string;
  accionTab?: string | undefined;
}

export interface ContratoCarteraItem {
  codigoContrato: string;
  clienteNombre: string;
  clienteDocumento?: string | undefined;
  vehiculoNombre: string;
  vehiculoPlaca: string;
  fechaInicio: string;
  fechaFin: string;
  totalAlquiler: number;
  totalAbonado: number;
  saldoPendiente: number;
  estadoPago: 'PAGADO' | 'PARCIAL' | 'PENDIENTE' | 'VENCIDO';
  garantiaEsperada: number;
  garantiaEstado: EstadoDepositoGarantia;
}

export interface ResumenFinancieroCompleto {
  periodo: RangoPeriodoFinanciero;
  fechaInicioISO: string;
  fechaFinISO: string;
  indicadores: IndicadoresFinancieros;
  cuentas: CuentaFinancieraSelect[];
  movimientosRecientes: MovimientoCajaSelect[];
  todosMovimientos: MovimientoCajaSelect[];
  sesionCajaActiva: SesionCajaSelect | null;
  historialSesionesCaja: SesionCajaSelect[];
  depositosGarantia: DepositoGarantiaSelect[];
  carteraContratos: ContratoCarteraItem[];
  alertas: AlertaFinanciera[];
  graficoFlujo: PuntoGraficoFlujo[];
  graficoMetodosPago: DistribucionMetodoPago[];
  graficoGastosCategorias: DistribucionCategoriaGasto[];
}
