# Rule: Modern Stack Compliance & Cloudflare Runtime Bindings

## 1. Zero Legacy Patterns & Up-to-Date Framework APIs

- **Modern Architecture Baseline**:
  - Astro (>= v6 / v7+) with Cloudflare SSR adapter (`@astrojs/cloudflare`).
  - Strict workerd execution model with standard Cloudflare Workers modules.
- **Strictly Prohibited Legacy APIs**:
  - **`Astro.locals.runtime.env` is completely removed**: NEVER access environment variables or bindings (D1, R2, KV, secrets) through `Astro.locals.runtime.env` or `context.locals.runtime`.
  - **`Astro.locals.runtime.cf` is removed**: Use `Astro.request.cf` (or `context.request.cf`).
  - **`Astro.locals.runtime.caches` is removed**: Use standard global `caches`.
  - **`Astro.locals.runtime.ctx` is removed**: Use `Astro.locals.cfContext` (or `context.locals.cfContext`).
- **Standard Modern Pattern for Bindings & Secrets**:
  - Always import bindings directly from the runtime module:
    ```typescript
    import { env } from 'cloudflare:workers';

    const db = env.DB;
    const bucket = env.BUCKET_MULTIMEDIA;
    const authSecret = env.BETTER_AUTH_SECRET;
    ```
  - Bindings and typed secrets are registered in ambient types via `declare module 'cloudflare:workers'` in `src/env.d.ts`.

## 2. Locals Clean Typing & Separation of Concerns

- **`App.Locals` Responsibility**:
  - `App.Locals` is reserved strictly for application-level state (e.g., authenticated user session `usuario: UsuarioSesion | null`, resolved request state, or localized context).
  - Do NOT cast `context.locals as unknown as { runtime?: ... }`. Keep all access to `Astro.locals` / `context.locals` strictly typed without unsafe casts.

## 3. Strict Compile & Build Gate (Pre-completion Verification)

- **Mandatory Commands**:
  - Prior to finalizing any feature or bugfix involving bindings, middleware, or endpoints:
    1. Run `pnpm run check` (Astro check must yield **0 errors, 0 warnings, 0 hints**).
    2. Run `pnpm run build` (Validate bundling and Cloudflare workerd output).
- Any attempt to use deprecated APIs or untested speculative types must immediately fail code review.
