# ADR: Navegación instantánea — caché HTTP privada, prefetch y transición perceptiva

**Estado:** Aprobado e implementado  
**Fecha:** 2026-10-27  
**Stack:** Astro 7.3 (`<ClientRouter />`), React 19, Cloudflare Workers SSR, Service Worker propio  
**Reglas relacionadas:** [`RUL-FLX-020`](../.agents/rules/pwa-spa-governance.md), [`docs/pwa-capabilities.md`](./pwa-capabilities.md)

---

## 1. Contexto y problema

Cada transición SPA de FlotaX ejecuta un `fetch` del `<ClientRouter />` y espera el HTML SSR completo. El Service Worker no intercepta esa petición porque el router no envía `Accept: text/html` ni `mode: navigate`; además no existían cabeceras de caché en el HTML. Resultado: cada cambio de pestaña cuesta un viaje al Worker + resolución de sesión + consultas D1.

Mediciones del 2026-10-27 desde Bogotá:

| Ruta | TTFB |
| :--- | ---: |
| `/catalogo` | 0.48 s |
| `/reservas` (302) | 0.64 s |
| `/login` | 0.33 s |
| `/admin` (302) | 0.30 s |

Lighthouse reportó 570 ms para el documento raíz. El prefetch de Astro estaba activo por defecto, pero con estrategia `hover`, que no existe en táctil; y en Safari el fallback `fetch` del prefetch exige cabeceras de caché, que no había.

No se puede hacer que un SSR no cacheado responda en 0 ms. "Instantáneo" exige **precomputar** (prefetch/caché) o **engañar la percepción** (feedback inmediato + transición corta). Este ADR combina ambas.

## 2. Alternativas evaluadas

| Alternativa | Resultado |
| :--- | :--- |
| **Caché HTTP privada del navegador + `Vary: Cookie` + cookie de revisión** | **Elegida.** Estándar, sin dependencias, compatible con el `fetch` del router y con Safari; invalidable por mutación. |
| **Prefetch/calentamiento con `fetch` autenticado** | **Elegido.** Garantiza cookies y materializa la caché HTTP; complementa `data-astro-prefetch`. |
| SW con stale-while-revalidate de HTML | Descartado para transiciones: no intercepta el `fetch` del router y su caché es compartida entre usuarios. Se usa solo para offline de catálogo público. |
| `experimental.clientPrerender` (Speculation Rules) | Pospuesto: Chrome prerenderiza, Safari 26.2 solo prefetch; requiere auditar efectos secundarios y confirmar que el router aprovecha el prerender. |
| `cacheCloudflare()` / route caching de Astro 7 | Descartado por ahora: emite `Cloudflare-CDN-Cache-Control: public` por URL, sin clave por cookie; la shell está personalizada (`TopBar` lee usuario y local). Requiere desacoplar la shell. |
| Cache en memoria + parche de `window.fetch` | Descartado por fragilidad: redirects, cabeceras, acciones y mantenimiento. |
| Solo optimizar TTFB | Insuficiente para "instantáneo"; queda como fase posterior. |

## 3. Decisión

1. **Caché HTTP privada por ruta.** El middleware aplica `Cache-Control: private, max-age=<ttl>, stale-while-revalidate=<swr>` y `Vary: Cookie` a respuestas HTML 200. El `fetch` del router reutiliza la respuesta sin red durante el TTL.
2. **Invalidación por revisión.** Cada acción mutante renueva la cookie HttpOnly `flotax_rev`. Como `Vary: Cookie` forma parte de la clave, la siguiente navegación no coincide con la caché anterior y va a red.
3. **Prefetch dirigido.** `prefetchAll: false`; se añade `data-astro-prefetch="tap"` a tabs, fichas y perfil. Un `fetch` autenticado calienta hasta dos rutas troncales tras el idle, con throttle de 20 s, concurrencia 2 y respeto a `saveData`/2G.
4. **Percepción.** Barra superior de 2 px a los 120 ms de iniciar una navegación (sin loader full-screen), transición raíz de 120 ms y actualización inmediata del tab activo del dock.
5. **Offline seguro.** El SW solo cachea HTML público de catálogo (`/catalogo`, `/c/`, `/vehiculos/`, `/offline`); nunca admin, reservas, perfil o notificaciones. Se habilita Navigation Preload.

## 4. Matriz de TTL

| Rutas | TTL | SWR | Razón |
| :--- | ---: | ---: | :--- |
| `/` | 60 s | 120 s | Landing; header con usuario → privada |
| `/catalogo`, `/c/[...]`, `/vehiculos/[...]` | 30 s | 60 s | Inventario; la reserva valida en servidor |
| `/reservas`, `/alquilar/[...]` | 10 s | 30 s | Datos personales; frescura corta |
| `/perfil`, `/notificaciones` | 10 s | 30 s | Datos personales |
| `/admin/[...]` | 5 s | 15 s | Operación de patio; invalidación por mutación |
| `/offline` | 300 s | 600 s | Respaldo offline |
| `/login`, `/registro`, `/home`, 404, 500 | `no-store` | — | Sesión, redirects y errores |
| `/api/`, `/_actions/`, `/_server-islands/`, `/_astro/`, assets, `sw.js`, manifiesto | Sin política | — | Bypass |

Rutas nuevas no mapeadas reciben `private, max-age=0, must-revalidate` como red de seguridad. Para que tengan navegación instantánea deben añadirse a [`src/lib/pwa/cache-policy.ts`](../src/lib/pwa/cache-policy.ts).

## 5. Implementación

| Pieza | Archivo | Rol |
| :--- | :--- | :--- |
| Política | [`src/lib/pwa/cache-policy.ts`](../src/lib/pwa/cache-policy.ts) | Resolución pura por ruta y aplicación de cabeceras; `NAV_CACHE_ENABLED` como rollback |
| Middleware | [`src/middleware.ts`](../src/middleware.ts) | Aplica la política a HTML y `no-store` a redirects; no actúa en desarrollo |
| Revisión | [`src/lib/pwa/revision.ts`](../src/lib/pwa/revision.ts) | Cookie `flotax_rev` desde acciones mutantes |
| Acciones | [`src/actions/`](../src/actions) | 27 handlers mutantes renuevan la revisión |
| Calentamiento | [`src/lib/pwa/navigation-cache.ts`](../src/lib/pwa/navigation-cache.ts) | `fetch` autenticado, cola, throttle, `saveData`/2G |
| Runtime | [`PwaRuntimeIsland.tsx`](../src/components/navigation/PwaRuntimeIsland.tsx) | Barra de progreso, listeners del router, calentamiento por rol |
| Layout | [`LayoutApp.astro`](../src/layouts/LayoutApp.astro) | `data-autenticado` para la isla persistida |
| Dock | [`BottomNavIsland.tsx`](../src/components/navigation/BottomNavIsland.tsx) | Tab activo inmediato + prefetch |
| SW | [`public/sw.js`](../public/sw.js) | Caché HTML solo pública, v4, Navigation Preload |
| Tests | [`tests/pwa_cache_policy.test.ts`](../tests/pwa_cache_policy.test.ts) | Matriz de rutas y cabeceras |

## 6. Consecuencias

**Positivas**

- Rutas calientes/repetidas se sirven desde caché del navegador: objetivo p75 ≤ 150 ms.
- Funciona en Chrome, Safari y Firefox sin APIs experimentales.
- La invalidación es inmediata tras una mutación y no depende de purgas de CDN.
- El SW deja de almacenar HTML privado (mejora de privacidad respecto al estado anterior).
- Menos invocaciones al Worker para navegación repetida.

**Negativas / límites**

- Se acepta staleness de 5–30 s para lecturas; las mutaciones la cortan.
- `Vary: Cookie` reduce la tasa de acierto si la cookie de sesión rota con frecuencia (no es el caso actual).
- La navegación en frío a una ruta no calentada sigue dependiendo del SSR (~0.3–0.7 s); la barra de progreso cubre la percepción.
- El SW cachea el catálogo público tal como se renderizó, incluida la personalización visual del `TopBar`; es una limitación conocida de baja severidad que se resolverá moviendo esa personalización a cliente.
- El route caching CDN y Speculation Rules quedan fuera hasta desacoplar la shell y auditar efectos secundarios.

## 7. Verificación

- `pnpm test`: matriz de política de caché y cabeceras.
- `pnpm check`, `pnpm build`, `pnpm index:audit`.
- `curl -I` en preview: `cache-control: private, max-age=30, stale-while-revalidate=60`, `vary: Cookie`; `/login` → `no-store`; `/_astro/*` inmutable; sin `cf-cache-status: HIT`.
- DevTools: segunda navegación dentro del TTL sin request de documento; tras mutación, `flotax_rev` cambia y la siguiente navegación va a red.
- Dos perfiles/usuarios: sin cruce de HTML.
- Safari iOS instalado: prefetch/calentamiento sin errores y navegación repetida desde caché.
- Offline: `/offline` y catálogo público funcionan; admin/reservas no se sirven desde caché del SW.

## 8. Rollback

- `NAV_CACHE_ENABLED = false` en [`cache-policy.ts`](../src/lib/pwa/cache-policy.ts) → todo HTML vuelve a `no-store`.
- El calentamiento y la barra de progreso son independientes; se pueden retirar sin tocar la política.
- El SW se revierte cambiando `CACHE_VERSION` y el predicado `esHtmlPublicoCacheable`.
