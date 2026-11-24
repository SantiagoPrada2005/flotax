import type { AppDb } from '@/lib/db';
import {
  reservas,
  contratosAlquiler,
  depositosGarantia,
  eventosAlquiler,
  inspeccionesPericiales,
  puntosInspeccionR2,
  vehiculos,
  localesAlquiler,
  politicasLocal,
  cuentasFinancieras,
  movimientosCaja,
  verificacionesIdentidad,
  clientesLocal,
  user,
  type ModalidadEntregaReservaSchema,
  type ModalidadPagoInicial,
  type MetodoAbonoInicial,
  type CategoriaLicenciaConduccion,
  type MetodoPagoFinanciero,
  type EstadoPuntoInspeccionR2,
  type GravedadNovedadInspeccion,
  type EstadoGeneralInspeccion,
  type TipoActoInspeccion,
  type RespuestaItemChecklistInspeccion,
} from '@/db/schema';
import {
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
import {
  evaluarCoberturaDomicilio,
  normalizarPoliticaDomicilio,
  PATIO_COORDENADAS_DEFECTO,
  sonCoordenadasValidas,
} from '@/lib/ubicacion';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
import type { RolUsuario, RolSistema } from '@/lib/auth/rbac';
import { toClientISODate } from '@/lib/time/client-time';

import {
  ErrorCicloAlquiler,
  type ErrorCicloAlquilerCode,
} from './errores';
export { ErrorCicloAlquiler, type ErrorCicloAlquilerCode };

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
  entregaLatitud?: number | null | undefined;
  entregaLongitud?: number | null | undefined;
  entregaReferencia?: string | null | undefined;
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

export interface ConductorVerificadoEntrega {
  nombreCompleto: string;
  telefono: string;
  correo?: string | null | undefined;
  tipoDocumento?: 'CC' | 'CE' | 'PASAPORTE' | 'NIT' | null | undefined;
  numeroDocumento?: string | null | undefined;
  ciudadExpedicion?: string | null | undefined;
  licenciaNumero?: string | null | undefined;
  licenciaCategoria?: CategoriaLicenciaConduccion | null | undefined;
  licenciaVencimiento?: string | null | undefined;
  domicilio?: string | null | undefined;
}

export interface EntregarVehiculoParams {
  reservaId?: string | undefined;
  codigo?: string | undefined;
  localId?: string | undefined;
  usuarioId: string;
  medidorUsoEntrega: number;
  nivelEnergiaEntregaPct?: number | undefined;
  conductorVerificado?: ConductorVerificadoEntrega | undefined;
  estadoGeneralEntrega?: EstadoGeneralInspeccion | undefined;
  observacionesEntrega?: string | undefined;
  respuestasChecklist?: RespuestaItemChecklistInspeccion[] | undefined;
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
  consentimientosContrato?: {
    ley1581Aceptada?: boolean | undefined;
    trasladoFotomultasAceptado?: boolean | undefined;
    pagareBlancoFirmado?: boolean | undefined;
  } | undefined;
  firmaArrendadorR2Key?: string | undefined;
  firmaArrendatarioR2Key?: string | undefined;
  cobrarSaldoAhora?: {
    monto: number;
    metodoPago: MetodoPagoFinanciero;
    cuentaId?: string | undefined;
    referencia?: string | undefined;
  } | undefined;
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
  usuarioId?: string | null | undefined;
  codigo?: string | undefined;
  reservaId?: string | undefined;
  nombreCompleto?: string | undefined;
  telefono?: string | undefined;
  correo?: string | undefined;
  tipoDocumento: 'CC' | 'CE' | 'PASAPORTE' | 'NIT';
  numeroDocumento: string;
  ciudadExpedicion?: string | undefined;
  domicilio?: string | undefined;
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
    faltaDocumentoIdentidad ||
    faltaLicencia ||
    licenciaIncompatible ||
    sinKycAprobado ||
    soatVencido ||
    rtmVencida;

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

export async function ejecutarBatchOSecuencial(db: AppDb, ops: unknown[]): Promise<void> {
  if (ops.length === 0) return;
  const dbBatchObj = db as { batch?: (queries: unknown[]) => Promise<unknown> };
  if (typeof dbBatchObj.batch === 'function') {
    await dbBatchObj.batch.call(db, ops);
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

  // 3. Validar documentación del vehículo (bloqueo estricto si está Sin realizar o Sin registrar)
  const estadoDocVeh = await obtenerEstadoDocumentalVehiculoD1(
    db,
    input.vehiculoId,
    vehiculo.categoria,
    input.fechaInicio
  );

  if (
    estadoDocVeh.bloqueadoPorDocumentos ||
    estadoDocVeh.tieneVencidos ||
    estadoDocVeh.faltantesSinCarga.length > 0
  ) {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      estadoDocVeh.motivoBloqueo
        ? `No se puede reservar el vehículo hasta regularizar sus documentos: ${estadoDocVeh.motivoBloqueo}.`
        : 'El vehículo presenta documentación legal vencida o sin registrar (SOAT / Tecnomecánica).'
    );
  }

  // 4. Recalcular precios estrictamente contra D1
  const esFlujoWeb = contexto.origen === 'CLIENTE_WEB' || contexto.origen === 'WEB';
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

  // 4.1 Validar modalidad de entrega, cobertura geográfica y recargo por distancia
  const modalidadEntregaFinal: ModalidadEntregaReservaSchema =
    input.modalidadEntrega === 'DOMICILIO_MEDELLIN'
      ? 'DOMICILIO_MEDELLIN'
      : 'PATIO_PRINCIPAL';

  let direccionEntregaFinal: string | null = null;
  let entregaLatitudFinal: number | null = null;
  let entregaLongitudFinal: number | null = null;
  let entregaReferenciaFinal: string | null = null;
  let distanciaEntregaKmFinal: number | null = null;
  let recargoEntregaDomicilioFinal = 0;

  if (modalidadEntregaFinal === 'DOMICILIO_MEDELLIN') {
    const politicaDomicilio = normalizarPoliticaDomicilio(polRows[0]);
    let patioCoords = { ...PATIO_COORDENADAS_DEFECTO };

    try {
      const localRows = await db
        .select({
          latitud: localesAlquiler.latitud,
          longitud: localesAlquiler.longitud,
        })
        .from(localesAlquiler)
        .where(eq(localesAlquiler.id, localId))
        .limit(1);
      const loc = localRows[0];
      if (
        loc &&
        typeof loc.latitud === 'number' &&
        typeof loc.longitud === 'number' &&
        sonCoordenadasValidas(loc.latitud, loc.longitud)
      ) {
        patioCoords = { lat: loc.latitud, lng: loc.longitud };
      }
    } catch {
      // Fallback seguro a coordenadas canónicas del patio
    }

    const direccionLimpia = input.direccionEntrega?.trim() || '';
    const referenciaLimpia = input.entregaReferencia?.trim() || null;
    const latInput = input.entregaLatitud;
    const lngInput = input.entregaLongitud;
    const tieneCoords =
      typeof latInput === 'number' &&
      typeof lngInput === 'number' &&
      sonCoordenadasValidas(latInput, lngInput);

    if (esFlujoWeb) {
      if (direccionLimpia.length < 5) {
        throw new ErrorCicloAlquiler(
          'BAD_REQUEST',
          'Para entrega a domicilio debes indicar una dirección de entrega válida.'
        );
      }
      if (!tieneCoords) {
        throw new ErrorCicloAlquiler(
          'BAD_REQUEST',
          'Debes confirmar la ubicación exacta en el mapa para entrega a domicilio.'
        );
      }
    }

    if (tieneCoords && typeof latInput === 'number' && typeof lngInput === 'number') {
      const evalCobertura = evaluarCoberturaDomicilio(
        { lat: latInput, lng: lngInput },
        patioCoords,
        politicaDomicilio
      );

      if (!evalCobertura.dentroCobertura) {
        throw new ErrorCicloAlquiler('BAD_REQUEST', evalCobertura.mensaje);
      }

      direccionEntregaFinal = direccionLimpia || null;
      entregaLatitudFinal = latInput;
      entregaLongitudFinal = lngInput;
      entregaReferenciaFinal = referenciaLimpia;
      distanciaEntregaKmFinal = evalCobertura.distanciaKm;
      recargoEntregaDomicilioFinal = evalCobertura.recargoDomicilio;
    } else {
      // Mostrador administrativo sin coordenadas explícitas
      if (!politicaDomicilio.domicilioHabilitado) {
        throw new ErrorCicloAlquiler(
          'BAD_REQUEST',
          'Esta sede no tiene entregas a domicilio habilitadas en este momento.'
        );
      }
      direccionEntregaFinal = direccionLimpia || null;
      entregaReferenciaFinal = referenciaLimpia;
      recargoEntregaDomicilioFinal = politicaDomicilio.tarifaDomicilioBase;
    }
  }

  const totalCotizado =
    subtotalTarifaCotizado + coberturaPericialCotizada + recargoEntregaDomicilioFinal;

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
    if (!clienteId && input.contactoCorreo) {
      const emailNorm = input.contactoCorreo.trim().toLowerCase();
      if (emailNorm) {
        const userMatches = await db
          .select({ id: user.id })
          .from(user)
          .where(sql`LOWER(TRIM(${user.email})) = ${emailNorm}`)
          .limit(1);
        clienteId = userMatches[0]?.id ?? null;
      }
    }
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
      modalidadEntrega: modalidadEntregaFinal,
      direccionEntrega: direccionEntregaFinal,
      entregaLatitud: entregaLatitudFinal,
      entregaLongitud: entregaLongitudFinal,
      entregaReferencia: entregaReferenciaFinal,
      distanciaEntregaKm: distanciaEntregaKmFinal,
      recargoEntregaDomicilio: recargoEntregaDomicilioFinal,
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

  // Registrar relación cliente-local en D1 cuando la reserva tiene clienteId
  if (clienteId) {
    ops.push(
      db
        .insert(clientesLocal)
        .values({
          id: `cl-${localId}-${clienteId}`,
          usuarioId: clienteId,
          localId,
          esLocalOrigen: false,
          esPreferido: false,
          ultimaVisitaEn: ahora,
          creadoEn: ahora,
        })
        .onConflictDoNothing()
    );
  }

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
  if (!reservaRecuperada) {
    throw new ErrorCicloAlquiler(
      'INTERNAL_SERVER_ERROR',
      `Fallo al recuperar la reserva #${codigo} desde D1 tras su creación`
    );
  }

  return {
    reserva: reservaRecuperada,
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
  correo: string,
  opciones?: { incluirCreadasPorUsuario?: boolean }
): Promise<number> {
  const emailNorm = correo?.trim().toLowerCase();
  if ((!emailNorm && !opciones?.incluirCreadasPorUsuario) || !userId) return 0;

  const filtroCoincidencia =
    emailNorm && opciones?.incluirCreadasPorUsuario
      ? or(
          sql`LOWER(TRIM(${reservas.contactoCorreo})) = ${emailNorm}`,
          eq(reservas.creadoPorId, userId)
        )
      : emailNorm
        ? sql`LOWER(TRIM(${reservas.contactoCorreo})) = ${emailNorm}`
        : eq(reservas.creadoPorId, userId);

  const rows = await db
    .select({
      id: reservas.id,
      codigo: reservas.codigo,
      localId: reservas.localId,
    })
    .from(reservas)
    .where(and(isNull(reservas.clienteId), filtroCoincidencia));

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
        .set({ clienteId: userId, actualizadoEn: ahora })
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

  const estadoDocVeh = await obtenerEstadoDocumentalVehiculoD1(
    db,
    reserva.vehiculoId,
    vehiculo.categoria,
    reserva.fechaInicio
  );

  if (
    estadoDocVeh.bloqueadoPorDocumentos ||
    estadoDocVeh.tieneVencidos ||
    estadoDocVeh.faltantesSinCarga.length > 0
  ) {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      estadoDocVeh.motivoBloqueo
        ? `No se puede confirmar la reserva hasta regularizar los documentos del vehículo: ${estadoDocVeh.motivoBloqueo}.`
        : 'El vehículo presenta documentación legal vencida o sin registrar (SOAT / Tecnomecánica).'
    );
  }

  const advertencias = construirAdvertenciasDocumentales(
    {
      contactoTipoDocumento: reserva.contactoTipoDocumento,
      contactoNumeroDocumento: reserva.contactoNumeroDocumento,
      contactoCategoriaLicencia: reserva.contactoCategoriaLicencia,
    },
    estadoDocVeh.vencidos,
    estadoDocVeh.faltantesSinCarga,
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
  if (!reservaActualizada) {
    throw new ErrorCicloAlquiler(
      'INTERNAL_SERVER_ERROR',
      `Fallo al recuperar la reserva #${reserva.codigo} tras su confirmación en D1`
    );
  }

  return {
    requiereAutorizacionSinDocs: false,
    reserva: reservaActualizada,
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
 * Comprueba y persiste los datos verificados del cliente en reserva/contrato/KYC,
 * sella el acta pericial ENTREGA con checklist y puntos R2, asienta cobro de saldo y fianza
 * si aplica, y pasa la reserva a EN_CURSO con contrato VIGENTE.
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

  // Resolver datos efectivos del conductor comprobados en patio
  const cv = params.conductorVerificado;
  const nombreEfectivo = (cv?.nombreCompleto?.trim() || reserva.contactoNombre).trim();
  const telefonoEfectivo = (cv?.telefono?.trim() || reserva.contactoTelefono).trim();
  const correoEfectivo =
    cv && cv.correo !== undefined
      ? cv.correo?.trim() || null
      : reserva.contactoCorreo ?? null;
  const tipoDocEfectivo =
    cv && cv.tipoDocumento !== undefined
      ? cv.tipoDocumento ?? null
      : reserva.contactoTipoDocumento ?? contrato?.arrendatarioTipoDocumento ?? null;
  const numDocEfectivo =
    cv && cv.numeroDocumento !== undefined
      ? cv.numeroDocumento?.trim() || null
      : reserva.contactoNumeroDocumento ?? contrato?.arrendatarioNumeroDocumento ?? null;
  const catLicenciaEfectiva =
    cv && cv.licenciaCategoria !== undefined
      ? cv.licenciaCategoria ?? null
      : reserva.contactoCategoriaLicencia ?? contrato?.arrendatarioLicenciaCategoria ?? null;
  const licenciaNumEfectiva =
    cv && cv.licenciaNumero !== undefined
      ? cv.licenciaNumero?.trim() || numDocEfectivo || null
      : contrato?.arrendatarioLicenciaNumero ?? null;
  const ciudadExpEfectiva =
    cv && cv.ciudadExpedicion !== undefined
      ? cv.ciudadExpedicion?.trim() || null
      : contrato?.arrendatarioCiudadExpedicion ?? null;
  const domicilioEfectivo =
    cv && cv.domicilio !== undefined
      ? cv.domicilio?.trim() || null
      : contrato?.arrendatarioDomicilio ?? null;

  // Validar documentación legal del vehículo antes de cualquier entrega (no omitible)
  const estadoDocVeh = await obtenerEstadoDocumentalVehiculoD1(
    db,
    reserva.vehiculoId,
    vehiculo.categoria,
    toClientISODate()
  );

  if (
    estadoDocVeh.bloqueadoPorDocumentos ||
    estadoDocVeh.tieneVencidos ||
    estadoDocVeh.faltantesSinCarga.length > 0
  ) {
    throw new ErrorCicloAlquiler(
      'CONFLICT',
      estadoDocVeh.motivoBloqueo
        ? `No se puede entregar el vehículo hasta regularizar sus documentos: ${estadoDocVeh.motivoBloqueo}.`
        : 'El vehículo presenta documentación legal vencida o sin registrar (SOAT / Tecnomecánica).'
    );
  }

  // Validar documentos del conductor cuando se diligencia el formulario de entrega
  if (cv) {
    const kycRows = reserva.clienteId
      ? await db
          .select({ estado: verificacionesIdentidad.estado })
          .from(verificacionesIdentidad)
          .where(eq(verificacionesIdentidad.usuarioId, reserva.clienteId))
          .limit(1)
      : [];
    const kycEstadoActual = kycRows[0]?.estado ?? null;
    const kycEfectivo =
      tipoDocEfectivo && numDocEfectivo
        ? 'APROBADO'
        : kycEstadoActual;
    const advertencias = construirAdvertenciasDocumentales(
      {
        contactoTipoDocumento: tipoDocEfectivo,
        contactoNumeroDocumento: numDocEfectivo,
        contactoCategoriaLicencia: catLicenciaEfectiva,
      },
      estadoDocVeh.vencidos,
      estadoDocVeh.faltantesSinCarga,
      vehiculo.categoria,
      kycEfectivo
    );

    const yaAutorizadaSinDocs =
      params.autorizarSinDocumentos === true ||
      Boolean(reserva.autorizadoSinDocumentosPorId);

    const hayFaltaCliente =
      advertencias.cliente.faltaDocumentoIdentidad ||
      advertencias.cliente.faltaLicencia ||
      advertencias.cliente.licenciaIncompatible;

    if (hayFaltaCliente && !yaAutorizadaSinDocs) {
      throw new ErrorCicloAlquiler(
        'BAD_REQUEST',
        `${advertencias.cliente.detalles.join('. ')}. Verifica los datos del cliente o autoriza bajo responsabilidad del local.`
      );
    }
  }

  const ahora = new Date();
  const contratoId =
    contrato?.id ?? `ctr-${reserva.codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`;
  const numeroContrato =
    contrato?.numeroContrato ?? `CTR-${reserva.codigo.replace('FLX-', '')}`;

  const ops: unknown[] = [];

  // Consultar cuentas financieras una sola vez si hay cobro de saldo o fianza en el acto
  const necesitaCuentas =
    Boolean(params.cobrarSaldoAhora && params.cobrarSaldoAhora.monto > 0) ||
    Boolean(params.recibirGarantiaAhora && params.recibirGarantiaAhora.monto > 0);
  const ctasLocal = necesitaCuentas
    ? await db
        .select()
        .from(cuentasFinancieras)
        .where(
          and(
            eq(cuentasFinancieras.localId, reserva.localId),
            eq(cuentasFinancieras.activo, true)
          )
        )
        .limit(10)
    : [];

  const cobroAdicional =
    params.cobrarSaldoAhora && params.cobrarSaldoAhora.monto > 0
      ? Math.round(params.cobrarSaldoAhora.monto)
      : 0;

  const totalLiquidadoBase = contrato?.totalLiquidado ?? reserva.totalCotizado;
  const totalPagadoBase = contrato?.totalPagado ?? (reserva.montoAbonoReportado ?? 0);
  const totalPagadoFinal = totalPagadoBase + cobroAdicional;
  const saldoPendienteFinal = Math.max(0, totalLiquidadoBase - totalPagadoFinal);
  const estadoPagoFinal =
    totalPagadoFinal >= totalLiquidadoBase
      ? 'PAGADO'
      : totalPagadoFinal > 0
        ? 'PARCIAL'
        : 'PENDIENTE';

  const ley1581Final =
    params.consentimientosContrato?.ley1581Aceptada ??
    contrato?.ley1581Aceptada ??
    reserva.ley1581Aceptada;
  const trasladoFotomultasFinal =
    params.consentimientosContrato?.trasladoFotomultasAceptado ??
    contrato?.trasladoFotomultasAceptado ??
    true;
  const pagareBlancoFinal =
    params.consentimientosContrato?.pagareBlancoFirmado ??
    contrato?.pagareBlancoFirmado ??
    false;

  if (!contrato) {
    ops.push(
      db.insert(contratosAlquiler).values({
        id: contratoId,
        numeroContrato,
        reservaId: reserva.id,
        localId: reserva.localId,
        vehiculoId: reserva.vehiculoId,
        clienteId: reserva.clienteId,
        arrendatarioNombre: nombreEfectivo,
        arrendatarioTelefono: telefonoEfectivo,
        arrendatarioCorreo: correoEfectivo,
        arrendatarioTipoDocumento: tipoDocEfectivo,
        arrendatarioNumeroDocumento: numDocEfectivo,
        arrendatarioCiudadExpedicion: ciudadExpEfectiva,
        arrendatarioLicenciaNumero: licenciaNumEfectiva,
        arrendatarioLicenciaCategoria: catLicenciaEfectiva,
        arrendatarioDomicilio: domicilioEfectivo,
        autorizadoSinDocumentosPorId: params.autorizarSinDocumentos
          ? params.usuarioId
          : reserva.autorizadoSinDocumentosPorId ?? null,
        ley1581Aceptada: ley1581Final,
        trasladoFotomultasAceptado: trasladoFotomultasFinal,
        pagareBlancoFirmado: pagareBlancoFinal,
        fechaHoraEntregaReal: ahora,
        fechaHoraDevolucionPactada: new Date(`${reserva.fechaFin}T20:00:00Z`),
        medidorUsoEntrega: params.medidorUsoEntrega,
        nivelEnergiaEntregaPct: params.nivelEnergiaEntregaPct ?? 100,
        canonDiarioPactado: reserva.precioDiaCotizado,
        subtotalCanon: reserva.subtotalTarifaCotizado,
        coberturaPericial: reserva.coberturaPericialCotizada,
        totalLiquidado: totalLiquidadoBase,
        totalPagado: totalPagadoFinal,
        saldoPendiente: saldoPendienteFinal,
        estadoPago: estadoPagoFinal,
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
          arrendatarioNombre: nombreEfectivo,
          arrendatarioTelefono: telefonoEfectivo,
          arrendatarioCorreo: correoEfectivo,
          arrendatarioTipoDocumento: tipoDocEfectivo,
          arrendatarioNumeroDocumento: numDocEfectivo,
          arrendatarioCiudadExpedicion: ciudadExpEfectiva,
          arrendatarioLicenciaNumero: licenciaNumEfectiva,
          arrendatarioLicenciaCategoria: catLicenciaEfectiva,
          arrendatarioDomicilio: domicilioEfectivo,
          autorizadoSinDocumentosPorId: params.autorizarSinDocumentos
            ? params.usuarioId
            : contrato.autorizadoSinDocumentosPorId,
          ley1581Aceptada: ley1581Final,
          trasladoFotomultasAceptado: trasladoFotomultasFinal,
          pagareBlancoFirmado: pagareBlancoFinal,
          fechaHoraEntregaReal: ahora,
          medidorUsoEntrega: params.medidorUsoEntrega,
          nivelEnergiaEntregaPct: params.nivelEnergiaEntregaPct ?? 100,
          totalPagado: totalPagadoFinal,
          saldoPendiente: saldoPendienteFinal,
          estadoPago: estadoPagoFinal,
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
      estadoGeneral: params.estadoGeneralEntrega ?? 'IMPECABLE',
      observaciones: params.observacionesEntrega ?? null,
      respuestasChecklist: params.respuestasChecklist ?? [],
      firmaClienteR2Key: params.firmaArrendatarioR2Key ?? null,
      firmaResponsableR2Key: params.firmaArrendadorR2Key ?? null,
      iniciadaEn: ahora,
      finalizadaEn: ahora,
      creadoEn: ahora,
    })
  );

  // Puntos R2 verificados durante el acto de entrega
  if (params.puntosR2 && params.puntosR2.length > 0) {
    for (const p of params.puntosR2) {
      if (p.id && !p.id.startsWith('r2-')) {
        ops.push(
          db
            .update(puntosInspeccionR2)
            .set({
              inspeccionId: inspId,
              zona: p.zona,
              etiqueta: p.etiqueta,
              dictamen: p.dictamen,
              estado: p.estado,
              gravedad: p.gravedad ?? null,
              coordX: p.coordX ?? '50%',
              coordY: p.coordY ?? '50%',
              costoEstimado: p.costoEstimado ?? 0,
              generaCargoCliente: p.generaCargoCliente ?? false,
              actualizadoEn: ahora,
            })
            .where(eq(puntosInspeccionR2.id, p.id))
        );
      } else {
        const pId = `pto-${crypto.randomUUID().slice(0, 8)}`;
        ops.push(
          db
            .insert(puntosInspeccionR2)
            .values({
              id: pId,
              localId: reserva.localId,
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
            .onConflictDoNothing()
        );
      }
    }
  }

  // Cobro de saldo pendiente en el acto de entrega
  if (params.cobrarSaldoAhora && cobroAdicional > 0) {
    const { metodoPago, referencia } = params.cobrarSaldoAhora;
    const cta = resolverCuentaPorMetodoPago(
      ctasLocal,
      metodoPago,
      params.cobrarSaldoAhora.cuentaId
    );
    const cuentaId = cta?.id ?? ctasLocal[0]?.id;

    if (cuentaId) {
      ops.push(
        db.insert(movimientosCaja).values({
          id: `mov-ent-${reserva.codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`,
          localId: reserva.localId,
          tipo: 'INGRESO',
          categoria: 'PAGO_ALQUILER',
          concepto: `Cobro de saldo en entrega #${reserva.codigo}`,
          monto: cobroAdicional,
          metodoPago,
          cuentaId,
          contratoId: numeroContrato,
          clienteId: reserva.clienteId,
          clienteNombre: nombreEfectivo,
          vehiculoId: reserva.vehiculoId,
          referencia: referencia ?? `ENT-${reserva.codigo}`,
          estado: 'CONFIRMADO',
          creadoPorId: params.usuarioId,
          fechaMovimiento: ahora,
          creadoEn: ahora,
          actualizadoEn: ahora,
        })
      );
    }
  }

  // Depósito de garantía recibido
  if (params.recibirGarantiaAhora && params.recibirGarantiaAhora.monto > 0) {
    const { monto, metodoPago, referencia } = params.recibirGarantiaAhora;
    const cta = resolverCuentaPorMetodoPago(
      ctasLocal,
      metodoPago,
      params.recibirGarantiaAhora.cuentaId
    );
    const cuentaId = cta?.id ?? ctasLocal[0]?.id;

    // Garantizar fila previa en depositos_garantia si la reserva no pasó por confirmación estándar
    const depExistente = await db
      .select({ id: depositosGarantia.id })
      .from(depositosGarantia)
      .where(
        or(
          eq(depositosGarantia.contratoId, numeroContrato),
          eq(depositosGarantia.contratoId, reserva.codigo)
        )
      )
      .limit(1);

    if (depExistente.length === 0) {
      ops.push(
        db
          .insert(depositosGarantia)
          .values({
            id: `dep-${reserva.codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`,
            localId: reserva.localId,
            contratoId: numeroContrato,
            clienteId: reserva.clienteId,
            clienteNombre: nombreEfectivo,
            vehiculoId: reserva.vehiculoId,
            montoEsperado: vehiculo.depositoGarantia ?? monto,
            montoRecibido: monto,
            montoRetenido: 0,
            montoDevuelto: 0,
            saldoComprometido: monto,
            estado: 'RECIBIDO_CUSTODIA',
            metodoPago,
            referenciaRecepcion: referencia ?? null,
            cuentaId: cuentaId ?? null,
            fechaRecepcion: ahora,
            creadoEn: ahora,
            actualizadoEn: ahora,
          })
          .onConflictDoNothing()
      );
    } else {
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
            clienteNombre: nombreEfectivo,
            fechaRecepcion: ahora,
            actualizadoEn: ahora,
          })
          .where(
            or(
              eq(depositosGarantia.contratoId, numeroContrato),
              eq(depositosGarantia.contratoId, reserva.codigo)
            )
          )
      );
    }

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
          clienteNombre: nombreEfectivo,
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

  // Evento de auditoría si se autoriza entrega sin documentos completos
  if (params.autorizarSinDocumentos) {
    ops.push(
      db.insert(eventosAlquiler).values({
        id: `evt-ent-${reserva.codigo.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`,
        localId: reserva.localId,
        reservaId: reserva.id,
        contratoId,
        vehiculoId: reserva.vehiculoId,
        tipoEvento: 'AUTORIZACION_SIN_DOCS',
        diasDelta: 0,
        montoDelta: 0,
        clausulaOTexto:
          params.notaAutorizacion ?? 'Entrega autorizada bajo responsabilidad del local',
        actorId: params.usuarioId,
        activo: true,
        creadoEn: ahora,
      })
    );
  }

  // Actualizar reserva a EN_CURSO con los datos verificados del cliente
  ops.push(
    db
      .update(reservas)
      .set({
        estado: 'EN_CURSO',
        contactoNombre: nombreEfectivo,
        contactoTelefono: telefonoEfectivo,
        contactoCorreo: correoEfectivo,
        contactoTipoDocumento: tipoDocEfectivo,
        contactoNumeroDocumento: numDocEfectivo,
        contactoCategoriaLicencia: catLicenciaEfectiva,
        ley1581Aceptada: ley1581Final,
        montoAbonoReportado: (reserva.montoAbonoReportado ?? 0) + cobroAdicional,
        autorizadoSinDocumentosPorId: params.autorizarSinDocumentos
          ? params.usuarioId
          : reserva.autorizadoSinDocumentosPorId,
        notaAutorizacionDocumentos: params.autorizarSinDocumentos
          ? params.notaAutorizacion ?? reserva.notaAutorizacionDocumentos
          : reserva.notaAutorizacionDocumentos,
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

  // Si la reserva tiene usuario vinculado y se comprobaron datos nuevos en patio, sincronizar KYC
  if (reserva.clienteId && cv && tipoDocEfectivo && numDocEfectivo) {
    await registrarOActualizarDocumentosClienteRapidoD1(db, {
      usuarioId: reserva.clienteId,
      tipoDocumento: tipoDocEfectivo,
      numeroDocumento: numDocEfectivo,
      licenciaNumero: licenciaNumEfectiva ?? undefined,
      licenciaCategoria: catLicenciaEfectiva ?? undefined,
      licenciaVencimiento: cv.licenciaVencimiento ?? undefined,
      aprobarInmediato: !params.autorizarSinDocumentos,
      operadorId: params.usuarioId,
    });
  }

  await resolverEstadoActualVehiculo(db, reserva.vehiculoId);

  const reservaActualizada = await obtenerReservaPorCodigoD1(db, reserva.codigo);
  if (!reservaActualizada) {
    throw new ErrorCicloAlquiler(
      'INTERNAL_SERVER_ERROR',
      `Fallo al recuperar la reserva #${reserva.codigo} tras su entrega en D1`
    );
  }

  return {
    reserva: reservaActualizada,
    contratoId,
  };
}

/**
 * 6. registrarOActualizarDocumentosClienteRapidoD1
 * Inserta o actualiza los datos documentales del conductor en reserva, contrato y verificaciones_identidad.
 * Soporta tanto cuentas registradas (usuarioId) como reservas presenciales o de invitados sin cuenta.
 */
export async function registrarOActualizarDocumentosClienteRapidoD1(
  db: AppDb,
  params: DocsClienteRapidoParams
): Promise<{ ok: true }> {
  const ahora = new Date();
  let usuarioIdDestino = params.usuarioId ?? null;
  let reservaVinculada: typeof reservas.$inferSelect | undefined;

  if (params.reservaId || params.codigo) {
    const condReserva = params.reservaId
      ? eq(reservas.id, params.reservaId)
      : eq(reservas.codigo, params.codigo!.trim().toUpperCase());
    const resRows = await db.select().from(reservas).where(condReserva).limit(1);
    const rawRes = resRows[0];
    reservaVinculada =
      rawRes && typeof rawRes === 'object' && 'reserva' in rawRes
        ? (rawRes as { reserva: typeof reservas.$inferSelect }).reserva
        : (rawRes as typeof reservas.$inferSelect | undefined);

    if (!usuarioIdDestino && reservaVinculada?.clienteId) {
      usuarioIdDestino = reservaVinculada.clienteId;
    }
  }

  const licCatValida = (
    params.licenciaCategoria === 'A1' ||
    params.licenciaCategoria === 'A2' ||
    params.licenciaCategoria === 'B1' ||
    params.licenciaCategoria === 'B2' ||
    params.licenciaCategoria === 'C1'
      ? params.licenciaCategoria
      : undefined
  ) satisfies CategoriaLicenciaConduccion | undefined;

  if (reservaVinculada) {
    await db
      .update(reservas)
      .set({
        contactoTipoDocumento: params.tipoDocumento,
        contactoNumeroDocumento: params.numeroDocumento,
        ...(licCatValida ? { contactoCategoriaLicencia: licCatValida } : {}),
        ...(params.nombreCompleto?.trim()
          ? { contactoNombre: params.nombreCompleto.trim() }
          : {}),
        ...(params.telefono?.trim()
          ? { contactoTelefono: params.telefono.trim() }
          : {}),
        ...(params.correo !== undefined
          ? { contactoCorreo: params.correo.trim() || null }
          : {}),
        actualizadoEn: ahora,
      })
      .where(eq(reservas.id, reservaVinculada.id));

    await db
      .update(contratosAlquiler)
      .set({
        arrendatarioTipoDocumento: params.tipoDocumento,
        arrendatarioNumeroDocumento: params.numeroDocumento,
        ...(params.licenciaNumero !== undefined
          ? { arrendatarioLicenciaNumero: params.licenciaNumero.trim() || null }
          : {}),
        ...(licCatValida ? { arrendatarioLicenciaCategoria: licCatValida } : {}),
        ...(params.ciudadExpedicion !== undefined
          ? { arrendatarioCiudadExpedicion: params.ciudadExpedicion.trim() || null }
          : {}),
        ...(params.domicilio !== undefined
          ? { arrendatarioDomicilio: params.domicilio.trim() || null }
          : {}),
        ...(params.nombreCompleto?.trim()
          ? { arrendatarioNombre: params.nombreCompleto.trim() }
          : {}),
        ...(params.telefono?.trim()
          ? { arrendatarioTelefono: params.telefono.trim() }
          : {}),
        ...(params.correo !== undefined
          ? { arrendatarioCorreo: params.correo.trim() || null }
          : {}),
        actualizadoEn: ahora,
      })
      .where(eq(contratosAlquiler.reservaId, reservaVinculada.id));
  }

  if (usuarioIdDestino) {
    const existe = await db
      .select()
      .from(verificacionesIdentidad)
      .where(eq(verificacionesIdentidad.usuarioId, usuarioIdDestino))
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
        .where(eq(verificacionesIdentidad.usuarioId, usuarioIdDestino));
    } else {
      const id = `kyc-${crypto.randomUUID().slice(0, 8)}`;
      await db.insert(verificacionesIdentidad).values({
        id,
        usuarioId: usuarioIdDestino,
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
  }

  return { ok: true };
}

export * from './ciclo-alquiler-transiciones';

