import { defineMiddleware } from 'astro:middleware';
import { createAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { resolveLocalActivo } from '@/lib/auth/session';
import {
  COOKIE_LOCAL_CAPTACION,
  obtenerLocalPorSlugOId,
  registrarCaptacionClienteEnLocal,
} from '@/lib/flota/locales-captacion';
import { getLogger } from '@/lib/logger';
import { env } from 'cloudflare:workers';

const ADMIN_PREFIX = '/admin';

const CLIENT_PROTECTED_PREFIXES = [
  '/reservas',
  '/perfil',
  '/notificaciones',
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
  context.locals.localCaptacion = null;

  // 2. Omitir peticiones de assets internos de Astro, favicons o artefactos estáticos de PWA
  if (
    context.url.pathname.startsWith('/_astro') ||
    context.url.pathname.startsWith('/favicon') ||
    context.url.pathname.startsWith('/icons/') ||
    context.url.pathname.startsWith('/instructions/') ||
    context.url.pathname.startsWith('/fonts/') ||
    context.url.pathname.startsWith('/images/') ||
    context.url.pathname === '/manifest.webmanifest' ||
    context.url.pathname === '/sw.js' ||
    context.url.pathname === '/apple-touch-icon.png' ||
    context.url.pathname === '/robots.txt' ||
    context.url.pathname === '/sitemap.xml'
  ) {
    return await next();
  }

  // 3. Si la petición está dirigida a las rutas internas de Better Auth (/api/auth/*),
  // delegar directamente a su handler para procesar sign-in, OTP, callbacks, etc.
  if (context.url.pathname.startsWith('/api/auth')) {
    return await next();
  }

  // Resolver cookie de captación perimetral incluso si D1 no está presente (entorno memoria)
  const cookieCaptacion = context.cookies.get(COOKIE_LOCAL_CAPTACION)?.value;
  const d1 = env.DB;
  const dbInstance = d1 ? getDb(d1) : undefined;

  if (cookieCaptacion) {
    context.locals.localCaptacion = await obtenerLocalPorSlugOId(
      cookieCaptacion,
      dbInstance
    );
  }

  // 4. Si no hay binding de base de datos D1 en runtime, evaluar protección y continuar
  if (!d1) {
    if (isProtectedRoute(context.url.pathname)) {
      return context.redirect('/login');
    }
    return await next();
  }

  try {
    const originHeader = context.request.headers.get('origin');
    const requestOrigin =
      (originHeader && !originHeader.includes('google.com') ? originHeader : undefined) ||
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

        // Si el cliente tiene local de captación por cookie, vincularlo en D1 (anti-fuga)
        if (context.locals.localCaptacion) {
          await registrarCaptacionClienteEnLocal(
            db,
            rawUser.id,
            context.locals.localCaptacion.id
          );
        } else if (rawUser.localOrigenId) {
          // Si no tenía la cookie pero ya fue captado antes en D1, restaurar su perímetro
          const localOrigen = await obtenerLocalPorSlugOId(
            rawUser.localOrigenId,
            db
          );
          if (localOrigen) {
            context.locals.localCaptacion = localOrigen;
          }
        }

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
          localOrigenId:
            rawUser.localOrigenId ?? context.locals.localCaptacion?.id ?? null,
          imagen: rawUser.image ?? null,
          localActivo,
        };

        // 7. Enriquecer el logger de locals con el contexto del usuario autenticado
        context.locals.logger = baseLogger.withContext({
          userId: rawUser.id,
          localId: localActivo?.id ?? context.locals.localCaptacion?.id,
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