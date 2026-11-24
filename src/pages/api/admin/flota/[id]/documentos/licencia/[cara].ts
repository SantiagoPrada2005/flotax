import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { vehiculos } from '@/db/schema';
import { getDb } from '@/lib/db';
import { PERMISOS, tienePermiso, type Permiso } from '@/lib/auth';
import {
  esCategoriaExentaDocumentosLegales,
  guardarClaveFotoLicenciaD1,
  obtenerLicenciaTransitoD1,
  type CaraLicenciaTransito,
} from '@/lib/documentos-vehiculo';
import { construirClaveR2DocumentoVehiculo } from '@/lib/media/r2-vehiculo-keys';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, no-store, max-age=0',
} as const;

const MAX_BYTES_IMAGEN = 5 * 1024 * 1024;
const MIME_A_EXT: Readonly<Record<string, 'jpg' | 'png' | 'webp'>> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: JSON_HEADERS,
  });
}

function validarCara(caraRaw: string | undefined): CaraLicenciaTransito | null {
  if (caraRaw === 'frente' || caraRaw === 'reverso') return caraRaw;
  return null;
}

async function validarAccesoVehiculoDocumento(
  locals: App.Locals,
  vehiculoIdRaw: string | undefined,
  permisoRequerido: Permiso
) {
  const usuario = locals.usuario;
  if (!usuario || !usuario.activo) {
    return { error: jsonError('Autenticación requerida.', 401) } as const;
  }

  const localActivo = usuario.localActivo;
  if (!localActivo) {
    return { error: jsonError('Selecciona un local activo para operar.', 400) } as const;
  }

  const sujeto = {
    rol: localActivo.rol,
    esSuperAdmin: usuario.esSuperAdmin,
    permisosConcedidos: localActivo.permisosConcedidos,
    permisosRevocados: localActivo.permisosRevocados,
  };

  if (!tienePermiso(sujeto, permisoRequerido)) {
    return {
      error: jsonError('No tienes permisos para acceder a los documentos de la flota.', 403),
    } as const;
  }

  const vehiculoId = vehiculoIdRaw?.trim();
  if (!vehiculoId) {
    return { error: jsonError('Identificador de vehículo obligatorio.', 400) } as const;
  }

  if (!env.DB || !env.BUCKET_MULTIMEDIA) {
    return {
      error: jsonError('Servicios de almacenamiento D1 o R2 no disponibles.', 503),
    } as const;
  }

  const db = getDb(env.DB);
  const rows = await db
    .select({
      id: vehiculos.id,
      localId: vehiculos.localId,
      categoria: vehiculos.categoria,
    })
    .from(vehiculos)
    .where(eq(vehiculos.id, vehiculoId))
    .limit(1);

  const vehiculo = rows[0];
  if (!vehiculo) {
    return { error: jsonError('Vehículo no encontrado.', 404) } as const;
  }

  if (!usuario.esSuperAdmin && vehiculo.localId !== localActivo.id) {
    return { error: jsonError('El vehículo no pertenece al local activo.', 403) } as const;
  }

  if (esCategoriaExentaDocumentosLegales(vehiculo.categoria)) {
    return {
      error: jsonError(
        'Las patinetas eléctricas livianas están exentas de Licencia de tránsito (Ley 2486 de 2025).',
        400
      ),
    } as const;
  }

  return {
    db,
    bucket: env.BUCKET_MULTIMEDIA,
    usuario,
    localId: vehiculo.localId ?? localActivo.id,
    vehiculo,
  } as const;
}

/**
 * Entrega privada de la foto delantera o trasera de la Licencia de Tránsito desde R2.
 * Nunca usa caché pública ni endpoint abierto de multimedia por contener PII.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const cara = validarCara(params.cara);
  if (!cara) {
    return jsonError('Cara de documento inválida. Usa "frente" o "reverso".', 400);
  }

  const ctx = await validarAccesoVehiculoDocumento(
    locals,
    params.id,
    PERMISOS.FLOTA_DOCUMENTOS_LEER
  );
  if ('error' in ctx) return ctx.error;

  const doc = await obtenerLicenciaTransitoD1(ctx.db, ctx.vehiculo.id);
  const r2Key = cara === 'frente' ? doc?.archivoR2Key : doc?.archivoReversoR2Key;
  if (!r2Key) {
    return jsonError('No hay fotografía cargada para esta cara del documento.', 404);
  }

  try {
    const obj = await ctx.bucket.get(r2Key);
    if (!obj) {
      return jsonError('Archivo no encontrado en el almacenamiento privado.', 404);
    }

    const headers = new Headers();
    headers.set(
      'content-type',
      obj.httpMetadata?.contentType ?? 'image/jpeg'
    );
    headers.set('content-disposition', 'inline');
    headers.set('cache-control', 'private, no-store, max-age=0');
    headers.set('pragma', 'no-cache');
    headers.set('x-content-type-options', 'nosniff');

    const buffer = await obj.arrayBuffer();
    headers.set('content-length', String(buffer.byteLength));
    return new Response(buffer, { status: 200, headers });
  } catch {
    return jsonError('No fue posible leer la fotografía desde el almacenamiento privado.', 500);
  }
};

/**
 * Sube o reemplaza la fotografía delantera o trasera de la Licencia de Tránsito en R2 privado.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  const cara = validarCara(params.cara);
  if (!cara) {
    return jsonError('Cara de documento inválida. Usa "frente" o "reverso".', 400);
  }

  const ctx = await validarAccesoVehiculoDocumento(
    locals,
    params.id,
    PERMISOS.FLOTA_DOCUMENTOS_GESTIONAR
  );
  if ('error' in ctx) return ctx.error;

  let archivoBytes: ArrayBuffer;
  let mimeType: string;

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return jsonError('No fue posible leer el formulario multipart.', 400);
    }

    const entry = formData.get('archivo');
    if (!(entry instanceof File)) {
      return jsonError('El campo "archivo" es obligatorio.', 400);
    }
    if (entry.size <= 0 || entry.size > MAX_BYTES_IMAGEN) {
      return jsonError('La imagen debe pesar más de 0 bytes y máximo 5 MB.', 400);
    }
    mimeType = entry.type.toLowerCase();
    archivoBytes = await entry.arrayBuffer();
  } else {
    return jsonError('Se requiere multipart/form-data con el campo "archivo".', 400);
  }

  const extension = MIME_A_EXT[mimeType];
  if (!extension) {
    return jsonError('Formato no soportado. Usa una imagen JPG, PNG o WebP.', 400);
  }

  const nuevaR2Key = construirClaveR2DocumentoVehiculo({
    localId: ctx.localId,
    vehiculoId: ctx.vehiculo.id,
    tipoDocumento: 'TARJETA_PROPIEDAD',
    extension,
    sufijo: cara,
  });

  try {
    await ctx.bucket.put(nuevaR2Key, archivoBytes, {
      httpMetadata: {
        contentType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
      },
    });

    const { claveAnterior, documentoId } = await guardarClaveFotoLicenciaD1(ctx.db, {
      localId: ctx.localId,
      vehiculoId: ctx.vehiculo.id,
      cara,
      nuevaR2Key,
      verificadoPorId: ctx.usuario.id,
    });

    if (claveAnterior && claveAnterior !== nuevaR2Key) {
      try {
        await ctx.bucket.delete(claveAnterior);
      } catch {
        // Purga best-effort del archivo reemplazado para no revertir la actualización principal
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        documentoId,
        cara,
        tieneFoto: true,
        version: Date.now(),
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch {
    try {
      await ctx.bucket.delete(nuevaR2Key);
    } catch {
      // Limpieza best-effort en caso de error
    }
    return jsonError('No fue posible guardar la fotografía en el almacenamiento privado.', 500);
  }
};

/**
 * Elimina la fotografía delantera o trasera de la Licencia de Tránsito en R2 y D1.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  const cara = validarCara(params.cara);
  if (!cara) {
    return jsonError('Cara de documento inválida. Usa "frente" o "reverso".', 400);
  }

  const ctx = await validarAccesoVehiculoDocumento(
    locals,
    params.id,
    PERMISOS.FLOTA_DOCUMENTOS_GESTIONAR
  );
  if ('error' in ctx) return ctx.error;

  try {
    const { claveAnterior, documentoId } = await guardarClaveFotoLicenciaD1(ctx.db, {
      localId: ctx.localId,
      vehiculoId: ctx.vehiculo.id,
      cara,
      nuevaR2Key: null,
      verificadoPorId: ctx.usuario.id,
    });

    if (claveAnterior) {
      try {
        await ctx.bucket.delete(claveAnterior);
      } catch {
        // Purga best-effort
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        documentoId,
        cara,
        tieneFoto: false,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch {
    return jsonError('No fue posible eliminar la fotografía de la licencia.', 500);
  }
};
