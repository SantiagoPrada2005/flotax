import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import type { AlquilerEnProcesoResponse } from '@/components/dashboard/AlquilerEnProcesoCard';
import {
  DEFAULT_TIEMPOS_ALQUILER_PROCESO,
  listarAlquileresEnProcesoD1,
} from '@/lib/dashboard/alquileres-proceso';
import { getDb } from '@/lib/db';
import { LOCAL_CANONICO_DEFECTO } from '@/lib/flota';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.usuario) {
    const errorBody: AlquilerEnProcesoResponse = {
      ok: false,
      error: 'No autenticado',
    };
    return new Response(JSON.stringify(errorBody), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }

  const localId =
    locals.usuario.localActivo?.id ?? LOCAL_CANONICO_DEFECTO.id;
  const db = env.DB ? getDb(env.DB) : undefined;
  const alquileres = await listarAlquileresEnProcesoD1(db, localId);

  const body: AlquilerEnProcesoResponse = {
    ok: true,
    alquileres,
    tiemposConfig: DEFAULT_TIEMPOS_ALQUILER_PROCESO,
    actualizadoEn: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
