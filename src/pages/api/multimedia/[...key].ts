import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

/**
 * Parseador seguro de cabecera HTTP `Range: bytes=start-end` para streaming de video en WebKit/iOS.
 */
function parseRangeHeader(
  rangeHeader: string | null
): { offset: number; length?: number } | null {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return null;
  }
  const spec = rangeHeader.slice('bytes='.length).split(',')[0]?.trim();
  if (!spec) return null;

  const [startStr, endStr] = spec.split('-');
  const start = startStr ? Number.parseInt(startStr, 10) : Number.NaN;
  const end = endStr ? Number.parseInt(endStr, 10) : Number.NaN;

  if (Number.isNaN(start) || start < 0) {
    return null;
  }

  if (!Number.isNaN(end) && end >= start) {
    return { offset: start, length: end - start + 1 };
  }

  return { offset: start };
}

/**
 * Endpoint de entrega perimetral de objetos multimedia almacenados en Cloudflare R2 (BUCKET_MULTIMEDIA).
 * Soporta imágenes periciales, miniaturas (`poster_r2_key`), documentos PDF y streaming de video
 * con soporte para peticiones parciales (`206 Partial Content` / `Accept-Ranges: bytes`).
 */
export const GET: APIRoute = async ({ params, request }) => {
  const key = params.key;

  if (!key) {
    return new Response('Clave de recurso multimedia no especificada', {
      status: 400,
    });
  }

  const bucket = env.BUCKET_MULTIMEDIA;
  if (!bucket) {
    return new Response(
      'El almacenamiento multimedia (R2) no se encuentra disponible',
      { status: 503 }
    );
  }

  try {
    const rangeReq = parseRangeHeader(request.headers.get('range'));
    const object = rangeReq
      ? await bucket.get(key, { range: rangeReq })
      : await bucket.get(key);

    if (!object) {
      return new Response(
        'El recurso multimedia solicitado no existe o fue purgado',
        { status: 404 }
      );
    }

    const headers = new Headers();
    if (object.httpMetadata?.contentType) {
      headers.set('content-type', object.httpMetadata.contentType);
    }
    if (object.httpMetadata?.contentLanguage) {
      headers.set('content-language', object.httpMetadata.contentLanguage);
    }
    if (object.httpMetadata?.contentDisposition) {
      headers.set('content-disposition', object.httpMetadata.contentDisposition);
    }
    headers.set('etag', object.httpEtag);
    headers.set('accept-ranges', 'bytes');
    headers.set('cache-control', 'private, max-age=3600, s-maxage=86400');

    const bodyBuffer = await object.arrayBuffer();

    if (rangeReq) {
      const start = rangeReq.offset;
      const length =
        rangeReq.length !== undefined
          ? Math.min(rangeReq.length, Math.max(0, object.size - start))
          : Math.max(0, object.size - start);
      const end = Math.max(start, start + length - 1);

      headers.set('content-range', `bytes ${start}-${end}/${object.size}`);
      headers.set('content-length', String(bodyBuffer.byteLength));

      return new Response(bodyBuffer, {
        status: 206,
        headers,
      });
    }

    headers.set('content-length', String(bodyBuffer.byteLength));
    return new Response(bodyBuffer, {
      status: 200,
      headers,
    });
  } catch {
    return new Response('Error al recuperar el archivo multimedia desde R2', {
      status: 500,
    });
  }
};
