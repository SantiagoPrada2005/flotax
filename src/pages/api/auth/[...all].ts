import type { APIRoute } from 'astro';
import { createAuth, type AuthEnv } from '@/lib/auth';
import type { D1Database } from '@cloudflare/workers-types';

export const ALL: APIRoute = async (context) => {
  const runtime = (context.locals as unknown as { runtime?: { env?: { DB?: D1Database } & AuthEnv } })?.runtime;
  const d1 = runtime?.env?.DB;

  if (!d1) {
    return new Response(
      JSON.stringify({ error: 'Binding de Cloudflare D1 no encontrado en el runtime.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const auth = createAuth(d1, runtime?.env);
  return auth.handler(context.request);
};
