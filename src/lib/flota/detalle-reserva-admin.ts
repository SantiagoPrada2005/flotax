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
  type ZonaEvidenciaVehiculo,
} from '@/db/schema';
import { resolverUrlMultimediaR2 } from '@/lib/media/r2-vehiculo-keys';
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
  inspeccionEntregaFechaISO: string | null;
  inspeccionDevolucionFechaISO: string | null;
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

export async function obtenerDetalleReservaAdminD1(
  db: AppDb | undefined,
  codigo: string,
  localId: string
): Promise<DetalleReservaAdminContext> {
  const vacio: DetalleReservaAdminContext = {
    fotosEntrega: [],
    fotosDevolucion: [],
    pagosHistorial: [],
    contrato: null,
    garantia: null,
    eventos: [],
    inspeccionEntregaFechaISO: null,
    inspeccionDevolucionFechaISO: null,
  };

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
          .orderBy(asc(multimediaVehiculo.ordenVisual), asc(multimediaVehiculo.capturadoEn)),
        contratoRow
          ? db
              .select()
              .from(movimientosCaja)
              .where(
                and(
                  eq(movimientosCaja.localId, localId),
                  eq(movimientosCaja.contratoId, contratoRow.id)
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
                eq(depositosGarantia.contratoId, reservaRow.codigo)
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
          .orderBy(asc(inspeccionesPericiales.creadoEn)),
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
          cobrosAdicionalesLineas: parsearLineasCobrosAdicionales(
            contratoRow.detalleOtrosCargos,
            contratoRow.cargosOtrosLocal
          ),
          ajusteDescuentoLocal: contratoRow.ajusteDescuentoLocal,
          totalLiquidado: contratoRow.totalLiquidado,
          totalPagado: contratoRow.totalPagado,
          saldoPendiente: contratoRow.saldoPendiente,
        }
      : null;

    const inspEntrega = inspeccionesRows.find((i) => i.tipoActo === 'ENTREGA');
    const inspDevolucion = inspeccionesRows.find((i) => i.tipoActo === 'RECEPCION');

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
