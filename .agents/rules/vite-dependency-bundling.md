# Rule: Vite Dependency Bundling & Upstream Sourcemap Handling

This rule establishes conventions for configuring Vite in `astro.config.mjs`, and how to handle upstream package packaging flaws (specifically `@openrouter/sdk` and `@openrouter/agent`).

---

## 1. Root Cause Analysis

### The Upstream Flaw
`@openrouter/sdk` and `@openrouter/agent` publish compiled ESM files containing sourcemap directives (e.g., `//# sourceMappingURL=customtool.js.map` or inline `.map` files that reference original `.ts` source files), but omit the original `.ts` sources from their npm tarball.

Vite emits two distinct warning formats when it encounters these:

| Warning format | Root cause |
|---|---|
| `Failed to load source map for "..."` | `.map` file referenced by `//# sourceMappingURL=` comment does not exist on disk |
| `Sourcemap for "..." points to missing source files` | `.map` file exists but references original `.ts` sources not included in the tarball |

### The `optimizeDeps.exclude` Anti-Pattern
Placing these packages in `vite.optimizeDeps.exclude`:
1. Bypasses esbuild pre-bundling, forcing Vite to serve each ESM file **individually**.
2. Causes Vite to inspect each file's sourcemap on every SSR transform, flooding the terminal with dozens of warnings per page load.

### The Logger-Patch Anti-Pattern
Using a Vite plugin to intercept `config.logger.warn` via `configResolved` patches only the **main Vite instance**. Astro's dev server spawns a separate **SSR Vite instance** with its own logger. The patch never reaches it, so warnings still appear.

---

## 2. Definitive Fix: `ssr.noExternal`

Add both packages to `vite.ssr.noExternal`. This instructs Vite to **bundle them through esbuild** during SSR transforms rather than serving individual files from `node_modules`. Bundling consolidates all modules into a single chunk and strips the `//# sourceMappingURL=` comments — eliminating the warnings at the source.

```js
// astro.config.mjs
// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  vite: {
    optimizeDeps: {
      exclude: ['better-auth', 'astrojs/cloudflare', 'drizzle-orm', 'zod'],
    },
    ssr: {
      // Force esbuild to bundle these packages instead of serving each ESM file
      // individually. Bundling strips the //# sourceMappingURL= comments that
      // point to .map files absent from the npm tarball, eliminating the
      // "Sourcemap for ... points to missing source files" warnings.
      noExternal: ['@openrouter/sdk', '@openrouter/agent'],
    },
  },
});
```

> [!IMPORTANT]
> Do NOT put `@openrouter/sdk` or `@openrouter/agent` in `optimizeDeps.exclude`. That causes per-file serving, which triggers sourcemap inspection on every SSR request.

---

## 3. When Adding New AI SDK Packages

Before adding any new package that ships ESM without sources, verify:
1. Check if it publishes `.map` files with `ls node_modules/<pkg>/esm/*.map | head -5`
2. If sourcemaps are missing, add the package to `ssr.noExternal` immediately.
3. Clear the Vite cache and restart: `rm -rf node_modules/.vite && pnpm run dev`
4. Run `pnpm check && pnpm build` to confirm `0 errors, 0 warnings, 0 hints`.

## 4. Mandatory Cache Clear After Any `vite.*` Config Change

> [!CAUTION]
> Changing `vite.ssr.*`, `vite.optimizeDeps.*`, or `vite.plugins` triggers a hot-reload of the Astro/Vite config. The SSR dep optimizer (`node_modules/.vite/deps_ssr/`) gets invalidated, but in-flight requests still reference stale file paths. This causes:
> ```
> Error: The file does not exist at "...deps_ssr/astro_virtual-modules_middleware__js.js"
> ```

**After every change to `vite.*` in `astro.config.mjs`, always restart with:**
```bash
rm -rf node_modules/.vite && pnpm run dev
```

Never rely on Vite's hot config reload when changing SSR-related settings.

