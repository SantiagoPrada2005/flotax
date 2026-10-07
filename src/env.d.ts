/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Usuario autenticado con local activo y permisos RBAC */
    usuario: import('./lib/auth/session').UsuarioSesion | null;
  }
}

declare module 'cloudflare:workers' {
  interface Env {
    DB: import('@cloudflare/workers-types').D1Database;
    BUCKET_MULTIMEDIA: import('@cloudflare/workers-types').R2Bucket;
    BETTER_AUTH_URL?: string;
    BETTER_AUTH_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    [key: string]: unknown;
  }

  export const env: Env;
}