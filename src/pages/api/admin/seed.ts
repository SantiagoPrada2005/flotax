import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import { ejecutarSeedDemostracionD1 } from '@/lib/db/seed';

/**
 * Endpoint administrativo para inicializar o sincronizar datos de demostración en Cloudflare D1.
 * Utilizado durante etapas de desarrollo, preview y pruebas de patio.
 */
export const ALL: APIRoute = async ({ locals, request }) => {
  if (!env.DB) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'El binding de base de datos D1 no se encuentra disponible.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Permitir en desarrollo local, usuarios administradores o token secreto en producción
  const esDesarrollo = import.meta.env.DEV;
  const usuario = locals.usuario;
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const secret = (env.BETTER_AUTH_SECRET as string) || '';
  const esAutorizadoPorSecret = Boolean(secret && token === secret);

  const esAdmin =
    usuario &&
    (usuario.esSuperAdmin ||
      usuario.localActivo?.rol === 'DUENO' ||
      usuario.localActivo?.rol === 'ADMIN');

  if (!esDesarrollo && !esAdmin && !esAutorizadoPorSecret) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'No tienes privilegios administrativos para inicializar datos semilla.',
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const db = getDb(env.DB);
    const resultado = await ejecutarSeedDemostracionD1(db);

    return new Response(
      JSON.stringify({
        ok: true,
        mensaje: 'Datos semilla de demostración sincronizados exitosamente en Cloudflare D1.',
        detalles: resultado.insertados,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Fallo al ejecutar el seed en Cloudflare D1',
        detalle: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
