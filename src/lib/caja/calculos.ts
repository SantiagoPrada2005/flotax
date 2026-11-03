import type {
  CuentaFinancieraSelect,
  MovimientoCajaSelect,
  DepositoGarantiaSelect,
  IndicadoresFinancieros,
  ContratoCarteraItem,
  MetodoPagoFinanciero,
  DistribucionMetodoPago,
  CategoriaEgreso,
  DistribucionCategoriaGasto,
  PuntoGraficoFlujo,
} from './tipos';
import { categoriasEgreso, metodosPagoFinanciero } from '@/db/schema/caja';

const CATEGORIAS_EGRESO_VALIDAS: ReadonlySet<string> = new Set(categoriasEgreso);

/** Verifica en runtime que una categoría libre de D1 pertenece al catálogo de egresos. */
function esCategoriaEgreso(valor: string): valor is CategoriaEgreso {
  return CATEGORIAS_EGRESO_VALIDAS.has(valor);
}

/**
 * Formatea un monto numérico a Pesos Colombianos (COP) estándar.
 */
export function formatearMonedaCOP(monto: number): string {
  const formateador = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  return formateador.format(monto);
}

/**
 * Formatea un monto abreviado para badges y gráficos (ej. $1.2M, $450K).
 */
export function formatearMonedaCompactaCOP(monto: number): string {
  if (Math.abs(monto) >= 1_000_000) {
    const millones = (monto / 1_000_000).toFixed(1).replace('.0', '');
    return `$${millones}M`;
  }
  if (Math.abs(monto) >= 1_000) {
    const miles = (monto / 1_000).toFixed(0);
    return `$${miles}K`;
  }
  return `$${monto}`;
}

/**
 * Calcula el saldo actual de una cuenta bancaria o caja física.
 * Regla: Saldo = Saldo Inicial + Entradas Confirmadas - Salidas Confirmadas.
 * - Si es transferencia interna y la cuenta es destino, suma.
 * - Si es transferencia interna y la cuenta es origen, resta.
 */
export function calcularSaldoCuenta(
  cuenta: CuentaFinancieraSelect,
  movimientos: MovimientoCajaSelect[]
): number {
  let saldo = cuenta.saldoInicial;

  for (const mov of movimientos) {
    if (mov.estado !== 'CONFIRMADO') continue;

    if (mov.tipo === 'INGRESO' && mov.cuentaId === cuenta.id) {
      saldo += mov.monto;
    } else if (mov.tipo === 'EGRESO' && mov.cuentaId === cuenta.id) {
      saldo -= mov.monto;
    } else if (mov.tipo === 'TRANSFERENCIA') {
      if (mov.cuentaDestinoId === cuenta.id) {
        saldo += mov.monto;
      }
      if (mov.cuentaId === cuenta.id) {
        saldo -= mov.monto;
      }
    }
  }

  return saldo;
}

/**
 * Calcula el saldo de depósitos de garantía que aún debe devolverse o liquidarse a clientes.
 * Regla: Depósito pendiente = Recibido en custodia - Devoluciones efectuadas - Descuentos/cargos aplicados.
 */
export function calcularGarantiasPorDevolver(
  depositos: DepositoGarantiaSelect[]
): number {
  return depositos.reduce((acc, dep) => {
    // Si ya está devuelto completamente o aplicado en su totalidad, no queda compromiso
    if (dep.estado === 'DEVUELTO_TOTAL' || dep.estado === 'APLICADO_CARGOS') {
      return acc;
    }
    const remanente = Math.max(
      0,
      dep.montoRecibido - dep.montoDevuelto - dep.montoRetenido
    );
    return acc + remanente;
  }, 0);
}

/**
 * Determina si un movimiento califica como ingreso operativo reconocido.
 * Regla: Los depósitos de garantía y transferencias internas NO son ingresos operativos.
 */
export function esIngresoOperativo(mov: MovimientoCajaSelect): boolean {
  if (mov.tipo !== 'INGRESO' || mov.estado !== 'CONFIRMADO') return false;
  if (mov.categoria === 'DEPOSITO_GARANTIA') return false;
  return true;
}

/**
 * Determina si un movimiento califica como gasto operativo reconocido.
 * Regla: La restitución de garantías a clientes y transferencias internas NO son gastos operativos.
 */
export function esGastoOperativo(mov: MovimientoCajaSelect): boolean {
  if (mov.tipo !== 'EGRESO' || mov.estado !== 'CONFIRMADO') return false;
  if (mov.categoria === 'REEMBOLSO_GARANTIA') return false;
  return true;
}

/**
 * Calcula los indicadores financieros completos según las reglas canónicas del negocio.
 */
export function calcularIndicadoresFinancieros(params: {
  cuentas: CuentaFinancieraSelect[];
  movimientosTodos: MovimientoCajaSelect[];
  movimientosPeriodo: MovimientoCajaSelect[];
  depositosGarantia: DepositoGarantiaSelect[];
  carteraContratos: ContratoCarteraItem[];
}): IndicadoresFinancieros {
  const {
    cuentas,
    movimientosTodos,
    movimientosPeriodo,
    depositosGarantia,
    carteraContratos,
  } = params;

  // 1. Saldo actual por cada cuenta
  let saldoEfectivo = 0;
  let saldoBancosYTransferencias = 0;

  for (const c of cuentas) {
    if (!c.activo) continue;
    const saldo = calcularSaldoCuenta(c, movimientosTodos);
    if (c.tipo === 'CAJA_EFECTIVO') {
      saldoEfectivo += saldo;
    } else {
      saldoBancosYTransferencias += saldo;
    }
  }

  const totalEnCuentas = saldoEfectivo + saldoBancosYTransferencias;

  // 2. Depósitos por devolver (Garantías en custodia)
  const depositosPorDevolver = calcularGarantiasPorDevolver(depositosGarantia);

  // 3. Saldo disponible real = Dinero total en cuentas - Garantías en custodia comprometidas
  const saldoDisponibleTotal = Math.max(0, totalEnCuentas - depositosPorDevolver);

  // 4. Ingresos y egresos brutos del período
  let ingresosPeriodo = 0;
  let egresosPeriodo = 0;
  let ingresosOperativosPeriodo = 0;
  let gastosOperativosPeriodo = 0;

  for (const mov of movimientosPeriodo) {
    if (mov.estado !== 'CONFIRMADO') continue;

    if (mov.tipo === 'INGRESO') {
      ingresosPeriodo += mov.monto;
      if (esIngresoOperativo(mov)) {
        ingresosOperativosPeriodo += mov.monto;
      }
    } else if (mov.tipo === 'EGRESO') {
      egresosPeriodo += mov.monto;
      if (esGastoOperativo(mov)) {
        gastosOperativosPeriodo += mov.monto;
      }
    }
    // Transferencias internas no alteran ingresos ni egresos del período
  }

  // 5. Flujo neto de caja del período = Dinero efectivamente entrado - Dinero efectivamente salido
  const flujoNetoCajaPeriodo = ingresosPeriodo - egresosPeriodo;

  // 6. Resultado operativo del período = Ingresos operativos - Gastos operativos
  const resultadoOperativoPeriodo = ingresosOperativosPeriodo - gastosOperativosPeriodo;

  // 7. Cuentas por cobrar en cartera
  const cuentasPorCobrar = carteraContratos.reduce(
    (acc, c) => acc + Math.max(0, c.saldoPendiente),
    0
  );

  return {
    saldoDisponibleTotal,
    totalEnCuentas,
    saldoEfectivo,
    saldoBancosYTransferencias,
    ingresosPeriodo,
    egresosPeriodo,
    flujoNetoCajaPeriodo,
    cuentasPorCobrar,
    depositosPorDevolver,
    resultadoOperativoPeriodo,
    totalContratosActivos: carteraContratos.length,
  };
}

/**
 * Genera la distribución de ingresos por método de pago para gráficos.
 */
export function calcularDistribucionMetodosPago(
  movimientosPeriodo: MovimientoCajaSelect[]
): DistribucionMetodoPago[] {
  const totales: Record<MetodoPagoFinanciero, { total: number; count: number }> = {
    efectivo: { total: 0, count: 0 },
    transferencia: { total: 0, count: 0 },
    tarjeta: { total: 0, count: 0 },
    especie: { total: 0, count: 0 },
    otro: { total: 0, count: 0 },
  };

  let totalGeneral = 0;

  for (const m of movimientosPeriodo) {
    if (m.tipo !== 'INGRESO' || m.estado !== 'CONFIRMADO') continue;
    const metodo = m.metodoPago ?? 'otro';
    if (!totales[metodo]) {
      totales[metodo] = { total: 0, count: 0 };
    }
    totales[metodo].total += m.monto;
    totales[metodo].count += 1;
    totalGeneral += m.monto;
  }

  const etiquetasMap: Record<MetodoPagoFinanciero, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia Bancaria',
    tarjeta: 'Tarjeta Débito/Crédito',
    especie: 'En Especie / Permuta',
    otro: 'Otros Medios',
  };

  const resultado: DistribucionMetodoPago[] = [];

  for (const key of metodosPagoFinanciero) {
    const item = totales[key];
    if (item.total > 0 || item.count > 0) {
      resultado.push({
        metodo: key,
        etiqueta: etiquetasMap[key] ?? key,
        total: item.total,
        cantidadMovimientos: item.count,
        porcentaje: totalGeneral > 0 ? Math.round((item.total / totalGeneral) * 100) : 0,
      });
    }
  }

  return resultado.sort((a, b) => b.total - a.total);
}

/**
 * Genera la distribución de gastos por categoría operativa.
 */
export function calcularDistribucionGastosCategorias(
  movimientosPeriodo: MovimientoCajaSelect[]
): DistribucionCategoriaGasto[] {
  const totales: Partial<Record<CategoriaEgreso, number>> = {};
  let totalGastos = 0;

  for (const m of movimientosPeriodo) {
    if (m.tipo !== 'EGRESO' || m.estado !== 'CONFIRMADO') continue;
    // `movimientos_caja.categoria` admite todo el catálogo; en un egreso lo ajeno cae en "otros".
    const cat: CategoriaEgreso = esCategoriaEgreso(m.categoria) ? m.categoria : 'OTRO_EGRESO';
    totales[cat] = (totales[cat] ?? 0) + m.monto;
    totalGastos += m.monto;
  }

  const etiquetasMap: Record<CategoriaEgreso, string> = {
    MANTENIMIENTO_REPARACION: 'Mantenimiento & Reparación',
    COMBUSTIBLE_OPERACION: 'Combustible & Carga',
    LIMPIEZA_ALISTAMIENTO: 'Lavado & Alistamiento',
    SEGUROS_IMPUESTOS: 'Seguros & Impuestos',
    COMISIONES_BANCARIAS: 'Comisiones & Pasarelas',
    REEMBOLSO_GARANTIA: 'Devolución de Garantías',
    COMPRAS_ADMINISTRATIVAS: 'Administración & Suministros',
    OTRO_EGRESO: 'Otros Gastos Operativos',
  };

  const resultado: DistribucionCategoriaGasto[] = [];

  for (const cat of categoriasEgreso) {
    const monto = totales[cat] ?? 0;
    if (monto <= 0) continue;
    resultado.push({
      categoria: cat,
      etiqueta: etiquetasMap[cat],
      total: monto,
      porcentaje: totalGastos > 0 ? Math.round((monto / totalGastos) * 100) : 0,
    });
  }

  return resultado.sort((a, b) => b.total - a.total);
}

/**
 * Agrupa movimientos por fecha para la curva de flujo de caja en gráficos.
 */
export function agruparFlujoPorFecha(
  movimientosPeriodo: MovimientoCajaSelect[],
  diasLimite = 7
): PuntoGraficoFlujo[] {
  const mapaFechas = new Map<string, { ingresos: number; egresos: number }>();

  // Ordenar movimientos por fecha ascendente
  const ordenados = [...movimientosPeriodo].sort(
    (a, b) => new Date(a.fechaMovimiento).getTime() - new Date(b.fechaMovimiento).getTime()
  );

  for (const m of ordenados) {
    if (m.estado !== 'CONFIRMADO' || m.tipo === 'TRANSFERENCIA') continue;
    const d = new Date(m.fechaMovimiento);
    const fechaClave = d.toISOString().split('T')[0] ?? '2026-10-01';

    const actual = mapaFechas.get(fechaClave) ?? { ingresos: 0, egresos: 0 };
    if (m.tipo === 'INGRESO') {
      actual.ingresos += m.monto;
    } else if (m.tipo === 'EGRESO') {
      actual.egresos += m.monto;
    }
    mapaFechas.set(fechaClave, actual);
  }

  const puntos: PuntoGraficoFlujo[] = [];

  for (const [fecha, val] of mapaFechas.entries()) {
    const [, mes = '10', dia = '01'] = fecha.split('-');
    puntos.push({
      fecha,
      etiqueta: `${dia}/${mes}`,
      ingresos: val.ingresos,
      egresos: val.egresos,
      flujoNeto: val.ingresos - val.egresos,
    });
  }

  // Tomar hasta diasLimite o todos si son menos
  return puntos.slice(-diasLimite);
}
