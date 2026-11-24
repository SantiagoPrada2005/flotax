import type { D1Database, KVNamespace, SendEmail } from '@cloudflare/workers-types';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { documentosVehiculo, rolesEmpleadoValidos, vehiculos } from '@/db/schema';
import { getDb } from '@/lib/db';
import {
  crearServicioNotificaciones,
  type EmisionNotificacion,
  type NotificacionesEnv,
} from '@/lib/notificaciones';
import { toClientISODate } from '@/lib/time/client-time';
import {
  evaluarResumenDocumentalVehiculo,
  formatearFechaDocumento,
  type EvaluacionDocumentoLegal,
} from './estados';

type RolEmpleado = (typeof rolesEmpleadoValidos)[number];

const ROLES_DESTINATARIOS_DOCUMENTOS: RolEmpleado[] = [
  'DUENO',
  'ADMIN',
  'ENCARGADO_FLOTA',
  'OPERATIVO',
];

export interface AlertaDocumentoProgramada {
  vehiculoId: string;
  localId: string;
  emision: EmisionNotificacion<'DOCUMENTO_POR_VENCER'>;
}

export interface EnvAlertasDocumentos {
  DB?: D1Database | undefined;
  SESSION?: KVNamespace | undefined;
  EMAIL?: SendEmail | undefined;
  EMAIL_DEFAULT_FROM?: string | undefined;
  EMAIL_AUTH_FROM?: string | undefined;
  BETTER_AUTH_URL?: string | undefined;
  VAPID_PUBLIC_KEY?: string | undefined;
  VAPID_PRIVATE_KEY?: string | undefined;
  VAPID_SUBJECT?: string | undefined;
}

function construirDedupeKeyAlerta(
  vehiculoId: string,
  ev: EvaluacionDocumentoLegal,
  hoyISO: string
): string {
  const vence = ev.fechaVencimiento ?? 'sin-fecha';
  if (ev.estado === 'PROXIMO_A_VENCER') {
    return `doc-alerta:${vehiculoId}:${ev.tipoDocumento}:${vence}:proximo`;
  }
  if (ev.estado === 'CUENTA_REGRESIVA') {
    return `doc-alerta:${vehiculoId}:${ev.tipoDocumento}:${vence}:countdown:${hoyISO}`;
  }
  return `doc-alerta:${vehiculoId}:${ev.tipoDocumento}:${vence}:pago:${hoyISO}`;
}

/**
 * Función pura que traduce una evaluación documental a una emisión de notificación si corresponde.
 */
export function construirEmisionAlertaDocumento(params: {
  vehiculoId: string;
  localId: string;
  etiquetaVehiculo: string;
  evaluacion: EvaluacionDocumentoLegal | null;
  hoyISO: string;
}): AlertaDocumentoProgramada | null {
  const ev = params.evaluacion;
  if (!ev || !ev.requiereNotificacion || !ev.fechaVencimiento) {
    return null;
  }

  if (
    ev.estado !== 'PROXIMO_A_VENCER' &&
    ev.estado !== 'CUENTA_REGRESIVA' &&
    ev.estado !== 'HOY_FECHA_PAGO'
  ) {
    return null;
  }

  const nombreDocumento =
    ev.tipoDocumento === 'SOAT' ? 'SOAT' : 'Revisión Tecnomecánica';
  const fechaVenceTexto = formatearFechaDocumento(ev.fechaVencimiento);
  const fechaPagoTexto = ev.fechaPago
    ? formatearFechaDocumento(ev.fechaPago)
    : fechaVenceTexto;

  return {
    vehiculoId: params.vehiculoId,
    localId: params.localId,
    emision: {
      tipo: 'DOCUMENTO_POR_VENCER',
      localId: params.localId,
      destino: {
        alcance: 'LOCAL_ROLES',
        localId: params.localId,
        roles: ROLES_DESTINATARIOS_DOCUMENTOS,
      },
      dedupeKey: construirDedupeKeyAlerta(params.vehiculoId, ev, params.hoyISO),
      payload: {
        vehiculo: params.etiquetaVehiculo,
        vehiculoId: params.vehiculoId,
        documento: nombreDocumento,
        vence: fechaVenceTexto,
        estado: ev.estado,
        fechaPago: fechaPagoTexto,
        diasRestantes: ev.diasParaPago ?? undefined,
      },
    },
  };
}

/**
 * Evalúa toda la flota activa (o un local específico) y emite notificaciones in-app, Push y Email
 * con deduplicación diaria determinista en `notificaciones.dedupe_key`.
 */
export async function ejecutarAlertasDiariasDocumentos(
  workerEnv: EnvAlertasDocumentos,
  opciones?: { localId?: string | undefined; hoyISO?: string | undefined }
): Promise<{ vehiculosEvaluados: number; alertasEmitidas: number }> {
  if (!workerEnv.DB) {
    return { vehiculosEvaluados: 0, alertasEmitidas: 0 };
  }

  const hoyISO = opciones?.hoyISO ?? toClientISODate();
  const db = getDb(workerEnv.DB);

  const condicionesVehiculo = [eq(vehiculos.activo, true)];
  if (opciones?.localId) {
    condicionesVehiculo.push(eq(vehiculos.localId, opciones.localId));
  }

  const flota = await db
    .select({
      id: vehiculos.id,
      localId: vehiculos.localId,
      marca: vehiculos.marca,
      modelo: vehiculos.modelo,
      placa: vehiculos.placa,
      categoria: vehiculos.categoria,
    })
    .from(vehiculos)
    .where(and(...condicionesVehiculo));

  const vehiculosConLocal = flota.filter(
    (v): v is typeof v & { localId: string } =>
      Boolean(v.localId) && v.categoria.toUpperCase() !== 'PATINETA'
  );

  if (vehiculosConLocal.length === 0) {
    return { vehiculosEvaluados: 0, alertasEmitidas: 0 };
  }

  const ids = vehiculosConLocal.map((v) => v.id);
  const docs = await db
    .select({
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
    })
    .from(documentosVehiculo)
    .where(
      and(
        inArray(documentosVehiculo.vehiculoId, ids),
        inArray(documentosVehiculo.tipoDocumento, ['SOAT', 'TECNICO_MECANICA'])
      )
    )
    .orderBy(desc(documentosVehiculo.fechaVencimiento));

  const docsPorVehiculo = new Map<string, typeof docs>();
  for (const doc of docs) {
    const lista = docsPorVehiculo.get(doc.vehiculoId) ?? [];
    lista.push(doc);
    docsPorVehiculo.set(doc.vehiculoId, lista);
  }

  const alertas: AlertaDocumentoProgramada[] = [];

  for (const v of vehiculosConLocal) {
    const resumen = evaluarResumenDocumentalVehiculo({
      categoria: v.categoria,
      documentos: docsPorVehiculo.get(v.id) ?? [],
      hoyISO,
    });

    const etiquetaVehiculo = `${v.marca} ${v.modelo} (${v.placa})`;

    for (const ev of [resumen.soat, resumen.tecnomecanica]) {
      const alerta = construirEmisionAlertaDocumento({
        vehiculoId: v.id,
        localId: v.localId,
        etiquetaVehiculo,
        evaluacion: ev,
        hoyISO,
      });
      if (alerta) {
        alertas.push(alerta);
      }
    }
  }

  if (alertas.length === 0) {
    return { vehiculosEvaluados: vehiculosConLocal.length, alertasEmitidas: 0 };
  }

  const notifEnv: NotificacionesEnv = {
    DB: workerEnv.DB,
    EMAIL: workerEnv.EMAIL,
    EMAIL_DEFAULT_FROM: workerEnv.EMAIL_DEFAULT_FROM,
    EMAIL_AUTH_FROM: workerEnv.EMAIL_AUTH_FROM,
    BETTER_AUTH_URL: workerEnv.BETTER_AUTH_URL,
    VAPID_PUBLIC_KEY: workerEnv.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: workerEnv.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: workerEnv.VAPID_SUBJECT,
  };
  const servicio = crearServicioNotificaciones(notifEnv);

  let alertasEmitidas = 0;
  for (const alerta of alertas) {
    const entregadas = await servicio.notificar(alerta.emision);
    if (entregadas > 0) {
      alertasEmitidas += 1;
    }
  }

  return {
    vehiculosEvaluados: vehiculosConLocal.length,
    alertasEmitidas,
  };
}

/**
 * Respaldo diario controlado por KV para entorno local o accesos previos al Cron Trigger.
 * Garantiza como máximo una corrida por local y por día calendario.
 */
export async function asegurarAlertasDiariasLocal(
  workerEnv: EnvAlertasDocumentos,
  localId: string,
  hoyISO: string = toClientISODate()
): Promise<void> {
  if (!workerEnv.DB || !localId) return;

  const kvKey = `doc-alerts-ran:${localId}:${hoyISO}`;
  try {
    if (workerEnv.SESSION) {
      const yaEjecutado = await workerEnv.SESSION.get(kvKey);
      if (yaEjecutado) return;
      await workerEnv.SESSION.put(kvKey, '1', { expirationTtl: 86400 });
    }
    await ejecutarAlertasDiariasDocumentos(workerEnv, { localId, hoyISO });
  } catch {
    // Ejecución best-effort para no bloquear la carga de UI
  }
}
