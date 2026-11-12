import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { getDb } from '@/lib/db';
import * as authSchema from '@/db/schema/auth';
import type { D1Database, SendEmail } from '@cloudflare/workers-types';
import { getEmailService } from '@/lib/email';
import { getLogger } from '@/lib/logger';
import { eq } from 'drizzle-orm';
import { vincularReservasHuerfanasPorCorreoD1 } from '@/lib/flota/ciclo-alquiler';

export interface AuthEnv {
  BETTER_AUTH_URL?: string;
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  EMAIL?: SendEmail;
  EMAIL_DEFAULT_FROM?: string;
  EMAIL_AUTH_FROM?: string;
  [key: string]: unknown;
}

export interface CreateAuthOptions {
  baseURL?: string;
  trustedOrigins?: string[];
}

/**
 * Factoría que inicializa la instancia de Better Auth usando el binding D1
 * de Cloudflare dentro del ciclo de vida de la petición.
 */
export function createAuth(d1: D1Database, env?: AuthEnv, options?: CreateAuthOptions) {
  const db = getDb(d1);

  const requestOrigin = options?.baseURL;
  const isPrivateIpOrLocal =
    requestOrigin &&
    (requestOrigin.includes('localhost') ||
      requestOrigin.includes('127.0.0.1') ||
      /https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|\[::1\])/.test(requestOrigin) ||
      requestOrigin.endsWith('.local') ||
      requestOrigin.includes('.local:'));

  const isDevMode = import.meta.env.DEV || process.env.NODE_ENV !== 'production';

  const baseURL =
    (isPrivateIpOrLocal || (isDevMode && requestOrigin) ? requestOrigin : undefined) ||
    (env?.BETTER_AUTH_URL as string | undefined) ||
    requestOrigin ||
    (import.meta.env?.BETTER_AUTH_URL as string | undefined) ||
    'http://localhost:4321';

  const secret =
    (env?.BETTER_AUTH_SECRET as string | undefined) ||
    (import.meta.env?.BETTER_AUTH_SECRET as string | undefined) ||
    (process.env?.BETTER_AUTH_SECRET as string | undefined) ||
    'movix-flotax-auth-secret-key-32-chars-min';

  const canonicalOrigins = [
    'https://flotax.innovaweb.pro',
    'https://preview.flotax.innovaweb.pro',
    'https://*.innovaweb.pro',
    'https://*.pages.dev',
    'http://localhost:4321',
    'http://localhost:*',
    'http://127.0.0.1:4321',
    'http://127.0.0.1:*',
    'http://192.168.*:*',
    'http://10.*:*',
    'http://*.local:*',
  ];

  const trustedOrigins = Array.from(
    new Set(
      [
        baseURL,
        env?.BETTER_AUTH_URL as string | undefined,
        requestOrigin,
        ...(options?.trustedOrigins ?? []),
        ...canonicalOrigins,
      ].filter((url): url is string => typeof url === 'string' && url.length > 0)
    )
  );

  const googleClientId =
    (env?.GOOGLE_CLIENT_ID as string | undefined) ||
    (import.meta.env?.GOOGLE_CLIENT_ID as string | undefined) ||
    (process.env?.GOOGLE_CLIENT_ID as string | undefined) ||
    '';

  const googleClientSecret =
    (env?.GOOGLE_CLIENT_SECRET as string | undefined) ||
    (import.meta.env?.GOOGLE_CLIENT_SECRET as string | undefined) ||
    (process.env?.GOOGLE_CLIENT_SECRET as string | undefined) ||
    '';

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: authSchema.user,
        session: authSchema.session,
        account: authSchema.account,
        verification: authSchema.verification,
      },
    }),
    baseURL,
    secret,
    trustedOrigins,
    emailAndPassword: {
      enabled: false, // Login sin contraseña obligatorio
    },
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        disableSignUp: false, // Permitir registrar automáticamente al usuario si no existe al iniciar sesión con Google
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
      },
    },
    advanced: {
      useSecureCookies: !isDevMode && baseURL.startsWith('https://'),
    },
    onAPIError: {
      errorURL: `${baseURL}/login`,
    },
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          const logger = getLogger(env, { module: 'auth-otp' });
          logger.info(`Generando despacho OTP a ${email}`, { type });

          try {
            const emailService = getEmailService(env);
            const result = await emailService.sendOtp({
              to: email,
              code: otp,
              type,
            });

            if (!result.success) {
              await logger.error(`Falló el despacho de correo OTP a ${email}`, {
                code: result.code,
                error: result.error,
                type,
              });
            } else {
              logger.info(`Correo OTP despachado exitosamente a ${email}`, {
                messageId: result.messageId,
              });
            }
          } catch (error) {
            await logger.error('Excepción no controlada durante despacho de OTP', error, {
              email,
              type,
            });
          }
        },
      }),
    ],
    user: {
      additionalFields: {
        telefono: { type: 'string', required: false },
        tipoDocumento: { type: 'string', required: false },
        numeroDocumento: { type: 'string', required: false },
        esSuperAdmin: { type: 'boolean', required: false, defaultValue: false },
        localOrigenId: { type: 'string', required: false },
        activo: { type: 'boolean', required: false, defaultValue: true },
      },
    },
    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            const logger = getLogger(env, { module: 'auth-session-hook' });
            try {
              const userRows = await db
                .select({ email: authSchema.user.email })
                .from(authSchema.user)
                .where(eq(authSchema.user.id, session.userId))
                .limit(1);
              const userEmail = userRows[0]?.email;
              if (userEmail) {
                await vincularReservasHuerfanasPorCorreoD1(db, session.userId, userEmail);
              }
            } catch (error) {
              await logger.error(
                'Error al vincular reservas huérfanas en hook de sesión',
                error,
                { userId: session.userId }
              );
            }
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type BetterAuthSession = Auth['$Infer']['Session'];
export type BetterAuthUser = BetterAuthSession['user'];
export type BetterAuthSessionData = BetterAuthSession['session'];

export * from './permisos';
export * from './rbac';
export * from './session';
export * from './guard';

