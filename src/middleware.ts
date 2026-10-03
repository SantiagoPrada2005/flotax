import { defineMiddleware } from 'astro:middleware';
import { createAuth, type AuthEnv } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { miembrosLocal, localesAlquiler } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import type { UsuarioSesion, LocalActivoSesion } from '@/lib/auth/session';
import type { RolSistema } from '@/lib/auth/rbac';

export const onRequest = defineMiddleware(async (context, next) => {
  const runtime = (context.locals as unknown as { runtime?: { env?: { DB?: D1Database } & AuthEnv } })?.runtime;
  const d1 = runtime?.env?.DB;

  // Si no hay binding de base de datos D1 en runtime, continuar como anónimo
  if (!d1) {
    (context.locals as { usuario: UsuarioSesion | null }).usuario = null;
    return await next();
  }

  try {
    const auth = createAuth(d1, runtime?.env);
    const sessionData = await auth.api.getSession({
      headers: context.request.headers,
    });

    if (!sessionData?.user) {
      (context.locals as { usuario: UsuarioSesion | null }).usuario = null;
      return await next();
    }

    const rawUser = sessionData.user as unknown as {
      id: string;
      name: string;
      email: string;
      telefono?: string | null;
      tipoDocumento?: string | null;
      numeroDocumento?: string | null;
      esSuperAdmin?: boolean;
      activo?: boolean;
      localOrigenId?: string | null;
    };

    if (rawUser.activo === false) {
      (context.locals as { usuario: UsuarioSesion | null }).usuario = null;
      return await next();
    }

    const db = getDb(d1);
    let localActivo: LocalActivoSesion | null = null;

    // Verificar si viene una preferencia de local en cookie o header
    const localIdSolicitado =
      context.cookies.get('movix_local_activo')?.value ||
      context.request.headers.get('x-local-id');

    // 1. Buscar si el usuario es miembro (empleado o dueño) en locales
    if (localIdSolicitado) {
      const miembroEncontrado = await db
        .select({
          miembroId: miembrosLocal.id,
          rol: miembrosLocal.rol,
          localId: localesAlquiler.id,
          nombreLocal: localesAlquiler.nombre,
          slugLocal: localesAlquiler.slug,
          duenoId: localesAlquiler.duenoId,
          localActivo: localesAlquiler.activo,
        })
        .from(miembrosLocal)
        .innerJoin(localesAlquiler, eq(miembrosLocal.localId, localesAlquiler.id))
        .where(
          and(
            eq(miembrosLocal.usuarioId, rawUser.id),
            eq(miembrosLocal.localId, localIdSolicitado),
            eq(miembrosLocal.activo, true)
          )
        )
        .limit(1);

      const item = miembroEncontrado[0];
      if (item && item.localActivo) {
        localActivo = {
          id: item.localId,
          nombre: item.nombreLocal,
          slug: item.slugLocal,
          rol: item.rol as RolSistema,
          esDueno: item.duenoId === rawUser.id,
        };
      }
    }

    // 2. Si no tiene local solicitado o no es miembro del solicitado, asignar el primer local donde trabaja/es dueño
    if (!localActivo) {
      const primerLocalMiembro = await db
        .select({
          rol: miembrosLocal.rol,
          localId: localesAlquiler.id,
          nombreLocal: localesAlquiler.nombre,
          slugLocal: localesAlquiler.slug,
          duenoId: localesAlquiler.duenoId,
          localActivo: localesAlquiler.activo,
        })
        .from(miembrosLocal)
        .innerJoin(localesAlquiler, eq(miembrosLocal.localId, localesAlquiler.id))
        .where(
          and(
            eq(miembrosLocal.usuarioId, rawUser.id),
            eq(miembrosLocal.activo, true)
          )
        )
        .limit(1);

      const item = primerLocalMiembro[0];
      if (item && item.localActivo) {
        localActivo = {
          id: item.localId,
          nombre: item.nombreLocal,
          slug: item.slugLocal,
          rol: item.rol as RolSistema,
          esDueno: item.duenoId === rawUser.id,
        };
      }
    }

    // 3. Si no es trabajador ni dueño (es un cliente/USUARIO):
    // Si tiene un local de origen asociado, asociarlo como cliente de dicho local
    if (!localActivo && rawUser.localOrigenId) {
      const localOrigen = await db
        .select({
          id: localesAlquiler.id,
          nombre: localesAlquiler.nombre,
          slug: localesAlquiler.slug,
          duenoId: localesAlquiler.duenoId,
          activo: localesAlquiler.activo,
        })
        .from(localesAlquiler)
        .where(eq(localesAlquiler.id, rawUser.localOrigenId))
        .limit(1);

      const item = localOrigen[0];
      if (item && item.activo) {
        localActivo = {
          id: item.id,
          nombre: item.nombre,
          slug: item.slug,
          rol: 'USUARIO',
          esDueno: false,
        };
      }
    }

    // 4. Hidratar usuario en locals
    const usuarioSesion: UsuarioSesion = {
      id: rawUser.id,
      nombre: rawUser.name,
      correo: rawUser.email,
      telefono: rawUser.telefono ?? null,
      tipoDocumento: rawUser.tipoDocumento ?? null,
      numeroDocumento: rawUser.numeroDocumento ?? null,
      esSuperAdmin: Boolean(rawUser.esSuperAdmin),
      activo: rawUser.activo !== undefined ? Boolean(rawUser.activo) : true,
      localOrigenId: rawUser.localOrigenId ?? null,
      localActivo,
    };

    (context.locals as { usuario: UsuarioSesion | null }).usuario = usuarioSesion;
  } catch (error) {
    console.error('[Middleware Auth Error]:', error);
    (context.locals as { usuario: UsuarioSesion | null }).usuario = null;
  }

  return await next();
});