import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { zonasEvidenciaVehiculo } from '@/db/schema';
import { PERMISOS, tienePermiso } from '@/lib/auth';
import { registrarFotoAlquilerR2D1 } from '@/lib/flota/detalle-reserva-admin';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

const FotoAlquilerPayloadSchema = z.object({
  etapaOperativa: z.enum(['ENTREGA_SALIDA', 'DEVOLUCION_RETORNO']),
  zonaEvidencia: z.enum(zonasEvidenciaVehiculo),
  dataUrl: z.string().min(40, { error: 'La fotografía es obligatoria.' }),
  observacion: z.string().max(400).optional(),
  ordenVisual: z.number().int().min(0).max(50).optional(),
  capturadoEnISO: z.string().optional(),
});

/**
 * Endpoint dedicado para registrar fotografías de entrega (`ENTREGA_SALIDA`)
 * o devolución (`DEVOLUCION_RETORNO`) en Cloudflare R2 + D1 con fecha y hora exacta.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const usuario = locals.usuario;
  if (!usuario || !usuario.localActivo) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Autenticación operativa requerida.' }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  const sujeto = {
    rol: usuario.localActivo.rol,
    esSuperAdmin: usuario.esSuperAdmin,
    permisosConcedidos: usuario.localActivo.permisosConcedidos,
    permisosRevocados: usuario.localActivo.permisosRevocados,
  };

  const puedeOperar =
    tienePermiso(sujeto, PERMISOS.CONTRATOS_CREAR) ||
    tienePermiso(sujeto, PERMISOS.CONTRATOS_FINALIZAR);

  if (!puedeOperar) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Sin permisos para registrar fotografías del alquiler.' }),
      { status: 403, headers: JSON_HEADERS }
    );
  }

  const codigo = params.codigo?.trim();
  if (!codigo) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Código de reserva obligatorio.' }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  if (!env.DB || !env.BUCKET_MULTIMEDIA) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Servicios de almacenamiento D1/R2 no disponibles.' }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  let bodyRaw: unknown;
  try {
    bodyRaw = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Cuerpo JSON no válido.' }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  const parsed = FotoAlquilerPayloadSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Datos de fotografía inválidos.',
      }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  try {
    const db = getDb(env.DB);
    const foto = await registrarFotoAlquilerR2D1(db, env.BUCKET_MULTIMEDIA, {
      codigo,
      localId: usuario.localActivo.id,
      usuarioId: usuario.id,
      etapaOperativa: parsed.data.etapaOperativa,
      zonaEvidencia: parsed.data.zonaEvidencia,
      dataUrl: parsed.data.dataUrl,
      observacion: parsed.data.observacion,
      ordenVisual: parsed.data.ordenVisual,
      capturadoEnISO: parsed.data.capturadoEnISO,
    });

    return new Response(JSON.stringify({ ok: true, foto }), {
      status: 201,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'No fue posible guardar la fotografía.';
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }
};
