import { drizzle } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';

/**
 * Cliente Drizzle inicializado con el binding D1 de Cloudflare.
 * Recibe el binding D1 desde cloudflare:workers (env.DB).
 */
export function getDb(d1Binding: D1Database) {
  return drizzle(d1Binding);
}

export type AppDb = ReturnType<typeof getDb>;