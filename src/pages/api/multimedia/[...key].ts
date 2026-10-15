import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

/**
 * Endpoint de entrega perimetral de objetos multimedia almacenados en Cloudflare R2 (BUCKET_MULTIMEDIA).
 * Sirve fotos periciales de inspección, documentos de identidad y licencias con caché inmutable.
 */
export const GET: APIRoute = async ({ params }) => {
  const key = params.key;

  if (!key) {
    return new Response('Clave de recurso multimedia no especificada', { status: 400 });
  }

  const bucket = env.BUCKET_MULTIMEDIA;
  if (!bucket) {
    return new Response('El almacenamiento multimedia (R2) no se encuentra disponible', { status: 503 });
  }

  try {
    const object = await bucket.get(key);

    if (!object) {
      return new Response('El recurso multimedia solicitado no existe o fue purgado', { status: 404 });
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
    headers.set('cache-control', 'private, max-age=3600, s-maxage=86400');

    const buffer = await object.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers,
    });
  } catch {
    return new Response('Error al recuperar el archivo multimedia desde R2', { status: 500 });
  }
};
