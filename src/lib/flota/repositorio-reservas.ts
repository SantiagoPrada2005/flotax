import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import {
  reservas,
  contratosAlquiler,
  puntosInspeccionR2,
  evaluacionesEntregaCliente,
  vehiculos,
  movimientosCaja,
  cuentasFinancieras,
  depositosGarantia,
  auditoriaFinanciera,
  type ReservaSelect,
  type VehiculoSelect,
  type ContratoAlquilerSelect,
  type EvaluacionEntregaClienteSelect,
  type EstadoReserva,
  type ModalidadEntregaReservaSchema,
  type ModalidadPagoInicial,
  type MetodoAbonoInicial,
  type CategoriaLicenciaConduccion,
} from '@/db/schema';
import { mapD1ToVehiculoItem } from './repositorio';
import { asegurarConfiguracionBaseLocal } from './locales-captacion';
import type {
  ReservaClienteItem,
  EstadoReservaCliente,
  ModalidadEntregaReserva,
  EstadoGarantiaReserva,
  PuntoInspeccionR2,
  EvaluacionEntregaServicio,
  CalificacionServicioNivel,
} from './reservas-cliente';
import { obtenerSpecsBentoPorVehiculo } from './reservas-cliente';
import { resolverEstadoActualVehiculo } from '@/lib/mantenimientos/repositorio';
import { resolverCuentaPorMetodoPago } from '@/lib/caja/calculos';
import { reconciliarSaldosContratoYReservaD1 } from '@/lib/caja/repositorio';
import { eq, desc, and, or } from 'drizzle-orm';
import { ErrorCicloAlquiler } from './errores';

export interface FiltrosListarReservas {
  localId?: string | undefined;
  clienteId?: string | undefined;
  estado?: EstadoReserva | undefined;
}

export interface NuevaReservaInput {
  vehiculoId: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  diasAlquiler: number;
  precioDiaCotizado: number;
  subtotalTarifaCotizado: number;
  coberturaPericialCotizada: number;
  totalCotizado: number;
  modalidadEntrega: ModalidadEntregaReservaSchema;
  direccionEntrega?: string | null | undefined;
  sedeNombre: string;
  modalidadPagoInicial: ModalidadPagoInicial;
  metodoAbonoInicial: MetodoAbonoInicial;
  montoAbonoReportado: number;
  referenciaAbonoInicial?: string | null | undefined;
  contactoNombre: string;
  contactoTipoDocumento: 'CC' | 'CE' | 'PASAPORTE' | 'NIT';
  contactoNumeroDocumento: string;
  contactoCategoriaLicencia: CategoriaLicenciaConduccion;
  contactoTelefono: string;
  contactoCorreo: string;
  ley1581Aceptada: boolean;
}

export interface RegistroEntregaEvaluacionInput {
  codigo: string;
  vehiculoId: string;
  calificacionGeneral: CalificacionServicioNivel;
  puntajeNumerico: 2 | 3 | 4 | 5;
  aspectosDestacados: string[];
  desempenoVehiculo: 'IMPECABLE' | 'OPTIMO' | 'DETALLE_MENOR';
  comentarioOpcional?: string | undefined;
  cabinaSinObjetos: boolean;
  telemetriaVerificada: boolean;
  llavesEntregadas: boolean;
  combustibleNivel?: 'MISMO_NIVEL' | 'CARGA_COMPLETA' | 'RECARGA_PENDIENTE' | undefined;
  clienteId?: string | undefined;
}

export interface RegistroCobroWaybillInput {
  codigo: string;
  monto: number;
  metodoPago: 'efectivo' | 'transferencia' | 'tarjeta';
  usuarioId: string;
  localId?: string | undefined;
  cuentaId?: string | undefined;
}

function mapEstadoReserva(estadoDb: EstadoReserva): EstadoReservaCliente {
  if (estadoDb === 'CANCELADA') return 'CANCELADA';
  return estadoDb;
}

function resolverEstadoGarantia(
  estadoReserva: EstadoReserva,
  garantiaRow?: { estado: string } | null
): EstadoGarantiaReserva {
  if (garantiaRow) {
    if (garantiaRow.estado === 'RECIBIDO_CUSTODIA') return 'CUSTODIA_ACTIVA';
    if (garantiaRow.estado === 'DEVUELTO_TOTAL' || garantiaRow.estado === 'DEVUELTO_PARCIAL')
      return 'LIBERADA';
    if (garantiaRow.estado === 'APLICADO_CARGOS' || garantiaRow.estado === 'EN_REVISION')
      return 'RETENIDA_NOVEDAD';
  }

  if (estadoReserva === 'EN_CURSO') return 'CUSTODIA_ACTIVA';
  if (estadoReserva === 'COMPLETADA') return 'LIBERADA';
  return 'PENDIENTE';
}

export function mapRowToReservaItem(
  reservaRow: ReservaSelect,
  vehiculoRow?: VehiculoSelect | null,
  contratoRow?: ContratoAlquilerSelect | null,
  evaluacionRow?: EvaluacionEntregaClienteSelect | null,
  puntosR2Rows?: PuntoInspeccionR2[],
  garantiaRow?: { estado: string } | null,
  eventosRows?: unknown[]
): ReservaClienteItem {
  const vehiculo = vehiculoRow
    ? mapD1ToVehiculoItem(vehiculoRow)
    : {
        id: reservaRow.vehiculoId,
        localId: reservaRow.localId,
        marca: 'Unidad de Flota',
        modelo: 'Vehículo Reservado',
        anio: 2024,
        categoria: 'SUV' as const,
        categoriaEtiqueta: 'SUV Familiar',
        placa: 'FLX-TMP',
        estado: 'RESERVADO' as const,
        precioDia: reservaRow.precioDiaCotizado,
        depositoGarantia: 500000,
        transmision: 'Automática' as const,
        combustible: 'Gasolina' as const,
        capacidadPasajeros: 5,
        kilometraje: 15000,
        imagenUrl: '/images/vehiculos/mazda-cx30.webp',
        descripcion: 'Unidad de flota asignada a la reserva.',
        aceleracion: '6.2 s',
        velocidadMaxima: '190 km/h',
        rating: 4.8,
        autonomiaOdo: '15.000 km',
        tipoPropulsionIcon: 'gas' as const,
      };

  const estadoVisual = mapEstadoReserva(reservaRow.estado);

  let evaluacionEntrega: EvaluacionEntregaServicio | undefined;
  if (evaluacionRow) {
    evaluacionEntrega = {
      calificacionGeneral: evaluacionRow.calificacionGeneral as CalificacionServicioNivel,
      puntajeNumerico: evaluacionRow.puntajeNumerico as 2 | 3 | 4 | 5,
      aspectosDestacados: (evaluacionRow.aspectosDestacados as string[]) || [],
      desempenoVehiculo: evaluacionRow.desempenoVehiculo as 'IMPECABLE' | 'OPTIMO' | 'DETALLE_MENOR',
      comentarioOpcional: evaluacionRow.comentarioOpcional ?? undefined,
      checklist: {
        cabinaSinObjetos: Boolean(evaluacionRow.cabinaSinObjetos),
        telemetriaVerificada: Boolean(evaluacionRow.telemetriaVerificada),
        llavesEntregadas: Boolean(evaluacionRow.llavesEntregadas),
        combustibleNivel: evaluacionRow.combustibleNivel as
          | 'MISMO_NIVEL'
          | 'CARGA_COMPLETA'
          | 'RECARGA_PENDIENTE',
      },
      completadaEnISO: new Date(evaluacionRow.completadaEn).toISOString(),
    };
  }

  return {
    codigo: reservaRow.codigo,
    vehiculoId: reservaRow.vehiculoId,
    vehiculo,
    fechaInicio: reservaRow.fechaInicio,
    fechaFin: reservaRow.fechaFin,
    diasAlquiler: reservaRow.diasAlquiler,
    totalAlquiler: reservaRow.totalCotizado,
    montoReportado: reservaRow.montoAbonoReportado,
    estado: estadoVisual,
    modalidadEntrega: reservaRow.modalidadEntrega as ModalidadEntregaReserva,
    sedeNombre: reservaRow.sedeNombre,
    creadaEn: new Date(reservaRow.creadoEn).toISOString(),
    specsBento:
      (vehiculoRow?.specsBento as ReturnType<typeof obtenerSpecsBentoPorVehiculo>) ||
      obtenerSpecsBentoPorVehiculo(vehiculo.id),
    conductor: {
      nombreCompleto: reservaRow.contactoNombre,
      tipoDocumento: (reservaRow.contactoTipoDocumento as 'CC' | 'CE' | 'PASAPORTE' | 'NIT' | null) ?? null,
      numeroDocumento: reservaRow.contactoNumeroDocumento ?? null,
      categoriaLicencia: (reservaRow.contactoCategoriaLicencia as 'B1' | 'B2' | 'A2' | 'C1' | null) ?? null,
      telefono: reservaRow.contactoTelefono,
      correo: reservaRow.contactoCorreo ?? null,
      ley1581Aceptada: Boolean(reservaRow.ley1581Aceptada),
    },
    estadoGarantia: resolverEstadoGarantia(reservaRow.estado, garantiaRow),
    kilometrajeEntrega: contratoRow?.medidorUsoEntrega ?? vehiculo.kilometraje,
    kilometrajeRetorno: contratoRow?.medidorUsoRetorno ?? undefined,
    nivelCargaPorcentaje: contratoRow?.nivelEnergiaEntregaPct ?? 100,
    motivoRechazo: reservaRow.motivoRechazo ?? undefined,
    tokenAccesoPublico: reservaRow.tokenAccesoPublico ?? undefined,
    clienteId: reservaRow.clienteId ?? undefined,
    localId: reservaRow.localId ?? undefined,
    eventosRecientes: eventosRows,
    puntosR2Custom: puntosR2Rows,
    evaluacionEntrega,
  };
}

/**
 * Lista las reservas desde Cloudflare D1 aplicando filtros por local, cliente o estado.
 */
export async function listarReservasD1(
  db?: AppDb,
  filtros?: FiltrosListarReservas
): Promise<ReservaClienteItem[]> {
  if (!db) return [];

  try {
    const condiciones = [];

    if (filtros?.localId) {
      condiciones.push(eq(reservas.localId, filtros.localId));
    }
    if (filtros?.clienteId) {
      condiciones.push(eq(reservas.clienteId, filtros.clienteId));
    }
    if (filtros?.estado) {
      condiciones.push(eq(reservas.estado, filtros.estado));
    }

    const rows = await db
      .select({
        reserva: reservas,
        vehiculo: vehiculos,
      })
      .from(reservas)
      .leftJoin(vehiculos, eq(reservas.vehiculoId, vehiculos.id))
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .orderBy(desc(reservas.creadoEn));

    return rows.map((r) => mapRowToReservaItem(r.reserva, r.vehiculo));
  } catch (error) {
    logFalloD1('reservas.listar', error, filtros as Record<string, unknown>);
    return [];
  }
}

/**
 * Obtiene el detalle completo de una reserva por su código único (ej. 'FLX-849210') desde D1.
 */
export async function obtenerReservaPorCodigoD1(
  db?: AppDb,
  codigo?: string
): Promise<ReservaClienteItem | null> {
  if (!db || !codigo) return null;

  const normalizado = codigo.trim().toUpperCase();

  try {
    const rows = await db
      .select({
        reserva: reservas,
        vehiculo: vehiculos,
      })
      .from(reservas)
      .leftJoin(vehiculos, eq(reservas.vehiculoId, vehiculos.id))
      .where(eq(reservas.codigo, normalizado))
      .limit(1);

    const match = rows[0];
    if (!match) return null;

    // Consultar contrato y evaluación vinculados
    const contratoRows = await db
      .select()
      .from(contratosAlquiler)
      .where(eq(contratosAlquiler.reservaId, match.reserva.id))
      .limit(1);

    const evaluacionRows = await db
      .select()
      .from(evaluacionesEntregaCliente)
      .where(eq(evaluacionesEntregaCliente.reservaId, match.reserva.id))
      .limit(1);

    const puntosRows = await db
      .select()
      .from(puntosInspeccionR2)
      .where(eq(puntosInspeccionR2.reservaId, match.reserva.id));

    const puntosR2Custom: PuntoInspeccionR2[] = puntosRows.map((p) => ({
      id: p.id,
      zona: p.zona,
      etiqueta: p.etiqueta,
      dictamen: p.dictamen,
      estado: p.estado as 'ORIGINAL' | 'VERIFICADO' | 'PROTEGIDO' | 'NOVEDAD',
      coordX: p.coordX,
      coordY: p.coordY,
    }));

    const garantiaRows = await db
      .select()
      .from(depositosGarantia)
      .where(
        or(
          eq(depositosGarantia.contratoId, match.reserva.codigo),
          eq(depositosGarantia.contratoId, `CTR-${match.reserva.codigo.replace('FLX-', '')}`)
        )
      )
      .limit(1);

    return mapRowToReservaItem(
      match.reserva,
      match.vehiculo,
      contratoRows[0] ?? null,
      evaluacionRows[0] ?? null,
      puntosR2Custom.length > 0 ? puntosR2Custom : undefined,
      garantiaRows[0] ?? null
    );
  } catch (error) {
    logFalloD1('reservas.obtenerPorCodigo', error, { codigo: normalizado });
    return null;
  }
}

/**
 * Crea una nueva reserva en Cloudflare D1.
 */
export async function crearReservaD1(
  db: AppDb,
  input: NuevaReservaInput,
  localId: string,
  clienteId?: string | null
): Promise<ReservaClienteItem> {
  // Asegurar que el local tenga políticas y cuentas base en D1
  await asegurarConfiguracionBaseLocal(db, localId);

  const ahora = new Date();
  const codigo = `FLX-${Math.floor(100000 + Math.random() * 900000)}`;
  const id = `res-${codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;

  await db.insert(reservas).values({
    id,
    codigo,
    localId,
    vehiculoId: input.vehiculoId,
    clienteId: clienteId || null,
    fechaInicio: input.fechaInicio,
    fechaFin: input.fechaFin,
    diasAlquiler: input.diasAlquiler,
    estado: 'PENDIENTE',
    modalidadEntrega: input.modalidadEntrega,
    direccionEntrega: input.direccionEntrega || null,
    sedeNombre: input.sedeNombre,
    precioDiaCotizado: input.precioDiaCotizado,
    subtotalTarifaCotizado: input.subtotalTarifaCotizado,
    coberturaPericialCotizada: input.coberturaPericialCotizada,
    totalCotizado: input.totalCotizado,
    modalidadPagoInicial: input.modalidadPagoInicial,
    metodoAbonoInicial: input.metodoAbonoInicial,
    montoAbonoReportado: input.montoAbonoReportado,
    referenciaAbonoInicial: input.referenciaAbonoInicial || null,
    contactoNombre: input.contactoNombre,
    contactoTipoDocumento: input.contactoTipoDocumento,
    contactoNumeroDocumento: input.contactoNumeroDocumento,
    contactoCategoriaLicencia: input.contactoCategoriaLicencia,
    contactoTelefono: input.contactoTelefono,
    contactoCorreo: input.contactoCorreo,
    ley1581Aceptada: input.ley1581Aceptada,
    creadoPorId: clienteId || null,
    creadoEn: ahora,
    actualizadoEn: ahora,
  });

  // Sincronizar estado operativo del vehículo en D1 si la reserva entra en vigencia hoy
  await resolverEstadoActualVehiculo(db, input.vehiculoId);

  const creada = await obtenerReservaPorCodigoD1(db, codigo);
  if (!creada) {
    throw new Error(`Fallo al recuperar la reserva #${codigo} tras su inserción en D1`);
  }

  return creada;
}

/**
 * Registra un contrato legal de alquiler en D1 de manera desacoplada de la reserva.
 */
export async function crearContratoAlquilerD1(
  db: AppDb,
  input: typeof contratosAlquiler.$inferInsert
): Promise<typeof contratosAlquiler.$inferSelect> {
  await db.insert(contratosAlquiler).values(input).onConflictDoNothing();
  const rows = await db
    .select()
    .from(contratosAlquiler)
    .where(eq(contratosAlquiler.id, input.id))
    .limit(1);
  return rows[0]!;
}

/**
 * Registra o apertura un depósito de garantía en D1 de manera desacoplada de la reserva.
 */
export async function crearDepositoGarantiaD1(
  db: AppDb,
  input: typeof depositosGarantia.$inferInsert
): Promise<typeof depositosGarantia.$inferSelect> {
  await db.insert(depositosGarantia).values(input).onConflictDoNothing();
  const rows = await db
    .select()
    .from(depositosGarantia)
    .where(eq(depositosGarantia.id, input.id))
    .limit(1);
  return rows[0]!;
}

/**
 * Actualiza el estado operativo de una reserva y sincroniza la flota en D1.
 */
export async function cambiarEstadoReservaD1(
  db: AppDb,
  codigo: string,
  nuevoEstado: EstadoReserva,
  opciones?: {
    motivoRechazo?: string | undefined;
    confirmadoPorId?: string | undefined;
    requiereMantenimiento?: boolean | undefined;
  }
): Promise<boolean> {
  const normalizado = codigo.trim().toUpperCase();

  try {
    const resRows = await db
      .select()
      .from(reservas)
      .where(eq(reservas.codigo, normalizado))
      .limit(1);

    const reserva = resRows[0];
    if (!reserva) return false;

    const ahora = new Date();
    await db
      .update(reservas)
      .set({
        estado: nuevoEstado,
        motivoRechazo: opciones?.motivoRechazo || null,
        confirmadoPorId: opciones?.confirmadoPorId || reserva.confirmadoPorId,
        actualizadoEn: ahora,
      })
      .where(eq(reservas.id, reserva.id));

    // Sincronizar estado operativo del vehículo en D1
    if (nuevoEstado === 'COMPLETADA' && opciones?.requiereMantenimiento) {
      await db
        .update(vehiculos)
        .set({ estado: 'MANTENIMIENTO', actualizadoEn: ahora })
        .where(eq(vehiculos.id, reserva.vehiculoId));
    } else {
      await resolverEstadoActualVehiculo(db, reserva.vehiculoId);
    }

    return true;
  } catch (error) {
    logFalloD1('reservas.cambiarEstado', error, { codigo: normalizado, nuevoEstado });
    return false;
  }
}

/**
 * Registra la entrega/devolución física del vehículo, checklist de cabina y calificación del cliente.
 */
export async function registrarEntregaEvaluacionD1(
  db: AppDb,
  input: RegistroEntregaEvaluacionInput
): Promise<boolean> {
  const normalizado = input.codigo.trim().toUpperCase();

  try {
    const resRows = await db
      .select()
      .from(reservas)
      .where(eq(reservas.codigo, normalizado))
      .limit(1);

    const reserva = resRows[0];
    if (!reserva) return false;

    const ahora = new Date();
    const evalId = `eval-${normalizado.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;

    await db
      .insert(evaluacionesEntregaCliente)
      .values({
        id: evalId,
        reservaId: reserva.id,
        localId: reserva.localId,
        vehiculoId: reserva.vehiculoId,
        clienteId: input.clienteId || reserva.clienteId,
        calificacionGeneral: input.calificacionGeneral,
        puntajeNumerico: input.puntajeNumerico,
        aspectosDestacados: input.aspectosDestacados,
        desempenoVehiculo: input.desempenoVehiculo,
        comentarioOpcional: input.comentarioOpcional || null,
        cabinaSinObjetos: input.cabinaSinObjetos,
        telemetriaVerificada: input.telemetriaVerificada,
        llavesEntregadas: input.llavesEntregadas,
        combustibleNivel: input.combustibleNivel || 'MISMO_NIVEL',
        completadaEn: ahora,
      })
      .onConflictDoUpdate({
        target: evaluacionesEntregaCliente.reservaId,
        set: {
          calificacionGeneral: input.calificacionGeneral,
          puntajeNumerico: input.puntajeNumerico,
          aspectosDestacados: input.aspectosDestacados,
          desempenoVehiculo: input.desempenoVehiculo,
          comentarioOpcional: input.comentarioOpcional || null,
          cabinaSinObjetos: input.cabinaSinObjetos,
          telemetriaVerificada: input.telemetriaVerificada,
          llavesEntregadas: input.llavesEntregadas,
          combustibleNivel: input.combustibleNivel || 'MISMO_NIVEL',
          completadaEn: ahora,
        },
      });

    const requiereMantenimiento =
      input.calificacionGeneral === 'ATENCION_REQUERIDA' ||
      input.desempenoVehiculo === 'DETALLE_MENOR';

    await cambiarEstadoReservaD1(db, normalizado, 'COMPLETADA', {
      requiereMantenimiento,
    });

    return true;
  } catch (error) {
    logFalloD1('reservas.entregaEvaluacion', error, { codigo: normalizado });
    return false;
  }
}

/**
 * Asienta un cobro en el Waybill registrándolo en caja y actualizando el contrato si existe.
 */
export async function registrarCobroWaybillD1(
  db: AppDb,
  input: RegistroCobroWaybillInput
): Promise<boolean> {
  const normalizado = input.codigo.trim().toUpperCase();

  try {
    const resRows = await db
      .select()
      .from(reservas)
      .where(eq(reservas.codigo, normalizado))
      .limit(1);

    const reserva = resRows[0];
    if (!reserva) {
      throw new ErrorCicloAlquiler(
        'NOT_FOUND',
        `Reserva #${normalizado} no encontrada para registrar cobro.`
      );
    }

    if (input.localId && reserva.localId !== input.localId) {
      throw new ErrorCicloAlquiler(
        'FORBIDDEN',
        `La reserva #${normalizado} no pertenece al local activo (${input.localId}).`
      );
    }

    // Buscar cuenta de recaudo del local con aseguramiento preventivo
    let ctas = await db
      .select()
      .from(cuentasFinancieras)
      .where(and(eq(cuentasFinancieras.localId, reserva.localId), eq(cuentasFinancieras.activo, true)))
      .limit(10);

    if (ctas.length === 0) {
      await asegurarConfiguracionBaseLocal(db, reserva.localId);
      ctas = await db
        .select()
        .from(cuentasFinancieras)
        .where(and(eq(cuentasFinancieras.localId, reserva.localId), eq(cuentasFinancieras.activo, true)))
        .limit(10);
    }

    const cta = resolverCuentaPorMetodoPago(ctas, input.metodoPago, input.cuentaId);

    if (input.cuentaId && (!cta || cta.id !== input.cuentaId)) {
      throw new ErrorCicloAlquiler(
        'BAD_REQUEST',
        `La cuenta financiera seleccionada (${input.cuentaId}) no existe o no está activa para este local.`
      );
    }

    const cuentaId = cta?.id ?? ctas[0]?.id;
    if (!cuentaId) {
      throw new ErrorCicloAlquiler(
        'CONFLICT',
        `No se encontró una cuenta financiera activa disponible en el local #${reserva.localId}.`
      );
    }

    const ahora = new Date();
    const movId = `mov-waybill-${normalizado.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;

    await db.insert(movimientosCaja).values({
      id: movId,
      localId: reserva.localId,
      tipo: 'INGRESO',
      categoria: 'PAGO_ALQUILER',
      concepto: `Cobro liquidación Waybill #${normalizado}`,
      monto: input.monto,
      metodoPago: input.metodoPago,
      cuentaId,
      contratoId: normalizado,
      clienteId: reserva.clienteId,
      clienteNombre: reserva.contactoNombre,
      vehiculoId: reserva.vehiculoId,
      referencia: `WB-${normalizado}`,
      estado: 'CONFIRMADO',
      creadoPorId: input.usuarioId,
      fechaMovimiento: ahora,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });

    // Auditoría financiera del movimiento
    await db.insert(auditoriaFinanciera).values({
      id: `aud-wb-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`,
      localId: reserva.localId,
      entidad: 'MOVIMIENTO',
      entidadId: movId,
      accion: 'CREAR',
      montoNuevo: input.monto,
      motivo: `Cobro Waybill #${normalizado}`,
      usuarioId: input.usuarioId,
      detallesJson: JSON.stringify({
        metodoPago: input.metodoPago,
        cuentaId,
        codigoReserva: normalizado,
      }),
      creadoEn: ahora,
    });

    // Reconciliar saldos de contrato y abono reportado en reserva
    await reconciliarSaldosContratoYReservaD1(
      db,
      reserva.localId,
      normalizado,
      reserva.id,
      input.usuarioId
    );

    return true;
  } catch (error) {
    if (error instanceof ErrorCicloAlquiler) {
      throw error;
    }
    logFalloD1('reservas.cobroWaybill', error, { codigo: normalizado, monto: input.monto });
    return false;
  }
}
