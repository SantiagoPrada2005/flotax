/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Usuario autenticado de Better Auth con campos personalizados */
    user: import('./lib/auth').BetterAuthUser | null;
    /** Sesión activa estándar de Better Auth */
    session: import('./lib/auth').BetterAuthSessionData | null;
    /** Usuario autenticado con local activo y permisos RBAC */
    usuario: import('./lib/auth/session').UsuarioSesion | null;
    /** Instancia tipada del Logger contextual de la petición */
    logger: import('./lib/logger').ILogger;
  }
}

declare module 'cloudflare:workers' {
  interface Env {
    DB: import('@cloudflare/workers-types').D1Database;
    BUCKET_MULTIMEDIA: import('@cloudflare/workers-types').R2Bucket;
    EMAIL?: import('@cloudflare/workers-types').SendEmail;
    EMAIL_DEFAULT_FROM?: string;
    EMAIL_AUTH_FROM?: string;
    EMAIL_ALERTS_FROM?: string;
    ALERT_DEVELOPER_EMAILS?: string;
    APP_ENV?: string;
    BETTER_AUTH_URL?: string;
    BETTER_AUTH_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    [key: string]: unknown;
  }

  export const env: Env;
}