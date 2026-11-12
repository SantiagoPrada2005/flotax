import { existsSync } from 'node:fs';

const SRC = new URL('../src/', import.meta.url);

function existe(url) {
  try {
    return existsSync(url);
  } catch {
    return false;
  }
}

/**
 * Loader mínimo para `node --test`:
 * - resuelve el alias `@/` hacia `src/`
 * - añade `.ts` a imports relativos y de alias sin extensión
 *
 * Astro/Vite resuelven esto en build; Node no lo hace por sí solo.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'astro:actions') {
    const code = encodeURIComponent(`
      export class ActionError extends Error {
        constructor(options) {
          super(options.message);
          this.code = options.code;
        }
      }
      export function defineAction(config) {
        const fn = async (input, ctx) => config.handler(input, ctx);
        fn.handler = config.handler;
        fn.input = config.input;
        return fn;
      }
    `);
    return { url: `data:text/javascript,${code}`, shortCircuit: true };
  }

  if (specifier === 'cloudflare:workers') {
    const code = encodeURIComponent(`
      export const env = {};
    `);
    return { url: `data:text/javascript,${code}`, shortCircuit: true };
  }

  if (specifier === '@/lib/notificaciones') {
    const code = encodeURIComponent(`
      export function crearServicioNotificaciones() {
        return {
          notificar: async () => {},
        };
      }
    `);
    return { url: `data:text/javascript,${code}`, shortCircuit: true };
  }

  if (specifier.startsWith('@/')) {
    const base = new URL(specifier.slice(2), SRC);

    for (const candidato of [
      new URL(`${base.href}.ts`),
      new URL(`${base.href}/index.ts`),
    ]) {
      if (existe(candidato)) {
        return { url: candidato.href, shortCircuit: true };
      }
    }
  }

  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    context.parentURL &&
    !/\.(?:ts|js|mjs|cjs|json)$/.test(specifier)
  ) {
    const base = new URL(specifier, context.parentURL);

    for (const candidato of [
      new URL(`${base.href}.ts`),
      new URL(`${base.href}/index.ts`),
    ]) {
      if (existe(candidato)) {
        return { url: candidato.href, shortCircuit: true };
      }
    }
  }

  return nextResolve(specifier, context);
}
