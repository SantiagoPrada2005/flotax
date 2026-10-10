import type { APIRoute } from 'astro';
import { createAuth } from '@/lib/auth';
import { env } from 'cloudflare:workers';

export const ALL: APIRoute = async (context) => {
  const originHeader = context.request.headers.get('origin');
  const refererHeader = context.request.headers.get('referer');
  const requestOrigin =
    originHeader ||
    (refererHeader ? new URL(refererHeader).origin : undefined) ||
    context.url.origin;

  const isOAuthCallback = context.url.pathname.includes('/callback');
  const d1 = env.DB;

  if (!d1) {
    if (isOAuthCallback) {
      return context.redirect(`${requestOrigin}/login?error=database_unavailable`);
    }
    return new Response(
      JSON.stringify({ error: 'Binding de Cloudflare D1 no encontrado en el runtime.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const auth = createAuth(d1, env, {
      baseURL: requestOrigin,
      trustedOrigins: requestOrigin ? [requestOrigin] : [],
    });
    return await auth.handler(context.request);
  } catch (error: unknown) {
    if (error instanceof Response) {
      return error;
    }
    if (isOAuthCallback) {
      const errorMsg =
        error instanceof Error
          ? encodeURIComponent(error.message)
          : 'oauth_callback_error';
      return context.redirect(
        `${requestOrigin}/login?error=oauth_error&error_description=${errorMsg}`
      );
    }
    throw error;
  }
};
