import type { AppDb } from '@/lib/db';
import {
  reservas,
  contratosAlquiler,
  eventosAlquiler,
  inspeccionesPericiales,
  mantenimientosVehiculo,
  evaluacionesEntregaCliente,
  vehiculos,
  movimientosCaja,
  auditoriaFinanciera,
  type MetodoPagoFinanciero,
  type EstadoGeneralInspeccion,
  type TipoMantenimientoVehiculo,
  type EstadoPagoContrato,
  type EstadoContratoAlquiler,
} from '@/db/schema';
import {
  ErrorCicloAlquiler,
  ejecutarBatchOSecuencial,
  type ContextoActorCiclo,
} from './ciclo-alquiler';
import {
  calcularDiasInclusivos,
  sumarDiasISO,
  verificarDisponibilidadVehiculo,
} from './disponibilidad';
import { resolverEstadoActualVehiculo } from '@/lib/mantenimientos/repositorio';
import { toClientISODate } from '@/lib/time/client-time';
import { PERMISOS, type Permiso } from '@/lib/auth/permisos';
import { tienePermiso } from '@/lib/auth/rbac';
import { eq, and } from 'drizzle-orm';

export interface PausarAlquilerParams {
  reservaId?: string | undefined;
  codigo?: string | undefined;
  localId?: string | undefined;
  diasPausa?: number | undefined;
  motivo?: string | undefined;
  usuarioId?: string | undefined;
  actor?: ContextoActorCiclo | undefined;
}

export interface ReanudarAlquilerParams {
  reservaId?: string | undefined;
  codigo?: string | undefined;
  localId?: string | undefined;
  motivo?: string | undefined;
  usuarioId?: string | undefined;
  actor?: ContextoActorCiclo | undefined;
}

export interface ProrrogarAlquilerParams {
  reservaId?: string | undefined;
  codigo?: string | undefined;
  localId?: string | undefined;
  diasExtra: number;
  modalidadTarifa: 'MISMO_PRECIO' | 'TARIFA_ESTANDAR' | 'PRECIO_PACTADO';
  montoAcordado?: number | undefined;
  precioDia?: number | undefined;
  clausulaAcuerdo?: string | undefined;
  motivo?: string | undefined;
  usuarioId?: string | undefined;
  actor?: ContextoActorCiclo | undefined;
}

export interface DevolverYCerrarAlquilerParams {
  reservaId?: string | undefined;
  codigo?: string | undefined;
  localId?: string | undefined;
  fechaDevolucionReal?: string | undefined;
  medidorUsoRetorno: number;
  nivelEnergiaRetornoPct?: number | undefined;
  estadoGeneral?: EstadoGeneralInspeccion | undefined;
  observaciones?: string | undefined;
  clausulaEncargado?: string | undefined;
  sobrecostoLocal?: number | undefined;
  motivoSobrecosto?: string | undefined;
  descuentoAjusteLocal?: number | undefined;
  motivoDescuento?: string | undefined;
  resolucionExcedente?: 'REEMBOLSO_ALQUILER' | 'RETENER_SALDO_LOCAL' | undefined;
  cuentaReembolsoId?: string | undefined;
  cobrarSaldoAhora?: {
    monto?: number | undefined;
    metodoPago: MetodoPagoFinanciero;
    cuentaId?: string | undefined;
    referencia?: string | undefined;
  } | undefined;
  gestionGarantia?: {
    accion: 'DEVOLVER_TOTAL' | 'DEVOLVER_PARCIAL' | 'RETENER_CARGOS' | 'DEJAR_CUSTODIA';
    montoDevolver?: number | undefined;
    cuentaId?: string | undefined;
    motivoRetencion?: string | undefined;
  } | undefined;
  requiereMantenimiento?: boolean | undefined;
  tipoMantenimiento?: TipoMantenimientoVehiculo | undefined;
  etiquetaMantenimiento?: string | undefined;
  fechaFinEstimadaMantenimiento?: string | undefined;
  usuarioId?: string | undefined;
  actor?: ContextoActorCiclo | undefined;
}

export interface RegistrarEvaluacionEntregaParams {
  reservaId?: string | undefined;
  codigo?: string | undefined;
  tokenAccesoPublico?: string | undefined;
  clienteId?: string | undefined;
  calificacionGeneral: 'SOBRESALIENTE' | 'MUY_BUENO' | 'REGULAR' | 'ATENCION_REQUERIDA';
  puntajeNumerico: number;
  aspectosDestacados: string[];
  desempenoVehiculo: 'IMPECABLE' | 'OPTIMO' | 'DETALLE_MENOR';
  comentarioOpcional?: string | undefined;
  cabinaSinObjetos?: boolean | undefined;
  telemetriaVerificada?: boolean | undefined;
  llavesEntregadas?: boolean | undefined;
  combustibleNivel?: 'MISMO_NIVEL' | 'CARGA_COMPLETA' | 'RECARGA_PENDIENTE' | undefined;
}

export interface RechazarReservaParams {
  reservaId?: string | undefined;
  codigo?: string | undefined;
  localId?: string | undefined;
  motivoRechazo: string;
  usuarioId?: string | undefined;
  actor?: ContextoActorCiclo | undefined;
}

export interface CancelarReservaParams {
  reservaId?: string | undefined;
  codigo?: string | undefined;
  localId?: string | undefined;
  tokenAccesoPublico?: string | undefined;
  clienteId?: string | undefined;
  motivoCancelacion?: string | undefined;
  resolucionFinanciera?: 'REEMBOLSAR_EGRESO' | 'ANULAR_MOVIMIENTOS' | 'RETENER_SALDO_LOCAL' | undefined;
  cuentaReembolsoId?: string | undefined;
  usuarioId?: string | undefined;
  actor?: ContextoActorCiclo | undefined;
}

export interface AnularAlquilerParams {
  contratoId?: string | undefined;
  reservaId?: string | undefined;
  codigo?: string | undefined;
  localId?: string | undefined;
  motivoAnulacion: string;
  resolucionFinanciera?: 'REEMBOLSAR_EGRESO' | 'ANULAR_MOVIMIENTOS' | 'RETENER_SALDO_LOCAL' | undefined;
  cuentaReembolsoId?: string | undefined;
  usuarioId?: string | undefined;
  actor?: ContextoActorCiclo | undefined;
}

export interface ReabrirReservaParams {
  reservaId?: string | undefined;
  codigo?: string | undefined;
  localId?: string | undefined;
  motivoReapertura?: string | undefined;
  usuarioId?: string | undefined;
  actor?: ContextoActorCiclo | undefined;
}

function validarPermisoActor(
  actor: ContextoActorCiclo | undefined,
  permiso: Permiso,
  mensajeError: string
): void {
  if (!actor || !actor.rol) return;
  if (!tienePermiso(actor.rol, permiso)) {
    throw new ErrorCicloAlquiler('FORBIDDEN', mensajeError);
  }
}

async function resolverReservaPorIdOCodigo(
  db: AppDb,
  reservaId?: string,
  codigo?: string
) {
  if (reservaId) {
    const rows = await db
      .select()
      .from(reservas)
      .where(eq(reservas.id, reservaId))
      .limit(1);
    return rows[0];
  }
  if (codigo) {
    const norm = codigo.trim().toUpperCase();
    const rows = await db
      .select()
      .from(reservas)
      .where(eq(reservas.codigo, norm))
      .limit(1);
    return rows[0];
  }
  throw new ErrorCicloAlquiler('BAD_REQUEST', 'Debe indicar reservaId o codigo');
}

async function resolverContratoPorReservaId(db: AppDb, reservaId: string) {
  const rows = await db
    .select()
    .from(contratosAlquiler)
    .where(eq(contratosAlquiler.reservaId, reservaId))
    .limit(1);
  return rows[0];
}

/**
 * 1. pausarAlquilerD1 (EN_CURSO -> PAUSADA)
 * Aplica pausa operativa sin costo adicional ($0 delta), extiende fechaFin,
 * preserva fechaFinOriginal, bloquea fechas en disponibilidad y marca vehículo NO_DISPONIBLE.
 */
export async function pausarAlquilerD1(
  db: AppDb,
  params: PausarAlquilerParams
) {
  validarPermisoActor(
    params.actor,
    PERMISOS.CONTRATOS_PAUSAR,
    'No cuenta con permisos para pausar alquileres (requiere CONTRATOS_PAUSAR)'
  );

  const reserva = await resolverReservaPorIdOCodigo(db, params.reservaId, params.codigo);
  if (!reserva) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Reserva no encontrada');
  }

  if (params.localId && reserva.localId !== params.localId) {
    throw new ErrorCicloAlquiler('FORBIDDEN', 'No tiene permisos sobre este local');
  }

  if (reserva.estado !== 'EN_CURSO') {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      `Solo un alquiler en estado EN_CURSO puede ser pausado (estado actual: ${reserva.estado})`
    );
  }

  const diasPausa = Math.max(1, Math.floor(params.diasPausa ?? 1));
  const fechaBloqueoInicio = sumarDiasISO(reserva.fechaFin, 1);
  const fechaBloqueoFin = sumarDiasISO(reserva.fechaFin, diasPausa);
  const hoyISO = toClientISODate();

  // Validar colisiones contra otras reservas y taller
  const disp = await verificarDisponibilidadVehiculo(
    db,
    reserva.vehiculoId,
    fechaBloqueoInicio,
    fechaBloqueoFin,
    hoyISO,
    reserva.id
  );

  if (!disp.disponible || disp.ocupado) {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      'Conflicto de disponibilidad vehicular en el período de pausa solicitado',
      {
        fechaBloqueoInicio,
        fechaBloqueoFin,
        conflictoCon: disp.reservaCodigo
          ? { tipo: 'RESERVA' as const, codigoOId: disp.reservaCodigo }
          : disp.mantenimientoActivoId
          ? { tipo: 'TALLER' as const, codigoOId: disp.mantenimientoActivoId }
          : undefined,
      }
    );
  }

  const contrato = await resolverContratoPorReservaId(db, reserva.id);
  const ahora = new Date();
  const fechaFinOriginal = reserva.fechaFinOriginal ?? reserva.fechaFin;
  const nuevoDiasAlquiler = calcularDiasInclusivos(reserva.fechaInicio, fechaBloqueoFin);

  const ops: unknown[] = [
    db
      .update(reservas)
      .set({
        estado: 'PAUSADA',
        fechaFin: fechaBloqueoFin,
        fechaFinOriginal,
        diasAlquiler: nuevoDiasAlquiler,
        actualizadoEn: ahora,
      })
      .where(eq(reservas.id, reserva.id)),

    db
      .insert(eventosAlquiler)
      .values({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        localId: reserva.localId,
        reservaId: reserva.id,
        contratoId: contrato?.id ?? null,
        vehiculoId: reserva.vehiculoId,
        tipoEvento: 'PAUSA',
        diasDelta: diasPausa,
        fechaBloqueoInicio,
        fechaBloqueoFin,
        modalidadTarifa: 'SIN_COSTO',
        montoDelta: 0,
        clausulaOTexto: params.motivo ?? 'Alquiler pausado por acuerdo',
        actorId: params.usuarioId ?? params.actor?.usuarioId ?? null,
        activo: true,
        creadoEn: ahora,
      }),

    db
      .update(vehiculos)
      .set({
        estado: 'NO_DISPONIBLE',
        actualizadoEn: ahora,
      })
      .where(eq(vehiculos.id, reserva.vehiculoId)),
  ];

  if (contrato) {
    ops.push(
      db
        .update(contratosAlquiler)
        .set({
          estadoContrato: 'PAUSADO',
          fechaHoraDevolucionPactada: new Date(`${fechaBloqueoFin}T20:00:00Z`),
          actualizadoEn: ahora,
        })
        .where(eq(contratosAlquiler.id, contrato.id))
    );
  }

  await ejecutarBatchOSecuencial(db, ops);
  await resolverEstadoActualVehiculo(db, reserva.vehiculoId);

  const reservaAct = await resolverReservaPorIdOCodigo(db, reserva.id);
  const contratoAct = contrato ? await resolverContratoPorReservaId(db, reserva.id) : null;

  return {
    reserva: reservaAct!,
    contrato: contratoAct,
  };
}

/**
 * 2. reanudarAlquilerD1 (PAUSADA -> EN_CURSO)
 * Reactiva el alquiler, sella eventos de pausa activos y retorna la unidad a RESERVADO.
 */
export async function reanudarAlquilerD1(
  db: AppDb,
  params: ReanudarAlquilerParams
) {
  validarPermisoActor(
    params.actor,
    PERMISOS.CONTRATOS_PAUSAR,
    'No cuenta con permisos para reanudar alquileres (requiere CONTRATOS_PAUSAR)'
  );

  const reserva = await resolverReservaPorIdOCodigo(db, params.reservaId, params.codigo);
  if (!reserva) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Reserva no encontrada');
  }

  if (params.localId && reserva.localId !== params.localId) {
    throw new ErrorCicloAlquiler('FORBIDDEN', 'No tiene permisos sobre este local');
  }

  if (reserva.estado !== 'PAUSADA') {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      `Solo un alquiler en estado PAUSADA puede ser reanudado (estado actual: ${reserva.estado})`
    );
  }

  const contrato = await resolverContratoPorReservaId(db, reserva.id);
  const ahora = new Date();

  const ops: unknown[] = [
    db
      .update(eventosAlquiler)
      .set({ activo: false })
      .where(
        and(
          eq(eventosAlquiler.reservaId, reserva.id),
          eq(eventosAlquiler.tipoEvento, 'PAUSA')
        )
      ),

    db
      .insert(eventosAlquiler)
      .values({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        localId: reserva.localId,
        reservaId: reserva.id,
        contratoId: contrato?.id ?? null,
        vehiculoId: reserva.vehiculoId,
        tipoEvento: 'REANUDACION',
        diasDelta: 0,
        montoDelta: 0,
        modalidadTarifa: 'SIN_COSTO',
        clausulaOTexto: params.motivo ?? 'Alquiler reanudado',
        actorId: params.usuarioId ?? params.actor?.usuarioId ?? null,
        activo: true,
        creadoEn: ahora,
      }),

    db
      .update(reservas)
      .set({
        estado: 'EN_CURSO',
        actualizadoEn: ahora,
      })
      .where(eq(reservas.id, reserva.id)),
  ];

  if (contrato) {
    ops.push(
      db
        .update(contratosAlquiler)
        .set({
          estadoContrato: 'VIGENTE',
          actualizadoEn: ahora,
        })
        .where(eq(contratosAlquiler.id, contrato.id))
    );
  }

  await ejecutarBatchOSecuencial(db, ops);
  await resolverEstadoActualVehiculo(db, reserva.vehiculoId);

  const reservaAct = await resolverReservaPorIdOCodigo(db, reserva.id);
  const contratoAct = contrato ? await resolverContratoPorReservaId(db, reserva.id) : null;

  return {
    reserva: reservaAct!,
    contrato: contratoAct,
  };
}

/**
 * 3. prorrogarAlquilerD1 (CONFIRMADA / EN_CURSO / PAUSADA)
 * Extiende fechas en 3 modalidades: TARIFA_ESTANDAR, MISMO_PRECIO, PRECIO_PACTADO.
 */
export async function prorrogarAlquilerD1(
  db: AppDb,
  params: ProrrogarAlquilerParams
) {
  if (params.modalidadTarifa === 'TARIFA_ESTANDAR') {
    validarPermisoActor(
      params.actor,
      PERMISOS.CONTRATOS_CREAR,
      'No cuenta con permisos para crear prórrogas estándar'
    );
  } else {
    validarPermisoActor(
      params.actor,
      PERMISOS.CONTRATOS_MODIFICAR_TARIFA,
      'No cuenta con permisos para modificar tarifas en prórrogas (requiere CONTRATOS_MODIFICAR_TARIFA)'
    );
  }

  const reserva = await resolverReservaPorIdOCodigo(db, params.reservaId, params.codigo);
  if (!reserva) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Reserva no encontrada');
  }

  if (params.localId && reserva.localId !== params.localId) {
    throw new ErrorCicloAlquiler('FORBIDDEN', 'No tiene permisos sobre este local');
  }

  if (
    reserva.estado !== 'CONFIRMADA' &&
    reserva.estado !== 'EN_CURSO' &&
    reserva.estado !== 'PAUSADA'
  ) {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      `Solo alquileres CONFIRMADA, EN_CURSO o PAUSADA pueden ser prorrogados (estado: ${reserva.estado})`
    );
  }

  const diasExtra = Math.max(1, Math.floor(params.diasExtra));
  const fechaBloqueoInicio = sumarDiasISO(reserva.fechaFin, 1);
  const nuevaFechaFin = sumarDiasISO(reserva.fechaFin, diasExtra);
  const hoyISO = toClientISODate();

  const disp = await verificarDisponibilidadVehiculo(
    db,
    reserva.vehiculoId,
    fechaBloqueoInicio,
    nuevaFechaFin,
    hoyISO,
    reserva.id
  );

  if (!disp.disponible || disp.ocupado) {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      'Conflicto de disponibilidad vehicular en el período de prórroga solicitado',
      {
        fechaBloqueoInicio,
        nuevaFechaFin,
        conflictoCon: disp.reservaCodigo
          ? { tipo: 'RESERVA' as const, codigoOId: disp.reservaCodigo }
          : disp.mantenimientoActivoId
          ? { tipo: 'TALLER' as const, codigoOId: disp.mantenimientoActivoId }
          : undefined,
      }
    );
  }

  const contrato = await resolverContratoPorReservaId(db, reserva.id);
  const vehRows = await db
    .select({ precioDia: vehiculos.precioDia })
    .from(vehiculos)
    .where(eq(vehiculos.id, reserva.vehiculoId))
    .limit(1);
  const precioDiaVehiculo = vehRows[0]?.precioDia ?? reserva.precioDiaCotizado;

  let montoDelta = 0;
  if (params.modalidadTarifa === 'MISMO_PRECIO') {
    montoDelta = 0;
  } else if (params.modalidadTarifa === 'TARIFA_ESTANDAR') {
    const pDia = params.precioDia ?? contrato?.canonDiarioPactado ?? precioDiaVehiculo;
    montoDelta = diasExtra * pDia;
  } else if (params.modalidadTarifa === 'PRECIO_PACTADO') {
    montoDelta = Math.max(0, Math.floor(params.montoAcordado ?? 0));
  }

  const ahora = new Date();
  const nuevoDiasAlquiler = reserva.diasAlquiler + diasExtra;
  const nuevoTotalCotizado = reserva.totalCotizado + montoDelta;

  const ops: unknown[] = [
    db
      .update(reservas)
      .set({
        fechaFin: nuevaFechaFin,
        diasAlquiler: nuevoDiasAlquiler,
        totalCotizado: nuevoTotalCotizado,
        actualizadoEn: ahora,
      })
      .where(eq(reservas.id, reserva.id)),

    db
      .insert(eventosAlquiler)
      .values({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        localId: reserva.localId,
        reservaId: reserva.id,
        contratoId: contrato?.id ?? null,
        vehiculoId: reserva.vehiculoId,
        tipoEvento: 'PRORROGA',
        diasDelta: diasExtra,
        fechaBloqueoInicio,
        fechaBloqueoFin: nuevaFechaFin,
        modalidadTarifa: params.modalidadTarifa,
        montoDelta,
        clausulaOTexto: params.clausulaAcuerdo ?? params.motivo ?? 'Prórroga de alquiler acordada',
        actorId: params.usuarioId ?? params.actor?.usuarioId ?? null,
        activo: true,
        creadoEn: ahora,
      }),
  ];

  if (contrato) {
    const nuevoTotalLiquidado = contrato.totalLiquidado + montoDelta;
    const nuevoSaldoPendiente = Math.max(0, nuevoTotalLiquidado - contrato.totalPagado);
    let nuevoEstadoPago: EstadoPagoContrato = 'PAGADO';
    if (nuevoSaldoPendiente > 0) {
      nuevoEstadoPago = contrato.totalPagado > 0 ? 'PARCIAL' : 'PENDIENTE';
    }

    ops.push(
      db
        .update(contratosAlquiler)
        .set({
          subtotalCanon: contrato.subtotalCanon + (params.modalidadTarifa === 'TARIFA_ESTANDAR' ? montoDelta : 0),
          cargosOtrosLocal: contrato.cargosOtrosLocal + (params.modalidadTarifa === 'PRECIO_PACTADO' ? montoDelta : 0),
          totalLiquidado: nuevoTotalLiquidado,
          saldoPendiente: nuevoSaldoPendiente,
          estadoPago: nuevoEstadoPago,
          fechaHoraDevolucionPactada: new Date(`${nuevaFechaFin}T20:00:00Z`),
          actualizadoEn: ahora,
        })
        .where(eq(contratosAlquiler.id, contrato.id))
    );
  }

  await ejecutarBatchOSecuencial(db, ops);

  const reservaAct = await resolverReservaPorIdOCodigo(db, reserva.id);
  const contratoAct = contrato ? await resolverContratoPorReservaId(db, reserva.id) : null;

  return {
    reserva: reservaAct!,
    contrato: contratoAct,
  };
}

/**
 * 4. devolverYCerrarAlquilerD1 (EN_CURSO / PAUSADA -> COMPLETADA)
 * Devolución normal o anticipada con cláusula del local, control de sobrecosto/descuento,
 * salvaguarda contra saldos negativos por excedente y orden técnica de mantenimiento.
 */
export async function devolverYCerrarAlquilerD1(
  db: AppDb,
  params: DevolverYCerrarAlquilerParams
) {
  validarPermisoActor(
    params.actor,
    PERMISOS.CONTRATOS_FINALIZAR,
    'No cuenta con permisos para cerrar contratos de alquiler (requiere CONTRATOS_FINALIZAR)'
  );

  const sobrecostoLocal = Math.max(0, Math.floor(params.sobrecostoLocal ?? 0));
  const descuentoAjusteLocal = Math.max(0, Math.floor(params.descuentoAjusteLocal ?? 0));

  if (sobrecostoLocal > 0) {
    validarPermisoActor(
      params.actor,
      PERMISOS.NOVEDADES_CARGOS_APROBAR,
      'No cuenta con permisos para aprobar sobrecostos o cargos del local (requiere NOVEDADES_CARGOS_APROBAR)'
    );
    if (!params.motivoSobrecosto || params.motivoSobrecosto.trim().length === 0) {
      throw new ErrorCicloAlquiler(
        'BAD_REQUEST',
        'El motivo de sobrecosto es obligatorio cuando sobrecostoLocal > 0'
      );
    }
  }

  if (descuentoAjusteLocal > 0) {
    validarPermisoActor(
      params.actor,
      PERMISOS.CONTRATOS_MODIFICAR_TARIFA,
      'No cuenta con permisos para aplicar descuentos en liquidación (requiere CONTRATOS_MODIFICAR_TARIFA)'
    );
  }

  const reserva = await resolverReservaPorIdOCodigo(db, params.reservaId, params.codigo);
  if (!reserva) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Reserva no encontrada');
  }

  if (params.localId && reserva.localId !== params.localId) {
    throw new ErrorCicloAlquiler('FORBIDDEN', 'No tiene permisos sobre este local');
  }

  if (reserva.estado !== 'EN_CURSO' && reserva.estado !== 'PAUSADA') {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      `Solo alquileres EN_CURSO o PAUSADA pueden ser devueltos y cerrados (estado: ${reserva.estado})`
    );
  }

  const contrato = await resolverContratoPorReservaId(db, reserva.id);
  const hoyISO = toClientISODate();
  const fechaDevolucionReal = params.fechaDevolucionReal ?? hoyISO;
  const esDevolucionAnticipada = fechaDevolucionReal < reserva.fechaFin;
  const fechaFinOriginal = reserva.fechaFinOriginal ?? reserva.fechaFin;

  // Cálculos financieros
  const totalBase = contrato ? contrato.totalLiquidado : reserva.totalCotizado;
  const totalPagadoActual = contrato ? contrato.totalPagado : reserva.montoAbonoReportado;
  const nuevoTotalLiquidado = Math.max(0, totalBase + sobrecostoLocal - descuentoAjusteLocal);

  const mensajeLegal = 'Las condiciones, ajustes y sobrecostos de devolución los establece el local.';
  const ahora = new Date();
  const ops: unknown[] = [];

  // Regla de excedente: si totalLiquidado < totalPagado
  let saldoPendienteFinal = 0;
  let totalPagadoFinal = totalPagadoActual;
  let estadoPagoFinal: EstadoPagoContrato = 'PAGADO';
  let estadoContratoFinal: EstadoContratoAlquiler = 'CERRADO_PAZ_Y_SALVO';

  if (nuevoTotalLiquidado < totalPagadoActual) {
    if (params.resolucionExcedente !== 'REEMBOLSO_ALQUILER') {
      throw new ErrorCicloAlquiler(
        'BAD_REQUEST',
        'El descuento genera un excedente pagado por el cliente (totalLiquidado < totalPagado). Debe especificar resolucionExcedente: "REEMBOLSO_ALQUILER" con una cuenta de origen autorizada o ajustar el descuento.',
        {
          totalPagadoActual,
          nuevoTotalLiquidado,
          excedente: totalPagadoActual - nuevoTotalLiquidado,
        }
      );
    }

    validarPermisoActor(
      params.actor,
      PERMISOS.CAJA_GASTOS_REGISTRAR,
      'No cuenta con permisos para emitir reembolsos de caja (requiere CAJA_GASTOS_REGISTRAR)'
    );

    const excedente = totalPagadoActual - nuevoTotalLiquidado;
    const movimientoReembolsoId = `mov-reemb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const cuentaId = params.cuentaReembolsoId ?? 'cta-caja-default';
    const usuarioResponsableId = params.usuarioId ?? params.actor?.usuarioId ?? reserva.clienteId ?? 'usr-sistema-cierre';

    ops.push(
      db.insert(movimientosCaja).values({
        id: movimientoReembolsoId,
        localId: reserva.localId,
        contratoId: contrato?.id ?? null,
        cuentaId,
        tipo: 'EGRESO',
        categoria: 'REEMBOLSO_ALQUILER',
        monto: excedente,
        metodoPago: 'efectivo',
        concepto: `Reembolso por devolución anticipada / descuento #${reserva.codigo}`,
        referencia: `REEMB-${reserva.codigo}`,
        estado: 'CONFIRMADO',
        creadoPorId: usuarioResponsableId,
        fechaMovimiento: ahora,
        creadoEn: ahora,
        actualizadoEn: ahora,
      }),
      db.insert(auditoriaFinanciera).values({
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        localId: reserva.localId,
        entidad: 'MOVIMIENTO',
        entidadId: movimientoReembolsoId,
        accion: 'CREAR',
        montoAnterior: null,
        montoNuevo: excedente,
        motivo: 'Reembolso por ajuste de devolución anticipada',
        usuarioId: usuarioResponsableId,
        detallesJson: JSON.stringify({ reservaId: reserva.id, nuevoTotalLiquidado, excedente }),
        creadoEn: ahora,
      })
    );

    totalPagadoFinal = nuevoTotalLiquidado;
    saldoPendienteFinal = 0;
    estadoPagoFinal = 'PAGADO';
    estadoContratoFinal = 'CERRADO_PAZ_Y_SALVO';
  } else if (nuevoTotalLiquidado > totalPagadoActual) {
    const saldo = nuevoTotalLiquidado - totalPagadoActual;
    if (params.cobrarSaldoAhora && params.cobrarSaldoAhora.metodoPago) {
      const movCobroId = `mov-cobro-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const usuarioResponsableId = params.usuarioId ?? params.actor?.usuarioId ?? reserva.clienteId ?? 'usr-sistema-cierre';
      ops.push(
        db.insert(movimientosCaja).values({
          id: movCobroId,
          localId: reserva.localId,
          contratoId: contrato?.id ?? null,
          cuentaId: params.cobrarSaldoAhora.cuentaId ?? 'cta-caja-default',
          tipo: 'INGRESO',
          categoria: 'PAGO_ALQUILER',
          monto: saldo,
          metodoPago: params.cobrarSaldoAhora.metodoPago ?? 'efectivo',
          concepto: `Cobro saldo final de alquiler #${reserva.codigo}`,
          referencia: params.cobrarSaldoAhora.referencia ?? `COBRO-${reserva.codigo}`,
          estado: 'CONFIRMADO',
          creadoPorId: usuarioResponsableId,
          fechaMovimiento: ahora,
          creadoEn: ahora,
          actualizadoEn: ahora,
        })
      );
      totalPagadoFinal = nuevoTotalLiquidado;
      saldoPendienteFinal = 0;
      estadoPagoFinal = 'PAGADO';
      estadoContratoFinal = 'CERRADO_PAZ_Y_SALVO';
    } else {
      saldoPendienteFinal = saldo;
      totalPagadoFinal = totalPagadoActual;
      estadoPagoFinal = totalPagadoActual > 0 ? 'PARCIAL' : 'PENDIENTE';
      estadoContratoFinal = 'CERRADO_CON_SALDO';
    }
  } else {
    saldoPendienteFinal = 0;
    totalPagadoFinal = nuevoTotalLiquidado;
    estadoPagoFinal = 'PAGADO';
    estadoContratoFinal = 'CERRADO_PAZ_Y_SALVO';
  }

  // Acta de recepción R2
  const inspeccionRecepcionId = `insp-rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  ops.push(
    db.insert(inspeccionesPericiales).values({
      id: inspeccionRecepcionId,
      reservaId: reserva.id,
      contratoId: contrato?.id ?? null,
      localId: reserva.localId,
      vehiculoId: reserva.vehiculoId,
      inspectorId: params.usuarioId ?? params.actor?.usuarioId ?? 'usr-sistema-insp',
      tipoActo: 'RECEPCION',
      medidorUso: params.medidorUsoRetorno,
      nivelEnergiaPct: params.nivelEnergiaRetornoPct ?? 100,
      estadoGeneral: params.estadoGeneral ?? 'OPTIMO',
      respuestasChecklist: [],
      observaciones: params.observaciones ?? null,
      iniciadaEn: ahora,
      finalizadaEn: ahora,
      creadoEn: ahora,
    })
  );

  // Orden de taller si requiere mantenimiento
  if (params.requiereMantenimiento === true) {
    const mantenimientoId = `man-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fechaFinTaller = params.fechaFinEstimadaMantenimiento ?? sumarDiasISO(fechaDevolucionReal, 2);

    ops.push(
      db.insert(mantenimientosVehiculo).values({
        id: mantenimientoId,
        localId: reserva.localId,
        vehiculoId: reserva.vehiculoId,
        reservaOrigenId: reserva.id,
        tipo: params.tipoMantenimiento ?? 'CORRECTIVO_NOVEDAD',
        estado: 'EN_TALLER',
        etiqueta: params.etiquetaMantenimiento ?? 'Mantenimiento correctivo post-devolución',
        descripcion: params.observaciones ?? 'Orden generada en cierre de devolución',
        fechaInicio: fechaDevolucionReal,
        fechaFin: fechaFinTaller,
        kilometrajeRegistro: params.medidorUsoRetorno,
        costoTotal: 0,
        creadoPorId: params.usuarioId ?? params.actor?.usuarioId ?? 'usr-sistema-taller',
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
    );
  }

  // Eventos de bitácora
  if (esDevolucionAnticipada) {
    const diasLiberados = calcularDiasInclusivos(fechaDevolucionReal, reserva.fechaFin) - 1;
    ops.push(
      db.insert(eventosAlquiler).values({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        localId: reserva.localId,
        reservaId: reserva.id,
        contratoId: contrato?.id ?? null,
        vehiculoId: reserva.vehiculoId,
        tipoEvento: 'DEVOLUCION_ANTICIPADA',
        diasDelta: -Math.max(1, diasLiberados),
        fechaBloqueoInicio: fechaDevolucionReal,
        fechaBloqueoFin: reserva.fechaFin,
        modalidadTarifa: 'SIN_COSTO',
        montoDelta: -descuentoAjusteLocal,
        clausulaOTexto: `${mensajeLegal} Devolución anticipada registrada.`,
        actorId: params.usuarioId ?? params.actor?.usuarioId ?? null,
        activo: false,
        creadoEn: ahora,
      })
    );
  }

  if (sobrecostoLocal > 0) {
    ops.push(
      db.insert(eventosAlquiler).values({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        localId: reserva.localId,
        reservaId: reserva.id,
        contratoId: contrato?.id ?? null,
        vehiculoId: reserva.vehiculoId,
        tipoEvento: 'SOBRECOSTO_CLAUSULA',
        diasDelta: 0,
        modalidadTarifa: 'PRECIO_PACTADO',
        montoDelta: sobrecostoLocal,
        clausulaOTexto: `${mensajeLegal} Sobrecosto: ${params.motivoSobrecosto}`,
        actorId: params.usuarioId ?? params.actor?.usuarioId ?? null,
        activo: false,
        creadoEn: ahora,
      })
    );
  }

  // Actualizar reserva y contrato
  const fechaFinFinal = esDevolucionAnticipada ? fechaDevolucionReal : reserva.fechaFin;
  const diasAlquilerFinal = calcularDiasInclusivos(reserva.fechaInicio, fechaFinFinal);

  ops.push(
    db
      .update(reservas)
      .set({
        estado: 'COMPLETADA',
        fechaFin: fechaFinFinal,
        fechaFinOriginal,
        fechaDevolucionReal,
        diasAlquiler: diasAlquilerFinal,
        totalCotizado: nuevoTotalLiquidado,
        actualizadoEn: ahora,
      })
      .where(eq(reservas.id, reserva.id)),

    db
      .update(vehiculos)
      .set({
        kilometraje: params.medidorUsoRetorno,
        actualizadoEn: ahora,
      })
      .where(eq(vehiculos.id, reserva.vehiculoId))
  );

  if (contrato) {
    ops.push(
      db
        .update(contratosAlquiler)
        .set({
          estadoContrato: estadoContratoFinal,
          estadoPago: estadoPagoFinal,
          totalLiquidado: nuevoTotalLiquidado,
          totalPagado: totalPagadoFinal,
          saldoPendiente: saldoPendienteFinal,
          cargosOtrosLocal: contrato.cargosOtrosLocal + sobrecostoLocal,
          ajusteDescuentoLocal: contrato.ajusteDescuentoLocal + descuentoAjusteLocal,
          clausulaEncargado: params.clausulaEncargado ?? mensajeLegal,
          medidorUsoRetorno: params.medidorUsoRetorno,
          nivelEnergiaRetornoPct: params.nivelEnergiaRetornoPct ?? 100,
          fechaHoraDevolucionReal: ahora,
          actualizadoEn: ahora,
        })
        .where(eq(contratosAlquiler.id, contrato.id))
    );
  }

  await ejecutarBatchOSecuencial(db, ops);
  await resolverEstadoActualVehiculo(db, reserva.vehiculoId);

  const reservaAct = await resolverReservaPorIdOCodigo(db, reserva.id);
  const contratoAct = contrato ? await resolverContratoPorReservaId(db, reserva.id) : null;

  return {
    reserva: reservaAct!,
    contrato: contratoAct,
    mensajeLegal,
  };
}

/**
 * 5. registrarEvaluacionEntregaClienteD1
 * Inserta exclusivamente en evaluaciones_entrega_cliente validando token o propiedad.
 * INVARIANTE INVIOLABLE: NUNCA cambia estado de reserva ni vehículo a COMPLETADA.
 */
export async function registrarEvaluacionEntregaClienteD1(
  db: AppDb,
  params: RegistrarEvaluacionEntregaParams
) {
  const reserva = await resolverReservaPorIdOCodigo(db, params.reservaId, params.codigo);
  if (!reserva) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Reserva no encontrada');
  }

  // Validación de acceso seguro
  if (params.tokenAccesoPublico) {
    if (!reserva.tokenAccesoPublico || params.tokenAccesoPublico !== reserva.tokenAccesoPublico) {
      throw new ErrorCicloAlquiler('FORBIDDEN', 'Token de acceso público inválido');
    }
  } else if (params.clienteId) {
    if (reserva.clienteId && params.clienteId !== reserva.clienteId) {
      throw new ErrorCicloAlquiler('FORBIDDEN', 'No autorizado para evaluar esta reserva');
    }
  } else {
    throw new ErrorCicloAlquiler(
      'FORBIDDEN',
      'Se requiere tokenAccesoPublico o clienteId para registrar la evaluación'
    );
  }

  const ahora = new Date();
  const evalId = `eval-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await db.insert(evaluacionesEntregaCliente).values({
    id: evalId,
    reservaId: reserva.id,
    localId: reserva.localId,
    vehiculoId: reserva.vehiculoId,
    clienteId: reserva.clienteId ?? params.clienteId ?? null,
    calificacionGeneral: params.calificacionGeneral,
    puntajeNumerico: params.puntajeNumerico,
    aspectosDestacados: params.aspectosDestacados,
    desempenoVehiculo: params.desempenoVehiculo,
    comentarioOpcional: params.comentarioOpcional ?? null,
    cabinaSinObjetos: params.cabinaSinObjetos ?? true,
    telemetriaVerificada: params.telemetriaVerificada ?? true,
    llavesEntregadas: params.llavesEntregadas ?? true,
    combustibleNivel: params.combustibleNivel ?? 'MISMO_NIVEL',
    completadaEn: ahora,
  });

  return {
    ok: true as const,
    evaluacionId: evalId,
  };
}

/**
 * 6. rechazarReservaD1 (PENDIENTE -> RECHAZADA)
 */
export async function rechazarReservaD1(
  db: AppDb,
  params: RechazarReservaParams
) {
  validarPermisoActor(
    params.actor,
    PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR,
    'No cuenta con permisos para rechazar reservas (requiere RESERVAS_CONFIRMAR_RECHAZAR)'
  );

  const reserva = await resolverReservaPorIdOCodigo(db, params.reservaId, params.codigo);
  if (!reserva) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Reserva no encontrada');
  }

  if (params.localId && reserva.localId !== params.localId) {
    throw new ErrorCicloAlquiler('FORBIDDEN', 'No tiene permisos sobre este local');
  }

  if (reserva.estado !== 'PENDIENTE') {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      `Solo solicitudes en estado PENDIENTE pueden ser rechazadas (estado actual: ${reserva.estado})`
    );
  }

  const contrato = await resolverContratoPorReservaId(db, reserva.id);
  const ahora = new Date();

  const ops: unknown[] = [
    db
      .update(reservas)
      .set({
        estado: 'RECHAZADA',
        motivoRechazo: params.motivoRechazo,
        actualizadoEn: ahora,
      })
      .where(eq(reservas.id, reserva.id)),
  ];

  if (contrato) {
    ops.push(
      db
        .update(contratosAlquiler)
        .set({
          estadoContrato: 'ANULADO',
          actualizadoEn: ahora,
        })
        .where(eq(contratosAlquiler.id, contrato.id))
    );
  }

  await ejecutarBatchOSecuencial(db, ops);
  await resolverEstadoActualVehiculo(db, reserva.vehiculoId);

  const reservaAct = await resolverReservaPorIdOCodigo(db, reserva.id);
  return { reserva: reservaAct! };
}

/**
 * 7. cancelarReservaD1 (PENDIENTE o CONFIRMADA -> CANCELADA)
 * Si está CONFIRMADA o tiene contrato creado, exige CONTRATOS_ANULAR.
 */
export async function cancelarReservaD1(
  db: AppDb,
  params: CancelarReservaParams
) {
  const reserva = await resolverReservaPorIdOCodigo(db, params.reservaId, params.codigo);
  if (!reserva) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Reserva no encontrada');
  }

  if (params.localId && reserva.localId !== params.localId) {
    throw new ErrorCicloAlquiler('FORBIDDEN', 'No tiene permisos sobre este local');
  }

  if (reserva.estado === 'COMPLETADA' || reserva.estado === 'CANCELADA' || reserva.estado === 'RECHAZADA') {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      `La reserva ya se encuentra en estado terminal ${reserva.estado}`
    );
  }

  // Validación de permisos
  const esInvitadoToken = Boolean(
    params.tokenAccesoPublico &&
    reserva.tokenAccesoPublico &&
    params.tokenAccesoPublico === reserva.tokenAccesoPublico
  );

  if (params.tokenAccesoPublico && !esInvitadoToken) {
    throw new ErrorCicloAlquiler('FORBIDDEN', 'Token de acceso público inválido');
  }

  const esClientePropio = Boolean(
    params.clienteId &&
    reserva.clienteId &&
    params.clienteId === reserva.clienteId
  );

  const contrato = await resolverContratoPorReservaId(db, reserva.id);
  const tienePagos = Boolean((contrato && contrato.totalPagado > 0) || reserva.montoAbonoReportado > 0);

  if (reserva.estado === 'CONFIRMADA' || contrato) {
    validarPermisoActor(
      params.actor,
      PERMISOS.CONTRATOS_ANULAR,
      'Cancelar una reserva confirmada o con contrato creado requiere permiso CONTRATOS_ANULAR (exclusivo de administradores)'
    );
  } else if (!esInvitadoToken && !esClientePropio) {
    validarPermisoActor(
      params.actor,
      PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR,
      'No cuenta con permisos para cancelar esta solicitud'
    );
  }

  if (tienePagos && !params.resolucionFinanciera) {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      'La reserva cuenta con pagos reportados o confirmados. Debe indicar resolucionFinanciera.'
    );
  }

  if (params.resolucionFinanciera) {
    validarPermisoActor(
      params.actor,
      PERMISOS.CAJA_GASTOS_REGISTRAR,
      'La resolución financiera requiere permiso CAJA_GASTOS_REGISTRAR'
    );
  }

  const ahora = new Date();
  const motivo = params.motivoCancelacion ?? 'Cancelación de reserva';

  const ops: unknown[] = [
    db
      .update(reservas)
      .set({
        estado: 'CANCELADA',
        motivoCancelacion: motivo,
        canceladoPorId: params.usuarioId ?? params.actor?.usuarioId ?? null,
        canceladoEn: ahora,
        actualizadoEn: ahora,
      })
      .where(eq(reservas.id, reserva.id)),

    db
      .insert(eventosAlquiler)
      .values({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        localId: reserva.localId,
        reservaId: reserva.id,
        contratoId: contrato?.id ?? null,
        vehiculoId: reserva.vehiculoId,
        tipoEvento: 'CANCELACION',
        diasDelta: 0,
        montoDelta: 0,
        modalidadTarifa: 'SIN_COSTO',
        clausulaOTexto: motivo,
        actorId: params.usuarioId ?? params.actor?.usuarioId ?? null,
        activo: false,
        creadoEn: ahora,
      }),
  ];

  if (contrato) {
    ops.push(
      db
        .update(contratosAlquiler)
        .set({
          estadoContrato: 'ANULADO',
          motivoAnulacion: motivo,
          anuladoPorId: params.usuarioId ?? params.actor?.usuarioId ?? null,
          anuladoEn: ahora,
          saldoPendiente: 0,
          actualizadoEn: ahora,
        })
        .where(eq(contratosAlquiler.id, contrato.id))
    );
  }

  if (contrato && contrato.totalPagado > 0 && params.resolucionFinanciera === 'REEMBOLSAR_EGRESO') {
    const usuarioResponsableId = params.usuarioId ?? params.actor?.usuarioId ?? reserva.clienteId ?? 'usr-sistema-canc';
    const movReembId = `mov-canc-reemb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    ops.push(
      db.insert(movimientosCaja).values({
        id: movReembId,
        localId: reserva.localId,
        contratoId: contrato.id,
        cuentaId: params.cuentaReembolsoId ?? 'cta-caja-default',
        tipo: 'EGRESO',
        categoria: 'REEMBOLSO_ALQUILER',
        monto: contrato.totalPagado,
        metodoPago: 'efectivo',
        concepto: `Reembolso por cancelación de reserva #${reserva.codigo}`,
        referencia: `REEMB-${reserva.codigo}`,
        estado: 'CONFIRMADO',
        creadoPorId: usuarioResponsableId,
        fechaMovimiento: ahora,
        creadoEn: ahora,
        actualizadoEn: ahora,
      }),
      db.insert(auditoriaFinanciera).values({
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        localId: reserva.localId,
        entidad: 'MOVIMIENTO',
        entidadId: movReembId,
        accion: 'CREAR',
        montoAnterior: null,
        montoNuevo: contrato.totalPagado,
        motivo: 'Reembolso por cancelación de reserva',
        usuarioId: usuarioResponsableId,
        detallesJson: JSON.stringify({ reservaId: reserva.id, totalPagado: contrato.totalPagado }),
        creadoEn: ahora,
      })
    );
  }

  await ejecutarBatchOSecuencial(db, ops);
  await resolverEstadoActualVehiculo(db, reserva.vehiculoId);

  const reservaAct = await resolverReservaPorIdOCodigo(db, reserva.id);
  const contratoAct = contrato ? await resolverContratoPorReservaId(db, reserva.id) : null;

  return {
    reserva: reservaAct!,
    contrato: contratoAct,
  };
}

/**
 * 8. anularAlquilerD1 (Exclusivo ADMIN/DUENO con CONTRATOS_ANULAR)
 */
export async function anularAlquilerD1(
  db: AppDb,
  params: AnularAlquilerParams
) {
  validarPermisoActor(
    params.actor,
    PERMISOS.CONTRATOS_ANULAR,
    'Anular un contrato de alquiler requiere permiso CONTRATOS_ANULAR (exclusivo de administradores)'
  );

  if (!params.motivoAnulacion || params.motivoAnulacion.trim().length < 5) {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      'El motivo de anulación es obligatorio y debe tener al menos 5 caracteres'
    );
  }

  let reserva = params.reservaId || params.codigo
    ? await resolverReservaPorIdOCodigo(db, params.reservaId, params.codigo)
    : null;

  let contrato = params.contratoId
    ? (await db.select().from(contratosAlquiler).where(eq(contratosAlquiler.id, params.contratoId)).limit(1))[0]
    : null;

  if (!contrato && reserva) {
    contrato = await resolverContratoPorReservaId(db, reserva.id);
  }
  if (!reserva && contrato) {
    reserva = await resolverReservaPorIdOCodigo(db, contrato.reservaId);
  }

  if (!reserva) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Reserva o contrato no encontrado para anulación');
  }

  if (params.localId && reserva.localId !== params.localId) {
    throw new ErrorCicloAlquiler('FORBIDDEN', 'No tiene permisos sobre este local');
  }

  if (contrato && contrato.totalPagado > 0 && !params.resolucionFinanciera) {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      'El contrato cuenta con pagos confirmados. Debe indicar resolucionFinanciera (REEMBOLSAR_EGRESO / ANULAR_MOVIMIENTOS / RETENER_SALDO_LOCAL).'
    );
  }

  if (params.resolucionFinanciera) {
    validarPermisoActor(
      params.actor,
      PERMISOS.CAJA_GASTOS_REGISTRAR,
      'La resolución financiera de caja requiere CAJA_GASTOS_REGISTRAR'
    );
  }

  const ahora = new Date();
  const ops: unknown[] = [
    db
      .update(reservas)
      .set({
        estado: 'CANCELADA',
        motivoCancelacion: params.motivoAnulacion,
        canceladoPorId: params.usuarioId ?? params.actor?.usuarioId ?? null,
        canceladoEn: ahora,
        actualizadoEn: ahora,
      })
      .where(eq(reservas.id, reserva.id)),

    db
      .insert(eventosAlquiler)
      .values({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        localId: reserva.localId,
        reservaId: reserva.id,
        contratoId: contrato?.id ?? null,
        vehiculoId: reserva.vehiculoId,
        tipoEvento: 'ANULACION',
        diasDelta: 0,
        montoDelta: 0,
        modalidadTarifa: 'SIN_COSTO',
        clausulaOTexto: params.motivoAnulacion,
        actorId: params.usuarioId ?? params.actor?.usuarioId ?? null,
        activo: false,
        creadoEn: ahora,
      }),
  ];

  if (contrato) {
    ops.push(
      db
        .update(contratosAlquiler)
        .set({
          estadoContrato: 'ANULADO',
          motivoAnulacion: params.motivoAnulacion,
          anuladoPorId: params.usuarioId ?? params.actor?.usuarioId ?? null,
          anuladoEn: ahora,
          saldoPendiente: 0,
          actualizadoEn: ahora,
        })
        .where(eq(contratosAlquiler.id, contrato.id))
    );

    if (contrato.totalPagado > 0 && params.resolucionFinanciera === 'REEMBOLSAR_EGRESO') {
      const usuarioResponsableId = params.usuarioId ?? params.actor?.usuarioId ?? reserva.clienteId ?? 'usr-sistema-anul';
      const movId = `mov-anul-reemb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      ops.push(
        db.insert(movimientosCaja).values({
          id: movId,
          localId: reserva.localId,
          contratoId: contrato.id,
          cuentaId: params.cuentaReembolsoId ?? 'cta-caja-default',
          tipo: 'EGRESO',
          categoria: 'REEMBOLSO_ALQUILER',
          monto: contrato.totalPagado,
          metodoPago: 'efectivo',
          concepto: `Reembolso por anulación de contrato #${contrato.numeroContrato}`,
          referencia: `REEMB-${contrato.numeroContrato}`,
          estado: 'CONFIRMADO',
          creadoPorId: usuarioResponsableId,
          fechaMovimiento: ahora,
          creadoEn: ahora,
          actualizadoEn: ahora,
        }),
        db.insert(auditoriaFinanciera).values({
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          localId: reserva.localId,
          entidad: 'MOVIMIENTO',
          entidadId: movId,
          accion: 'CREAR',
          montoAnterior: null,
          montoNuevo: contrato.totalPagado,
          motivo: `Reembolso egreso por anulación: ${params.motivoAnulacion}`,
          usuarioId: usuarioResponsableId,
          detallesJson: JSON.stringify({ contratoId: contrato.id, motivo: params.motivoAnulacion }),
          creadoEn: ahora,
        })
      );
    }
  }

  await ejecutarBatchOSecuencial(db, ops);
  await resolverEstadoActualVehiculo(db, reserva.vehiculoId);

  const reservaAct = await resolverReservaPorIdOCodigo(db, reserva.id);
  const contratoAct = contrato ? await resolverContratoPorReservaId(db, reserva.id) : null;

  return {
    reserva: reservaAct!,
    contrato: contratoAct,
  };
}

/**
 * 9. reabrirReservaD1 (CANCELADA o RECHAZADA -> PENDIENTE)
 * Valida disponibilidad vehicular antes de reabrir.
 */
export async function reabrirReservaD1(
  db: AppDb,
  params: ReabrirReservaParams
) {
  validarPermisoActor(
    params.actor,
    PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR,
    'Reabrir una reserva requiere permisos de administración (RESERVAS_CONFIRMAR_RECHAZAR)'
  );

  const reserva = await resolverReservaPorIdOCodigo(db, params.reservaId, params.codigo);
  if (!reserva) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Reserva no encontrada');
  }

  if (params.localId && reserva.localId !== params.localId) {
    throw new ErrorCicloAlquiler('FORBIDDEN', 'No tiene permisos sobre este local');
  }

  if (reserva.estado !== 'CANCELADA' && reserva.estado !== 'RECHAZADA') {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      `Solo reservas CANCELADA o RECHAZADA pueden ser reabiertas (estado actual: ${reserva.estado})`
    );
  }

  const hoyISO = toClientISODate();
  const disp = await verificarDisponibilidadVehiculo(
    db,
    reserva.vehiculoId,
    reserva.fechaInicio,
    reserva.fechaFin,
    hoyISO,
    reserva.id
  );

  if (!disp.disponible || disp.ocupado) {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      'No es posible reabrir la reserva: el vehículo ya no se encuentra disponible en las fechas requeridas',
      {
        fechaInicio: reserva.fechaInicio,
        fechaFin: reserva.fechaFin,
        conflictoCon: disp.reservaCodigo
          ? { tipo: 'RESERVA' as const, codigoOId: disp.reservaCodigo }
          : disp.mantenimientoActivoId
          ? { tipo: 'TALLER' as const, codigoOId: disp.mantenimientoActivoId }
          : undefined,
      }
    );
  }

  const ahora = new Date();
  const ops: unknown[] = [
    db
      .update(reservas)
      .set({
        estado: 'PENDIENTE',
        motivoCancelacion: null,
        canceladoPorId: null,
        canceladoEn: null,
        motivoRechazo: null,
        actualizadoEn: ahora,
      })
      .where(eq(reservas.id, reserva.id)),

    db
      .insert(eventosAlquiler)
      .values({
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        localId: reserva.localId,
        reservaId: reserva.id,
        vehiculoId: reserva.vehiculoId,
        tipoEvento: 'REAPERTURA',
        diasDelta: 0,
        montoDelta: 0,
        modalidadTarifa: 'SIN_COSTO',
        clausulaOTexto: params.motivoReapertura ?? 'Reapertura de reserva',
        actorId: params.usuarioId ?? params.actor?.usuarioId ?? null,
        activo: true,
        creadoEn: ahora,
      }),
  ];

  await ejecutarBatchOSecuencial(db, ops);
  await resolverEstadoActualVehiculo(db, reserva.vehiculoId);

  const reservaAct = await resolverReservaPorIdOCodigo(db, reserva.id);
  return {
    reserva: reservaAct!,
  };
}
