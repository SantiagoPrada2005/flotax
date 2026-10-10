import { defineMiddleware } from 'astro:middleware';
import { createAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { resolveLocalActivo } from '@/lib/auth/session';
import { getLogger } from '@/lib/logger';
import { env } from 'cloudflare:workers';

const ADMIN_PREFIX = '/admin';

const CLIENT_PROTECTED_PREFIXES = [
  '/reservas',
  '/perfil',
  '/alquilar',
  '/home',
];

function isAdminRoute(pathname: string): boolean {
  return pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
}

function isProtectedRoute(pathname: string): boolean {
  return isAdminRoute(pathname) || CLIENT_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

const AUTH_PAGES = ['/login', '/registro'];

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some(
    (page) => pathname === page || pathname.startsWith(`${page}/`)
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Inicializar logger contextual y estados de sesión en locals como seguros y tipados
  const requestId = context.request.headers.get('cf-ray') || crypto.randomUUID();
  const cfData = (context.request as unknown as { cf?: { colo?: string } }).cf;

  const baseLogger = getLogger(env, {
    requestId,
    path: context.url.pathname,
    method: context.request.method,
    colocation: cfData?.colo,
  });

  context.locals.logger = baseLogger;
  context.locals.user = null;
  context.locals.session = null;
  context.locals.usuario = null;

  // 2. Omitir peticiones de assets internos de Astro o favicons
  if (
    context.url.pathname.startsWith('/_astro') ||
    context.url.pathname.startsWith('/favicon')
  ) {
    return await next();
  }

  // 3. Si la petición está dirigida a las rutas internas de Better Auth (/api/auth/*),
  // delegar directamente a su handler para procesar sign-in, OTP, callbacks, etc.
  if (context.url.pathname.startsWith('/api/auth')) {
    return await next();
  }

  // 4. Si no hay binding de base de datos D1 en runtime, evaluar protección y continuar
  const d1 = env.DB;
  if (!d1) {
    if (isProtectedRoute(context.url.pathname)) {
      return context.redirect('/login');
    }
    return await next();
  }

  try {
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
    const sessionData = await auth.api.getSession({
      headers: context.request.headers,
    });

    if (sessionData?.user && sessionData?.session) {
      const rawUser = sessionData.user;

      // Solo hidratar sesión activa si el usuario no se encuentra suspendido
      if (rawUser.activo !== false) {
        context.locals.user = rawUser;
        context.locals.session = sessionData.session;

        // 5. Resolver contexto de negocio perimetral (local activo y roles RBAC)
        const db = getDb(d1);
        const localIdSolicitado =
          context.cookies.get('movix_local_activo')?.value ||
          context.request.headers.get('x-local-id');

        const localActivo = await resolveLocalActivo(
          db,
          rawUser.id,
          rawUser.localOrigenId,
          localIdSolicitado
        );

        // 6. Hidratar modelo de dominio FlotaX en locals
        context.locals.usuario = {
          id: rawUser.id,
          nombre: rawUser.name,
          correo: rawUser.email,
          telefono: rawUser.telefono ?? null,
          tipoDocumento: rawUser.tipoDocumento ?? null,
          numeroDocumento: rawUser.numeroDocumento ?? null,
          esSuperAdmin: Boolean(rawUser.esSuperAdmin),
          activo: rawUser.activo !== undefined ? Boolean(rawUser.activo) : true,
          localOrigenId: rawUser.localOrigenId ?? null,
          localActivo,
        };

        // 7. Enriquecer el logger de locals con el contexto del usuario autenticado
        context.locals.logger = baseLogger.withContext({
          userId: rawUser.id,
          localId: localActivo?.id,
        });
      }
    }
  } catch (error) {
    await baseLogger.error('Error al resolver sesión o roles en middleware', error, {
      module: 'middleware-auth',
    });
    context.locals.user = null;
    context.locals.session = null;
    context.locals.usuario = null;
  }

  // 8. Control de acceso perimetral y redirección de rutas
  const pathname = context.url.pathname;
  const user = context.locals.user;
  const usuario = context.locals.usuario;

  // Acceso sin autenticación a cualquier ruta protegida
  if (isProtectedRoute(pathname) && !user) {
    const returnTo = encodeURIComponent(pathname + context.url.search);
    return context.redirect(`/login?redirect=${returnTo}`);
  }

  // Protección RBAC estricta para el entorno operativo (/admin/**)
  if (isAdminRoute(pathname)) {
    if (!usuario) {
      const returnTo = encodeURIComponent(pathname + context.url.search);
      return context.redirect(`/login?redirect=${returnTo}`);
    }

    const esPersonal =
      usuario.esSuperAdmin ||
      (usuario.localActivo && usuario.localActivo.rol !== 'USUARIO');

    if (!esPersonal) {
      // Permitir acceso si se encuentra en onboarding para crear su propio patio o unirse con código
      if (pathname.startsWith('/admin/onboarding')) {
        return await next();
      }

      context.locals.logger.warn(
        'Intento de acceso a ruta administrativa por usuario sin rol de patio',
        { userId: usuario.id, path: pathname }
      );
      return context.redirect('/catalogo');
    }

    // Si tiene inducción pendiente en este local, forzar paso por /admin/onboarding
    const requiereOnboarding =
      !usuario.esSuperAdmin &&
      usuario.localActivo &&
      !usuario.localActivo.onboardingCompletado;

    if (requiereOnboarding && !pathname.startsWith('/admin/onboarding')) {
      return context.redirect('/admin/onboarding');
    }

    if (
      !requiereOnboarding &&
      pathname.startsWith('/admin/onboarding') &&
      context.url.searchParams.get('modo') !== 'crear'
    ) {
      return context.redirect('/admin');
    }
  }

  // Redirección inteligente si ya tiene sesión activa e intenta visitar /login o /registro
  if (isAuthPage(pathname) && user) {
    const esPersonal =
      usuario?.esSuperAdmin ||
      (usuario?.localActivo && usuario.localActivo.rol !== 'USUARIO');
    return context.redirect(esPersonal ? '/admin' : '/catalogo');
  }

  try {
    return await next();
  } catch (pipelineError) {
    await context.locals.logger.fatal(
      'Falla no controlada en el pipeline de ejecución de la petición',
      pipelineError,
      { module: 'pipeline-unhandled' }
    );
    throw pipelineError;
  }
});