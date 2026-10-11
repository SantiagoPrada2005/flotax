# Index: `src/lib/pwa`

**Responsibility**: Utilidades de dominio para ejecución como Progressive Web App (PWA) en modo standalone, instalación adaptativa (Android `beforeinstallprompt` e iOS Safari/Chrome), validación de rutas SPA y registro del Service Worker perimetral.
**Architectural Layer**: Infrastructure / Client PWA Runtime Layer

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`index.ts`](./index.ts) | Barrel Export | `isStandalonePwa`, `isSpaInterceptableUrl`, `registerPwaServiceWorker`, `detectInstallPlatform`, `isInstallPromptDismissed`, `dismissInstallPromptForDays`, `markAppInstalled`, `isAppMarkedInstalled`, `openInstallPromptModal`, `BeforeInstallPromptEvent`, `PwaInstallPlatform` | `./standalone`, `./install` |
| [`install.ts`](./install.ts) | Pure PWA Install Domain Utilities | `detectInstallPlatform()`, `isInstallPromptDismissed()`, `dismissInstallPromptForDays()`, `markAppInstalled()`, `isAppMarkedInstalled()`, `openInstallPromptModal()` | Estándares Web (`beforeinstallprompt`, `localStorage`, `CustomEvent`) |
| [`standalone.ts`](./standalone.ts) | Pure PWA Standalone & SPA Utilities | `isStandalonePwa()`, `isSpaInterceptableUrl()`, `registerPwaServiceWorker()` | Estándares Web (`window.matchMedia`, `navigator.serviceWorker`) |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
