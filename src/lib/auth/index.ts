import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { getDb } from '@/lib/db';
import * as authSchema from '@/db/schema/auth';
import type { D1Database, SendEmail } from '@cloudflare/workers-types';
import { getEmailService } from '@/lib/email';

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

/**
 * Factoría que inicializa la instancia de Better Auth usando el binding D1
 * de Cloudflare dentro del ciclo de vida de la petición.
 */
export function createAuth(d1: D1Database, env?: AuthEnv) {
  const db = getDb(d1);

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
    baseURL: env?.BETTER_AUTH_URL ?? 'http://localhost:4321',
    secret: env?.BETTER_AUTH_SECRET ?? 'movix-flotax-auth-secret-key-32-chars-min',
    emailAndPassword: {
      enabled: false, // Login sin contraseña obligatorio
    },
    socialProviders: {
      google: {
        clientId: env?.GOOGLE_CLIENT_ID ?? '',
        clientSecret: env?.GOOGLE_CLIENT_SECRET ?? '',
      },
    },
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          console.info(`[Auth OTP Dispatch] Generando envío a ${email} (tipo: ${type})`);
          try {
            const emailService = getEmailService(env);
            const result = await emailService.sendOtp({
              to: email,
              code: otp,
              type,
            });

            if (!result.success) {
              console.error(
                `[Auth OTP Error] Falló el despacho de correo a ${email}: [${result.code}] ${result.error}`
              );
            } else {
              console.info(
                `[Auth OTP Success] Correo despachado exitosamente a ${email} (MessageId: ${result.messageId})`
              );
            }
          } catch (error) {
            console.error('[Auth OTP Exception]:', error);
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
  });
}

export type Auth = ReturnType<typeof createAuth>;
export * from './permisos';
export * from './rbac';
export * from './session';
export * from './guard';
