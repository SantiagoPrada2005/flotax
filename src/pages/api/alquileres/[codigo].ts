import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import { validarAccesoReservaLectura } from '@/lib/auth';
import {
  obtenerDetalleCompletoAlquilerD1,
  type DetalleCompletoAlquilerResponse,
} from '@/lib/flota/detalle-reserva-admin';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

/**
 * Endpoint único consolidado de detalle operativo de un alquiler.
 * Entrega en una sola respuesta: fotos de entrega y devolución con fecha/hora,
 * datos del cliente, historial de pagos, fechas programadas y reales, estado del proceso,
 * contrato, garantía y cobros adicionales con trazabilidad.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const usuario = locals.usuario;
  if (!usuario || !usuario.localActivo) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Autenticación operativa requerida.' }),
      { status: 401, headers: JSON_HEADERS }
    );
  }

  const codigo = params.codigo?.trim();
  if (!codigo) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Código de reserva obligatorio.' }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  if (!env.DB) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Base de datos no disponible.' }),
      { status: 503, headers: JSON_HEADERS }
    );
  }

  const db = getDb(env.DB);
  const resultado = await obtenerDetalleCompletoAlquilerD1(
    db,
    codigo,
    usuario.localActivo.id
  );

  if (!resultado) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Reserva no encontrada.' }),
      { status: 404, headers: JSON_HEADERS }
    );
  }

  if (!validarAccesoReservaLectura(resultado.reserva, usuario)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Sin permisos para consultar esta reserva.' }),
      { status: 403, headers: JSON_HEADERS }
    );
  }

  const body: DetalleCompletoAlquilerResponse = {
    ok: true,
    reserva: resultado.reserva,
    detalleAdmin: resultado.detalleAdmin,
    actualizadoEn: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: JSON_HEADERS,
  });
};
