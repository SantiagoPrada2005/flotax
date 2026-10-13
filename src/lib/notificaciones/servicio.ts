import { and, count, desc, eq, inArray, isNull, lt, or, type SQL } from 'drizzle-orm';
import type { AppDb } from '@/lib/db';
import {
  notificaciones,
  suscripcionesPush,
  type NotificacionInsert,
  type NotificacionSelect,
  type SuscripcionPushInsert,
} from '@/db/schema';
import type { ILogger } from '@/lib/logger';
import { resolverDestinatarios } from './destinatarios';
import type { CanalNotificacion, EntregaNotificacion } from './canales';
import { enLotes } from './lotes';
import { renderizarNotificacion } from './plantillas';
import type { DestinoNotificacion, PayloadPorTipo, TipoNotificacion } from './tipos';

/** Cuántas filas caben en un INSERT sin superar los 100 parámetros de D1. */
const FILAS_POR_INSERT = 8;

export interface EmisionNotificacion<K extends TipoNotificacion> {
  tipo: K;
  payload: PayloadPorTipo[K];
  destino: DestinoNotificacion;
  /** Patio al que pertenece el aviso. Omitir para avisos personales (modo cliente). */
  localId?: string | undefined;
  /** Usuario que originó el hecho: no se le notifica a sí mismo. */
  actorId?: string | undefined;
  /** Evita duplicar el mismo hecho para un mismo destinatario. */
  dedupeKey?: string | undefined;
}

/** Ámbito de lectura según el modo de portal activo del usuario. */
export interface AmbitoNotificaciones {
  usuarioId: string;
  /** Patio activo en modo operador; `null` en modo cliente. */
  localId: string | null;
}

export interface ConsultaNotificaciones {
  soloNoLeidas: boolean;
  limite: number;
  cursor?: string | undefined;
}

export interface PaginaNotificaciones {
  items: NotificacionSelect[];
  siguienteCursor: string | null;
}

function condicionAmbito(ambito: AmbitoNotificaciones): SQL | undefined {
  const propietario = eq(notificaciones.usuarioId, ambito.usuarioId);
  const lugar = ambito.localId
    ? or(isNull(notificaciones.localId), eq(notificaciones.localId, ambito.localId))
    : isNull(notificaciones.localId);
  return and(propietario, lugar);
}

function decodificarCursor(cursor: string): { fecha: Date; id: string } | null {
  const separador = cursor.indexOf(':');
  if (separador < 1) return null;
  const segundos = Number(cursor.slice(0, separador));
  if (!Number.isFinite(segundos)) return null;
  return { fecha: new Date(segundos * 1000), id: cursor.slice(separador + 1) };
}

export class ServicioNotificaciones {
  constructor(
    private readonly db: AppDb,
    private readonly canales: readonly CanalNotificacion[] = [],
    private readonly logger?: ILogger | undefined
  ) {}

  /**
   * Persiste el aviso para cada destinatario del scope y lo despacha a los canales externos.
   * Es "best effort": un fallo aquí nunca debe revertir la operación de negocio que lo originó.
   * @returns cantidad de bandejas a las que se entregó el aviso (0 si falló).
   */
  async notificar<K extends TipoNotificacion>(emision: EmisionNotificacion<K>): Promise<number> {
    try {
      const contenido = renderizarNotificacion(emision.tipo, emision.payload);
      const destinatarios = await resolverDestinatarios(this.db, emision.destino, emision.actorId);
      if (destinatarios.length === 0) return 0;

      const ahora = new Date();
      const filas: NotificacionInsert[] = destinatarios.map((usuarioId) => ({
        id: crypto.randomUUID(),
        usuarioId,
        localId: emision.localId ?? null,
        tipo: emision.tipo,
        alcance: emision.destino.alcance,
        prioridad: contenido.prioridad,
        titulo: contenido.titulo,
        detalle: contenido.detalle,
        href: contenido.href,
        dedupeKey: emision.dedupeKey ?? null,
        creadaEn: ahora,
      }));

      const entregas: EntregaNotificacion[] = [];
      for (const lote of enLotes(filas, FILAS_POR_INSERT)) {
        const insertadas = await this.db
          .insert(notificaciones)
          .values(lote)
          .onConflictDoNothing()
          .returning({ id: notificaciones.id, usuarioId: notificaciones.usuarioId });
        for (const fila of insertadas) {
          entregas.push({ id: fila.id, usuarioId: fila.usuarioId, tipo: emision.tipo, contenido });
        }
      }

      await Promise.allSettled(
        this.canales.map(async (canal) => {
          try {
            await canal.enviar(entregas);
          } catch (error) {
            await this.logger?.error(`Falló el canal ${canal.nombre} de notificaciones`, error, {
              module: 'notificaciones',
            });
          }
        })
      );
      return entregas.length;
    } catch (error) {
      await this.logger?.error('No se pudo emitir la notificación', error, { module: 'notificaciones' });
      return 0;
    }
  }

  async listar(ambito: AmbitoNotificaciones, consulta: ConsultaNotificaciones): Promise<PaginaNotificaciones> {
    const condiciones: (SQL | undefined)[] = [condicionAmbito(ambito)];
    if (consulta.soloNoLeidas) condiciones.push(isNull(notificaciones.leidaEn));

    const cursor = consulta.cursor ? decodificarCursor(consulta.cursor) : null;
    if (cursor) {
      condiciones.push(
        or(
          lt(notificaciones.creadaEn, cursor.fecha),
          and(eq(notificaciones.creadaEn, cursor.fecha), lt(notificaciones.id, cursor.id))
        )
      );
    }

    const filas = await this.db
      .select()
      .from(notificaciones)
      .where(and(...condiciones))
      .orderBy(desc(notificaciones.creadaEn), desc(notificaciones.id))
      .limit(consulta.limite + 1);

    const items = filas.slice(0, consulta.limite);
    const ultima = items.at(-1);
    const hayMas = filas.length > consulta.limite;
    return {
      items,
      siguienteCursor:
        hayMas && ultima ? `${Math.floor(ultima.creadaEn.getTime() / 1000)}:${ultima.id}` : null,
    };
  }

  async contarNoLeidas(ambito: AmbitoNotificaciones): Promise<number> {
    const [fila] = await this.db
      .select({ total: count() })
      .from(notificaciones)
      .where(and(condicionAmbito(ambito), isNull(notificaciones.leidaEn)));
    return fila?.total ?? 0;
  }

  async marcarLeida(ambito: AmbitoNotificaciones, ids: readonly string[]): Promise<void> {
    for (const lote of enLotes(ids, 80)) {
      await this.db
        .update(notificaciones)
        .set({ leidaEn: new Date() })
        .where(and(condicionAmbito(ambito), inArray(notificaciones.id, lote), isNull(notificaciones.leidaEn)));
    }
  }

  /**
   * Marca como leídas todas las pendientes del ámbito (hasta 500) y devuelve sus ids
   * para poder deshacer la operación.
   */
  async marcarTodasLeidas(ambito: AmbitoNotificaciones): Promise<string[]> {
    const pendientes = await this.db
      .select({ id: notificaciones.id })
      .from(notificaciones)
      .where(and(condicionAmbito(ambito), isNull(notificaciones.leidaEn)))
      .limit(500);
    const ids = pendientes.map((p) => p.id);
    await this.marcarLeida(ambito, ids);
    return ids;
  }

  /** Revierte "marcar todas" (deshacer) sobre los ids que estaban sin leer. */
  async marcarNoLeidas(ambito: AmbitoNotificaciones, ids: readonly string[]): Promise<void> {
    for (const lote of enLotes(ids, 80)) {
      await this.db
        .update(notificaciones)
        .set({ leidaEn: null })
        .where(and(condicionAmbito(ambito), inArray(notificaciones.id, lote)));
    }
  }

  async guardarSuscripcionPush(
    suscripcion: Omit<SuscripcionPushInsert, 'id' | 'creadaEn'>
  ): Promise<void> {
    await this.db
      .insert(suscripcionesPush)
      .values({ ...suscripcion, id: crypto.randomUUID(), creadaEn: new Date() })
      .onConflictDoUpdate({
        target: suscripcionesPush.endpoint,
        set: {
          usuarioId: suscripcion.usuarioId,
          p256dh: suscripcion.p256dh,
          auth: suscripcion.auth,
          agente: suscripcion.agente ?? null,
        },
      });
  }

  async eliminarSuscripcionPush(usuarioId: string, endpoint: string): Promise<void> {
    await this.db
      .delete(suscripcionesPush)
      .where(and(eq(suscripcionesPush.usuarioId, usuarioId), eq(suscripcionesPush.endpoint, endpoint)));
  }
}
