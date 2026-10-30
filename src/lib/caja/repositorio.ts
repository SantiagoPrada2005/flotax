import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import {
  cuentasFinancieras,
  movimientosCaja,
  sesionesCaja,
  depositosGarantia,
  auditoriaFinanciera,
  type CuentaFinancieraSelect,
  type MovimientoCajaSelect,
  type SesionCajaSelect,
  type DepositoGarantiaSelect,
} from '@/db/schema/caja';
import { eq, desc } from 'drizzle-orm';
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
} from './calculos';
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

  inicializarCacheMemoria();

  let cuentasList: CuentaFinancieraSelect[] = Array.from(cacheCuentas.values());
  let movimientosList: MovimientoCajaSelect[] = Array.from(cacheMovimientos.values());
  let sesionesList: SesionCajaSelect[] = Array.from(cacheSesiones.values());
  let garantiasList: DepositoGarantiaSelect[] = Array.from(cacheGarantias.values());
  const carteraList: ContratoCarteraItem[] = Array.from(cacheCartera.values());

  // Si hay base de datos D1 conectada, leer registros persistidos
  if (db) {
    try {
      const dbCuentas = await db.select().from(cuentasFinancieras).all();
      if (dbCuentas.length > 0) {
        cuentasList = dbCuentas;
      }
      const dbMovimientos = await db
        .select()
        .from(movimientosCaja)
        .orderBy(desc(movimientosCaja.fechaMovimiento))
        .all();
      if (dbMovimientos.length > 0) {
        movimientosList = dbMovimientos;
      }
      const dbSesiones = await db
        .select()
        .from(sesionesCaja)
        .orderBy(desc(sesionesCaja.fechaApertura))
        .all();
      if (dbSesiones.length > 0) {
        sesionesList = dbSesiones;
      }
      const dbGarantias = await db
        .select()
        .from(depositosGarantia)
        .orderBy(desc(depositosGarantia.creadoEn))
        .all();
      if (dbGarantias.length > 0) {
        garantiasList = dbGarantias;
      }
    } catch (error) {
      // Si las tablas aún no están migradas en el isolate local, continúa con memoria
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
  const alertas: AlertaFinanciera[] = [...ALERTAS_FINANCIERAS_SEMILLA];

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

  cacheMovimientos.set(id, nuevoMov);

  // Si hay contrato asociado y es abono/pago de alquiler, actualizar cartera
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

  // Persistir en D1
  if (params.db) {
    try {
      await params.db.insert(movimientosCaja).values({
        id: nuevoMov.id,
        localId: nuevoMov.localId,
        tipo: nuevoMov.tipo,
        categoria: nuevoMov.categoria,
        concepto: nuevoMov.concepto,
        monto: nuevoMov.monto,
        metodoPago: nuevoMov.metodoPago,
        cuentaId: nuevoMov.cuentaId,
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

      // Registrar auditoría
      await params.db.insert(auditoriaFinanciera).values({
        id: `aud-${Date.now()}`,
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
    } catch (error) {
      // Fallback memoria asegurado
      logFalloD1('caja.movimiento.insert', error, { movimientoId: id });
    }
  }

  return nuevoMov;
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
  const mov = cacheMovimientos.get(params.movimientoId);
  if (!mov) {
    throw new Error('El movimiento financiero no existe');
  }
  if (mov.estado === 'ANULADO') {
    throw new Error('El movimiento ya se encuentra anulado');
  }

  const ahora = new Date();
  mov.estado = 'ANULADO';
  mov.motivoAnulacion = params.motivo;
  mov.anuladoPorId = params.usuarioId;
  mov.anuladoEn = ahora;
  mov.actualizadoEn = ahora;
  cacheMovimientos.set(params.movimientoId, mov);

  // Si estaba asociado a un contrato, revertir abono
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

  if (params.db) {
    try {
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
        id: `aud-${Date.now()}`,
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
    } catch (error) {
      // Fallback: la anulación ya quedó aplicada en memoria
      logFalloD1('caja.movimiento.anular', error, { movimientoId: params.movimientoId });
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

  const ctaOrigen = cacheCuentas.get(params.cuentaOrigenId);
  const ctaDestino = cacheCuentas.get(params.cuentaDestinoId);
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
  const sesion = cacheSesiones.get(params.sesionId);
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
  const dep = cacheGarantias.get(params.garantiaId);
  if (!dep) {
    throw new Error('El depósito de garantía no fue encontrado');
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

  cacheGarantias.set(params.garantiaId, dep);

  if (params.db) {
    try {
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
    } catch (error) {
      // Fallback: la garantía ya quedó actualizada en memoria
      logFalloD1('caja.garantia.update', error, { garantiaId: params.garantiaId });
    }
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
