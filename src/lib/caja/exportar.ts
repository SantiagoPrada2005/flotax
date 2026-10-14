import type {
  MovimientoCajaSelect,
  SesionCajaSelect,
  ContratoCarteraItem,
  DepositoGarantiaSelect,
} from './tipos';

function escaparCsv(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '""';
  const str = String(valor).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Genera el contenido CSV formateado para movimientos de caja.
 */
export function exportarMovimientosCsv(movimientos: MovimientoCajaSelect[]): string {
  const encabezados = [
    'ID',
    'Fecha',
    'Tipo',
    'Categoría',
    'Concepto',
    'Monto COP',
    'Método Pago',
    'Cuenta ID',
    'Contrato',
    'Cliente',
    'Vehículo ID',
    'Proveedor',
    'Referencia',
    'Estado',
    'Motivo Anulación',
    'Observaciones',
  ];

  const filas = movimientos.map((m) => {
    const fecha = new Date(m.fechaMovimiento).toISOString().replace('T', ' ').slice(0, 19);
    return [
      escaparCsv(m.id),
      escaparCsv(fecha),
      escaparCsv(m.tipo),
      escaparCsv(m.categoria),
      escaparCsv(m.concepto),
      escaparCsv(m.monto),
      escaparCsv(m.metodoPago),
      escaparCsv(m.cuentaId),
      escaparCsv(m.contratoId),
      escaparCsv(m.clienteNombre),
      escaparCsv(m.vehiculoId),
      escaparCsv(m.proveedor),
      escaparCsv(m.referencia),
      escaparCsv(m.estado),
      escaparCsv(m.motivoAnulacion),
      escaparCsv(m.observaciones),
    ].join(',');
  });

  return [encabezados.join(','), ...filas].join('\r\n');
}

/**
 * Genera el contenido CSV formateado para historial de sesiones y arqueos de caja.
 */
export function exportarSesionesCajaCsv(sesiones: SesionCajaSelect[]): string {
  const encabezados = [
    'ID Sesión',
    'Fecha Apertura',
    'Fecha Cierre',
    'Cuenta ID',
    'Saldo Inicial',
    'Saldo Esperado',
    'Saldo Contado',
    'Diferencia',
    'Estado',
    'Motivo Diferencia',
    'Observaciones',
  ];

  const filas = sesiones.map((s) => {
    const fApertura = new Date(s.fechaApertura).toISOString().replace('T', ' ').slice(0, 19);
    const fCierre = s.fechaCierre
      ? new Date(s.fechaCierre).toISOString().replace('T', ' ').slice(0, 19)
      : 'En curso';
    return [
      escaparCsv(s.id),
      escaparCsv(fApertura),
      escaparCsv(fCierre),
      escaparCsv(s.cuentaId),
      escaparCsv(s.saldoInicialContado),
      escaparCsv(s.saldoEsperado ?? 0),
      escaparCsv(s.saldoRealContado ?? 0),
      escaparCsv(s.diferencia ?? 0),
      escaparCsv(s.estado),
      escaparCsv(s.motivoDiferencia),
      escaparCsv(s.observaciones),
    ].join(',');
  });

  return [encabezados.join(','), ...filas].join('\r\n');
}

/**
 * Genera el contenido CSV formateado para la cartera de contratos y cuentas por cobrar.
 */
export function exportarCarteraContratosCsv(contratos: ContratoCarteraItem[]): string {
  const encabezados = [
    'Código Contrato',
    'Cliente',
    'Documento',
    'Vehículo',
    'Placa',
    'Fecha Inicio',
    'Fecha Fin',
    'Total Alquiler',
    'Total Abonado',
    'Saldo Pendiente',
    'Estado Pago',
    'Garantía Esperada',
    'Estado Garantía',
  ];

  const filas = contratos.map((c) => {
    return [
      escaparCsv(c.codigoContrato),
      escaparCsv(c.clienteNombre),
      escaparCsv(c.clienteDocumento),
      escaparCsv(c.vehiculoNombre),
      escaparCsv(c.vehiculoPlaca),
      escaparCsv(c.fechaInicio),
      escaparCsv(c.fechaFin),
      escaparCsv(c.totalAlquiler),
      escaparCsv(c.totalAbonado),
      escaparCsv(c.saldoPendiente),
      escaparCsv(c.estadoPago),
      escaparCsv(c.garantiaEsperada),
      escaparCsv(c.garantiaEstado),
    ].join(',');
  });

  return [encabezados.join(','), ...filas].join('\r\n');
}

/**
 * Genera el contenido CSV formateado para los depósitos de garantía.
 */
export function exportarGarantiasCsv(garantias: DepositoGarantiaSelect[]): string {
  const encabezados = [
    'ID',
    'Contrato',
    'Cliente',
    'Vehículo',
    'Monto Esperado',
    'Monto Recibido',
    'Monto Retenido',
    'Monto Devuelto',
    'Saldo Comprometido',
    'Estado',
    'Método Pago',
    'Referencia',
    'Motivo Retención',
    'Observaciones',
  ];

  const filas = garantias.map((g) => {
    return [
      escaparCsv(g.id),
      escaparCsv(g.contratoId),
      escaparCsv(g.clienteNombre),
      escaparCsv(g.vehiculoId),
      escaparCsv(g.montoEsperado),
      escaparCsv(g.montoRecibido),
      escaparCsv(g.montoRetenido),
      escaparCsv(g.montoDevuelto),
      escaparCsv(g.saldoComprometido),
      escaparCsv(g.estado),
      escaparCsv(g.metodoPago),
      escaparCsv(g.referenciaRecepcion),
      escaparCsv(g.motivoRetencion),
      escaparCsv(g.observaciones),
    ].join(',');
  });

  return [encabezados.join(','), ...filas].join('\r\n');
}
