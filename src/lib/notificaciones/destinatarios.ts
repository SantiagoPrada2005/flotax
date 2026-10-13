import { and, eq, inArray } from 'drizzle-orm';
import type { AppDb } from '@/lib/db';
import { miembrosLocal, user } from '@/db/schema';
import type { DestinoNotificacion } from './tipos';

/**
 * Traduce un scope de notificación a la lista de ids de usuario (sin duplicados)
 * que deben recibirla. Solo considera cuentas activas.
 */
export async function resolverDestinatarios(
  db: AppDb,
  destino: DestinoNotificacion,
  excluirUsuarioId?: string | undefined
): Promise<string[]> {
  const ids = await consultarIds(db, destino);
  const unicos = new Set(ids);
  if (excluirUsuarioId) unicos.delete(excluirUsuarioId);
  return [...unicos];
}

async function consultarIds(db: AppDb, destino: DestinoNotificacion): Promise<string[]> {
  switch (destino.alcance) {
    case 'USUARIO': {
      const filas = await db
        .select({ id: user.id })
        .from(user)
        .where(and(inArray(user.id, destino.usuarioIds), eq(user.activo, true)));
      return filas.map((f) => f.id);
    }
    case 'LOCAL': {
      const filas = await db
        .select({ id: miembrosLocal.usuarioId })
        .from(miembrosLocal)
        .where(and(eq(miembrosLocal.localId, destino.localId), eq(miembrosLocal.activo, true)));
      return filas.map((f) => f.id);
    }
    case 'LOCAL_ROLES': {
      const filas = await db
        .select({ id: miembrosLocal.usuarioId })
        .from(miembrosLocal)
        .where(
          and(
            eq(miembrosLocal.localId, destino.localId),
            eq(miembrosLocal.activo, true),
            inArray(miembrosLocal.rol, destino.roles)
          )
        );
      return filas.map((f) => f.id);
    }
    case 'PLATAFORMA': {
      const filas = await db.select({ id: user.id }).from(user).where(eq(user.activo, true));
      return filas.map((f) => f.id);
    }
  }
}
