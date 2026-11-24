import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import {
  documentosVehiculo,
  type DocumentoVehiculoSelect,
} from '@/db/schema';
import { toClientISODate } from '@/lib/time/client-time';
import {
  evaluarResumenDocumentalVehiculo,
  type ResumenDocumentalVehiculo,
  type TipoDocumentoLegalObligatorio,
} from './estados';

export type CaraLicenciaTransito = 'frente' | 'reverso';

export interface GuardarDocumentoLegalParams {
  localId: string;
  vehiculoId: string;
  categoriaVehiculo?: string | null | undefined;
  tipoDocumento: TipoDocumentoLegalObligatorio;
  numeroReferencia: string;
  fechaExpedicion: string;
  fechaVencimiento: string;
  verificadoPorId: string;
  modo?: 'RENOVAR' | 'EDITAR' | undefined;
  hoyISO?: string | undefined;
}

const COLUMNAS_RESUMEN = {
  id: documentosVehiculo.id,
  vehiculoId: documentosVehiculo.vehiculoId,
  tipoDocumento: documentosVehiculo.tipoDocumento,
  numeroReferencia: documentosVehiculo.numeroReferencia,
  fechaExpedicion: documentosVehiculo.fechaExpedicion,
  fechaVencimiento: documentosVehiculo.fechaVencimiento,
  vigente: documentosVehiculo.vigente,
  archivoR2Key: documentosVehiculo.archivoR2Key,
  archivoReversoR2Key: documentosVehiculo.archivoReversoR2Key,
  actualizadoEn: documentosVehiculo.actualizadoEn,
};

/**
 * Obtiene y evalúa el resumen documental completo de un vehículo en Cloudflare D1.
 */
export async function obtenerResumenDocumentalVehiculoD1(
  db: DrizzleD1Database | AppDb,
  vehiculoId: string,
  categoria?: string | null,
  hoyISO: string = toClientISODate()
): Promise<ResumenDocumentalVehiculo> {
  try {
    const filas = await db
      .select(COLUMNAS_RESUMEN)
      .from(documentosVehiculo)
      .where(eq(documentosVehiculo.vehiculoId, vehiculoId))
      .orderBy(desc(documentosVehiculo.fechaVencimiento));

    return evaluarResumenDocumentalVehiculo({
      categoria,
      documentos: filas,
      hoyISO,
    });
  } catch (error) {
    logFalloD1('documentosVehiculo.obtenerResumen', error, { vehiculoId });
    return evaluarResumenDocumentalVehiculo({
      categoria,
      documentos: [],
      hoyISO,
    });
  }
}

/**
 * Consulta y evalúa en una sola query (sin N+1) el estado documental de toda una flota.
 */
export async function listarResumenesDocumentalesFlotaD1(
  db: DrizzleD1Database | AppDb | undefined,
  vehiculosLista: ReadonlyArray<{ id: string; categoria: string }>,
  hoyISO: string = toClientISODate()
): Promise<Record<string, ResumenDocumentalVehiculo>> {
  const resultado: Record<string, ResumenDocumentalVehiculo> = {};
  if (!db || vehiculosLista.length === 0) {
    for (const v of vehiculosLista) {
      resultado[v.id] = evaluarResumenDocumentalVehiculo({
        categoria: v.categoria,
        documentos: [],
        hoyISO,
      });
    }
    return resultado;
  }

  const ids = vehiculosLista.map((v) => v.id);

  try {
    const filas = await db
      .select(COLUMNAS_RESUMEN)
      .from(documentosVehiculo)
      .where(inArray(documentosVehiculo.vehiculoId, ids))
      .orderBy(desc(documentosVehiculo.fechaVencimiento));

    const porVehiculo = new Map<string, typeof filas>();
    for (const fila of filas) {
      const lista = porVehiculo.get(fila.vehiculoId) ?? [];
      lista.push(fila);
      porVehiculo.set(fila.vehiculoId, lista);
    }

    for (const v of vehiculosLista) {
      resultado[v.id] = evaluarResumenDocumentalVehiculo({
        categoria: v.categoria,
        documentos: porVehiculo.get(v.id) ?? [],
        hoyISO,
      });
    }
    return resultado;
  } catch (error) {
    logFalloD1('documentosVehiculo.listarResumenesFlota', error, {
      totalVehiculos: ids.length,
    });
    for (const v of vehiculosLista) {
      resultado[v.id] = evaluarResumenDocumentalVehiculo({
        categoria: v.categoria,
        documentos: [],
        hoyISO,
      });
    }
    return resultado;
  }
}

/**
 * Registra una renovación o actualiza el documento legal (SOAT / Tecnomecánica) activo.
 * Al renovar, marca las filas previas del mismo tipo con `vigente = false` para conservar historial.
 */
export async function guardarDocumentoLegalD1(
  db: AppDb,
  params: GuardarDocumentoLegalParams
): Promise<ResumenDocumentalVehiculo> {
  const ahora = new Date();
  const modo = params.modo ?? 'RENOVAR';

  const existentes = await db
    .select({
      id: documentosVehiculo.id,
      vigente: documentosVehiculo.vigente,
    })
    .from(documentosVehiculo)
    .where(
      and(
        eq(documentosVehiculo.vehiculoId, params.vehiculoId),
        eq(documentosVehiculo.tipoDocumento, params.tipoDocumento)
      )
    )
    .orderBy(desc(documentosVehiculo.actualizadoEn));

  const activoExistente = existentes.find((d) => d.vigente);

  if (modo === 'EDITAR' && activoExistente) {
    await db
      .update(documentosVehiculo)
      .set({
        numeroReferencia: params.numeroReferencia.trim(),
        fechaExpedicion: params.fechaExpedicion,
        fechaVencimiento: params.fechaVencimiento,
        vigente: true,
        verificadoPorId: params.verificadoPorId,
        actualizadoEn: ahora,
      })
      .where(eq(documentosVehiculo.id, activoExistente.id));
  } else {
    if (existentes.length > 0) {
      await db
        .update(documentosVehiculo)
        .set({ vigente: false, actualizadoEn: ahora })
        .where(
          and(
            eq(documentosVehiculo.vehiculoId, params.vehiculoId),
            eq(documentosVehiculo.tipoDocumento, params.tipoDocumento)
          )
        );
    }

    await db.insert(documentosVehiculo).values({
      id: `doc-${params.tipoDocumento.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
      localId: params.localId,
      vehiculoId: params.vehiculoId,
      tipoDocumento: params.tipoDocumento,
      numeroReferencia: params.numeroReferencia.trim(),
      fechaExpedicion: params.fechaExpedicion,
      fechaVencimiento: params.fechaVencimiento,
      vigente: true,
      verificadoPorId: params.verificadoPorId,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  return obtenerResumenDocumentalVehiculoD1(
    db,
    params.vehiculoId,
    params.categoriaVehiculo,
    params.hoyISO
  );
}

/**
 * Obtiene la fila de Licencia de Tránsito (`TARJETA_PROPIEDAD`) de un vehículo si existe.
 */
export async function obtenerLicenciaTransitoD1(
  db: AppDb,
  vehiculoId: string
): Promise<DocumentoVehiculoSelect | null> {
  const filas = await db
    .select()
    .from(documentosVehiculo)
    .where(
      and(
        eq(documentosVehiculo.vehiculoId, vehiculoId),
        eq(documentosVehiculo.tipoDocumento, 'TARJETA_PROPIEDAD')
      )
    )
    .orderBy(desc(documentosVehiculo.vigente), desc(documentosVehiculo.actualizadoEn))
    .limit(1);

  return filas[0] ?? null;
}

/**
 * Actualiza o limpia la clave R2 de una de las dos caras (frente/reverso) de la Licencia de Tránsito.
 * Retorna la clave R2 previa (si existía) para que el endpoint pueda purgarla de R2.
 */
export async function guardarClaveFotoLicenciaD1(
  db: AppDb,
  params: {
    localId: string;
    vehiculoId: string;
    cara: CaraLicenciaTransito;
    nuevaR2Key: string | null;
    verificadoPorId: string;
  }
): Promise<{ claveAnterior: string | null; documentoId: string }> {
  const ahora = new Date();
  const existente = await obtenerLicenciaTransitoD1(db, params.vehiculoId);

  if (!existente) {
    const nuevoId = `doc-licencia-${crypto.randomUUID().slice(0, 8)}`;
    await db.insert(documentosVehiculo).values({
      id: nuevoId,
      localId: params.localId,
      vehiculoId: params.vehiculoId,
      tipoDocumento: 'TARJETA_PROPIEDAD',
      vigente: true,
      archivoR2Key: params.cara === 'frente' ? params.nuevaR2Key : null,
      archivoReversoR2Key: params.cara === 'reverso' ? params.nuevaR2Key : null,
      verificadoPorId: params.verificadoPorId,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
    return { claveAnterior: null, documentoId: nuevoId };
  }

  const claveAnterior =
    params.cara === 'frente'
      ? existente.archivoR2Key ?? null
      : existente.archivoReversoR2Key ?? null;

  await db
    .update(documentosVehiculo)
    .set({
      ...(params.cara === 'frente'
        ? { archivoR2Key: params.nuevaR2Key }
        : { archivoReversoR2Key: params.nuevaR2Key }),
      vigente: true,
      verificadoPorId: params.verificadoPorId,
      actualizadoEn: ahora,
    })
    .where(eq(documentosVehiculo.id, existente.id));

  return { claveAnterior, documentoId: existente.id };
}
