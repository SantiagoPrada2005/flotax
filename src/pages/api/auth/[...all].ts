import type { APIRoute } from 'astro';
import { createAuth } from '@/lib/auth';
import { env } from 'cloudflare:workers';

export const ALL: APIRoute = async (context) => {
  const d1 = env.DB;

  if (!d1) {
    return new Response(
      JSON.stringify({ error: 'Binding de Cloudflare D1 no encontrado en el runtime.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const originHeader = context.request.headers.get('origin');
  const refererHeader = context.request.headers.get('referer');
  const requestOrigin =
    originHeader ||
    (refererHeader ? new URL(refererHeader).origin : undefined) ||
    context.url.origin;

  const auth = createAuth(d1, env, {
    baseURL: requestOrigin,
    trustedOrigins: requestOrigin ? [requestOrigin] : [],
  });
  return auth.handler(context.request);
};
