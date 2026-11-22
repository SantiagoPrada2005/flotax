import type { R2Bucket } from '@cloudflare/workers-types';
import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import {
  contratosAlquiler,
  depositosGarantia,
  eventosAlquiler,
  inspeccionesPericiales,
  movimientosCaja,
  multimediaVehiculo,
  reservas,
  user,
  type ZonaEvidenciaVehiculo,
} from '@/db/schema';
import {
  construirClaveR2MultimediaVehiculo,
  resolverUrlMultimediaR2,
} from '@/lib/media/r2-vehiculo-keys';
import { obtenerReservaPorCodigoD1 } from './repositorio-reservas';
import type { ReservaClienteItem } from './reservas-cliente';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';

export interface FotoInspeccionItem {
  id: string;
  url: string;
  r2Key: string;
  etapaOperativa: 'ENTREGA_SALIDA' | 'DEVOLUCION_RETORNO';
  zonaEvidencia: ZonaEvidenciaVehiculo;
  capturadoEnISO: string | null;
  observacion: string | null;
}

export interface MovimientoPagoItem {
  id: string;
  fechaISO: string;
  monto: number;
  metodoPago: string;
  concepto: string;
  categoria: string;
  tipo: 'INGRESO' | 'EGRESO' | 'TRANSFERENCIA';
  referencia: string | null;
  estado: string;
}

export interface LineaCobroAdicionalItem {
  id: string;
  concepto: string;
  valor: number;
  nota: string;
  zona: string;
  evidenciaId?: string | undefined;
  evidenciaUrl?: string | undefined;
  registradoPorId?: string | undefined;
  registradoPorNombre?: string | undefined;
  registradoEnISO?: string | undefined;
}

export interface RevisionZonaResultadoItem {
  codigo: string;
  nombre: string;
  estado: 'BIEN' | 'CON_NOVEDAD' | 'NO_APLICA';
  observacion?: string | undefined;
  multimediaIds?: string[] | undefined;
}

export interface EventoTimelineItem {
  id: string;
  tipoEvento: string;
  fechaISO: string;
  descripcion: string | null;
}

export interface GarantiaDetalleAdmin {
  id: string;
  montoEsperado: number;
  montoRecibido: number;
  montoDevuelto: number;
  montoRetenido: number;
  saldoComprometido: number;
  estado: string;
  motivoRetencion: string | null;
}

export interface ContratoDetalleAdmin {
  id: string;
  numeroContrato: string;
  estadoContrato: string;
  estadoPago: string;
  fechaHoraEntregaRealISO: string | null;
  fechaHoraDevolucionPactadaISO: string | null;
  fechaHoraDevolucionRealISO: string | null;
  canonDiarioPactado: number;
  subtotalCanon: number;
  coberturaPericial: number;
  cargosMora: number;
  cargosNovedadesDanos: number;
  cargosCombustibleLavado: number;
  cargosOtrosLocal: number;
  cobrosAdicionalesLineas: LineaCobroAdicionalItem[];
  ajusteDescuentoLocal: number;
  totalLiquidado: number;
  totalPagado: number;
  saldoPendiente: number;
}

export interface DetalleReservaAdminContext {
  fotosEntrega: FotoInspeccionItem[];
  fotosDevolucion: FotoInspeccionItem[];
  pagosHistorial: MovimientoPagoItem[];
  contrato: ContratoDetalleAdmin | null;
  garantia: GarantiaDetalleAdmin | null;
  eventos: EventoTimelineItem[];
  revisionDevolucion: RevisionZonaResultadoItem[];
  inspeccionEntregaFechaISO: string | null;
  inspeccionDevolucionFechaISO: string | null;
}

export interface DetalleCompletoAlquilerResponse {
  ok: true;
  reserva: ReservaClienteItem;
  detalleAdmin: DetalleReservaAdminContext;
  actualizadoEn: string;
}

export function parsearLineasCobrosAdicionales(
  detalleOtrosCargos: string | null | undefined,
  cargosOtrosFallback = 0
): LineaCobroAdicionalItem[] {
  if (detalleOtrosCargos && detalleOtrosCargos.trim().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(detalleOtrosCargos);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null && 'concepto' in item && 'valor' in item
          )
          .map((item, idx) => ({
            id: typeof item.id === 'string' ? item.id : `cobro-${idx + 1}`,
            concepto: String(item.concepto || 'Cobro adicional'),
            valor: Math.max(0, Math.round(Number(item.valor) || 0)),
            nota: typeof item.nota === 'string' ? item.nota : '',
            zona: typeof item.zona === 'string' ? item.zona : 'General',
            evidenciaId: typeof item.evidenciaId === 'string' ? item.evidenciaId : undefined,
            evidenciaUrl: typeof item.evidenciaUrl === 'string' ? item.evidenciaUrl : undefined,
            registradoPorId:
              typeof item.registradoPorId === 'string' ? item.registradoPorId : undefined,
            registradoPorNombre:
              typeof item.registradoPorNombre === 'string'
                ? item.registradoPorNombre
                : undefined,
            registradoEnISO:
              typeof item.registradoEnISO === 'string' ? item.registradoEnISO : undefined,
          }));
      }
    } catch {
      // Fallback a texto plano abajo
    }
  }

  if (detalleOtrosCargos && detalleOtrosCargos.trim().length > 0 && cargosOtrosFallback > 0) {
    return [
      {
        id: 'cobro-legacy-1',
        concepto: detalleOtrosCargos.trim(),
        valor: cargosOtrosFallback,
        nota: '',
        zona: 'General',
      },
    ];
  }

  return [];
}

function toSafeISO(val: Date | number | string | null | undefined): string | null {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function crearDetalleReservaAdminVacio(): DetalleReservaAdminContext {
  return {
    fotosEntrega: [],
    fotosDevolucion: [],
    pagosHistorial: [],
    contrato: null,
    garantia: null,
    eventos: [],
    revisionDevolucion: [],
    inspeccionEntregaFechaISO: null,
    inspeccionDevolucionFechaISO: null,
  };
}

export async function obtenerDetalleReservaAdminD1(
  db: AppDb | undefined,
  codigo: string,
  localId: string
): Promise<DetalleReservaAdminContext> {
  const vacio = crearDetalleReservaAdminVacio();

  if (!db || !codigo) return vacio;

  const codigoNorm = codigo.trim().toUpperCase();

  try {
    const resRows = await db
      .select({
        id: reservas.id,
        codigo: reservas.codigo,
        localId: reservas.localId,
        fechaDevolucionReal: reservas.fechaDevolucionReal,
      })
      .from(reservas)
      .where(and(eq(reservas.codigo, codigoNorm), eq(reservas.localId, localId)))
      .limit(1);

    const reservaRow = resRows[0];
    if (!reservaRow) return vacio;

    const contratoRows = await db
      .select()
      .from(contratosAlquiler)
      .where(eq(contratosAlquiler.reservaId, reservaRow.id))
      .limit(1);
    const contratoRow = contratoRows[0] ?? null;

    // Asociar movimientos de caja por todos los identificadores posibles del alquiler
    const idsMovimiento = Array.from(
      new Set(
        [
          contratoRow?.id,
          contratoRow?.numeroContrato,
          reservaRow.codigo,
          reservaRow.id,
        ].filter((v): v is string => Boolean(v && v.trim().length > 0))
      )
    );

    const [multimediaRows, movimientosRows, garantiaRows, eventosRows, inspeccionesRows] =
      await Promise.all([
        db
          .select()
          .from(multimediaVehiculo)
          .where(
            and(
              eq(multimediaVehiculo.reservaId, reservaRow.id),
              inArray(multimediaVehiculo.etapaOperativa, ['ENTREGA_SALIDA', 'DEVOLUCION_RETORNO'])
            )
          )
          .orderBy(desc(multimediaVehiculo.capturadoEn), asc(multimediaVehiculo.ordenVisual)),
        idsMovimiento.length > 0
          ? db
              .select()
              .from(movimientosCaja)
              .where(
                and(
                  eq(movimientosCaja.localId, localId),
                  inArray(movimientosCaja.contratoId, idsMovimiento)
                )
              )
              .orderBy(desc(movimientosCaja.fechaMovimiento))
          : Promise.resolve([]),
        db
          .select()
          .from(depositosGarantia)
          .where(
            and(
              eq(depositosGarantia.localId, localId),
              or(
                eq(depositosGarantia.contratoId, contratoRow?.id ?? ''),
                eq(depositosGarantia.contratoId, contratoRow?.numeroContrato ?? ''),
                eq(depositosGarantia.contratoId, reservaRow.codigo),
                eq(depositosGarantia.contratoId, reservaRow.id)
              )
            )
          )
          .limit(1),
        db
          .select()
          .from(eventosAlquiler)
          .where(eq(eventosAlquiler.reservaId, reservaRow.id))
          .orderBy(asc(eventosAlquiler.creadoEn)),
        db
          .select()
          .from(inspeccionesPericiales)
          .where(eq(inspeccionesPericiales.reservaId, reservaRow.id))
          .orderBy(desc(inspeccionesPericiales.creadoEn)),
      ]);

    const fotosEntrega: FotoInspeccionItem[] = [];
    const fotosDevolucion: FotoInspeccionItem[] = [];

    for (const m of multimediaRows) {
      if (m.tipoMedio !== 'IMAGEN') continue;
      const item: FotoInspeccionItem = {
        id: m.id,
        url: resolverUrlMultimediaR2(m.r2Key),
        r2Key: m.r2Key,
        etapaOperativa:
          m.etapaOperativa === 'DEVOLUCION_RETORNO' ? 'DEVOLUCION_RETORNO' : 'ENTREGA_SALIDA',
        zonaEvidencia: m.zonaEvidencia,
        capturadoEnISO: toSafeISO(m.capturadoEn),
        observacion: m.observacion ?? null,
      };
      if (item.etapaOperativa === 'DEVOLUCION_RETORNO') {
        fotosDevolucion.push(item);
      } else {
        fotosEntrega.push(item);
      }
    }

    const pagosHistorial: MovimientoPagoItem[] = movimientosRows.map((mov) => ({
      id: mov.id,
      fechaISO: toSafeISO(mov.fechaMovimiento) ?? new Date().toISOString(),
      monto: mov.monto,
      metodoPago: mov.metodoPago,
      concepto: mov.concepto,
      categoria: mov.categoria,
      tipo: mov.tipo,
      referencia: mov.referencia ?? null,
      estado: mov.estado,
    }));

    const garRow = garantiaRows[0] ?? null;
    const garantia: GarantiaDetalleAdmin | null = garRow
      ? {
          id: garRow.id,
          montoEsperado: garRow.montoEsperado,
          montoRecibido: garRow.montoRecibido,
          montoDevuelto: garRow.montoDevuelto,
          montoRetenido: garRow.montoRetenido,
          saldoComprometido: garRow.saldoComprometido,
          estado: garRow.estado,
          motivoRetencion: garRow.motivoRetencion ?? null,
        }
      : null;

    // Parsear cobros adicionales y completar nombres de operadores faltantes desde tabla user
    let cobrosAdicionalesLineas = contratoRow
      ? parsearLineasCobrosAdicionales(contratoRow.detalleOtrosCargos, contratoRow.cargosOtrosLocal)
      : [];

    const idsSinNombre = Array.from(
      new Set(
        cobrosAdicionalesLineas
          .filter((l) => l.registradoPorId && !l.registradoPorNombre)
          .map((l) => l.registradoPorId!)
      )
    );

    if (idsSinNombre.length > 0) {
      const usuariosCobros = await db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(inArray(user.id, idsSinNombre));
      const mapaNombres = new Map(usuariosCobros.map((u) => [u.id, u.name]));
      cobrosAdicionalesLineas = cobrosAdicionalesLineas.map((linea) => ({
        ...linea,
        registradoPorNombre:
          linea.registradoPorNombre ??
          (linea.registradoPorId ? mapaNombres.get(linea.registradoPorId) : undefined),
      }));
    }

    const contrato: ContratoDetalleAdmin | null = contratoRow
      ? {
          id: contratoRow.id,
          numeroContrato: contratoRow.numeroContrato,
          estadoContrato: contratoRow.estadoContrato,
          estadoPago: contratoRow.estadoPago,
          fechaHoraEntregaRealISO: toSafeISO(contratoRow.fechaHoraEntregaReal),
          fechaHoraDevolucionPactadaISO: toSafeISO(contratoRow.fechaHoraDevolucionPactada),
          fechaHoraDevolucionRealISO: toSafeISO(contratoRow.fechaHoraDevolucionReal),
          canonDiarioPactado: contratoRow.canonDiarioPactado,
          subtotalCanon: contratoRow.subtotalCanon,
          coberturaPericial: contratoRow.coberturaPericial,
          cargosMora: contratoRow.cargosMora,
          cargosNovedadesDanos: contratoRow.cargosNovedadesDanos,
          cargosCombustibleLavado: contratoRow.cargosCombustibleLavado,
          cargosOtrosLocal: contratoRow.cargosOtrosLocal,
          cobrosAdicionalesLineas,
          ajusteDescuentoLocal: contratoRow.ajusteDescuentoLocal,
          totalLiquidado: contratoRow.totalLiquidado,
          totalPagado: contratoRow.totalPagado,
          saldoPendiente: contratoRow.saldoPendiente,
        }
      : null;

    const inspEntrega = inspeccionesRows.find((i) => i.tipoActo === 'ENTREGA');
    const inspDevolucion = inspeccionesRows.find((i) => i.tipoActo === 'RECEPCION');

    const revisionDevolucion: RevisionZonaResultadoItem[] = Array.isArray(
      inspDevolucion?.respuestasChecklist
    )
      ? inspDevolucion.respuestasChecklist.map((r) => ({
          codigo: r.codigo,
          nombre: r.nombre,
          estado: r.estado,
          observacion: r.observacion,
          multimediaIds: r.multimediaIds,
        }))
      : [];

    const eventos: EventoTimelineItem[] = eventosRows.map((ev) => ({
      id: ev.id,
      tipoEvento: ev.tipoEvento,
      fechaISO: toSafeISO(ev.creadoEn) ?? '',
      descripcion: ev.clausulaOTexto ?? null,
    }));

    return {
      fotosEntrega,
      fotosDevolucion,
      pagosHistorial,
      contrato,
      garantia,
      eventos,
      revisionDevolucion,
      inspeccionEntregaFechaISO: toSafeISO(inspEntrega?.finalizadaEn ?? inspEntrega?.iniciadaEn),
      inspeccionDevolucionFechaISO: toSafeISO(
        inspDevolucion?.finalizadaEn ?? inspDevolucion?.iniciadaEn
      ),
    };
  } catch (error) {
    logFalloD1('reservas.obtenerDetalleAdmin', error, { codigo: codigoNorm, localId });
    return vacio;
  }
}

/**
 * Obtiene en una sola consulta unificada los datos del alquiler (reserva, cliente, vehículo)
 * junto con todo el contexto administrativo (fotos con fecha, pagos, fechas reales, estado y factura).
 */
export async function obtenerDetalleCompletoAlquilerD1(
  db: AppDb | undefined,
  codigo: string,
  localId: string
): Promise<{
  reserva: ReservaClienteItem;
  detalleAdmin: DetalleReservaAdminContext;
} | null> {
  if (!db || !codigo) return null;
  const [reserva, detalleAdmin] = await Promise.all([
    obtenerReservaPorCodigoD1(db, codigo),
    obtenerDetalleReservaAdminD1(db, codigo, localId),
  ]);
  if (!reserva) return null;
  return { reserva, detalleAdmin };
}

export interface RegistrarFotoAlquilerParams {
  codigo?: string | undefined;
  reservaId?: string | undefined;
  localId: string;
  usuarioId: string;
  etapaOperativa: 'ENTREGA_SALIDA' | 'DEVOLUCION_RETORNO';
  zonaEvidencia: ZonaEvidenciaVehiculo;
  dataUrl: string;
  observacion?: string | undefined;
  ordenVisual?: number | undefined;
  capturadoEnISO?: string | undefined;
}

/**
 * Sube una fotografía individual de entrega o devolución a Cloudflare R2 (`BUCKET_MULTIMEDIA`)
 * y la registra en `multimedia_vehiculo` con fecha/hora exacta de captura.
 */
export async function registrarFotoAlquilerR2D1(
  db: AppDb,
  bucket: R2Bucket,
  params: RegistrarFotoAlquilerParams
): Promise<FotoInspeccionItem> {
  const codigoNorm = params.codigo?.trim().toUpperCase();
  const resMatch = await db
    .select({
      id: reservas.id,
      codigo: reservas.codigo,
      vehiculoId: reservas.vehiculoId,
      localId: reservas.localId,
    })
    .from(reservas)
    .where(
      and(
        eq(reservas.localId, params.localId),
        codigoNorm
          ? eq(reservas.codigo, codigoNorm)
          : eq(reservas.id, params.reservaId ?? '')
      )
    )
    .limit(1);

  const resRow = resMatch[0];
  if (!resRow) {
    throw new Error('Reserva no encontrada para el local activo.');
  }

  const matchData = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(params.dataUrl.trim());
  if (!matchData?.[1] || !matchData[2]) {
    throw new Error('Formato de fotografía no válido.');
  }

  const mimeType = matchData[1];
  const ext: 'webp' | 'png' | 'jpg' =
    mimeType === 'image/webp'
      ? 'webp'
      : mimeType === 'image/png'
        ? 'png'
        : 'jpg';

  const binaryStr = atob(matchData[2]);
  const bytes = new Uint8Array(binaryStr.length);
  for (let b = 0; b < binaryStr.length; b++) {
    bytes[b] = binaryStr.charCodeAt(b);
  }

  const contratoRows = await db
    .select({ id: contratosAlquiler.id })
    .from(contratosAlquiler)
    .where(eq(contratosAlquiler.reservaId, resRow.id))
    .limit(1);
  const contratoId = contratoRows[0]?.id ?? null;

  const fechaParsed = params.capturadoEnISO ? new Date(params.capturadoEnISO) : new Date();
  const capturadoEn = Number.isNaN(fechaParsed.getTime()) ? new Date() : fechaParsed;
  const ahora = new Date();

  const r2Key = construirClaveR2MultimediaVehiculo({
    localId: resRow.localId,
    vehiculoId: resRow.vehiculoId,
    reservaCodigo: resRow.codigo,
    etapaOperativa: params.etapaOperativa,
    zonaEvidencia: params.zonaEvidencia,
    extension: ext,
    timestampMs: ahora.getTime(),
  });

  await bucket.put(r2Key, bytes.buffer, {
    httpMetadata: { contentType: mimeType },
    customMetadata: {
      reservaCodigo: resRow.codigo,
      etapa: params.etapaOperativa,
      zona: params.zonaEvidencia,
      capturadoEn: capturadoEn.toISOString(),
    },
  });

  const prefijo = params.etapaOperativa === 'ENTREGA_SALIDA' ? 'med-ent' : 'med-dev';
  const mediaId = `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  await db.insert(multimediaVehiculo).values({
    id: mediaId,
    localId: resRow.localId,
    vehiculoId: resRow.vehiculoId,
    reservaId: resRow.id,
    contratoId,
    tipoMedio: 'IMAGEN',
    etapaOperativa: params.etapaOperativa,
    zonaEvidencia: params.zonaEvidencia,
    esPortadaCatalogo: false,
    ordenVisual: params.ordenVisual ?? 0,
    r2Key,
    mimeType,
    tamanoBytes: bytes.byteLength,
    observacion: params.observacion?.trim() || null,
    subidoPorId: params.usuarioId,
    capturadoEn,
    creadoEn: ahora,
  });

  return {
    id: mediaId,
    url: resolverUrlMultimediaR2(r2Key),
    r2Key,
    etapaOperativa: params.etapaOperativa,
    zonaEvidencia: params.zonaEvidencia,
    capturadoEnISO: capturadoEn.toISOString(),
    observacion: params.observacion?.trim() || null,
  };
}
