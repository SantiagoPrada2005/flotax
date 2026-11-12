import type { AppDb } from '@/lib/db';
import {
  reservas,
  contratosAlquiler,
  depositosGarantia,
  eventosAlquiler,
  inspeccionesPericiales,
  puntosInspeccionR2,
  vehiculos,
  politicasLocal,
  cuentasFinancieras,
  movimientosCaja,
  verificacionesIdentidad,
  clientesLocal,
  type ReservaSelect,
  type VehiculoSelect,
  type ModalidadEntregaReservaSchema,
  type ModalidadPagoInicial,
  type MetodoAbonoInicial,
  type CategoriaLicenciaConduccion,
  type MetodoPagoFinanciero,
  type EstadoPuntoInspeccionR2,
  type GravedadNovedadInspeccion,
  type EstadoGeneralInspeccion,
  type TipoActoInspeccion,
} from '@/db/schema';
import {
  mapRowToReservaItem,
  obtenerReservaPorCodigoD1,
} from './repositorio-reservas';
import type { ReservaClienteItem } from './reservas-cliente';
import {
  calcularDiasInclusivos,
  verificarDisponibilidadVehiculo,
  obtenerEstadoDocumentalVehiculoD1,
} from './disponibilidad';
import { resolverEstadoActualVehiculo } from '@/lib/mantenimientos/repositorio';
import { resolverCuentaPorMetodoPago } from '@/lib/caja/calculos';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
import type { RolUsuario, RolSistema } from '@/lib/auth/rbac';

export type ErrorCicloAlquilerCode =
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INTERNAL_SERVER_ERROR';

export class ErrorCicloAlquiler extends Error {
  readonly code: ErrorCicloAlquilerCode;
  readonly detalle?: Record<string, unknown> | undefined;

  constructor(
    code: ErrorCicloAlquilerCode,
    mensaje: string,
    detalle?: Record<string, unknown>
  ) {
    super(mensaje);
    this.name = 'ErrorCicloAlquiler';
    this.code = code;
    this.detalle = detalle;
  }
}

export interface AdvertenciaDocumentalCiclo {
  cliente: {
    faltaDocumentoIdentidad: boolean;
    faltaLicencia: boolean;
    licenciaIncompatible: boolean;
    sinKycAprobado: boolean;
    detalles: string[];
  };
  vehiculo: {
    soatVencido: boolean;
    rtmVencida: boolean;
    faltantesSinCarga: Array<'SOAT' | 'TECNICO_MECANICA'>;
    detalles: string[];
  };
  requiereAutorizacion: boolean;
}

export interface CrearReservaCicloInput {
  vehiculoId: string;
  localId?: string | undefined;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
  modalidadEntrega?: ModalidadEntregaReservaSchema | undefined;
  direccionEntrega?: string | null | undefined;
  sedeNombre?: string | undefined;
  modalidadPagoInicial?: ModalidadPagoInicial | undefined;
  metodoAbonoInicial?: MetodoAbonoInicial | undefined;
  montoAbonoReportado?: number | undefined;
  referenciaAbonoInicial?: string | null | undefined;
  contactoNombre: string;
  contactoTipoDocumento?: 'CC' | 'CE' | 'PASAPORTE' | 'NIT' | null | undefined;
  contactoNumeroDocumento?: string | null | undefined;
  contactoCategoriaLicencia?: CategoriaLicenciaConduccion | null | undefined;
  contactoTelefono: string;
  contactoCorreo?: string | null | undefined;
  ley1581Aceptada?: boolean | undefined;
  clienteId?: string | null | undefined;
  estadoInicial?: 'PENDIENTE' | 'CONFIRMADA' | undefined;
  precioDiaCotizado?: number | undefined;
  totalCotizado?: number | undefined;
  pagoConfirmadoInmediato?: {
    monto: number;
    metodoPago: MetodoPagoFinanciero;
    cuentaId?: string | undefined;
    referencia?: string | undefined;
  } | undefined;
}

export interface ContextoActorCiclo {
  usuarioId?: string | null | undefined;
  rol?: RolUsuario | RolSistema | undefined;
  localId?: string | null | undefined;
  origen?: 'CLIENTE_WEB' | 'MOSTRADOR_ADMIN' | 'WEB' | 'MOSTRADOR' | undefined;
}

export interface ConfirmarReservaParams {
  reservaId?: string | undefined;
  codigo?: string | undefined;
  localId?: string | undefined;
  usuarioId: string;
  autorizarSinDocumentos?: boolean | undefined;
  notaAutorizacion?: string | undefined;
}

export type ResultadoConfirmacion =
  | {
      requiereAutorizacionSinDocs: true;
      advertencias: AdvertenciaDocumentalCiclo;
    }
  | {
      requiereAutorizacionSinDocs: false;
      reserva: ReservaClienteItem;
      contratoId: string;
    };

export interface GuardarInspeccionR2Params {
  reservaId: string;
  localId?: string | undefined;
  inspectorId: string;
  tipoActo: TipoActoInspeccion;
  medidorUso: number;
  nivelEnergiaPct: number;
  estadoGeneral?: EstadoGeneralInspeccion | undefined;
  observaciones?: string | undefined;
  puntosR2?: Array<{
    id?: string | undefined;
    zona: string;
    etiqueta: string;
    dictamen: string;
    estado: EstadoPuntoInspeccionR2;
    gravedad?: GravedadNovedadInspeccion | undefined;
    coordX?: string | undefined;
    coordY?: string | undefined;
    costoEstimado?: number | undefined;
    generaCargoCliente?: boolean | undefined;
  }> | undefined;
}

export interface EntregarVehiculoParams {
  reservaId?: string | undefined;
  codigo?: string | undefined;
  localId?: string | undefined;
  usuarioId: string;
  medidorUsoEntrega: number;
  nivelEnergiaEntregaPct?: number | undefined;
  firmaArrendadorR2Key?: string | undefined;
  firmaArrendatarioR2Key?: string | undefined;
  recibirGarantiaAhora?: {
    monto: number;
    metodoPago: MetodoPagoFinanciero;
    cuentaId?: string | undefined;
    referencia?: string | undefined;
  } | undefined;
  autorizarSinDocumentos?: boolean | undefined;
  notaAutorizacion?: string | undefined;
}

export interface DocsClienteRapidoParams {
  usuarioId: string;
  tipoDocumento: 'CC' | 'CE' | 'PASAPORTE' | 'NIT';
  numeroDocumento: string;
  licenciaNumero?: string | undefined;
  licenciaCategoria?: string | undefined;
  licenciaVencimiento?: string | undefined;
  documentoFrenteKey?: string | undefined;
  documentoDorsoKey?: string | undefined;
  licenciaFrenteKey?: string | undefined;
  licenciaDorsoKey?: string | undefined;
  aprobarInmediato?: boolean | undefined;
  operadorId?: string | undefined;
}

function generarTokenAccesoPublico(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function generarCodigoReserva(): string {
  return `FLX-${Math.floor(100000 + Math.random() * 900000)}`;
}

function esCategoriaLicenciaCompatible(
  categoriaLicencia?: string | null,
  categoriaVehiculo?: string | null
): boolean {
  if (!categoriaVehiculo) return true;
  const catVeh = categoriaVehiculo.toUpperCase();
  if (catVeh === 'PATINETA') return true;

  if (!categoriaLicencia) return false;
  const catLic = categoriaLicencia.toUpperCase();

  if (catVeh === 'MOTO') {
    return catLic === 'A1' || catLic === 'A2';
  }

  // Automotores de 4 ruedas o utilitarios
  return catLic === 'B1' || catLic === 'B2' || catLic === 'C1' || catLic === 'C2' || catLic === 'C3';
}

function construirAdvertenciasDocumentales(
  cliente: {
    contactoTipoDocumento?: string | null | undefined;
    contactoNumeroDocumento?: string | null | undefined;
    contactoCategoriaLicencia?: string | null | undefined;
  },
  vehiculoDocsVencidos: Array<{ tipo: string; fechaVencimiento: string }> = [],
  faltantesSinCarga: Array<'SOAT' | 'TECNICO_MECANICA'> = [],
  categoriaVehiculo?: string | null,
  kycEstado?: string | null
): AdvertenciaDocumentalCiclo {
  const faltaDocumentoIdentidad =
    !cliente.contactoNumeroDocumento || !cliente.contactoTipoDocumento;
  const faltaLicencia =
    categoriaVehiculo?.toUpperCase() !== 'PATINETA' && !cliente.contactoCategoriaLicencia;
  const licenciaIncompatible =
    Boolean(cliente.contactoCategoriaLicencia) &&
    !esCategoriaLicenciaCompatible(cliente.contactoCategoriaLicencia, categoriaVehiculo);
  const sinKycAprobado = kycEstado !== 'APROBADO';

  const detallesCliente: string[] = [];
  if (faltaDocumentoIdentidad) detallesCliente.push('Falta documento de identidad del conductor');
  if (faltaLicencia) detallesCliente.push('Falta categoría de licencia de conducción');
  if (licenciaIncompatible) detallesCliente.push('Categoría de licencia incompatible con el vehículo');
  if (sinKycAprobado) detallesCliente.push('Cliente sin validación KYC aprobada');

  const soatVencido = vehiculoDocsVencidos.some((d) => d.tipo === 'SOAT');
  const rtmVencida = vehiculoDocsVencidos.some((d) => d.tipo === 'TECNICO_MECANICA');
  const detallesVehiculo: string[] = [];
  if (soatVencido) detallesVehiculo.push('SOAT vencido o inactivo');
  if (rtmVencida) detallesVehiculo.push('Revisión técnico-mecánica vencida');
  for (const f of faltantesSinCarga) {
    detallesVehiculo.push(`Documento pendiente de carga: ${f}`);
  }

  const requiereAutorizacion =
    faltaDocumentoIdentidad || faltaLicencia || licenciaIncompatible || sinKycAprobado;

  return {
    cliente: {
      faltaDocumentoIdentidad,
      faltaLicencia,
      licenciaIncompatible,
      sinKycAprobado,
      detalles: detallesCliente,
    },
    vehiculo: {
      soatVencido,
      rtmVencida,
      faltantesSinCarga,
      detalles: detallesVehiculo,
    },
    requiereAutorizacion,
  };
}

async function ejecutarBatchOSecuencial(db: AppDb, ops: unknown[]): Promise<void> {
  const maybeBatch = (db as { batch?: (queries: unknown[]) => Promise<unknown> }).batch;
  if (typeof maybeBatch === 'function') {
    await maybeBatch(ops);
  } else {
    for (const op of ops) {
      if (op && typeof (op as Promise<unknown>).then === 'function') {
        await (op as Promise<unknown>);
      }
    }
  }
}

/**
 * 1. crearReservaConValidaciones
 * Recalcula estrictamente tarifas y coberturas en servidor, valida disponibilidad física
 * y documental del vehículo, genera token de acceso para invitados sin sesión y permite
 * crear reservas directas en mostrador.
 */
export async function crearReservaConValidaciones(
  db: AppDb,
  input: CrearReservaCicloInput,
  contexto: ContextoActorCiclo
): Promise<{
  reserva: ReservaClienteItem;
  tokenAccesoPublico: string | null;
  advertenciasDocumentales: AdvertenciaDocumentalCiclo;
}> {
  if (!input.fechaInicio || !input.fechaFin) {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      'Las fechas de inicio y fin del alquiler son obligatorias'
    );
  }

  if (input.fechaInicio > input.fechaFin) {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      'La fecha de inicio debe ser anterior o igual a la fecha de fin'
    );
  }

  // 1. Consultar vehículo
  const vehRows = await db
    .select()
    .from(vehiculos)
    .where(eq(vehiculos.id, input.vehiculoId))
    .limit(1);

  const vehiculo = vehRows[0];
  if (!vehiculo) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Vehículo no encontrado');
  }

  if (!vehiculo.activo || vehiculo.estado === 'FUERA_SERVICIO') {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      'El vehículo seleccionado no se encuentra operativo ni disponible para reserva'
    );
  }

  const localIdCandidate = input.localId ?? vehiculo.localId;
  if (!localIdCandidate) {
    throw new ErrorCicloAlquiler(
      'BAD_REQUEST',
      'El local de la reserva es obligatorio y no pudo determinarse desde el vehículo'
    );
  }
  const localId: string = localIdCandidate;
  if (input.localId && vehiculo.localId && vehiculo.localId !== input.localId) {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      'El vehículo no pertenece al local de operación seleccionado'
    );
  }

  // 2. Validar disponibilidad vehicular
  const disp = await verificarDisponibilidadVehiculo(
    db,
    input.vehiculoId,
    input.fechaInicio,
    input.fechaFin
  );

  if (!disp.disponible && disp.ocupado) {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      disp.etiqueta || 'El vehículo no se encuentra disponible en las fechas solicitadas'
    );
  }

  // 3. Validar documentación del vehículo
  const estadoDocVeh = await obtenerEstadoDocumentalVehiculoD1(
    db,
    input.vehiculoId,
    vehiculo.categoria,
    input.fechaInicio
  );

  const esFlujoWeb = contexto.origen === 'CLIENTE_WEB' || contexto.origen === 'WEB';

  if (esFlujoWeb && estadoDocVeh.tieneVencidos) {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      'El vehículo presenta documentación legal vencida (SOAT / RTM)'
    );
  }

  // 4. Recalcular precios estrictamente contra D1
  const diasAlquiler = calcularDiasInclusivos(input.fechaInicio, input.fechaFin);
  const precioDia = vehiculo.precioDia;
  const subtotalTarifaCotizado = diasAlquiler * precioDia;

  let coberturaPct = 8;
  const polRows = await db
    .select()
    .from(politicasLocal)
    .where(eq(politicasLocal.localId, localId))
    .limit(1);
  if (polRows[0]?.coberturaPericialPct != null) {
    coberturaPct = polRows[0].coberturaPericialPct;
  }

  const coberturaPericialCotizada = Math.round(
    subtotalTarifaCotizado * (coberturaPct / 100)
  );
  const totalCotizado = subtotalTarifaCotizado + coberturaPericialCotizada;

  // 5. Determinar identidad, token y estado inicial
  let tokenAccesoPublico: string | null = null;
  let estadoInicial: 'PENDIENTE' | 'CONFIRMADA' = 'PENDIENTE';
  let clienteId: string | null = null;
  const creadoPorId: string | null = contexto.usuarioId ?? null;

  if (esFlujoWeb) {
    tokenAccesoPublico = generarTokenAccesoPublico();
    estadoInicial = 'PENDIENTE';
    clienteId = contexto.usuarioId ?? null;
  } else {
    // Mostrador admin: no asignar clienteId al empleado operador
    tokenAccesoPublico = null;
    estadoInicial = input.estadoInicial === 'CONFIRMADA' ? 'CONFIRMADA' : 'PENDIENTE';
    clienteId = input.clienteId ?? null;
  }

  // 6. Evaluar advertencias documentales
  let kycEstado: string | null = null;
  if (clienteId) {
    const kycRows = await db
      .select({ estado: verificacionesIdentidad.estado })
      .from(verificacionesIdentidad)
      .where(eq(verificacionesIdentidad.usuarioId, clienteId))
      .limit(1);
    kycEstado = kycRows[0]?.estado ?? null;
  }

  const advertencias = construirAdvertenciasDocumentales(
    {
      contactoTipoDocumento: input.contactoTipoDocumento,
      contactoNumeroDocumento: input.contactoNumeroDocumento,
      contactoCategoriaLicencia: input.contactoCategoriaLicencia,
    },
    estadoDocVeh.vencidos,
    estadoDocVeh.faltantesSinCarga,
    vehiculo.categoria,
    kycEstado
  );

  const ahora = new Date();
  const codigo = generarCodigoReserva();
  const reservaId = `res-${codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;
  const contratoId = `ctr-${codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;
  const numeroContrato = `CTR-${codigo.replace('FLX-', '')}`;
  const depositoId = `dep-${codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;

  const ops: unknown[] = [];

  const montoAbonoInicial =
    input.pagoConfirmadoInmediato?.monto ?? input.montoAbonoReportado ?? 0;

  // Inserción de la reserva
  ops.push(
    db.insert(reservas).values({
      id: reservaId,
      codigo,
      localId,
      vehiculoId: input.vehiculoId,
      clienteId,
      fechaInicio: input.fechaInicio,
      fechaFin: input.fechaFin,
      fechaFinOriginal: input.fechaFin,
      diasAlquiler,
      estado: estadoInicial,
      modalidadEntrega: input.modalidadEntrega ?? 'PATIO_PRINCIPAL',
      direccionEntrega: input.direccionEntrega ?? null,
      sedeNombre: input.sedeNombre ?? 'Patio Central',
      tokenAccesoPublico,
      precioDiaCotizado: precioDia,
      subtotalTarifaCotizado,
      coberturaPericialCotizada,
      totalCotizado,
      modalidadPagoInicial: input.modalidadPagoInicial ?? 'ABONO_30',
      metodoAbonoInicial: input.metodoAbonoInicial ?? 'TRANSFERENCIA_PSE',
      montoAbonoReportado: montoAbonoInicial,
      referenciaAbonoInicial: input.referenciaAbonoInicial ?? null,
      contactoNombre: input.contactoNombre,
      contactoTipoDocumento: input.contactoTipoDocumento ?? null,
      contactoNumeroDocumento: input.contactoNumeroDocumento ?? null,
      contactoCategoriaLicencia: input.contactoCategoriaLicencia ?? null,
      contactoTelefono: input.contactoTelefono,
      contactoCorreo: input.contactoCorreo ?? null,
      ley1581Aceptada: input.ley1581Aceptada ?? true,
      creadoPorId,
      confirmadoPorId: estadoInicial === 'CONFIRMADA' ? creadoPorId : null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    })
  );

  // Si entra como CONFIRMADA directa, crear contrato BORRADOR y depósito PENDIENTE_RECIBIR
  if (estadoInicial === 'CONFIRMADA') {
    const saldoPendiente = Math.max(0, totalCotizado - montoAbonoInicial);
    const estadoPago =
      montoAbonoInicial >= totalCotizado
        ? 'PAGADO'
        : montoAbonoInicial > 0
          ? 'PARCIAL'
          : 'PENDIENTE';

    ops.push(
      db
        .insert(contratosAlquiler)
        .values({
          id: contratoId,
          numeroContrato,
          reservaId,
          localId,
          vehiculoId: input.vehiculoId,
          clienteId,
          arrendatarioNombre: input.contactoNombre,
          arrendatarioTelefono: input.contactoTelefono,
          arrendatarioCorreo: input.contactoCorreo ?? null,
          arrendatarioTipoDocumento: input.contactoTipoDocumento ?? null,
          arrendatarioNumeroDocumento: input.contactoNumeroDocumento ?? null,
          arrendatarioLicenciaCategoria: input.contactoCategoriaLicencia ?? null,
          fechaHoraDevolucionPactada: new Date(`${input.fechaFin}T20:00:00Z`),
          medidorUsoEntrega: vehiculo.kilometraje ?? 0,
          canonDiarioPactado: precioDia,
          subtotalCanon: subtotalTarifaCotizado,
          coberturaPericial: coberturaPericialCotizada,
          totalLiquidado: totalCotizado,
          totalPagado: montoAbonoInicial,
          saldoPendiente,
          estadoPago,
          estadoContrato: 'BORRADOR',
          creadoEn: ahora,
          actualizadoEn: ahora,
        })
        .onConflictDoNothing()
    );

    ops.push(
      db
        .insert(depositosGarantia)
        .values({
          id: depositoId,
          localId,
          contratoId: numeroContrato,
          clienteId,
          clienteNombre: input.contactoNombre,
          vehiculoId: input.vehiculoId,
          montoEsperado: vehiculo.depositoGarantia ?? 500_000,
          montoRecibido: 0,
          montoRetenido: 0,
          montoDevuelto: 0,
          saldoComprometido: 0,
          estado: 'PENDIENTE_RECIBIR',
          creadoEn: ahora,
          actualizadoEn: ahora,
        })
        .onConflictDoNothing()
    );

    if (input.pagoConfirmadoInmediato && input.pagoConfirmadoInmediato.monto > 0) {
      const { monto, metodoPago, referencia } = input.pagoConfirmadoInmediato;
      const ctas = await db
        .select()
        .from(cuentasFinancieras)
        .where(
          and(
            eq(cuentasFinancieras.localId, localId),
            eq(cuentasFinancieras.activo, true)
          )
        )
        .limit(10);

      const cta = resolverCuentaPorMetodoPago(
        ctas,
        metodoPago,
        input.pagoConfirmadoInmediato.cuentaId
      );
      const cuentaId = cta?.id ?? ctas[0]?.id;

      if (cuentaId) {
        const actorCajaId = creadoPorId ?? 'usr-mostrador-sistema';
        ops.push(
          db.insert(movimientosCaja).values({
            id: `mov-${codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`,
            localId,
            tipo: 'INGRESO',
            categoria: 'PAGO_ALQUILER',
            concepto: `Cobro inicial Waybill #${codigo}`,
            monto,
            metodoPago,
            cuentaId,
            contratoId: numeroContrato,
            clienteId,
            clienteNombre: input.contactoNombre,
            vehiculoId: input.vehiculoId,
            referencia: referencia ?? `WB-${codigo}`,
            estado: 'CONFIRMADO',
            creadoPorId: actorCajaId,
            fechaMovimiento: ahora,
            creadoEn: ahora,
            actualizadoEn: ahora,
          })
        );
      }
    }
  }

  await ejecutarBatchOSecuencial(db, ops);
  await resolverEstadoActualVehiculo(db, input.vehiculoId);

  const reservaRecuperada = await obtenerReservaPorCodigoD1(db, codigo);
  const reservaItem: ReservaClienteItem =
    reservaRecuperada ??
    mapRowToReservaItem({
      id: reservaId,
      codigo,
      localId,
      vehiculoId: input.vehiculoId,
      clienteId,
      fechaInicio: input.fechaInicio,
      fechaFin: input.fechaFin,
      fechaFinOriginal: input.fechaFin,
      fechaDevolucionReal: null,
      diasAlquiler,
      estado: estadoInicial,
      modalidadEntrega: input.modalidadEntrega ?? 'PATIO_PRINCIPAL',
      direccionEntrega: input.direccionEntrega ?? null,
      sedeNombre: input.sedeNombre ?? 'Patio Central',
      tokenAccesoPublico,
      precioDiaCotizado: precioDia,
      subtotalTarifaCotizado,
      coberturaPericialCotizada,
      totalCotizado,
      modalidadPagoInicial: input.modalidadPagoInicial ?? 'ABONO_30',
      metodoAbonoInicial: input.metodoAbonoInicial ?? 'TRANSFERENCIA_PSE',
      montoAbonoReportado: montoAbonoInicial,
      referenciaAbonoInicial: input.referenciaAbonoInicial ?? null,
      contactoNombre: input.contactoNombre,
      contactoTipoDocumento: input.contactoTipoDocumento ?? null,
      contactoNumeroDocumento: input.contactoNumeroDocumento ?? null,
      contactoCategoriaLicencia: input.contactoCategoriaLicencia ?? null,
      contactoTelefono: input.contactoTelefono,
      contactoCorreo: input.contactoCorreo ?? null,
      ley1581Aceptada: input.ley1581Aceptada ?? true,
      autorizadoSinDocumentosPorId: null,
      notaAutorizacionDocumentos: null,
      motivoCancelacion: null,
      canceladoPorId: null,
      canceladoEn: null,
      motivoRechazo: null,
      creadoPorId,
      confirmadoPorId: estadoInicial === 'CONFIRMADA' ? creadoPorId : null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    } as unknown as ReservaSelect, vehiculo as unknown as VehiculoSelect);

  return {
    reserva: reservaItem,
    tokenAccesoPublico,
    advertenciasDocumentales: advertencias,
  };
}

/**
 * 2. vincularReservasHuerfanasPorCorreoD1
 * Normaliza el correo electrónico y actualiza todas las reservas y contratos huérfanos
 * (clienteId IS NULL) asociándolos al nuevo usuario verificado por Better Auth OTP.
 */
export async function vincularReservasHuerfanasPorCorreoD1(
  db: AppDb,
  userId: string,
  correo: string
): Promise<number> {
  const emailNorm = correo?.trim().toLowerCase();
  if (!emailNorm || !userId) return 0;

  const rows = await db
    .select({
      id: reservas.id,
      codigo: reservas.codigo,
      localId: reservas.localId,
    })
    .from(reservas)
    .where(
      and(
        isNull(reservas.clienteId),
        sql`LOWER(TRIM(${reservas.contactoCorreo})) = ${emailNorm}`
      )
    );

  if (rows.length === 0) return 0;

  const ahora = new Date();
  const ops: unknown[] = [];

  for (const r of rows) {
    ops.push(
      db
        .update(reservas)
        .set({ clienteId: userId, actualizadoEn: ahora })
        .where(eq(reservas.id, r.id))
    );

    ops.push(
      db
        .update(contratosAlquiler)
        .set({ clienteId: userId, actualizadoEn: ahora })
        .where(
          and(
            eq(contratosAlquiler.reservaId, r.id),
            isNull(contratosAlquiler.clienteId)
          )
        )
    );

    ops.push(
      db
        .update(depositosGarantia)
        .set({ clienteId: userId })
        .where(
          and(
            or(
              eq(depositosGarantia.contratoId, r.codigo),
              eq(depositosGarantia.contratoId, `CTR-${r.codigo.replace('FLX-', '')}`)
            ),
            isNull(depositosGarantia.clienteId)
          )
        )
    );

    ops.push(
      db
        .insert(clientesLocal)
        .values({
          id: `cl-${r.localId}-${userId}`,
          usuarioId: userId,
          localId: r.localId,
          esLocalOrigen: false,
          esPreferido: false,
          creadoEn: ahora,
        })
        .onConflictDoNothing()
    );
  }

  await ejecutarBatchOSecuencial(db, ops);
  return rows.length;
}

/**
 * 3. confirmarReservaD1 (PENDIENTE -> CONFIRMADA)
 * Exige validación o autorización explícita sin documentos, crea contrato BORRADOR
 * y apertura depósito PENDIENTE_RECIBIR sin entregar físicamente la unidad.
 */
export async function confirmarReservaD1(
  db: AppDb,
  params: ConfirmarReservaParams
): Promise<ResultadoConfirmacion> {
  const normalizado = params.codigo?.trim().toUpperCase();

  let cond = normalizado ? eq(reservas.codigo, normalizado) : undefined;
  if (params.reservaId) {
    cond = eq(reservas.id, params.reservaId);
  }
  if (!cond) {
    throw new ErrorCicloAlquiler('BAD_REQUEST', 'Debe indicar codigo o reservaId');
  }

  const resRows = await db.select().from(reservas).where(cond).limit(1);
  const rawRes = resRows[0];
  const reserva = (rawRes && typeof rawRes === 'object' && 'reserva' in rawRes)
    ? (rawRes as { reserva: typeof reservas.$inferSelect }).reserva
    : (rawRes as typeof reservas.$inferSelect | undefined);

  if (!reserva) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Reserva no encontrada');
  }

  if (params.localId && reserva.localId !== params.localId) {
    throw new ErrorCicloAlquiler('FORBIDDEN', 'No tiene permisos sobre este local');
  }

  if (reserva.estado !== 'PENDIENTE') {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      `La reserva se encuentra en estado ${reserva.estado} y no puede ser confirmada`
    );
  }

  const vehRows = await db
    .select()
    .from(vehiculos)
    .where(eq(vehiculos.id, reserva.vehiculoId))
    .limit(1);
  const vehiculo = vehRows[0];
  if (!vehiculo) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Vehículo no encontrado');
  }

  const disp = await verificarDisponibilidadVehiculo(
    db,
    reserva.vehiculoId,
    reserva.fechaInicio,
    reserva.fechaFin,
    undefined,
    reserva.id
  );
  if (!disp.disponible && disp.ocupado) {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      disp.etiqueta || 'El vehículo no está disponible para estas fechas'
    );
  }

  let kycEstado: string | null = null;
  if (reserva.clienteId) {
    const kycRows = await db
      .select({ estado: verificacionesIdentidad.estado })
      .from(verificacionesIdentidad)
      .where(eq(verificacionesIdentidad.usuarioId, reserva.clienteId))
      .limit(1);
    kycEstado = kycRows[0]?.estado ?? null;
  }

  const advertencias = construirAdvertenciasDocumentales(
    {
      contactoTipoDocumento: reserva.contactoTipoDocumento,
      contactoNumeroDocumento: reserva.contactoNumeroDocumento,
      contactoCategoriaLicencia: reserva.contactoCategoriaLicencia,
    },
    [],
    [],
    vehiculo.categoria,
    kycEstado
  );

  if (advertencias.requiereAutorizacion && !params.autorizarSinDocumentos) {
    return {
      requiereAutorizacionSinDocs: true,
      advertencias,
    };
  }

  const ahora = new Date();
  const contratoId = `ctr-${reserva.codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;
  const numeroContrato = `CTR-${reserva.codigo.replace('FLX-', '')}`;
  const depositoId = `dep-${reserva.codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;

  const ops: unknown[] = [];

  ops.push(
    db
      .update(reservas)
      .set({
        estado: 'CONFIRMADA',
        confirmadoPorId: params.usuarioId,
        autorizadoSinDocumentosPorId: params.autorizarSinDocumentos
          ? params.usuarioId
          : null,
        notaAutorizacionDocumentos: params.notaAutorizacion ?? null,
        actualizadoEn: ahora,
      })
      .where(eq(reservas.id, reserva.id))
  );

  const totalCotizado = reserva.totalCotizado;
  const montoAbonado = reserva.montoAbonoReportado ?? 0;
  const saldoPendiente = Math.max(0, totalCotizado - montoAbonado);
  const estadoPago =
    montoAbonado >= totalCotizado ? 'PAGADO' : montoAbonado > 0 ? 'PARCIAL' : 'PENDIENTE';

  ops.push(
    db
      .insert(contratosAlquiler)
      .values({
        id: contratoId,
        numeroContrato,
        reservaId: reserva.id,
        localId: reserva.localId,
        vehiculoId: reserva.vehiculoId,
        clienteId: reserva.clienteId,
        arrendatarioNombre: reserva.contactoNombre,
        arrendatarioTelefono: reserva.contactoTelefono,
        arrendatarioCorreo: reserva.contactoCorreo ?? null,
        arrendatarioTipoDocumento: reserva.contactoTipoDocumento ?? null,
        arrendatarioNumeroDocumento: reserva.contactoNumeroDocumento ?? null,
        arrendatarioLicenciaCategoria: reserva.contactoCategoriaLicencia ?? null,
        autorizadoSinDocumentosPorId: params.autorizarSinDocumentos
          ? params.usuarioId
          : null,
        fechaHoraDevolucionPactada: new Date(`${reserva.fechaFin}T20:00:00Z`),
        medidorUsoEntrega: vehiculo.kilometraje ?? 0,
        canonDiarioPactado: reserva.precioDiaCotizado,
        subtotalCanon: reserva.subtotalTarifaCotizado,
        coberturaPericial: reserva.coberturaPericialCotizada,
        totalLiquidado: totalCotizado,
        totalPagado: montoAbonado,
        saldoPendiente,
        estadoPago,
        estadoContrato: 'BORRADOR',
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
      .onConflictDoNothing()
  );

  ops.push(
    db
      .insert(depositosGarantia)
      .values({
        id: depositoId,
        localId: reserva.localId,
        contratoId: numeroContrato,
        clienteId: reserva.clienteId,
        clienteNombre: reserva.contactoNombre,
        vehiculoId: reserva.vehiculoId,
        montoEsperado: vehiculo.depositoGarantia ?? 500_000,
        montoRecibido: 0,
        montoRetenido: 0,
        montoDevuelto: 0,
        saldoComprometido: 0,
        estado: 'PENDIENTE_RECIBIR',
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
      .onConflictDoNothing()
  );

  if (params.autorizarSinDocumentos) {
    ops.push(
      db.insert(eventosAlquiler).values({
        id: `evt-${reserva.codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`,
        localId: reserva.localId,
        reservaId: reserva.id,
        contratoId,
        vehiculoId: reserva.vehiculoId,
        tipoEvento: 'AUTORIZACION_SIN_DOCS',
        diasDelta: 0,
        montoDelta: 0,
        clausulaOTexto: params.notaAutorizacion ?? 'Autorización sin documentos completos',
        actorId: params.usuarioId,
        activo: true,
        creadoEn: ahora,
      })
    );
  }

  await ejecutarBatchOSecuencial(db, ops);
  await resolverEstadoActualVehiculo(db, reserva.vehiculoId);

  const reservaActualizada = await obtenerReservaPorCodigoD1(db, reserva.codigo);
  const reservaItem: ReservaClienteItem =
    reservaActualizada ??
    mapRowToReservaItem({
      ...reserva,
      estado: 'CONFIRMADA',
      confirmadoPorId: params.usuarioId,
      autorizadoSinDocumentosPorId: params.autorizarSinDocumentos ? params.usuarioId : null,
      actualizadoEn: ahora,
    } as unknown as ReservaSelect, vehiculo as unknown as VehiculoSelect);

  return {
    requiereAutorizacionSinDocs: false,
    reserva: reservaItem,
    contratoId,
  };
}

/**
 * 4. guardarInspeccionR2D1
 * Persiste el acta pericial en inspecciones_periciales y sus puntos interactivos en R2.
 */
export async function guardarInspeccionR2D1(
  db: AppDb,
  params: GuardarInspeccionR2Params
): Promise<{ inspeccionId: string }> {
  const ahora = new Date();

  const resRows = await db
    .select()
    .from(reservas)
    .where(or(eq(reservas.id, params.reservaId), eq(reservas.codigo, params.reservaId)))
    .limit(1);

  const rawRes = resRows[0];
  const reserva = (rawRes && typeof rawRes === 'object' && 'reserva' in rawRes)
    ? (rawRes as { reserva: typeof reservas.$inferSelect }).reserva
    : (rawRes as typeof reservas.$inferSelect | undefined);

  if (!reserva) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Reserva no encontrada para registrar inspección');
  }

  const localId = params.localId ?? reserva.localId;
  const inspId = `insp-${params.tipoActo.toLowerCase()}-${reserva.codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;

  const ops: unknown[] = [];

  ops.push(
    db.insert(inspeccionesPericiales).values({
      id: inspId,
      localId,
      reservaId: reserva.id,
      vehiculoId: reserva.vehiculoId,
      tipoActo: params.tipoActo,
      inspectorId: params.inspectorId,
      medidorUso: params.medidorUso,
      nivelEnergiaPct: params.nivelEnergiaPct,
      estadoGeneral: params.estadoGeneral ?? 'IMPECABLE',
      observaciones: params.observaciones ?? null,
      respuestasChecklist: [],
      iniciadaEn: ahora,
      finalizadaEn: ahora,
      creadoEn: ahora,
    })
  );

  if (params.puntosR2 && params.puntosR2.length > 0) {
    for (const p of params.puntosR2) {
      const pId = p.id ?? `pto-${crypto.randomUUID().slice(0, 8)}`;
      ops.push(
        db.insert(puntosInspeccionR2).values({
          id: pId,
          localId,
          reservaId: reserva.id,
          inspeccionId: inspId,
          vehiculoId: reserva.vehiculoId,
          zona: p.zona,
          etiqueta: p.etiqueta,
          dictamen: p.dictamen,
          estado: p.estado,
          gravedad: p.gravedad ?? null,
          coordX: p.coordX ?? '50%',
          coordY: p.coordY ?? '50%',
          costoEstimado: p.costoEstimado ?? 0,
          generaCargoCliente: p.generaCargoCliente ?? false,
          creadoEn: ahora,
          actualizadoEn: ahora,
        })
      );
    }
  }

  await ejecutarBatchOSecuencial(db, ops);
  return { inspeccionId: inspId };
}

/**
 * 5. entregarVehiculoConContratoD1 (CONFIRMADA -> EN_CURSO)
 * Pasa reserva a EN_CURSO, actualiza o crea contrato VIGENTE con hora real de entrega,
 * registra acta pericial de ENTREGA y opcionalmente asienta fianza en custodia.
 */
export async function entregarVehiculoConContratoD1(
  db: AppDb,
  params: EntregarVehiculoParams
): Promise<{ reserva: ReservaClienteItem; contratoId: string }> {
  const normalizado = params.codigo?.trim().toUpperCase();

  let cond = normalizado ? eq(reservas.codigo, normalizado) : undefined;
  if (params.reservaId) {
    cond = eq(reservas.id, params.reservaId);
  }
  if (!cond) {
    throw new ErrorCicloAlquiler('BAD_REQUEST', 'Debe indicar codigo o reservaId');
  }

  const resRows = await db.select().from(reservas).where(cond).limit(1);
  const rawRes = resRows[0];
  const reserva = (rawRes && typeof rawRes === 'object' && 'reserva' in rawRes)
    ? (rawRes as { reserva: typeof reservas.$inferSelect }).reserva
    : (rawRes as typeof reservas.$inferSelect | undefined);

  if (!reserva) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Reserva no encontrada');
  }

  if (params.localId && reserva.localId !== params.localId) {
    throw new ErrorCicloAlquiler('FORBIDDEN', 'No tiene permisos sobre este local');
  }

  if (reserva.estado === 'EN_CURSO') {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      'La reserva ya fue entregada y se encuentra en curso'
    );
  }

  if (reserva.estado !== 'CONFIRMADA') {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      `La reserva debe estar CONFIRMADA para ser entregada (estado actual: ${reserva.estado})`
    );
  }

  const vehRows = await db
    .select()
    .from(vehiculos)
    .where(eq(vehiculos.id, reserva.vehiculoId))
    .limit(1);
  const vehiculo = vehRows[0];
  if (!vehiculo) {
    throw new ErrorCicloAlquiler('NOT_FOUND', 'Vehículo no encontrado');
  }

  const ctrRows = await db
    .select()
    .from(contratosAlquiler)
    .where(eq(contratosAlquiler.reservaId, reserva.id))
    .limit(1);
  const contrato = ctrRows[0];

  const ahora = new Date();
  const contratoId =
    contrato?.id ?? `ctr-${reserva.codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;
  const numeroContrato =
    contrato?.numeroContrato ?? `CTR-${reserva.codigo.replace('FLX-', '')}`;

  const ops: unknown[] = [];

  if (!contrato) {
    ops.push(
      db.insert(contratosAlquiler).values({
        id: contratoId,
        numeroContrato,
        reservaId: reserva.id,
        localId: reserva.localId,
        vehiculoId: reserva.vehiculoId,
        clienteId: reserva.clienteId,
        arrendatarioNombre: reserva.contactoNombre,
        arrendatarioTelefono: reserva.contactoTelefono,
        arrendatarioCorreo: reserva.contactoCorreo ?? null,
        arrendatarioTipoDocumento: reserva.contactoTipoDocumento ?? null,
        arrendatarioNumeroDocumento: reserva.contactoNumeroDocumento ?? null,
        arrendatarioLicenciaCategoria: reserva.contactoCategoriaLicencia ?? null,
        fechaHoraEntregaReal: ahora,
        fechaHoraDevolucionPactada: new Date(`${reserva.fechaFin}T20:00:00Z`),
        medidorUsoEntrega: params.medidorUsoEntrega,
        nivelEnergiaEntregaPct: params.nivelEnergiaEntregaPct ?? 100,
        canonDiarioPactado: reserva.precioDiaCotizado,
        subtotalCanon: reserva.subtotalTarifaCotizado,
        coberturaPericial: reserva.coberturaPericialCotizada,
        totalLiquidado: reserva.totalCotizado,
        totalPagado: reserva.montoAbonoReportado ?? 0,
        saldoPendiente: Math.max(0, reserva.totalCotizado - (reserva.montoAbonoReportado ?? 0)),
        estadoPago:
          (reserva.montoAbonoReportado ?? 0) >= reserva.totalCotizado
            ? 'PAGADO'
            : (reserva.montoAbonoReportado ?? 0) > 0
              ? 'PARCIAL'
              : 'PENDIENTE',
        estadoContrato: 'VIGENTE',
        firmaArrendadorR2Key: params.firmaArrendadorR2Key ?? null,
        firmaArrendatarioR2Key: params.firmaArrendatarioR2Key ?? null,
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
    );
  } else {
    ops.push(
      db
        .update(contratosAlquiler)
        .set({
          estadoContrato: 'VIGENTE',
          fechaHoraEntregaReal: ahora,
          medidorUsoEntrega: params.medidorUsoEntrega,
          nivelEnergiaEntregaPct: params.nivelEnergiaEntregaPct ?? 100,
          firmaArrendadorR2Key: params.firmaArrendadorR2Key ?? contrato.firmaArrendadorR2Key,
          firmaArrendatarioR2Key: params.firmaArrendatarioR2Key ?? contrato.firmaArrendatarioR2Key,
          actualizadoEn: ahora,
        })
        .where(eq(contratosAlquiler.id, contrato.id))
    );
  }

  // Acta de inspección de ENTREGA
  const inspId = `insp-ent-${reserva.codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;
  ops.push(
    db.insert(inspeccionesPericiales).values({
      id: inspId,
      localId: reserva.localId,
      reservaId: reserva.id,
      contratoId,
      vehiculoId: reserva.vehiculoId,
      tipoActo: 'ENTREGA',
      inspectorId: params.usuarioId,
      medidorUso: params.medidorUsoEntrega,
      nivelEnergiaPct: params.nivelEnergiaEntregaPct ?? 100,
      estadoGeneral: 'IMPECABLE',
      respuestasChecklist: [],
      iniciadaEn: ahora,
      finalizadaEn: ahora,
      creadoEn: ahora,
    })
  );

  // Depósito de garantía recibido
  if (params.recibirGarantiaAhora && params.recibirGarantiaAhora.monto > 0) {
    const { monto, metodoPago, referencia } = params.recibirGarantiaAhora;
    let ctas = await db
      .select()
      .from(cuentasFinancieras)
      .where(
        and(
          eq(cuentasFinancieras.localId, reserva.localId),
          eq(cuentasFinancieras.activo, true)
        )
      )
      .limit(10);

    const cta = resolverCuentaPorMetodoPago(
      ctas,
      metodoPago,
      params.recibirGarantiaAhora.cuentaId
    );
    const cuentaId = cta?.id ?? ctas[0]?.id;

    ops.push(
      db
        .update(depositosGarantia)
        .set({
          estado: 'RECIBIDO_CUSTODIA',
          montoRecibido: monto,
          saldoComprometido: monto,
          metodoPago,
          referenciaRecepcion: referencia ?? null,
          cuentaId: cuentaId ?? null,
        })
        .where(
          or(
            eq(depositosGarantia.contratoId, numeroContrato),
            eq(depositosGarantia.contratoId, reserva.codigo)
          )
        )
    );

    if (cuentaId) {
      const movId = `mov-fianza-${reserva.codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;
      ops.push(
        db.insert(movimientosCaja).values({
          id: movId,
          localId: reserva.localId,
          tipo: 'INGRESO',
          categoria: 'DEPOSITO_GARANTIA',
          concepto: `Depósito de garantía recibido en custodia #${reserva.codigo}`,
          monto,
          metodoPago,
          cuentaId,
          contratoId: numeroContrato,
          clienteId: reserva.clienteId,
          clienteNombre: reserva.contactoNombre,
          vehiculoId: reserva.vehiculoId,
          referencia: referencia ?? `GAR-${reserva.codigo}`,
          estado: 'CONFIRMADO',
          creadoPorId: params.usuarioId,
          fechaMovimiento: ahora,
          creadoEn: ahora,
          actualizadoEn: ahora,
        })
      );
    }
  }

  // Actualizar reserva a EN_CURSO
  ops.push(
    db
      .update(reservas)
      .set({
        estado: 'EN_CURSO',
        actualizadoEn: ahora,
      })
      .where(eq(reservas.id, reserva.id))
  );

  // Actualizar kilometraje en vehículo
  ops.push(
    db
      .update(vehiculos)
      .set({
        kilometraje: params.medidorUsoEntrega,
        actualizadoEn: ahora,
      })
      .where(eq(vehiculos.id, reserva.vehiculoId))
  );

  await ejecutarBatchOSecuencial(db, ops);
  await resolverEstadoActualVehiculo(db, reserva.vehiculoId);

  const reservaActualizada = await obtenerReservaPorCodigoD1(db, reserva.codigo);
  const reservaItem: ReservaClienteItem =
    reservaActualizada ??
    mapRowToReservaItem({
      ...reserva,
      estado: 'EN_CURSO',
      actualizadoEn: ahora,
    } as unknown as ReservaSelect, vehiculo as unknown as VehiculoSelect);

  return {
    reserva: reservaItem,
    contratoId,
  };
}

/**
 * 6. registrarOActualizarDocumentosClienteRapidoD1
 * Inserta o actualiza el registro KYC del cliente en verificaciones_identidad.
 */
export async function registrarOActualizarDocumentosClienteRapidoD1(
  db: AppDb,
  params: DocsClienteRapidoParams
): Promise<{ ok: true }> {
  const ahora = new Date();

  const existe = await db
    .select()
    .from(verificacionesIdentidad)
    .where(eq(verificacionesIdentidad.usuarioId, params.usuarioId))
    .limit(1);

  if (existe.length > 0) {
    await db
      .update(verificacionesIdentidad)
      .set({
        tipoDocumento: params.tipoDocumento,
        numeroDocumento: params.numeroDocumento,
        licenciaNumero: params.licenciaNumero ?? existe[0]!.licenciaNumero,
        licenciaCategoria: params.licenciaCategoria ?? existe[0]!.licenciaCategoria,
        licenciaVencimiento: params.licenciaVencimiento ?? existe[0]!.licenciaVencimiento,
        documentoFrenteKey: params.documentoFrenteKey ?? existe[0]!.documentoFrenteKey,
        documentoDorsoKey: params.documentoDorsoKey ?? existe[0]!.documentoDorsoKey,
        licenciaFrenteKey: params.licenciaFrenteKey ?? existe[0]!.licenciaFrenteKey,
        licenciaDorsoKey: params.licenciaDorsoKey ?? existe[0]!.licenciaDorsoKey,
        estado: params.aprobarInmediato ? 'APROBADO' : existe[0]!.estado,
        verificadoEn: params.aprobarInmediato ? ahora : existe[0]!.verificadoEn,
        actualizadoEn: ahora,
      })
      .where(eq(verificacionesIdentidad.usuarioId, params.usuarioId));
  } else {
    const id = `kyc-${crypto.randomUUID().slice(0, 8)}`;
    await db.insert(verificacionesIdentidad).values({
      id,
      usuarioId: params.usuarioId,
      tipoDocumento: params.tipoDocumento,
      numeroDocumento: params.numeroDocumento,
      licenciaNumero: params.licenciaNumero ?? null,
      licenciaCategoria: params.licenciaCategoria ?? null,
      licenciaVencimiento: params.licenciaVencimiento ?? null,
      documentoFrenteKey: params.documentoFrenteKey ?? null,
      documentoDorsoKey: params.documentoDorsoKey ?? null,
      licenciaFrenteKey: params.licenciaFrenteKey ?? null,
      licenciaDorsoKey: params.licenciaDorsoKey ?? null,
      estado: params.aprobarInmediato ? 'APROBADO' : 'PENDIENTE',
      verificadoEn: params.aprobarInmediato ? ahora : null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  return { ok: true };
}
