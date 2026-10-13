import { inArray } from 'drizzle-orm';
import type { AppDb } from '@/lib/db';
import { suscripcionesPush, user } from '@/db/schema';
import type { EmailService } from '@/lib/email';
import { renderBaseLayout, escapeHtml } from '@/lib/email/templates/base';
import type { ILogger } from '@/lib/logger';
import { enLotes } from './lotes';
import { canalesDeTipo } from './plantillas';
import type { CanalNotificacionNombre, ContenidoNotificacion, TipoNotificacion } from './tipos';
import { enviarWebPush, type ClavesVapid } from './webpush';

export interface EntregaNotificacion {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  contenido: ContenidoNotificacion;
}

/** Puerto de salida: cada canal externo sabe entregar un lote de avisos ya persistidos. */
export interface CanalNotificacion {
  readonly nombre: CanalNotificacionNombre;
  enviar(entregas: readonly EntregaNotificacion[]): Promise<void>;
}

export function filtrarPorCanal(
  entregas: readonly EntregaNotificacion[],
  canal: CanalNotificacionNombre
): EntregaNotificacion[] {
  return entregas.filter((e) => canalesDeTipo(e.tipo).includes(canal));
}

const LOTE_CONSULTA = 90;
const CONCURRENCIA_PUSH = 10;

export class CanalPush implements CanalNotificacion {
  readonly nombre = 'PUSH' as const;

  constructor(
    private readonly db: AppDb,
    private readonly claves: ClavesVapid | null,
    private readonly logger?: ILogger | undefined
  ) {}

  async enviar(entregas: readonly EntregaNotificacion[]): Promise<void> {
    const { claves } = this;
    if (!claves) return;
    const aEnviar = filtrarPorCanal(entregas, 'PUSH');
    if (aEnviar.length === 0) return;

    const porUsuario = new Map<string, EntregaNotificacion>();
    for (const entrega of aEnviar) porUsuario.set(entrega.usuarioId, entrega);

    const usuarioIds = [...porUsuario.keys()];
    const suscripciones = (
      await Promise.all(
        enLotes(usuarioIds, LOTE_CONSULTA).map((lote) =>
          this.db.select().from(suscripcionesPush).where(inArray(suscripcionesPush.usuarioId, lote))
        )
      )
    ).flat();

    const caducadas: string[] = [];
    for (const lote of enLotes(suscripciones, CONCURRENCIA_PUSH)) {
      await Promise.allSettled(
        lote.map(async (suscripcion) => {
          const entrega = porUsuario.get(suscripcion.usuarioId);
          if (!entrega) return;
          const resultado = await enviarWebPush(
            suscripcion,
            {
              id: entrega.id,
              titulo: entrega.contenido.titulo,
              detalle: entrega.contenido.detalle,
              href: entrega.contenido.href,
              urgente: entrega.contenido.prioridad === 'URGENTE',
            },
            claves
          );
          if (resultado.expirada) caducadas.push(suscripcion.id);
          else if (!resultado.ok) {
            this.logger?.warn('Web Push rechazado por el servicio del navegador', {
              status: resultado.status,
              module: 'notificaciones-push',
            });
          }
        })
      );
    }

    for (const lote of enLotes(caducadas, LOTE_CONSULTA)) {
      await this.db.delete(suscripcionesPush).where(inArray(suscripcionesPush.id, lote));
    }
  }
}

export class CanalEmail implements CanalNotificacion {
  readonly nombre = 'EMAIL' as const;

  constructor(
    private readonly db: AppDb,
    private readonly email: EmailService,
    private readonly baseUrl: string,
    private readonly logger?: ILogger | undefined
  ) {}

  async enviar(entregas: readonly EntregaNotificacion[]): Promise<void> {
    const aEnviar = filtrarPorCanal(entregas, 'EMAIL');
    if (aEnviar.length === 0) return;

    const correos = new Map<string, string>();
    for (const lote of enLotes(aEnviar.map((e) => e.usuarioId), LOTE_CONSULTA)) {
      const filas = await this.db
        .select({ id: user.id, email: user.email })
        .from(user)
        .where(inArray(user.id, lote));
      for (const fila of filas) correos.set(fila.id, fila.email);
    }

    for (const lote of enLotes(aEnviar, CONCURRENCIA_PUSH)) {
      await Promise.allSettled(
        lote.map(async (entrega) => {
          const destinatario = correos.get(entrega.usuarioId);
          if (!destinatario) return;
          const { titulo, detalle, href } = entrega.contenido;
          const enlace = new URL(href, this.baseUrl).toString();
          const resultado = await this.email.send({
            to: destinatario,
            subject: `FlotaX: ${titulo}`,
            html: renderBaseLayout({
              title: titulo,
              preheader: detalle,
              contentHtml: `
                <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:#EDEDED;">${escapeHtml(titulo)}</h1>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.5;color:#9CA3AF;">${escapeHtml(detalle)}</p>
                <a href="${escapeHtml(enlace)}" style="display:inline-block;padding:14px 24px;border-radius:9999px;background:#EDEDED;color:#111827;font-weight:700;font-size:15px;text-decoration:none;">Ver en FlotaX</a>`,
            }),
            text: `${titulo}\n${detalle}\n\nVer en FlotaX: ${enlace}`,
          });
          if (!resultado.success) {
            this.logger?.warn('No se pudo enviar el correo de notificación', {
              error: resultado.error,
              module: 'notificaciones-email',
            });
          }
        })
      );
    }
  }
}
