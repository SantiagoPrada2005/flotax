import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import {
  cuentasFinancieras,
  movimientosCaja,
  sesionesCaja,
  depositosGarantia,
  auditoriaFinanciera,
  contratosAlquiler,
  reservas,
  vehiculos,
  type CuentaFinancieraSelect,
  type MovimientoCajaSelect,
  type SesionCajaSelect,
  type DepositoGarantiaSelect,
} from '@/db/schema';
import { eq, desc, or } from 'drizzle-orm';
import { asegurarConfiguracionBaseLocal } from '@/lib/flota/locales-captacion';
import {
  CUENTAS_CANONICAS_SEMILLA,
  MOVIMIENTOS_CANONICOS_SEMILLA,
  SESION_CAJA_ACTIVA_SEMILLA,
  DEPOSITOS_GARANTIA_SEMILLA,
  CARTERA_CONTRATOS_SEMILLA,
  ALERTAS_FINANCIERAS_SEMILLA,
} from './semillas';
import {
  calcularIndicadoresFinancieros,
  calcularDistribucionMetodosPago,
  calcularDistribucionGastosCategorias,
  agruparFlujoPorFecha,
  calcularSaldoCuenta,
  calcularTotalPagadoNetoContrato,
  resolverCuentaPorMetodoPago,
} from './calculos';

export { resolverCuentaPorMetodoPago, calcularTotalPagadoNetoContrato } from './calculos';
import type {
  ResumenFinancieroCompleto,
  RangoPeriodoFinanciero,
  ContratoCarteraItem,
  AlertaFinanciera,
  MetodoPagoFinanciero,
  CategoriaMovimiento,
  TipoMovimientoCaja,
  TipoCuentaFinanciera,
} from './tipos';

// Cache en memoria para reactividad y tolerancia en entornos offline o preview
const cacheCuentas = new Map<string, CuentaFinancieraSelect>();
const cacheMovimientos = new Map<string, MovimientoCajaSelect>();
const cacheSesiones = new Map<string, SesionCajaSelect>();
const cacheGarantias = new Map<string, DepositoGarantiaSelect>();
const cacheCartera = new Map<string, ContratoCarteraItem>();

function inicializarCacheMemoria() {
  if (cacheCuentas.size === 0) {
    for (const c of CUENTAS_CANONICAS_SEMILLA) cacheCuentas.set(c.id, { ...c });
    for (const m of MOVIMIENTOS_CANONICOS_SEMILLA) cacheMovimientos.set(m.id, { ...m });
    cacheSesiones.set(SESION_CAJA_ACTIVA_SEMILLA.id, { ...SESION_CAJA_ACTIVA_SEMILLA });
    for (const g of DEPOSITOS_GARANTIA_SEMILLA) cacheGarantias.set(g.id, { ...g });
    for (const car of CARTERA_CONTRATOS_SEMILLA) cacheCartera.set(car.codigoContrato, { ...car });
  }
}

inicializarCacheMemoria();

/**
 * Calcula los límites de fecha (inicio y fin) según el período seleccionado.
 */
export function resolverRangoFechasPeriodo(
  periodo: RangoPeriodoFinanciero,
  fechaInicioCustom?: string,
  fechaFinCustom?: string,
  fechaReferencia?: Date | string
): { inicio: Date; fin: Date } {
  const ahora = fechaReferencia ? new Date(fechaReferencia) : new Date();
  const fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

  if (periodo === 'HOY') {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    return { inicio, fin };
  }

  if (periodo === '7_DIAS') {
    const inicio = new Date(ahora);
    inicio.setDate(ahora.getDate() - 6);
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fin };
  }

  if (periodo === 'ESTE_MES') {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
    return { inicio, fin };
  }

  if (periodo === 'MES_ANTERIOR') {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1, 0, 0, 0, 0);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59, 999);
    return { inicio, fin: finMesAnterior };
  }

  if (periodo === 'PERSONALIZADO' && fechaInicioCustom && fechaFinCustom) {
    const inicio = new Date(`${fechaInicioCustom}T00:00:00Z`);
    const finC = new Date(`${fechaFinCustom}T23:59:59Z`);
    return { inicio, fin: finC };
  }

  // Fallback este mes
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
  return { inicio, fin };
}

/**
 * Obtiene el estado financiero consolidado completo para el dashboard administrativo.
 */
export async function obtenerEstadoFinancieroCompleto(params: {
  localId?: string | undefined;
  periodo?: RangoPeriodoFinanciero | undefined;
  fechaInicioCustom?: string | undefined;
  fechaFinCustom?: string | undefined;
  db?: AppDb | undefined;
}): Promise<ResumenFinancieroCompleto> {
  const {
    periodo = 'ESTE_MES',
    fechaInicioCustom,
    fechaFinCustom,
    db,
  } = params;

  let cuentasList: CuentaFinancieraSelect[] = [];
  let movimientosList: MovimientoCajaSelect[] = [];
  let sesionesList: SesionCajaSelect[] = [];
  let garantiasList: DepositoGarantiaSelect[] = [];
  let carteraList: ContratoCarteraItem[] = [];

  if (!db) {
    inicializarCacheMemoria();
    cuentasList = Array.from(cacheCuentas.values());
    movimientosList = Array.from(cacheMovimientos.values());
    sesionesList = Array.from(cacheSesiones.values());
    garantiasList = Array.from(cacheGarantias.values());
    carteraList = Array.from(cacheCartera.values());
  } else if (params.localId) {
    // Si hay base de datos D1 conectada y localId definido, leer registros persistidos de dicho local
    try {
      const dbCuentas = await db
        .select()
        .from(cuentasFinancieras)
        .where(eq(cuentasFinancieras.localId, params.localId))
        .all();
      cuentasList = dbCuentas;

      const dbMovimientos = await db
        .select()
        .from(movimientosCaja)
        .where(eq(movimientosCaja.localId, params.localId))
        .orderBy(desc(movimientosCaja.fechaMovimiento))
        .all();
      movimientosList = dbMovimientos;

      const dbSesiones = await db
        .select()
        .from(sesionesCaja)
        .where(eq(sesionesCaja.localId, params.localId))
        .orderBy(desc(sesionesCaja.fechaApertura))
        .all();
      sesionesList = dbSesiones;

      const dbGarantias = await db
        .select()
        .from(depositosGarantia)
        .where(eq(depositosGarantia.localId, params.localId))
        .orderBy(desc(depositosGarantia.creadoEn))
        .all();
      garantiasList = dbGarantias;

      // Proyección estricta E2E (<20 columnas) para evitar SQLITE_MAX_COLUMN (100) en D1
      const dbContratos = await db
        .select({
          id: contratosAlquiler.id,
          numeroContrato: contratosAlquiler.numeroContrato,
          localId: contratosAlquiler.localId,
          arrendatarioNombre: contratosAlquiler.arrendatarioNombre,
          arrendatarioTipoDocumento: contratosAlquiler.arrendatarioTipoDocumento,
          arrendatarioNumeroDocumento: contratosAlquiler.arrendatarioNumeroDocumento,
          totalLiquidado: contratosAlquiler.totalLiquidado,
          totalPagado: contratosAlquiler.totalPagado,
          saldoPendiente: contratosAlquiler.saldoPendiente,
          estadoPago: contratosAlquiler.estadoPago,
          creadoEn: contratosAlquiler.creadoEn,
          reservaVehiculoId: reservas.vehiculoId,
          reservaFechaInicio: reservas.fechaInicio,
          reservaFechaFin: reservas.fechaFin,
          vehiculoMarca: vehiculos.marca,
          vehiculoModelo: vehiculos.modelo,
          vehiculoPlaca: vehiculos.placa,
          vehiculoDepositoGarantia: vehiculos.depositoGarantia,
        })
        .from(contratosAlquiler)
        .innerJoin(reservas, eq(contratosAlquiler.reservaId, reservas.id))
        .leftJoin(vehiculos, eq(reservas.vehiculoId, vehiculos.id))
        .where(eq(contratosAlquiler.localId, params.localId))
        .orderBy(desc(contratosAlquiler.creadoEn));

      const mapaGarantiasPorContrato = new Map(
        garantiasList.map((g) => [g.contratoId, g])
      );

      carteraList = dbContratos.map((row) => {
        const garantiaAsociada =
          mapaGarantiasPorContrato.get(row.id) ??
          mapaGarantiasPorContrato.get(row.numeroContrato);

        const vehiculoNombre =
          row.vehiculoMarca && row.vehiculoModelo
            ? `${row.vehiculoMarca} ${row.vehiculoModelo}`
            : row.reservaVehiculoId;

        const garantiaEsperada =
          garantiaAsociada?.montoEsperado ??
          row.vehiculoDepositoGarantia ??
          0;

        return {
          codigoContrato: row.numeroContrato,
          clienteNombre: row.arrendatarioNombre,
          clienteDocumento: `${row.arrendatarioTipoDocumento} ${row.arrendatarioNumeroDocumento}`,
          vehiculoNombre,
          vehiculoPlaca: row.vehiculoPlaca ?? 'N/A',
          fechaInicio: row.reservaFechaInicio,
          fechaFin: row.reservaFechaFin,
          totalAlquiler: row.totalLiquidado,
          totalAbonado: row.totalPagado,
          saldoPendiente: row.saldoPendiente,
          estadoPago:
            row.estadoPago === 'PAGADO'
              ? 'PAGADO'
              : row.estadoPago === 'EN_MORA'
                ? 'VENCIDO'
                : row.totalPagado > 0
                  ? 'PARCIAL'
                  : 'PENDIENTE',
          garantiaEsperada,
          garantiaEstado: garantiaAsociada?.estado ?? 'PENDIENTE_RECIBIR',
        };
      });
    } catch (error) {
      logFalloD1('caja.resumen.select', error, {});
    }
  }

  const { inicio, fin } = resolverRangoFechasPeriodo(
    periodo,
    fechaInicioCustom,
    fechaFinCustom
  );

  // Filtrar movimientos del período
  const movimientosPeriodo = movimientosList.filter((m) => {
    const f = new Date(m.fechaMovimiento);
    return f >= inicio && f <= fin;
  });

  // Indicadores
  const indicadores = calcularIndicadoresFinancieros({
    cuentas: cuentasList,
    movimientosTodos: movimientosList,
    movimientosPeriodo,
    depositosGarantia: garantiasList,
    carteraContratos: carteraList,
  });

  // Gráficos
  const graficoFlujo = agruparFlujoPorFecha(movimientosPeriodo, 7);
  const graficoMetodosPago = calcularDistribucionMetodosPago(movimientosPeriodo);
  const graficoGastosCategorias = calcularDistribucionGastosCategorias(movimientosPeriodo);

  // Sesión activa
  const sesionActiva = sesionesList.find((s) => s.estado === 'ABIERTA') ?? null;

  // Alertas accionables
  const alertas: AlertaFinanciera[] = db ? [] : [...ALERTAS_FINANCIERAS_SEMILLA];

  // Si hay sesión abierta, calcular diferencia si existiera conteo
  if (sesionActiva) {
    const ctaEfectivo = cuentasList.find((c) => c.id === sesionActiva.cuentaId);
    if (ctaEfectivo) {
      const saldoEsperado = calcularSaldoCuenta(ctaEfectivo, movimientosList);
      if (sesionActiva.saldoRealContado !== null && sesionActiva.saldoRealContado !== undefined) {
        const diff = sesionActiva.saldoRealContado - saldoEsperado;
        if (diff !== 0) {
          alertas.unshift({
            id: `alt-diff-${sesionActiva.id}`,
            tipo: 'DIFERENCIA_ARQUEO',
            nivel: 'URGENTE',
            titulo: 'Diferencia en arqueo de caja física',
            descripcion: `Existe un descuadre de ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(diff)} entre saldo contado y esperado.`,
            montoAsociado: Math.abs(diff),
            entidadId: sesionActiva.id,
            accionTexto: 'Revisar Arqueo',
            accionTab: 'arqueo',
          });
        }
      }
    }
  }

  // Ordenar movimientos recientes (máximo 15)
  const movimientosRecientes = [...movimientosList]
    .sort((a, b) => new Date(b.fechaMovimiento).getTime() - new Date(a.fechaMovimiento).getTime())
    .slice(0, 15);

  return {
    periodo,
    fechaInicioISO: inicio.toISOString(),
    fechaFinISO: fin.toISOString(),
    indicadores,
    cuentas: cuentasList,
    movimientosRecientes,
    todosMovimientos: movimientosList,
    sesionCajaActiva: sesionActiva,
    historialSesionesCaja: sesionesList,
    depositosGarantia: garantiasList,
    carteraContratos: carteraList,
    alertas,
    graficoFlujo,
    graficoMetodosPago,
    graficoGastosCategorias,
  };
}

/**
 * Reconcilia de forma atómica en D1 los saldos y estados de pago de un contrato de alquiler
 * y su reserva asociada a partir de todos los movimientos confirmados en caja.
 * Actualiza contratos_alquiler (totalPagado, saldoPendiente, estadoPago)
 * y reservas.montoAbonoReportado vía db.batch() e inserta auditoria_financiera.
 */
export async function reconciliarSaldosContratoYReservaD1(
  db: AppDb,
  localId: string,
  contratoId?: string | undefined,
  reservaId?: string | undefined,
  usuarioId?: string | undefined
): Promise<{ totalPagadoNeto: number; saldoPendiente: number; estadoPago: string }> {
  // 1. Localizar contrato si se pasó contratoId o reservaId
  let contrato: {
    id: string;
    numeroContrato: string;
    reservaId: string;
    localId: string;
    totalLiquidado: number;
    totalPagado: number;
    saldoPendiente: number;
    estadoPago: string;
  } | undefined;

  if (contratoId) {
    const resCtr = await db
      .select({
        id: contratosAlquiler.id,
        numeroContrato: contratosAlquiler.numeroContrato,
        reservaId: contratosAlquiler.reservaId,
        localId: contratosAlquiler.localId,
        totalLiquidado: contratosAlquiler.totalLiquidado,
        totalPagado: contratosAlquiler.totalPagado,
        saldoPendiente: contratosAlquiler.saldoPendiente,
        estadoPago: contratosAlquiler.estadoPago,
      })
      .from(contratosAlquiler)
      .where(
        or(
          eq(contratosAlquiler.id, contratoId),
          eq(contratosAlquiler.numeroContrato, contratoId)
        )
      )
      .limit(1);
    contrato = resCtr[0];
  }

  if (!contrato && reservaId) {
    const resCtr = await db
      .select({
        id: contratosAlquiler.id,
        numeroContrato: contratosAlquiler.numeroContrato,
        reservaId: contratosAlquiler.reservaId,
        localId: contratosAlquiler.localId,
        totalLiquidado: contratosAlquiler.totalLiquidado,
        totalPagado: contratosAlquiler.totalPagado,
        saldoPendiente: contratosAlquiler.saldoPendiente,
        estadoPago: contratosAlquiler.estadoPago,
      })
      .from(contratosAlquiler)
      .where(eq(contratosAlquiler.reservaId, reservaId))
      .limit(1);
    contrato = resCtr[0];
  }

  // 2. Localizar reserva
  let reserva: {
    id: string;
    codigo: string;
    localId: string;
    totalCotizado: number;
    montoAbonoReportado: number;
  } | undefined;

  const idReservaBuscar = reservaId ?? contrato?.reservaId ?? contratoId;
  if (idReservaBuscar) {
    const resRes = await db
      .select({
        id: reservas.id,
        codigo: reservas.codigo,
        localId: reservas.localId,
        totalCotizado: reservas.totalCotizado,
        montoAbonoReportado: reservas.montoAbonoReportado,
      })
      .from(reservas)
      .where(
        or(
          eq(reservas.id, idReservaBuscar),
          eq(reservas.codigo, idReservaBuscar)
        )
      )
      .limit(1);
    reserva = resRes[0];
  }

  // Si no hay ni contrato ni reserva, no hay qué reconciliar
  if (!contrato && !reserva) {
    return { totalPagadoNeto: 0, saldoPendiente: 0, estadoPago: 'PENDIENTE' };
  }

  // Validar pertenencia al localId
  if (contrato && contrato.localId !== localId) {
    throw new Error('El contrato no pertenece al local especificado');
  }
  if (reserva && reserva.localId !== localId) {
    throw new Error('La reserva no pertenece al local especificado');
  }

  // 3. Recopilar todos los identificadores posibles bajo los que se hayan asentado movimientos
  const idsAsociados = new Set<string>();
  if (contratoId) idsAsociados.add(contratoId);
  if (reservaId) idsAsociados.add(reservaId);
  if (contrato) {
    idsAsociados.add(contrato.id);
    idsAsociados.add(contrato.numeroContrato);
  }
  if (reserva) {
    idsAsociados.add(reserva.id);
    idsAsociados.add(reserva.codigo);
  }

  // 4. Consultar movimientos confirmados asociados al localId
  const movimientosDelLocal = await db
    .select({
      id: movimientosCaja.id,
      tipo: movimientosCaja.tipo,
      categoria: movimientosCaja.categoria,
      monto: movimientosCaja.monto,
      estado: movimientosCaja.estado,
      contratoId: movimientosCaja.contratoId,
    })
    .from(movimientosCaja)
    .where(eq(movimientosCaja.localId, localId));

  const movimientosContrato = movimientosDelLocal.filter(
    (m) => m.contratoId && idsAsociados.has(m.contratoId)
  );

  const totalPagadoNeto = calcularTotalPagadoNetoContrato(movimientosContrato);

  // 5. Calcular saldos del contrato
  const totalLiquidado = contrato ? contrato.totalLiquidado : (reserva?.totalCotizado ?? 0);
  const saldoPendiente = Math.max(0, totalLiquidado - totalPagadoNeto);

  let estadoPago: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'EN_MORA' = 'PENDIENTE';
  if (totalPagadoNeto >= totalLiquidado && totalLiquidado > 0) {
    estadoPago = 'PAGADO';
  } else if (totalPagadoNeto > 0) {
    estadoPago = 'PARCIAL';
  } else {
    estadoPago = 'PENDIENTE';
  }

  const ahora = new Date();
  const auditoriaId = `aud-rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entId = contrato?.id ?? reserva?.id ?? (contratoId || 'N/A');

  if (typeof db.batch === 'function') {
    if (contrato && reserva) {
      await db.batch([
        db
          .update(contratosAlquiler)
          .set({
            totalPagado: totalPagadoNeto,
            saldoPendiente,
            estadoPago,
            actualizadoEn: ahora,
          })
          .where(eq(contratosAlquiler.id, contrato.id)),
        db
          .update(reservas)
          .set({
            montoAbonoReportado: totalPagadoNeto,
          })
          .where(eq(reservas.id, reserva.id)),
        db.insert(auditoriaFinanciera).values({
          id: auditoriaId,
          localId,
          entidad: 'MOVIMIENTO',
          entidadId: entId,
          accion: 'MODIFICAR',
          montoAnterior: contrato.totalPagado,
          montoNuevo: totalPagadoNeto,
          motivo: `Reconciliación de saldos contrato ${contrato.numeroContrato}`,
          usuarioId: usuarioId ?? 'sistema',
          detallesJson: JSON.stringify({
            totalPagadoNeto,
            saldoPendiente,
            estadoPago,
            movimientosContabilizados: movimientosContrato.length,
          }),
          creadoEn: ahora,
        }),
      ]);
    } else if (contrato) {
      await db.batch([
        db
          .update(contratosAlquiler)
          .set({
            totalPagado: totalPagadoNeto,
            saldoPendiente,
            estadoPago,
            actualizadoEn: ahora,
          })
          .where(eq(contratosAlquiler.id, contrato.id)),
        db.insert(auditoriaFinanciera).values({
          id: auditoriaId,
          localId,
          entidad: 'MOVIMIENTO',
          entidadId: entId,
          accion: 'MODIFICAR',
          montoAnterior: contrato.totalPagado,
          montoNuevo: totalPagadoNeto,
          motivo: `Reconciliación de saldos contrato ${contrato.numeroContrato}`,
          usuarioId: usuarioId ?? 'sistema',
          detallesJson: JSON.stringify({
            totalPagadoNeto,
            saldoPendiente,
            estadoPago,
            movimientosContabilizados: movimientosContrato.length,
          }),
          creadoEn: ahora,
        }),
      ]);
    } else if (reserva) {
      await db.batch([
        db
          .update(reservas)
          .set({
            montoAbonoReportado: totalPagadoNeto,
          })
          .where(eq(reservas.id, reserva.id)),
        db.insert(auditoriaFinanciera).values({
          id: auditoriaId,
          localId,
          entidad: 'MOVIMIENTO',
          entidadId: entId,
          accion: 'MODIFICAR',
          montoAnterior: reserva.montoAbonoReportado,
          montoNuevo: totalPagadoNeto,
          motivo: `Reconciliación de abono reserva ${reserva.codigo}`,
          usuarioId: usuarioId ?? 'sistema',
          detallesJson: JSON.stringify({
            totalPagadoNeto,
            saldoPendiente,
            estadoPago,
            movimientosContabilizados: movimientosContrato.length,
          }),
          creadoEn: ahora,
        }),
      ]);
    }
  } else {
    if (contrato) {
      await db
        .update(contratosAlquiler)
        .set({
          totalPagado: totalPagadoNeto,
          saldoPendiente,
          estadoPago,
          actualizadoEn: ahora,
        })
        .where(eq(contratosAlquiler.id, contrato.id));
    }
    if (reserva) {
      await db
        .update(reservas)
        .set({
          montoAbonoReportado: totalPagadoNeto,
        })
        .where(eq(reservas.id, reserva.id));
    }
    await db.insert(auditoriaFinanciera).values({
      id: auditoriaId,
      localId,
      entidad: 'MOVIMIENTO',
      entidadId: entId,
      accion: 'MODIFICAR',
      montoAnterior: contrato?.totalPagado ?? reserva?.montoAbonoReportado ?? null,
      montoNuevo: totalPagadoNeto,
      motivo: `Reconciliación de saldos ${contrato?.numeroContrato ?? reserva?.codigo ?? ''}`,
      usuarioId: usuarioId ?? 'sistema',
      detallesJson: JSON.stringify({
        totalPagadoNeto,
        saldoPendiente,
        estadoPago,
        movimientosContabilizados: movimientosContrato.length,
      }),
      creadoEn: ahora,
    });
  }

  return { totalPagadoNeto, saldoPendiente, estadoPago };
}

/**
 * Registra un nuevo movimiento financiero (Ingreso o Egreso) con persistencia y auditoría.
 */
export async function registrarMovimientoRepo(params: {
  localId: string;
  tipo: TipoMovimientoCaja;
  categoria: CategoriaMovimiento;
  concepto: string;
  monto: number;
  metodoPago: MetodoPagoFinanciero;
  cuentaId: string;
  contratoId?: string | undefined;
  clienteNombre?: string | undefined;
  vehiculoId?: string | undefined;
  proveedor?: string | undefined;
  referencia?: string | undefined;
  observaciones?: string | undefined;
  estado?: 'CONFIRMADO' | 'PENDIENTE' | undefined;
  usuarioId: string;
  db?: AppDb | undefined;
}): Promise<MovimientoCajaSelect> {
  const ahora = new Date();
  const id = `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const nuevoMov: MovimientoCajaSelect = {
    id,
    localId: params.localId,
    tipo: params.tipo,
    categoria: params.categoria,
    concepto: params.concepto,
    monto: params.monto,
    metodoPago: params.metodoPago,
    cuentaId: params.cuentaId,
    cuentaDestinoId: null,
    contratoId: params.contratoId ?? null,
    clienteId: null,
    clienteNombre: params.clienteNombre ?? null,
    vehiculoId: params.vehiculoId ?? null,
    proveedor: params.proveedor ?? null,
    referencia: params.referencia ?? null,
    soporteUrl: null,
    estado: params.estado ?? 'CONFIRMADO',
    motivoAnulacion: null,
    anuladoPorId: null,
    anuladoEn: null,
    creadoPorId: params.usuarioId,
    observaciones: params.observaciones ?? null,
    fechaMovimiento: ahora,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  // Solo en entorno sin DB conectada (offline/preview) usar cache en memoria
  if (!params.db) {
    cacheMovimientos.set(id, nuevoMov);

    if (params.contratoId && params.tipo === 'INGRESO') {
      const contrato = cacheCartera.get(params.contratoId);
      if (contrato) {
        const nuevoAbonado = contrato.totalAbonado + params.monto;
        const nuevoSaldo = Math.max(0, contrato.totalAlquiler - nuevoAbonado);
        contrato.totalAbonado = nuevoAbonado;
        contrato.saldoPendiente = nuevoSaldo;
        contrato.estadoPago = nuevoSaldo === 0 ? 'PAGADO' : 'PARCIAL';
        cacheCartera.set(params.contratoId, contrato);
      }
    }
  }

  // Persistir en D1
  if (params.db) {
    // Validar o resolver la cuenta existente en D1 para evitar fallo de FK
    let cuentaEfectivaId = nuevoMov.cuentaId;
    const ctaCheck = await params.db
      .select({ id: cuentasFinancieras.id })
      .from(cuentasFinancieras)
      .where(eq(cuentasFinancieras.id, cuentaEfectivaId))
      .limit(1);

    if (!ctaCheck[0]) {
      await asegurarConfiguracionBaseLocal(params.db, params.localId);
      const primeraCta = await params.db
        .select({ id: cuentasFinancieras.id })
        .from(cuentasFinancieras)
        .where(eq(cuentasFinancieras.localId, params.localId))
        .limit(1);
      if (primeraCta[0]) {
        cuentaEfectivaId = primeraCta[0].id;
      }
    }

    await params.db.insert(movimientosCaja).values({
      id: nuevoMov.id,
      localId: nuevoMov.localId,
      tipo: nuevoMov.tipo,
      categoria: nuevoMov.categoria,
      concepto: nuevoMov.concepto,
      monto: nuevoMov.monto,
      metodoPago: nuevoMov.metodoPago,
      cuentaId: cuentaEfectivaId,
      cuentaDestinoId: null,
      contratoId: nuevoMov.contratoId,
      clienteId: null,
      clienteNombre: nuevoMov.clienteNombre,
      vehiculoId: nuevoMov.vehiculoId,
      proveedor: nuevoMov.proveedor,
      referencia: nuevoMov.referencia,
      soporteUrl: null,
      estado: nuevoMov.estado,
      motivoAnulacion: null,
      anuladoPorId: null,
      anuladoEn: null,
      creadoPorId: nuevoMov.creadoPorId,
      observaciones: nuevoMov.observaciones,
      fechaMovimiento: nuevoMov.fechaMovimiento,
      creadoEn: nuevoMov.creadoEn,
      actualizadoEn: nuevoMov.actualizadoEn,
    });

    // Registrar auditoría financiera
    await params.db.insert(auditoriaFinanciera).values({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      localId: params.localId,
      entidad: 'MOVIMIENTO',
      entidadId: id,
      accion: 'CREAR',
      montoAnterior: null,
      montoNuevo: params.monto,
      motivo: params.concepto,
      usuarioId: params.usuarioId,
      detallesJson: JSON.stringify({ tipo: params.tipo, categoria: params.categoria }),
      creadoEn: ahora,
    });

    // Reconciliación atómica de saldos en D1 si hay contrato asociado
    if (params.contratoId && nuevoMov.estado === 'CONFIRMADO') {
      await reconciliarSaldosContratoYReservaD1(
        params.db,
        params.localId,
        params.contratoId,
        undefined,
        params.usuarioId
      );
    }
  }

  return nuevoMov;
}

/**
 * Registra un abono a contrato con persistencia en D1 y reconciliación atómica.
 */
export async function registrarAbonoRepo(params: {
  localId: string;
  contratoId: string;
  monto: number;
  metodoPago: MetodoPagoFinanciero;
  cuentaId?: string | undefined;
  referencia?: string | undefined;
  observaciones?: string | undefined;
  usuarioId: string;
  db?: AppDb | undefined;
}): Promise<MovimientoCajaSelect> {
  let cuentaEfectivaId = params.cuentaId;

  if (params.db) {
    if (!cuentaEfectivaId) {
      const cuentasDelLocal = await params.db
        .select()
        .from(cuentasFinancieras)
        .where(eq(cuentasFinancieras.localId, params.localId));
      const resCta = resolverCuentaPorMetodoPago(cuentasDelLocal, params.metodoPago);
      cuentaEfectivaId = resCta?.id;
    }

    if (!cuentaEfectivaId) {
      cuentaEfectivaId =
        params.metodoPago === 'efectivo'
          ? 'cta-caja-principal'
          : 'cta-bancolombia-ope';
    }

    // Validar pertenencia del contrato al local
    const ctrRows = await params.db
      .select({
        id: contratosAlquiler.id,
        localId: contratosAlquiler.localId,
      })
      .from(contratosAlquiler)
      .where(
        or(
          eq(contratosAlquiler.id, params.contratoId),
          eq(contratosAlquiler.numeroContrato, params.contratoId)
        )
      )
      .limit(1);

    if (ctrRows[0] && ctrRows[0].localId !== params.localId) {
      throw new Error('El contrato pertenece a otro local operativo');
    }
  } else {
    if (!cuentaEfectivaId) {
      cuentaEfectivaId =
        params.metodoPago === 'efectivo'
          ? 'cta-caja-principal'
          : 'cta-bancolombia-ope';
    }
  }

  return registrarMovimientoRepo({
    localId: params.localId,
    tipo: 'INGRESO',
    categoria: 'ABONO_CONTRATO',
    concepto: `Abono a contrato #${params.contratoId}`,
    monto: params.monto,
    metodoPago: params.metodoPago,
    cuentaId: cuentaEfectivaId,
    contratoId: params.contratoId,
    referencia: params.referencia,
    observaciones: params.observaciones,
    usuarioId: params.usuarioId,
    db: params.db,
  });
}

/**
 * Anula un movimiento confirmado registrando motivo obligatorio y auditoría inmutable.
 */
export async function anularMovimientoRepo(params: {
  movimientoId: string;
  motivo: string;
  usuarioId: string;
  localId: string;
  db?: AppDb | undefined;
}): Promise<MovimientoCajaSelect> {
  const ahora = new Date();

  if (params.db) {
    const rows = await params.db
      .select()
      .from(movimientosCaja)
      .where(eq(movimientosCaja.id, params.movimientoId))
      .limit(1);
    const mov = rows[0];

    if (!mov) {
      throw new Error('El movimiento financiero no existe');
    }
    if (mov.localId !== params.localId) {
      throw new Error('No tiene autorización para anular movimientos de otro local');
    }
    if (mov.estado === 'ANULADO') {
      throw new Error('El movimiento ya se encuentra anulado');
    }

    await params.db
      .update(movimientosCaja)
      .set({
        estado: 'ANULADO',
        motivoAnulacion: params.motivo,
        anuladoPorId: params.usuarioId,
        anuladoEn: ahora,
        actualizadoEn: ahora,
      })
      .where(eq(movimientosCaja.id, params.movimientoId));

    await params.db.insert(auditoriaFinanciera).values({
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      localId: params.localId,
      entidad: 'MOVIMIENTO',
      entidadId: params.movimientoId,
      accion: 'ANULAR',
      montoAnterior: mov.monto,
      montoNuevo: 0,
      motivo: params.motivo,
      usuarioId: params.usuarioId,
      detallesJson: JSON.stringify({ motivo: params.motivo, fechaAnulacion: ahora }),
      creadoEn: ahora,
    });

    if (mov.contratoId) {
      await reconciliarSaldosContratoYReservaD1(
        params.db,
        params.localId,
        mov.contratoId,
        undefined,
        params.usuarioId
      );
    }

    return {
      ...mov,
      estado: 'ANULADO',
      motivoAnulacion: params.motivo,
      anuladoPorId: params.usuarioId,
      anuladoEn: ahora,
      actualizadoEn: ahora,
    };
  }

  // Fallback memoria (solo cuando db no está disponible)
  const mov = cacheMovimientos.get(params.movimientoId);
  if (!mov) {
    throw new Error('El movimiento financiero no existe');
  }
  if (mov.localId !== params.localId) {
    throw new Error('No tiene autorización para anular movimientos de otro local');
  }
  if (mov.estado === 'ANULADO') {
    throw new Error('El movimiento ya se encuentra anulado');
  }

  mov.estado = 'ANULADO';
  mov.motivoAnulacion = params.motivo;
  mov.anuladoPorId = params.usuarioId;
  mov.anuladoEn = ahora;
  mov.actualizadoEn = ahora;
  cacheMovimientos.set(params.movimientoId, mov);

  if (mov.contratoId && mov.tipo === 'INGRESO') {
    const contrato = cacheCartera.get(mov.contratoId);
    if (contrato) {
      contrato.totalAbonado = Math.max(0, contrato.totalAbonado - mov.monto);
      contrato.saldoPendiente = Math.max(0, contrato.totalAlquiler - contrato.totalAbonado);
      contrato.estadoPago =
        contrato.saldoPendiente === 0
          ? 'PAGADO'
          : contrato.totalAbonado > 0
            ? 'PARCIAL'
            : 'PENDIENTE';
      cacheCartera.set(mov.contratoId, contrato);
    }
  }

  return mov;
}

/**
 * Registra una transferencia interna entre cuentas.
 * No genera ingreso ni egreso operativo global.
 */
export async function registrarTransferenciaInternaRepo(params: {
  cuentaOrigenId: string;
  cuentaDestinoId: string;
  monto: number;
  concepto: string;
  referencia?: string | undefined;
  usuarioId: string;
  localId: string;
  db?: AppDb | undefined;
}): Promise<MovimientoCajaSelect> {
  if (params.cuentaOrigenId === params.cuentaDestinoId) {
    throw new Error('La cuenta origen y destino deben ser diferentes');
  }

  let ctaOrigen = cacheCuentas.get(params.cuentaOrigenId);
  let ctaDestino = cacheCuentas.get(params.cuentaDestinoId);

  if ((!ctaOrigen || !ctaDestino) && params.db) {
    const rowsO = await params.db
      .select()
      .from(cuentasFinancieras)
      .where(eq(cuentasFinancieras.id, params.cuentaOrigenId))
      .limit(1);
    const rowsD = await params.db
      .select()
      .from(cuentasFinancieras)
      .where(eq(cuentasFinancieras.id, params.cuentaDestinoId))
      .limit(1);
    if (rowsO[0]) ctaOrigen = rowsO[0];
    if (rowsD[0]) ctaDestino = rowsD[0];
  }

  if (!ctaOrigen || !ctaDestino) {
    throw new Error('Las cuentas seleccionadas no son válidas');
  }

  const saldoActualOrigen = calcularSaldoCuenta(ctaOrigen, Array.from(cacheMovimientos.values()));
  if (saldoActualOrigen < params.monto) {
    throw new Error(
      `Saldo insuficiente en ${ctaOrigen.nombre}. Disponible: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(saldoActualOrigen)}`
    );
  }

  const ahora = new Date();
  const id = `mov-tr-${Date.now()}`;

  const nuevoMov: MovimientoCajaSelect = {
    id,
    localId: params.localId,
    tipo: 'TRANSFERENCIA',
    categoria: 'TRANSFERENCIA_INTERNA',
    concepto: params.concepto || `Transferencia de ${ctaOrigen.nombre} a ${ctaDestino.nombre}`,
    monto: params.monto,
    metodoPago: 'transferencia',
    cuentaId: params.cuentaOrigenId,
    cuentaDestinoId: params.cuentaDestinoId,
    contratoId: null,
    clienteId: null,
    clienteNombre: null,
    vehiculoId: null,
    proveedor: null,
    referencia: params.referencia ?? null,
    soporteUrl: null,
    estado: 'CONFIRMADO',
    motivoAnulacion: null,
    anuladoPorId: null,
    anuladoEn: null,
    creadoPorId: params.usuarioId,
    observaciones: `Traslado interno sin impacto en resultado operativo`,
    fechaMovimiento: ahora,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  cacheMovimientos.set(id, nuevoMov);

  if (params.db) {
    try {
      await params.db.insert(movimientosCaja).values({
        id: nuevoMov.id,
        localId: nuevoMov.localId,
        tipo: 'TRANSFERENCIA',
        categoria: 'TRANSFERENCIA_INTERNA',
        concepto: nuevoMov.concepto,
        monto: nuevoMov.monto,
        metodoPago: 'transferencia',
        cuentaId: nuevoMov.cuentaId,
        cuentaDestinoId: nuevoMov.cuentaDestinoId,
        estado: 'CONFIRMADO',
        creadoPorId: nuevoMov.creadoPorId,
        observaciones: nuevoMov.observaciones,
        fechaMovimiento: nuevoMov.fechaMovimiento,
        creadoEn: nuevoMov.creadoEn,
        actualizadoEn: nuevoMov.actualizadoEn,
      });

      await params.db.insert(auditoriaFinanciera).values({
        id: `aud-${Date.now()}`,
        localId: params.localId,
        entidad: 'MOVIMIENTO',
        entidadId: id,
        accion: 'TRANSFERENCIA',
        montoAnterior: null,
        montoNuevo: params.monto,
        motivo: `Transferencia interna ${ctaOrigen.nombre} -> ${ctaDestino.nombre}`,
        usuarioId: params.usuarioId,
        detallesJson: JSON.stringify({ origen: params.cuentaOrigenId, destino: params.cuentaDestinoId }),
        creadoEn: ahora,
      });
    } catch (error) {
      // Fallback: la transferencia ya quedó aplicada en memoria
      logFalloD1('caja.transferencia.insert', error, { movimientoId: id });
    }
  }

  return nuevoMov;
}

/**
 * Apertura de caja física para inicio de jornada.
 */
export async function aperturaCajaRepo(params: {
  cuentaId: string;
  saldoInicialContado: number;
  observaciones?: string | undefined;
  usuarioId: string;
  localId: string;
  db?: AppDb | undefined;
}): Promise<SesionCajaSelect> {
  // Verificar que no haya una sesión abierta previa para esa cuenta
  const abiertas = Array.from(cacheSesiones.values()).filter(
    (s) => s.cuentaId === params.cuentaId && s.estado === 'ABIERTA'
  );
  if (abiertas.length > 0) {
    throw new Error('Ya existe una sesión de caja abierta para este punto operativo.');
  }

  const ahora = new Date();
  const id = `ses-${Date.now()}`;

  const nuevaSesion: SesionCajaSelect = {
    id,
    localId: params.localId,
    cuentaId: params.cuentaId,
    usuarioAperturaId: params.usuarioId,
    fechaApertura: ahora,
    saldoInicialContado: params.saldoInicialContado,
    estado: 'ABIERTA',
    usuarioCierreId: null,
    fechaCierre: null,
    saldoEsperado: null,
    saldoRealContado: null,
    diferencia: null,
    motivoDiferencia: null,
    observaciones: params.observaciones ?? null,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  cacheSesiones.set(id, nuevaSesion);

  if (params.db) {
    try {
      await params.db.insert(sesionesCaja).values({
        id: nuevaSesion.id,
        localId: nuevaSesion.localId,
        cuentaId: nuevaSesion.cuentaId,
        usuarioAperturaId: nuevaSesion.usuarioAperturaId,
        fechaApertura: nuevaSesion.fechaApertura,
        saldoInicialContado: nuevaSesion.saldoInicialContado,
        estado: 'ABIERTA',
        observaciones: nuevaSesion.observaciones,
        creadoEn: nuevaSesion.creadoEn,
        actualizadoEn: nuevaSesion.actualizadoEn,
      });
    } catch (error) {
      // Fallback: la apertura ya quedó aplicada en memoria
      logFalloD1('caja.apertura.insert', error, { sesionId: nuevaSesion.id });
    }
  }

  return nuevaSesion;
}

/**
 * Cierre de caja física con arqueo y justificación de diferencias.
 */
export async function cierreCajaRepo(params: {
  sesionId: string;
  saldoRealContado: number;
  motivoDiferencia?: string | undefined;
  observaciones?: string | undefined;
  usuarioId: string;
  localId: string;
  db?: AppDb | undefined;
}): Promise<SesionCajaSelect> {
  let sesion = cacheSesiones.get(params.sesionId);
  if (!sesion && params.db) {
    const rows = await params.db
      .select()
      .from(sesionesCaja)
      .where(eq(sesionesCaja.id, params.sesionId))
      .limit(1);
    if (rows[0]) sesion = rows[0];
  }
  if (!sesion) {
    throw new Error('La sesión de caja no existe');
  }
  if (sesion.estado === 'CERRADA') {
    throw new Error('La sesión de caja ya se encuentra cerrada');
  }

  const cta = cacheCuentas.get(sesion.cuentaId);
  if (!cta) {
    throw new Error('La cuenta asociada a la sesión no es válida');
  }

  // Calcular movimientos de efectivo ocurridos desde la apertura
  const movimientos = Array.from(cacheMovimientos.values()).filter(
    (m) =>
      m.cuentaId === sesion.cuentaId &&
      m.estado === 'CONFIRMADO' &&
      new Date(m.fechaMovimiento) >= new Date(sesion.fechaApertura)
  );

  let saldoEsperado = sesion.saldoInicialContado;
  for (const m of movimientos) {
    if (m.tipo === 'INGRESO') saldoEsperado += m.monto;
    else if (m.tipo === 'EGRESO') saldoEsperado -= m.monto;
    else if (m.tipo === 'TRANSFERENCIA') {
      if (m.cuentaDestinoId === sesion.cuentaId) saldoEsperado += m.monto;
      if (m.cuentaId === sesion.cuentaId) saldoEsperado -= m.monto;
    }
  }

  const diferencia = params.saldoRealContado - saldoEsperado;
  if (diferencia !== 0 && (!params.motivoDiferencia || params.motivoDiferencia.trim().length < 5)) {
    throw new Error('Existe una diferencia en el arqueo; es obligatorio indicar el motivo justificado.');
  }

  const ahora = new Date();
  sesion.estado = 'CERRADA';
  sesion.usuarioCierreId = params.usuarioId;
  sesion.fechaCierre = ahora;
  sesion.saldoEsperado = saldoEsperado;
  sesion.saldoRealContado = params.saldoRealContado;
  sesion.diferencia = diferencia;
  sesion.motivoDiferencia = params.motivoDiferencia ?? null;
  sesion.observaciones = params.observaciones ?? sesion.observaciones;
  sesion.actualizadoEn = ahora;

  cacheSesiones.set(params.sesionId, sesion);

  if (params.db) {
    try {
      await params.db
        .update(sesionesCaja)
        .set({
          estado: 'CERRADA',
          usuarioCierreId: params.usuarioId,
          fechaCierre: ahora,
          saldoEsperado,
          saldoRealContado: params.saldoRealContado,
          diferencia,
          motivoDiferencia: params.motivoDiferencia ?? null,
          observaciones: sesion.observaciones,
          actualizadoEn: ahora,
        })
        .where(eq(sesionesCaja.id, params.sesionId));

      await params.db.insert(auditoriaFinanciera).values({
        id: `aud-${Date.now()}`,
        localId: params.localId,
        entidad: 'SESION_CAJA',
        entidadId: params.sesionId,
        accion: 'CERRAR_CAJA',
        montoAnterior: saldoEsperado,
        montoNuevo: params.saldoRealContado,
        motivo: params.motivoDiferencia ?? 'Cierre regular sin diferencia',
        usuarioId: params.usuarioId,
        detallesJson: JSON.stringify({ diferencia, saldoEsperado, saldoContado: params.saldoRealContado }),
        creadoEn: ahora,
      });
    } catch (error) {
      // Fallback memoria
      logFalloD1('caja.cierre.update', error, { sesionId: params.sesionId });
    }
  }

  return sesion;
}

/**
 * Gestión de Depósitos de Garantía (Recepción, Devolución o Retención por Daños/Multas).
 */
export async function gestionarGarantiaRepo(params: {
  garantiaId: string;
  accion: 'RECIBIR' | 'DEVOLVER' | 'RETENER_CARGOS';
  monto: number;
  cuentaId?: string | undefined;
  metodoPago?: MetodoPagoFinanciero | undefined;
  referencia?: string | undefined;
  motivo?: string | undefined;
  usuarioId: string;
  localId: string;
  db?: AppDb | undefined;
}): Promise<DepositoGarantiaSelect> {
  let dep: DepositoGarantiaSelect | undefined;

  if (params.db) {
    const rows = await params.db
      .select()
      .from(depositosGarantia)
      .where(eq(depositosGarantia.id, params.garantiaId))
      .limit(1);
    dep = rows[0];
  } else {
    dep = cacheGarantias.get(params.garantiaId);
  }

  if (!dep) {
    throw new Error('El depósito de garantía no fue encontrado');
  }

  if (dep.localId !== params.localId) {
    throw new Error('No tiene autorización para gestionar garantías de otro local');
  }

  const ahora = new Date();

  if (params.accion === 'RECIBIR') {
    dep.montoRecibido = (dep.montoRecibido || 0) + params.monto;
    dep.saldoComprometido = dep.montoRecibido - dep.montoDevuelto - dep.montoRetenido;
    dep.estado = 'RECIBIDO_CUSTODIA';
    dep.cuentaId = params.cuentaId ?? dep.cuentaId ?? 'cta-bancolombia-ope';
    dep.metodoPago = params.metodoPago ?? 'transferencia';
    dep.referenciaRecepcion = params.referencia ?? null;
    dep.fechaRecepcion = ahora;
    dep.actualizadoEn = ahora;

    // Asentar movimiento de entrada en caja/cuenta bajo categoría DEPOSITO_GARANTIA (no computable como ingreso operativo)
    await registrarMovimientoRepo({
      localId: params.localId,
      tipo: 'INGRESO',
      categoria: 'DEPOSITO_GARANTIA',
      concepto: `Recepción de depósito de garantía contrato #${dep.contratoId} (${dep.clienteNombre})`,
      monto: params.monto,
      metodoPago: dep.metodoPago ?? 'transferencia',
      cuentaId: dep.cuentaId,
      contratoId: dep.contratoId,
      clienteNombre: dep.clienteNombre,
      vehiculoId: dep.vehiculoId ?? undefined,
      referencia: params.referencia,
      usuarioId: params.usuarioId,
      db: params.db,
    });
  } else if (params.accion === 'DEVOLVER') {
    const disponible = dep.montoRecibido - dep.montoDevuelto - dep.montoRetenido;
    if (params.monto > disponible) {
      throw new Error(`El monto a devolver ($${params.monto}) supera el saldo retenido disponible ($${disponible})`);
    }

    dep.montoDevuelto += params.monto;
    dep.saldoComprometido = dep.montoRecibido - dep.montoDevuelto - dep.montoRetenido;
    dep.estado = dep.saldoComprometido === 0 ? 'DEVUELTO_TOTAL' : 'DEVUELTO_PARCIAL';
    dep.fechaDevolucionReal = ahora;
    dep.referenciaDevolucion = params.referencia ?? null;
    dep.actualizadoEn = ahora;

    // Asentar egreso bajo REEMBOLSO_GARANTIA (no es gasto operativo)
    await registrarMovimientoRepo({
      localId: params.localId,
      tipo: 'EGRESO',
      categoria: 'REEMBOLSO_GARANTIA',
      concepto: `Devolución de fianza/garantía contrato #${dep.contratoId} a ${dep.clienteNombre}`,
      monto: params.monto,
      metodoPago: params.metodoPago ?? 'transferencia',
      cuentaId: params.cuentaId ?? dep.cuentaId ?? 'cta-bancolombia-ope',
      contratoId: dep.contratoId,
      clienteNombre: dep.clienteNombre,
      vehiculoId: dep.vehiculoId ?? undefined,
      referencia: params.referencia,
      usuarioId: params.usuarioId,
      db: params.db,
    });
  } else if (params.accion === 'RETENER_CARGOS') {
    const disponible = dep.montoRecibido - dep.montoDevuelto - dep.montoRetenido;
    if (params.monto > disponible) {
      throw new Error(`El monto a retener ($${params.monto}) supera el saldo disponible ($${disponible})`);
    }

    dep.montoRetenido += params.monto;
    dep.saldoComprometido = dep.montoRecibido - dep.montoDevuelto - dep.montoRetenido;
    dep.estado = dep.saldoComprometido === 0 ? 'APLICADO_CARGOS' : 'DEVUELTO_PARCIAL';
    dep.motivoRetencion = params.motivo ?? 'Deducción pericial autorizada';
    dep.actualizadoEn = ahora;

    // Al retener y aplicar a daños/multas, el dinero sí se reconoce ahora como ingreso operativo
    await registrarMovimientoRepo({
      localId: params.localId,
      tipo: 'INGRESO',
      categoria: 'COBRO_DANOS_MULTAS',
      concepto: `Aplicación de garantía a cargos autorizados contrato #${dep.contratoId}: ${params.motivo}`,
      monto: params.monto,
      metodoPago: dep.metodoPago ?? 'transferencia',
      cuentaId: dep.cuentaId || 'cta-bancolombia-ope',
      contratoId: dep.contratoId,
      clienteNombre: dep.clienteNombre,
      vehiculoId: dep.vehiculoId ?? undefined,
      usuarioId: params.usuarioId,
      db: params.db,
    });
  }

  if (!params.db) {
    cacheGarantias.set(params.garantiaId, dep);
  }

  if (params.db) {
    await params.db
      .update(depositosGarantia)
      .set({
        montoRecibido: dep.montoRecibido,
        montoRetenido: dep.montoRetenido,
        montoDevuelto: dep.montoDevuelto,
        saldoComprometido: dep.saldoComprometido,
        estado: dep.estado,
        cuentaId: dep.cuentaId,
        metodoPago: dep.metodoPago,
        referenciaRecepcion: dep.referenciaRecepcion,
        fechaRecepcion: dep.fechaRecepcion,
        fechaDevolucionReal: dep.fechaDevolucionReal,
        referenciaDevolucion: dep.referenciaDevolucion,
        motivoRetencion: dep.motivoRetencion,
        actualizadoEn: ahora,
      })
      .where(eq(depositosGarantia.id, params.garantiaId));
  }

  return dep;
}

/**
 * Crea una nueva cuenta financiera en el catálogo.
 */
export async function crearCuentaRepo(params: {
  nombre: string;
  tipo: TipoCuentaFinanciera;
  saldoInicial: number;
  localId: string;
  usuarioId: string;
  db?: AppDb | undefined;
}): Promise<CuentaFinancieraSelect> {
  const ahora = new Date();
  const id = `cta-${Date.now()}`;

  const nueva: CuentaFinancieraSelect = {
    id,
    localId: params.localId,
    nombre: params.nombre,
    tipo: params.tipo,
    saldoInicial: params.saldoInicial,
    activo: true,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  cacheCuentas.set(id, nueva);

  if (params.db) {
    try {
      await params.db.insert(cuentasFinancieras).values({
        id: nueva.id,
        localId: nueva.localId,
        nombre: nueva.nombre,
        tipo: nueva.tipo,
        saldoInicial: nueva.saldoInicial,
        activo: true,
        creadoEn: ahora,
        actualizadoEn: ahora,
      });

      await params.db.insert(auditoriaFinanciera).values({
        id: `aud-${Date.now()}`,
        localId: params.localId,
        entidad: 'CUENTA',
        entidadId: id,
        accion: 'CREAR',
        montoAnterior: null,
        montoNuevo: params.saldoInicial,
        motivo: `Creación de cuenta ${params.nombre}`,
        usuarioId: params.usuarioId,
        detallesJson: JSON.stringify({ nombre: params.nombre, tipo: params.tipo }),
        creadoEn: ahora,
      });
    } catch (error) {
      // Fallback: la cuenta ya quedó creada en memoria
      logFalloD1('caja.cuenta.insert', error, { cuentaId: id });
    }
  }

  return nueva;
}
