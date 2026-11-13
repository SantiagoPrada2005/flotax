# Index: `src/lib/pwa`

**Responsibility**: Utilidades de dominio para ejecución como Progressive Web App (PWA) en modo standalone, instalación adaptativa (Android `beforeinstallprompt` e iOS Safari/Chrome), validación de rutas SPA, registro del Service Worker perimetral, caché HTTP privada de navegación y calentamiento de rutas.
**Architectural Layer**: Infrastructure / Client PWA Runtime Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`cache-policy.ts`](./cache-policy.ts) | Pure HTTP Cache Policy | `NAV_CACHE_ENABLED`, `TTL_CACHE_HTML`, `resolverPoliticaCacheHtml()`, `aplicarPoliticaCacheHtml()` | `Response` estándar |
| [`index.ts`](./index.ts) | Barrel Export | `isStandalonePwa`, `isSpaInterceptableUrl`, `registerPwaServiceWorker`, `detectInstallPlatform`, `isInstallPromptDismissed`, `dismissInstallPromptForDays`, `markAppInstalled`, `isAppMarkedInstalled`, `openInstallPromptModal`, `prefetchHtml`, `prefetchRutasCalientes`, `rutasCalientes`, `BeforeInstallPromptEvent`, `PwaInstallPlatform`, `activarFlotaxLoading`, `desactivarFlotaxLoading`, `resolverVarianteTransicionPortal` | `./standalone`, `./install`, `./navigation-cache`, `./loading` |
| [`install.ts`](./install.ts) | Pure PWA Install Domain Utilities | `detectInstallPlatform()`, `isInstallPromptDismissed()`, `dismissInstallPromptForDays()`, `markAppInstalled()`, `isAppMarkedInstalled()`, `openInstallPromptModal()` | Estándares Web (`beforeinstallprompt`, `localStorage`, `CustomEvent`) |
| [`loading.ts`](./loading.ts) | Kinetic Loader Dispatcher | `activarFlotaxLoading()`, `desactivarFlotaxLoading()`, `resolverVarianteTransicionPortal()`, `FlotaxLoadingVariant`, `FlotaxLoadingOptions` | `CustomEvent ('flotax:loading')`, `@/lib/theme` |
| [`navigation-cache.ts`](./navigation-cache.ts) | Client Navigation Warm-up | `prefetchHtml()`, `prefetchRutasCalientes()`, `rutasCalientes()` | Fetch API, Network Information, `requestIdleCallback` |
| [`page-transitions.ts`](./page-transitions.ts) | Horizontal Slide View Transitions | `resolveNavTabOrder()`, `resolveNavSlideDirection()`, `initHorizontalPageTransitions()` | Astro `ClientRouter`, View Transitions API |
| [`push.ts`](./push.ts) | TypeScript / JavaScript Module | - | - |
| [`revision.ts`](./revision.ts) | Server Cache Revision Cookie | `COOKIE_REVISION_NAVEGACION`, `marcarRevisionNavegacion()` | `AstroCookies`, `crypto.randomUUID()` |
| [`standalone.ts`](./standalone.ts) | Pure PWA Standalone & SPA Utilities | `isStandalonePwa()`, `isSpaInterceptableUrl()`, `registerPwaServiceWorker()` | Estándares Web (`window.matchMedia`, `navigator.serviceWorker`) |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
