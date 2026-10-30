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
