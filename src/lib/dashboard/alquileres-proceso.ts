import { and, eq, inArray } from 'drizzle-orm';
import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import {
  reservas,
  vehiculos,
  contratosAlquiler,
  inspeccionesPericiales,
  verificacionesIdentidad,
  type ReservaSelect,
  type VehiculoSelect,
  type ContratoAlquilerSelect,
  type InspeccionPericialSelect,
  type VerificacionIdentidad,
} from '@/db/schema';

export type EstadoAlquilerEnProceso = 'PAUSADO' | 'EN_PROCESO' | 'COMPLETADO';

export type EstadoPasoContrato =
  | 'COMPLETADO'
  | 'EN_PROCESO'
  | 'PAUSADO'
  | 'PENDIENTE';

export interface PasoProcesoContrato {
  readonly id: string;
  readonly titulo: string;
  readonly detalle: string;
  readonly estado: EstadoPasoContrato;
}

export interface TiemposConfigAlquilerEnProceso {
  readonly ocultarCompletadoHoras: number;
  readonly pausadoSinRespuestaHoras: number;
}

export const DEFAULT_TIEMPOS_ALQUILER_PROCESO: TiemposConfigAlquilerEnProceso = {
  ocultarCompletadoHoras: 4,
  pausadoSinRespuestaHoras: 12,
};

export interface AlquilerEnProcesoItem {
  readonly id: ReservaSelect['id'];
  readonly codigoContrato?: ContratoAlquilerSelect['numeroContrato'] | undefined;
  readonly clienteNombre: ReservaSelect['contactoNombre'];
  readonly clienteDocumento: ReservaSelect['contactoNumeroDocumento'];
  readonly placa: VehiculoSelect['placa'];
  readonly imagenUrl: VehiculoSelect['imagenUrl'];
  readonly estado: EstadoAlquilerEnProceso;
  readonly etapaActualResumen?: string | undefined;
  readonly pasosProceso?: readonly PasoProcesoContrato[] | undefined;
  /** ISO timestamp de inicio de espera de respuesta final (para evaluar >12h -> PAUSADO) */
  readonly esperandoRespuestaDesde?: string | null | undefined;
  /** ISO timestamp de finalización (para ocultar COMPLETADO después de 4h) */
  readonly completadoEn?: string | null | undefined;
}

const ORDEN_PRIORIDAD_ESTADO: Record<EstadoAlquilerEnProceso, number> = {
  PAUSADO: 0,
  EN_PROCESO: 1,
  COMPLETADO: 2,
};

export function resolverYOrdenarAlquileres(
  items: readonly AlquilerEnProcesoItem[],
  config: TiemposConfigAlquilerEnProceso = DEFAULT_TIEMPOS_ALQUILER_PROCESO,
  ahoraMs: number = Date.now()
): AlquilerEnProcesoItem[] {
  const maxCompletadoMs = config.ocultarCompletadoHoras * 3600_000;
  const maxSinRespuestaMs = config.pausadoSinRespuestaHoras * 3600_000;

  return items
    .map((item): AlquilerEnProcesoItem => {
      if (item.estado === 'EN_PROCESO' && item.esperandoRespuestaDesde) {
        const esperaMs =
          ahoraMs - new Date(item.esperandoRespuestaDesde).getTime();
        if (Number.isFinite(esperaMs) && esperaMs >= maxSinRespuestaMs) {
          return { ...item, estado: 'PAUSADO' };
        }
      }
      return item;
    })
    .filter((item) => {
      if (item.estado === 'COMPLETADO' && item.completadoEn) {
        const transcurridoMs =
          ahoraMs - new Date(item.completadoEn).getTime();
        if (
          Number.isFinite(transcurridoMs) &&
          transcurridoMs >= maxCompletadoMs
        ) {
          return false;
        }
      }
      return true;
    })
    .sort(
      (a, b) =>
        ORDEN_PRIORIDAD_ESTADO[a.estado] - ORDEN_PRIORIDAD_ESTADO[b.estado]
    );
}

export interface MapearReservaAAlquilerEnProcesoParams {
  reserva: ReservaSelect;
  vehiculo: Pick<VehiculoSelect, 'placa' | 'imagenUrl'> | null;
  contrato: Pick<
    ContratoAlquilerSelect,
    | 'numeroContrato'
    | 'estadoContrato'
    | 'totalPagado'
    | 'firmaArrendatarioR2Key'
    | 'fechaHoraEntregaReal'
    | 'actualizadoEn'
  > | null;
  inspeccionEntrega: Pick<
    InspeccionPericialSelect,
    'iniciadaEn' | 'finalizadaEn'
  > | null;
  verificacion: Pick<VerificacionIdentidad, 'estado'> | null;
}

/**
 * Transforma una reserva activa de D1 con sus entidades jurídicas y periciales asociadas
 * en un ítem normalizado para el panel de "Alquiler en proceso".
 */
export function mapearReservaAAlquilerEnProceso(
  params: MapearReservaAAlquilerEnProcesoParams
): AlquilerEnProcesoItem {
  const { reserva, vehiculo, contrato, inspeccionEntrega, verificacion } = params;

  // Paso 1: KYC (Verificación de Cédula y Licencia)
  let estadoKyc: EstadoPasoContrato = 'PENDIENTE';
  let detalleKyc = 'Pendiente de validación';

  if (
    verificacion?.estado === 'APROBADO' ||
    (contrato?.estadoContrato === 'VIGENTE' && contrato?.fechaHoraEntregaReal)
  ) {
    estadoKyc = 'COMPLETADO';
    detalleKyc = 'Identidad validada';
  } else if (verificacion?.estado === 'EN_REVISION') {
    estadoKyc = 'EN_PROCESO';
    detalleKyc = 'En revisión de documentos';
  } else if (verificacion?.estado === 'RECHAZADO') {
    estadoKyc = 'PAUSADO';
    detalleKyc = 'Documentos rechazados';
  }

  // Paso 2: Abono y Garantía
  let estadoAbono: EstadoPasoContrato = 'PENDIENTE';
  let detalleAbono = 'Pendiente de abono';

  if (
    reserva.montoAbonoReportado > 0 ||
    (contrato?.totalPagado ?? 0) > 0 ||
    (contrato?.estadoContrato === 'VIGENTE' && contrato?.fechaHoraEntregaReal)
  ) {
    estadoAbono = 'COMPLETADO';
    detalleAbono =
      (contrato?.totalPagado ?? 0) > 0
        ? 'Liquidado en caja'
        : 'Abono confirmado';
  } else if (reserva.estado === 'CONFIRMADA' || reserva.estado === 'EN_CURSO') {
    estadoAbono = 'COMPLETADO';
    detalleAbono = 'Abono confirmado';
  }

  // Paso 3: Inspección Pericial Fotográfica
  let estadoPeritaje: EstadoPasoContrato = 'PENDIENTE';
  let detallePeritaje = 'Pendiente de inicio';

  if (inspeccionEntrega?.finalizadaEn) {
    estadoPeritaje = 'COMPLETADO';
    detallePeritaje = 'Acta R2 sellada';
  } else if (inspeccionEntrega?.iniciadaEn) {
    estadoPeritaje = 'EN_PROCESO';
    detallePeritaje = 'Capturando evidencia en patio';
  } else if (
    contrato?.estadoContrato === 'VIGENTE' &&
    contrato?.fechaHoraEntregaReal
  ) {
    estadoPeritaje = 'COMPLETADO';
    detallePeritaje = 'Acta R2 sellada';
  }

  // Paso 4: Firma de Contrato y Entrega
  let estadoFirma: EstadoPasoContrato = 'PENDIENTE';
  let detalleFirma = 'Pendiente de firma final';

  if (
    contrato?.estadoContrato === 'VIGENTE' &&
    contrato?.fechaHoraEntregaReal
  ) {
    estadoFirma = 'COMPLETADO';
    detalleFirma = 'Contrato firmado y llaves entregadas';
  } else if (contrato?.firmaArrendatarioR2Key) {
    estadoFirma = 'EN_PROCESO';
    detalleFirma = 'Firma registrada, entrega pendiente';
  } else if (estadoPeritaje === 'COMPLETADO' && contrato) {
    estadoFirma = 'EN_PROCESO';
    detalleFirma = 'Pendiente de firma arrendatario';
  }

  // Estado general del alquiler en proceso
  let estado: EstadoAlquilerEnProceso = 'EN_PROCESO';
  let completadoEn: string | null = null;
  let esperandoRespuestaDesde: string | null = null;

  const esCompletado =
    contrato?.estadoContrato === 'VIGENTE' &&
    contrato?.fechaHoraEntregaReal !== null &&
    contrato?.fechaHoraEntregaReal !== undefined;

  if (esCompletado && contrato?.fechaHoraEntregaReal) {
    estado = 'COMPLETADO';
    const fechaEntrega = contrato.fechaHoraEntregaReal;
    completadoEn =
      fechaEntrega instanceof Date
        ? fechaEntrega.toISOString()
        : new Date(fechaEntrega).toISOString();
  } else if (
    verificacion?.estado === 'RECHAZADO' ||
    contrato?.estadoContrato === 'ANULADO'
  ) {
    estado = 'PAUSADO';
  } else {
    estado = 'EN_PROCESO';
    if (contrato && !contrato.firmaArrendatarioR2Key) {
      const baseDate = inspeccionEntrega?.finalizadaEn ?? contrato.actualizadoEn;
      esperandoRespuestaDesde =
        baseDate instanceof Date
          ? baseDate.toISOString()
          : new Date(baseDate).toISOString();
    } else if (inspeccionEntrega?.finalizadaEn && !contrato?.fechaHoraEntregaReal) {
      const baseDate = inspeccionEntrega.finalizadaEn;
      esperandoRespuestaDesde =
        baseDate instanceof Date
          ? baseDate.toISOString()
          : new Date(baseDate).toISOString();
    }
  }

  // Resumen textual de la etapa actual
  let etapaActualResumen: string;
  if (estado === 'COMPLETADO') {
    etapaActualResumen = 'Contrato activo • Llaves entregadas';
  } else if (estado === 'PAUSADO') {
    etapaActualResumen =
      verificacion?.estado === 'RECHAZADO'
        ? 'Documentos rechazados'
        : 'Proceso de alquiler pausado';
  } else if (estadoFirma === 'EN_PROCESO') {
    etapaActualResumen = 'Firma de contrato y entrega';
  } else if (estadoPeritaje === 'EN_PROCESO') {
    etapaActualResumen = 'Peritaje fotográfico en patio';
  } else if (estadoPeritaje === 'COMPLETADO') {
    etapaActualResumen = 'Pendiente de firma de contrato';
  } else if (estadoAbono === 'COMPLETADO') {
    etapaActualResumen = 'Pendiente de peritaje en patio';
  } else if (estadoKyc === 'EN_PROCESO') {
    etapaActualResumen = 'Validación de documentos';
  } else {
    etapaActualResumen = 'Validación inicial de reserva';
  }

  const pasosProceso: readonly PasoProcesoContrato[] = [
    {
      id: 'kyc',
      titulo: '1. Verificación C.C. y Licencia',
      detalle: detalleKyc,
      estado: estadoKyc,
    },
    {
      id: 'abono',
      titulo: '2. Abono y Depósito de Garantía',
      detalle: detalleAbono,
      estado: estadoAbono,
    },
    {
      id: 'peritaje',
      titulo: '3. Inspección Pericial Fotográfica',
      detalle: detallePeritaje,
      estado: estadoPeritaje,
    },
    {
      id: 'firma',
      titulo: '4. Firma de Contrato y Entrega',
      detalle: detalleFirma,
      estado: estadoFirma,
    },
  ];

  return {
    id: reserva.id,
    codigoContrato: contrato?.numeroContrato ?? reserva.codigo,
    clienteNombre: reserva.contactoNombre,
    clienteDocumento: reserva.contactoNumeroDocumento,
    placa: vehiculo?.placa ?? 'SIN-PLACA',
    imagenUrl: vehiculo?.imagenUrl ?? '/images/vehiculos/mazda-cx30.webp',
    estado,
    etapaActualResumen,
    pasosProceso,
    esperandoRespuestaDesde,
    completadoEn,
  };
}

/**
 * Consulta en D1 las reservas en curso del local ('PENDIENTE', 'CONFIRMADA', 'EN_CURSO')
 * y las ensambla con vehículos, contratos, inspecciones y verificaciones KYC,
 * ordenándolas según prioridad y expiración temporal.
 */
export async function listarAlquileresEnProcesoD1(
  db: AppDb | undefined,
  localId: string
): Promise<AlquilerEnProcesoItem[]> {
  if (!db || !localId) {
    return [];
  }

  try {
    const rows = await db
      .select({
        reserva: reservas,
        vehiculoPlaca: vehiculos.placa,
        vehiculoImagenUrl: vehiculos.imagenUrl,
        contratoNumeroContrato: contratosAlquiler.numeroContrato,
        contratoEstadoContrato: contratosAlquiler.estadoContrato,
        contratoTotalPagado: contratosAlquiler.totalPagado,
        contratoFirmaArrendatarioR2Key: contratosAlquiler.firmaArrendatarioR2Key,
        contratoFechaHoraEntregaReal: contratosAlquiler.fechaHoraEntregaReal,
        contratoActualizadoEn: contratosAlquiler.actualizadoEn,
      })
      .from(reservas)
      .leftJoin(vehiculos, eq(reservas.vehiculoId, vehiculos.id))
      .leftJoin(contratosAlquiler, eq(reservas.id, contratosAlquiler.reservaId))
      .where(
        and(
          eq(reservas.localId, localId),
          inArray(reservas.estado, ['PENDIENTE', 'CONFIRMADA', 'EN_CURSO'])
        )
      )
      .all();

    if (rows.length === 0) {
      return [];
    }

    const reservaIds = rows.map((r) => r.reserva.id);
    const clienteIds = Array.from(
      new Set(
        rows
          .map((r) => r.reserva.clienteId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );

    const [inspecciones, verificaciones] = await Promise.all([
      db
        .select({
          reservaId: inspeccionesPericiales.reservaId,
          iniciadaEn: inspeccionesPericiales.iniciadaEn,
          finalizadaEn: inspeccionesPericiales.finalizadaEn,
        })
        .from(inspeccionesPericiales)
        .where(
          and(
            inArray(inspeccionesPericiales.reservaId, reservaIds),
            eq(inspeccionesPericiales.tipoActo, 'ENTREGA')
          )
        )
        .all(),
      clienteIds.length > 0
        ? db
            .select({
              usuarioId: verificacionesIdentidad.usuarioId,
              estado: verificacionesIdentidad.estado,
            })
            .from(verificacionesIdentidad)
            .where(inArray(verificacionesIdentidad.usuarioId, clienteIds))
            .all()
        : Promise.resolve([]),
    ]);

    const inspeccionesPorReserva = new Map<
      string,
      Pick<InspeccionPericialSelect, 'iniciadaEn' | 'finalizadaEn'>
    >();
    for (const insp of inspecciones) {
      if (insp.reservaId && !inspeccionesPorReserva.has(insp.reservaId)) {
        inspeccionesPorReserva.set(insp.reservaId, {
          iniciadaEn: insp.iniciadaEn,
          finalizadaEn: insp.finalizadaEn,
        });
      }
    }

    const verificacionesPorUsuario = new Map<
      string,
      Pick<VerificacionIdentidad, 'estado'>
    >();
    for (const verif of verificaciones) {
      if (verif.usuarioId && !verificacionesPorUsuario.has(verif.usuarioId)) {
        verificacionesPorUsuario.set(verif.usuarioId, {
          estado: verif.estado,
        });
      }
    }

    const items: AlquilerEnProcesoItem[] = rows.map((row) => {
      const inspeccion = inspeccionesPorReserva.get(row.reserva.id) ?? null;
      const verificacion = row.reserva.clienteId
        ? verificacionesPorUsuario.get(row.reserva.clienteId) ?? null
        : null;

      const vehiculo =
        row.vehiculoPlaca && row.vehiculoImagenUrl
          ? {
              placa: row.vehiculoPlaca,
              imagenUrl: row.vehiculoImagenUrl,
            }
          : null;

      const contrato =
        row.contratoNumeroContrato &&
        row.contratoEstadoContrato &&
        row.contratoActualizadoEn
          ? {
              numeroContrato: row.contratoNumeroContrato,
              estadoContrato: row.contratoEstadoContrato,
              totalPagado: row.contratoTotalPagado ?? 0,
              firmaArrendatarioR2Key: row.contratoFirmaArrendatarioR2Key ?? null,
              fechaHoraEntregaReal: row.contratoFechaHoraEntregaReal ?? null,
              actualizadoEn: row.contratoActualizadoEn,
            }
          : null;

      return mapearReservaAAlquilerEnProceso({
        reserva: row.reserva,
        vehiculo,
        contrato,
        inspeccionEntrega: inspeccion,
        verificacion,
      });
    });

    return resolverYOrdenarAlquileres(items);
  } catch (error) {
    logFalloD1('dashboard.alquileresProceso.select', error, { localId });
    return [];
  }
}
