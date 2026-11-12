import {
  esGastoOperativo,
  esIngresoOperativo,
  formatearMonedaCOP,
  formatearMonedaCompactaCOP,
  type MovimientoCajaSelect,
} from '@/lib/caja';
import type { CategoriaVehiculo, VehiculoItem } from '@/lib/flota';
import { DEFAULT_TIMEZONE, toClientISODate } from '@/lib/time/client-time';
import type { ContratoAlquilerSelect, ReservaSelect } from '@/db/schema';
import type { DatosMetricasLocalD1 } from './repositorio';
import type {
  DailyCompanyMovementItem,
  DailyMovementCurvePoint,
  DailyMovementsSummary,
  DailyVehicleEarningsSummary,
  HourlyEarningsSlot,
  MonthlyFleetOccupancySummary,
  MonthlyOccupancyPoint,
  RentedAutomobileItem,
  RentedFleetComplement,
  VehicleEarningsCategorySlice,
  YardMetricsSnapshot,
} from './types';

export interface BuildMetricsInput {
  readonly yardName?: string | null | undefined;
  readonly cityLabel?: string | null | undefined;
  readonly operatorName?: string | null | undefined;
  readonly timezone?: string | undefined;
  readonly dateLabel?: string | undefined;
  readonly hoyISO?: string | undefined;
  readonly vehiculos?: readonly VehiculoItem[] | undefined;
  readonly datosD1?: DatosMetricasLocalD1 | undefined;
}

const DATOS_D1_VACIOS: DatosMetricasLocalD1 = {
  reservas: [],
  contratosVigentes: [],
  movimientosConfirmados: [],
};

const ESTADOS_RESERVA_ACTIVA: ReadonlySet<string> = new Set([
  'EN_CURSO',
  'CONFIRMADA',
  'PENDIENTE',
]);

const NOMBRES_MESES: readonly { corto: string; largo: string }[] = [
  { corto: 'Ene', largo: 'Enero' },
  { corto: 'Feb', largo: 'Febrero' },
  { corto: 'Mar', largo: 'Marzo' },
  { corto: 'Abr', largo: 'Abril' },
  { corto: 'May', largo: 'Mayo' },
  { corto: 'Jun', largo: 'Junio' },
  { corto: 'Jul', largo: 'Julio' },
  { corto: 'Ago', largo: 'Agosto' },
  { corto: 'Sep', largo: 'Septiembre' },
  { corto: 'Oct', largo: 'Octubre' },
  { corto: 'Nov', largo: 'Noviembre' },
  { corto: 'Dic', largo: 'Diciembre' },
];

const CATEGORIAS_LEGIBLES: Readonly<Record<string, string>> = {
  PAGO_ALQUILER: 'Pago de alquiler',
  ABONO_CONTRATO: 'Abono de reserva',
  EXTENSION_ALQUILER: 'Prórroga de alquiler',
  PRORROGA_ALQUILER: 'Prórroga de alquiler',
  SERVICIOS_ADICIONALES: 'Servicios adicionales',
  COBRO_DANOS_MULTAS: 'Cobro de daños y multas',
  COBRO_DANOS: 'Reposición por novedad',
  DEPOSITO_GARANTIA: 'Depósito de garantía',
  INGRESO_EXTRAORDINARIO: 'Ingreso extraordinario',
  OTRO_INGRESO: 'Ingreso operativo',
  MANTENIMIENTO_REPARACION: 'Mantenimiento preventivo',
  COMBUSTIBLE_OPERACION: 'Combustible / Carga EV',
  LIMPIEZA_ALISTAMIENTO: 'Lavado y alistamiento',
  SEGUROS_IMPUESTOS: 'Póliza e impuestos',
  COMISIONES_BANCARIAS: 'Comisión de recaudo',
  REEMBOLSO_GARANTIA: 'Reembolso de garantía',
  COMPRAS_ADMINISTRATIVAS: 'Insumos de patio',
  OTRO_EGRESO: 'Gasto operativo',
};

const METODOS_PAGO_LEGIBLES: Readonly<Record<string, string>> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  especie: 'Especie',
  otro: 'Otro',
};

const ETIQUETAS_CATEGORIA_VEHICULO: Readonly<Record<CategoriaVehiculo, string>> = {
  SEDAN: 'Automóviles Sedán',
  SUV: 'Camionetas SUV',
  MOTO: 'Motocicletas',
  PATINETA: 'Patinetas Eléctricas',
  UTILITARIO: 'Utilitarios',
};

const FRANJAS_HORARIAS: readonly { id: string; label: string; minHora: number; maxHora: number }[] = [
  { id: 'hr-0', label: '06h-09h', minHora: 0, maxHora: 8 },
  { id: 'hr-1', label: '09h-12h', minHora: 9, maxHora: 11 },
  { id: 'hr-2', label: '12h-15h', minHora: 12, maxHora: 14 },
  { id: 'hr-3', label: '15h-18h', minHora: 15, maxHora: 17 },
  { id: 'hr-4', label: '18h-22h', minHora: 18, maxHora: 23 },
];

function esAutomovil(vehiculo: VehiculoItem): boolean {
  return vehiculo.categoria === 'SEDAN' || vehiculo.categoria === 'SUV';
}

function parsearFechaISOUTC(fechaISO: string): { anio: number; mes: number; dia: number } {
  const partes = fechaISO.split('-');
  const anio = parseInt(partes[0] ?? '', 10);
  const mes = parseInt(partes[1] ?? '', 10);
  const dia = parseInt(partes[2] ?? '', 10);
  if (
    !Number.isFinite(anio) ||
    !Number.isFinite(mes) ||
    !Number.isFinite(dia) ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    dia > 31
  ) {
    const ahora = new Date();
    return {
      anio: ahora.getUTCFullYear(),
      mes: ahora.getUTCMonth() + 1,
      dia: ahora.getUTCDate(),
    };
  }
  return { anio, mes, dia };
}

function sumarDiasISO(fechaISO: string, deltaDias: number): string {
  const { anio, mes, dia } = parsearFechaISOUTC(fechaISO);
  const d = new Date(Date.UTC(anio, mes - 1, dia + deltaDias));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function diasEntreISO(inicioISO: string, finISO: string): number {
  const ini = parsearFechaISOUTC(inicioISO);
  const fin = parsearFechaISOUTC(finISO);
  const tsIni = Date.UTC(ini.anio, ini.mes - 1, ini.dia);
  const tsFin = Date.UTC(fin.anio, fin.mes - 1, fin.dia);
  return Math.round((tsFin - tsIni) / 86_400_000);
}

function formatearHoraLocal(fecha: Date, timezone: string): string {
  const formateado = new Intl.DateTimeFormat('es-CO', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(fecha);
  return formateado.startsWith('24:') ? `00:${formateado.slice(3)}` : formateado;
}

function obtenerHoraLocal(fecha: Date, timezone: string): number {
  const horaStr = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hour12: false,
  }).format(fecha);
  const hora = parseInt(horaStr, 10);
  if (!Number.isFinite(hora) || hora === 24) return 0;
  return hora;
}

function extraerPlacaDeTexto(
  texto: string,
  vehiculoId: string | null,
  mapaPlacasPorId: ReadonlyMap<string, string>
): string | null {
  if (vehiculoId) {
    const placaMapeada = mapaPlacasPorId.get(vehiculoId);
    if (placaMapeada) return placaMapeada;
  }
  const coincidencia = /([A-Z]{3}-\d{2,3}[A-Z]?)/.exec(texto);
  return coincidencia?.[1] ?? null;
}

function construirFlotaAlquilada(
  flota: readonly VehiculoItem[],
  datosD1: DatosMetricasLocalD1,
  hoyISO: string,
  timezone: string
): RentedFleetComplement {
  const automoviles = flota.filter(esAutomovil);
  const otrasUnidades = flota.filter((v) => !esAutomovil(v));

  const contratosPorVehiculo = new Map<string, ContratoAlquilerSelect>();
  for (const contrato of datosD1.contratosVigentes) {
    if (!contratosPorVehiculo.has(contrato.vehiculoId)) {
      contratosPorVehiculo.set(contrato.vehiculoId, contrato);
    }
  }

  const reservasPorId = new Map<string, ReservaSelect>();
  const reservasActivasPorVehiculo = new Map<string, ReservaSelect>();
  for (const reserva of datosD1.reservas) {
    reservasPorId.set(reserva.id, reserva);
    if (
      ESTADOS_RESERVA_ACTIVA.has(reserva.estado) &&
      reserva.fechaInicio <= hoyISO &&
      reserva.fechaFin >= hoyISO &&
      !reservasActivasPorVehiculo.has(reserva.vehiculoId)
    ) {
      reservasActivasPorVehiculo.set(reserva.vehiculoId, reserva);
    }
  }

  const itemsAlquilados: RentedAutomobileItem[] = [];

  for (const auto of automoviles) {
    const contrato = contratosPorVehiculo.get(auto.id);
    const reserva = contrato
      ? (reservasPorId.get(contrato.reservaId) ?? reservasActivasPorVehiculo.get(auto.id))
      : reservasActivasPorVehiculo.get(auto.id);

    const estaAlquilado =
      auto.estado === 'RESERVADO' || contrato !== undefined || reserva !== undefined;
    if (!estaAlquilado) continue;

    const fechaInicio =
      reserva?.fechaInicio ??
      (contrato?.fechaHoraEntregaReal
        ? toClientISODate(new Date(contrato.fechaHoraEntregaReal), timezone)
        : hoyISO);
    const diasActivos = Math.max(1, diasEntreISO(fechaInicio, hoyISO) + 1);

    const returnLabel = reserva?.fechaFin
      ? `Retorno ${reserva.fechaFin}`
      : contrato?.fechaHoraDevolucionPactada
        ? `Retorno ${toClientISODate(new Date(contrato.fechaHoraDevolucionPactada), timezone)}`
        : 'Retorno programado';

    itemsAlquilados.push({
      id: auto.id,
      plate: auto.placa,
      brandModel: `${auto.marca} ${auto.modelo}`,
      categoryLabel: auto.categoriaEtiqueta,
      transmissionLabel: auto.transmision,
      fuelLabel: auto.combustible,
      dailyRate: auto.precioDia,
      dailyRateFormatted: `${formatearMonedaCOP(auto.precioDia)}/día`,
      clientName: contrato?.arrendatarioNombre ?? reserva?.contactoNombre ?? 'Reserva en curso',
      returnLabel,
      contractCode: contrato?.numeroContrato ?? reserva?.codigo ?? auto.placa,
      daysActive: diasActivos,
    });
  }

  const totalAutos = automoviles.length;
  const alquiladosAutos = itemsAlquilados.length;
  const mantenimientoAutos = automoviles.filter(
    (v) => v.estado === 'MANTENIMIENTO' || v.estado === 'FUERA_SERVICIO'
  ).length;
  const disponiblesAutos = Math.max(0, totalAutos - alquiladosAutos - mantenimientoAutos);

  const otrasAlquiladas = otrasUnidades.filter(
    (v) =>
      v.estado === 'RESERVADO' ||
      contratosPorVehiculo.has(v.id) ||
      reservasActivasPorVehiculo.has(v.id)
  ).length;

  const ocupacionAutosPct =
    totalAutos > 0 ? Math.min(100, Math.round((alquiladosAutos / totalAutos) * 100)) : 0;
  const sumaTarifaDiaria = itemsAlquilados.reduce((acc, item) => acc + item.dailyRate, 0);

  return {
    rentedAutomobilesCount: alquiladosAutos,
    totalAutomobilesCount: totalAutos,
    automobilesOccupancyPct: ocupacionAutosPct,
    availableAutomobilesCount: disponiblesAutos,
    maintenanceAutomobilesCount: mantenimientoAutos,
    otherRentedUnitsCount: otrasAlquiladas,
    totalFleetCount: flota.length,
    activeDailyRunRateFormatted: formatearMonedaCOP(sumaTarifaDiaria),
    rentedAutomobiles: itemsAlquilados,
  };
}

function construirCurvaMovimientosDiarios(
  movimientosConfirmados: readonly MovimientoCajaSelect[],
  hoyISO: string,
  timezone: string
): readonly DailyMovementCurvePoint[] {
  const totalesPorDia = new Map<string, { income: number; expense: number }>();

  for (const mov of movimientosConfirmados) {
    if (mov.estado !== 'CONFIRMADO') continue;
    const fechaISO = toClientISODate(new Date(mov.fechaMovimiento), timezone);
    const actual = totalesPorDia.get(fechaISO) ?? { income: 0, expense: 0 };
    if (esIngresoOperativo(mov)) {
      actual.income += mov.monto;
    } else if (esGastoOperativo(mov)) {
      actual.expense += mov.monto;
    }
    totalesPorDia.set(fechaISO, actual);
  }

  const offsets = [-4, -3, -2, -1, 0] as const;
  return offsets.map((offset, idx) => {
    const fechaISO = sumarDiasISO(hoyISO, offset);
    const partes = fechaISO.split('-');
    const dia = partes[2] ?? '01';
    const mes = partes[1] ?? '01';
    const esHoy = offset === 0;
    const totales = totalesPorDia.get(fechaISO) ?? { income: 0, expense: 0 };
    const net = totales.income - totales.expense;

    return {
      id: `flujo-dia-${idx}`,
      dateKey: fechaISO,
      label: esHoy ? 'Hoy' : `${dia}/${mes}`,
      isToday: esHoy,
      income: totales.income,
      incomeFormatted: formatearMonedaCOP(totales.income),
      incomeCompactFormatted: formatearMonedaCompactaCOP(totales.income),
      expense: totales.expense,
      expenseFormatted: formatearMonedaCOP(totales.expense),
      expenseCompactFormatted: formatearMonedaCompactaCOP(totales.expense),
      netBalance: net,
      netBalanceFormatted: `${net >= 0 ? '+ ' : '- '}${formatearMonedaCOP(Math.abs(net))}`,
    };
  });
}

function construirMovimientosDiarios(
  dateLabel: string,
  flota: readonly VehiculoItem[],
  movimientosConfirmados: readonly MovimientoCajaSelect[],
  hoyISO: string,
  timezone: string
): DailyMovementsSummary {
  const mapaPlacas = new Map<string, string>();
  for (const v of flota) {
    mapaPlacas.set(v.id, v.placa);
  }

  const movimientosHoy = movimientosConfirmados
    .filter((m) => {
      if (m.estado !== 'CONFIRMADO') return false;
      if (m.tipo !== 'INGRESO' && m.tipo !== 'EGRESO') return false;
      return toClientISODate(new Date(m.fechaMovimiento), timezone) === hoyISO;
    })
    .sort(
      (a, b) =>
        new Date(b.fechaMovimiento).getTime() - new Date(a.fechaMovimiento).getTime()
    );

  const items: DailyCompanyMovementItem[] = movimientosHoy.map((m) => {
    const esIngreso = m.tipo === 'INGRESO';
    const fecha = new Date(m.fechaMovimiento);
    const placa = extraerPlacaDeTexto(m.concepto, m.vehiculoId, mapaPlacas);
    const signo = esIngreso ? '+ ' : '- ';
    return {
      id: m.id,
      kind: esIngreso ? 'INGRESO' : 'EGRESO',
      title: m.concepto,
      categoryLabel: CATEGORIAS_LEGIBLES[m.categoria] ?? 'Operación de patio',
      timeLabel: formatearHoraLocal(fecha, timezone),
      amount: m.monto,
      amountFormatted: `${signo}${formatearMonedaCOP(m.monto)}`,
      vehiclePlate: placa,
      paymentMethodLabel: METODOS_PAGO_LEGIBLES[m.metodoPago] ?? m.metodoPago,
      referenceCode: m.contratoId ?? m.referencia,
      notes:
        m.observaciones ??
        (esIngreso
          ? 'Ingreso registrado por alquiler de unidad en patio.'
          : 'Egreso operativo aplicado a alistamiento o mantenimiento.'),
    };
  });

  const ingresosOperativosHoy = movimientosHoy.filter(esIngresoOperativo);
  const egresosOperativosHoy = movimientosHoy.filter(esGastoOperativo);

  const totalIncome = ingresosOperativosHoy.reduce((acc, m) => acc + m.monto, 0);
  const totalExpense = egresosOperativosHoy.reduce((acc, m) => acc + m.monto, 0);
  const netDailyBalance = totalIncome - totalExpense;
  const volumenBruto = totalIncome + totalExpense;
  const incomeSharePct =
    volumenBruto > 0 ? Math.round((totalIncome / volumenBruto) * 100) : 0;

  const curvePoints = construirCurvaMovimientosDiarios(
    movimientosConfirmados,
    hoyISO,
    timezone
  );

  return {
    dateLabel,
    totalIncome,
    totalIncomeFormatted: formatearMonedaCOP(totalIncome),
    totalIncomeCompactFormatted: formatearMonedaCompactaCOP(totalIncome),
    totalExpense,
    totalExpenseFormatted: formatearMonedaCOP(totalExpense),
    totalExpenseCompactFormatted: formatearMonedaCompactaCOP(totalExpense),
    netDailyBalance,
    netDailyBalanceFormatted: `${netDailyBalance >= 0 ? '+ ' : '- '}${formatearMonedaCOP(Math.abs(netDailyBalance))}`,
    netDailyBalanceCompactFormatted: `${netDailyBalance >= 0 ? '+' : '-'}${formatearMonedaCompactaCOP(Math.abs(netDailyBalance))}`,
    incomeSharePct,
    incomeCount: ingresosOperativosHoy.length,
    expenseCount: egresosOperativosHoy.length,
    curvePoints,
    items,
  };
}

function construirGananciaDiariaVehiculos(
  flota: readonly VehiculoItem[],
  movimientosConfirmados: readonly MovimientoCajaSelect[],
  hoyISO: string,
  timezone: string
): DailyVehicleEarningsSummary {
  const vehiculosPorId = new Map<string, VehiculoItem>();
  for (const v of flota) {
    vehiculosPorId.set(v.id, v);
  }

  const ingresosOperativos = movimientosConfirmados.filter(esIngresoOperativo);
  const ingresosHoy = ingresosOperativos.filter(
    (m) => toClientISODate(new Date(m.fechaMovimiento), timezone) === hoyISO
  );

  const todayEarnings = ingresosHoy.reduce((acc, m) => acc + m.monto, 0);

  const hace29DiasISO = sumarDiasISO(hoyISO, -29);
  const ingresosUltimos30Dias = new Map<string, number>();
  for (const mov of ingresosOperativos) {
    const fechaISO = toClientISODate(new Date(mov.fechaMovimiento), timezone);
    if (fechaISO >= hace29DiasISO && fechaISO <= hoyISO) {
      ingresosUltimos30Dias.set(
        fechaISO,
        (ingresosUltimos30Dias.get(fechaISO) ?? 0) + mov.monto
      );
    }
  }

  const total30Dias = Array.from(ingresosUltimos30Dias.values()).reduce(
    (acc, v) => acc + v,
    0
  );
  const dailyAverage =
    ingresosUltimos30Dias.size > 0
      ? Math.round(total30Dias / ingresosUltimos30Dias.size)
      : 0;

  const variationPct =
    dailyAverage > 0
      ? Math.round(((todayEarnings - dailyAverage) / dailyAverage) * 100)
      : 0;

  const vehiculosAportantes = new Set<string>();
  for (const mov of ingresosHoy) {
    if (mov.vehiculoId) {
      vehiculosAportantes.add(mov.vehiculoId);
    }
  }
  const contributingVehiclesCount =
    vehiculosAportantes.size > 0
      ? vehiculosAportantes.size
      : todayEarnings > 0
        ? 1
        : 0;

  const averagePerVehicle =
    contributingVehiclesCount > 0
      ? Math.round(todayEarnings / contributingVehiclesCount)
      : 0;

  const acumuladorCategorias = new Map<
    string,
    { label: string; amount: number; vehiculos: Set<string> }
  >();

  if (todayEarnings > 0) {
    for (const mov of ingresosHoy) {
      const vehiculo = mov.vehiculoId ? vehiculosPorId.get(mov.vehiculoId) : undefined;
      const catKey = vehiculo ? vehiculo.categoria : 'OTROS';
      const catLabel = vehiculo
        ? ETIQUETAS_CATEGORIA_VEHICULO[vehiculo.categoria]
        : 'Otros ingresos operativos';

      const entrada = acumuladorCategorias.get(catKey) ?? {
        label: catLabel,
        amount: 0,
        vehiculos: new Set<string>(),
      };
      entrada.amount += mov.monto;
      if (mov.vehiculoId) {
        entrada.vehiculos.add(mov.vehiculoId);
      }
      acumuladorCategorias.set(catKey, entrada);
    }
  }

  const byCategory: readonly VehicleEarningsCategorySlice[] = Array.from(
    acumuladorCategorias.entries()
  )
    .filter(([, datos]) => datos.amount > 0)
    .map(([key, datos]) => ({
      id: `cat-${key.toLowerCase()}`,
      label: datos.label,
      rentedCount: datos.vehiculos.size,
      amount: datos.amount,
      amountFormatted: formatearMonedaCOP(datos.amount),
      sharePct:
        todayEarnings > 0 ? Math.round((datos.amount / todayEarnings) * 100) : 0,
    }));

  const acumuladorFranjas = FRANJAS_HORARIAS.map((f) => ({
    id: f.id,
    label: f.label,
    minHora: f.minHora,
    maxHora: f.maxHora,
    amount: 0,
    ops: 0,
  }));

  for (const mov of ingresosHoy) {
    const hora = obtenerHoraLocal(new Date(mov.fechaMovimiento), timezone);
    const franja =
      acumuladorFranjas.find((f) => hora >= f.minHora && hora <= f.maxHora) ??
      acumuladorFranjas[acumuladorFranjas.length - 1]!;
    franja.amount += mov.monto;
    franja.ops += 1;
  }

  const maxSlotAmount = Math.max(...acumuladorFranjas.map((f) => f.amount), 0);
  const hourlySlots: readonly HourlyEarningsSlot[] = acumuladorFranjas.map((slot) => ({
    id: slot.id,
    hourLabel: slot.label,
    amount: slot.amount,
    amountFormatted: formatearMonedaCOP(slot.amount),
    compactFormatted: formatearMonedaCompactaCOP(slot.amount),
    heightPct: maxSlotAmount > 0 ? Math.round((slot.amount / maxSlotAmount) * 100) : 0,
    operationsCount: slot.ops,
  }));

  const signo = variationPct >= 0 ? '+' : '';

  return {
    todayEarnings,
    todayEarningsFormatted: formatearMonedaCOP(todayEarnings),
    todayEarningsCompactFormatted: formatearMonedaCompactaCOP(todayEarnings),
    dailyAverage,
    dailyAverageFormatted: formatearMonedaCOP(dailyAverage),
    variationPct,
    variationLabel: `${signo}${variationPct}% vs promedio diario`,
    contributingVehiclesCount,
    averagePerVehicleFormatted: formatearMonedaCOP(averagePerVehicle),
    byCategory,
    hourlySlots,
  };
}

function construirOcupacionMensual(
  flota: readonly VehiculoItem[],
  datosD1: DatosMetricasLocalD1,
  hoyISO: string,
  timezone: string
): MonthlyFleetOccupancySummary {
  const { anio: anioActual, mes: mesActualNumero } = parsearFechaISOUTC(hoyISO);
  const mesActualIdx = mesActualNumero - 1;

  const reservasValidas = datosD1.reservas.filter(
    (r) => r.estado !== 'CANCELADA' && r.estado !== 'RECHAZADA'
  );
  const ingresosOperativos = datosD1.movimientosConfirmados.filter(esIngresoOperativo);

  const offsets = [-5, -4, -3, -2, -1, 0] as const;

  const months: MonthlyOccupancyPoint[] = offsets.map((offset) => {
    const fechaMes = new Date(Date.UTC(anioActual, mesActualIdx + offset, 1));
    const mIdx = fechaMes.getUTCMonth();
    const mAnio = fechaMes.getUTCFullYear();
    const mesNumero = mIdx + 1;
    const ymKey = `${mAnio}-${String(mesNumero).padStart(2, '0')}`;
    const diasDelMes = new Date(Date.UTC(mAnio, mesNumero, 0)).getUTCDate();
    const primerDiaMesISO = `${ymKey}-01`;
    const ultimoDiaMesISO = `${ymKey}-${String(diasDelMes).padStart(2, '0')}`;

    const reservasMes = reservasValidas.filter(
      (r) => r.fechaInicio <= ultimoDiaMesISO && r.fechaFin >= primerDiaMesISO
    );

    let diasOcupadosMes = 0;
    for (const r of reservasMes) {
      const inicioEfectivo =
        r.fechaInicio > primerDiaMesISO ? r.fechaInicio : primerDiaMesISO;
      const finEfectivo =
        r.fechaFin < ultimoDiaMesISO ? r.fechaFin : ultimoDiaMesISO;
      if (finEfectivo >= inicioEfectivo) {
        diasOcupadosMes += diasEntreISO(inicioEfectivo, finEfectivo) + 1;
      }
    }

    const ocupacionPct =
      flota.length > 0
        ? Math.min(
            100,
            Math.max(0, Math.round((diasOcupadosMes / (flota.length * diasDelMes)) * 100))
          )
        : 0;

    const gananciaMes = ingresosOperativos
      .filter((m) =>
        toClientISODate(new Date(m.fechaMovimiento), timezone).startsWith(ymKey)
      )
      .reduce((acc, m) => acc + m.monto, 0);

    const infoMes = NOMBRES_MESES[mIdx] ?? { corto: 'Oct', largo: 'Octubre' };
    const promedioReserva =
      reservasMes.length > 0 ? Math.round(gananciaMes / reservasMes.length) : 0;

    return {
      id: `mes-${mAnio}-${mesNumero}`,
      monthShort: infoMes.corto,
      monthFull: `${infoMes.largo} ${mAnio}`,
      isCurrentMonth: offset === 0,
      reservationsCount: reservasMes.length,
      occupancyPct: ocupacionPct,
      earnings: gananciaMes,
      earningsFormatted: formatearMonedaCOP(gananciaMes),
      earningsCompactFormatted: formatearMonedaCompactaCOP(gananciaMes),
      avgReservationFormatted: formatearMonedaCOP(promedioReserva),
    };
  });

  const mesActualObj = months[months.length - 1]!;
  const totalReservasSemestre = months.reduce((acc, m) => acc + m.reservationsCount, 0);
  const totalGananciaSemestre = months.reduce((acc, m) => acc + m.earnings, 0);

  let mejorMes = mesActualObj;
  for (const m of months) {
    if (m.earnings > mejorMes.earnings) {
      mejorMes = m;
    }
  }

  return {
    currentMonthLabel: mesActualObj.monthFull,
    currentOccupancyPct: mesActualObj.occupancyPct,
    targetOccupancyPct: 85,
    currentMonthReservations: mesActualObj.reservationsCount,
    currentMonthEarnings: mesActualObj.earnings,
    currentMonthEarningsFormatted: mesActualObj.earningsFormatted,
    sixMonthTotalReservations: totalReservasSemestre,
    sixMonthTotalEarningsFormatted: formatearMonedaCOP(totalGananciaSemestre),
    bestMonthLabel: `${mejorMes.monthShort} (${mejorMes.earningsCompactFormatted})`,
    months,
  };
}

export function getYardMetricsSnapshot(
  input: BuildMetricsInput = {}
): YardMetricsSnapshot {
  const yardName = input.yardName ?? 'Patio Principal';
  const cityLabel = input.cityLabel ?? 'Medellín';
  const operatorName = input.operatorName ?? 'Operador';
  const timezone = input.timezone ?? DEFAULT_TIMEZONE;
  const hoyISO = input.hoyISO ?? toClientISODate(new Date(), timezone);
  const dateLabel = input.dateLabel ?? hoyISO;
  const flota = input.vehiculos ?? [];
  const datosD1 = input.datosD1 ?? DATOS_D1_VACIOS;

  const rentedFleet = construirFlotaAlquilada(flota, datosD1, hoyISO, timezone);
  const dailyMovements = construirMovimientosDiarios(
    dateLabel,
    flota,
    datosD1.movimientosConfirmados,
    hoyISO,
    timezone
  );
  const dailyEarnings = construirGananciaDiariaVehiculos(
    flota,
    datosD1.movimientosConfirmados,
    hoyISO,
    timezone
  );
  const monthlyOccupancy = construirOcupacionMensual(flota, datosD1, hoyISO, timezone);

  return {
    yardName,
    cityLabel,
    operatorName,
    timezone,
    dateLabel,
    dailyEarnings,
    monthlyOccupancy,
    rentedFleet,
    dailyMovements,
  };
}
