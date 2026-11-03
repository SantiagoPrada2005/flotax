# Rule: PWA Standalone & Single Page App (SPA) Navigation Governance

**Código:** RUL-FLX-020  
**Proyecto:** FlotaX — Sistema de Alquiler y Gestión de Flota de Vehículos  
**Directorio Fuente de Verdad:** [`public/manifest.webmanifest`](../../public/manifest.webmanifest), [`public/sw.js`](../../public/sw.js), [`src/layouts/LayoutApp.astro`](../../src/layouts/LayoutApp.astro), [`src/lib/pwa/`](../../src/lib/pwa)  
**Ámbito:** Todas las páginas Astro, layouts, componentes de navegación, islas React 19, formularios y middleware perimetral.

---

## 1. Propósito y Contexto Arquitectónico

FlotaX opera como una **Progressive Web App (PWA) instalable en modo `standalone`** con comportamiento de **Single Page Application (SPA)** impulsado por `<ClientRouter />` de Astro 7 sobre Cloudflare Workers SSR (`output: 'server'`).

En dispositivos móviles (especialmente iOS WebKit y Android WebAPK), cualquier error en el manejo de enlaces, redirecciones imperativas, alcances (`scope`) del manifiesto o islas persistidas provoca que:
1. El sistema operativo abra una hoja de navegador externo (Safari / Chrome Custom Tab con barra de URL) rompiendo la experiencia de aplicación nativa.
2. El navegador ejecute recargas completas de documento (parpadeo en blanco y pérdida de estado de UI).
3. Los componentes con `transition:persist` queden congelados con las props de la primera ruta visitada.

Esta regla establece las invariantes obligatorias para que ningún código nuevo corrompa el comportamiento de PWA y SPA.

---

## 2. Prohibiciones Estrictas (Zero-Tolerance)

1. **PROHIBIDO navegar a rutas internas con `window.location`**:
   - ❌ Prohibido: `window.location.href = '/catalogo'`, `window.location.assign('/admin')`, `window.location.replace('/reservas')`.
   - ✅ Canónico: Importar y ejecutar `navigate('/ruta')` desde `'astro:transitions/client'`.
   - *Única excepción permitida*: Redirecciones hacia proveedores OAuth externos (ej. Google OAuth URL en `authClient.signIn.social`).

2. **PROHIBIDO usar `target="_blank"` o `data-astro-reload` en enlaces internos (`same-origin`)**:
   - En modo `standalone` de iOS y Android, `target="_blank"` fuerza al sistema operativo a salir de la PWA y abrir el navegador externo del dispositivo.
   - `data-astro-reload` desactiva el `<ClientRouter />` y destruye la transición fluida SPA.

3. **PROHIBIDO crear páginas `.astro` sin envolverlas en `LayoutApp.astro` o `LayoutAdmin.astro`**:
   - Ninguna página en `src/pages/` puede declarar sus propias etiquetas `<html>`, `<head>` o `<body>`.
   - Toda vista debe heredar de [`src/layouts/LayoutApp.astro`](../../src/layouts/LayoutApp.astro) (o [`LayoutAdmin.astro`](../../src/layouts/LayoutAdmin.astro)) para garantizar la presencia ininterrumpida de `<ClientRouter />`, `<PwaRuntimeIsland />`, `<link rel="manifest">` y los meta tags de capacidad standalone.

4. **PROHIBIDO asumir que las props de una isla con `transition:persist` cambian al navegar**:
   - Cuando un componente tiene `transition:persist="..."`, Astro conserva la instancia viva en el cliente entre páginas y **no actualiza sus props iniciales**.
   - Si el componente depende de la ruta activa (como [`BottomNavIsland.tsx`](../../src/components/navigation/BottomNavIsland.tsx)), **debe** mantener un estado reactivo interno sincronizado mediante los eventos `astro:page-load` y `popstate` (con su respectivo `removeEventListener` en el cleanup de `useEffect`).

5. **PROHIBIDO aplicar caché *Cache-First* a HTML SSR, `/api/*` o `/_actions/*` en `public/sw.js`**:
   - Las rutas HTML renderizadas en el servidor dependen de la sesión activa de Better Auth, cookies RBAC (`movix_local_activo`, `movix_portal_modo`) e inventario en tiempo real en Cloudflare D1.
   - En [`public/sw.js`](../../public/sw.js), las páginas HTML deben usar exclusivamente **Network-First**, y las rutas `/api/*` y `/_actions/*` deben tener **bypass estricto**.

6. **PROHIBIDO instalar `@vite-pwa/astro` sin verificación de compatibilidad**:
   - La arquitectura PWA de FlotaX es nativa y libre de dependencias de compilación externas para mantener compatibilidad total con Astro 7 + Vite 8 + `@astrojs/cloudflare`.

---

## 3. Patrones Canónicos de Implementación

### 3.1 Navegación Programática en Islas React 19 (`.tsx`)
Siempre utilizar `navigate` de `'astro:transitions/client'`:

```tsx
import { navigate } from 'astro:transitions/client';

// Navegación estándar SPA
const irAlCatalogo = () => {
  navigate('/catalogo');
};

// Reemplazo de historial (ej. redirección post-onboarding o guardias)
const redirigirSinHistorial = () => {
  navigate('/home', { history: 'replace' });
};
```

### 3.2 Formularios de Búsqueda o Filtrado por URL (`GET`)
Para evitar que un `<form method="GET">` dispare una recarga completa del documento en el navegador, interceptar siempre `onSubmit` y delegar a `navigate()`:

```tsx
import type { SyntheticEvent } from 'react';
import { navigate } from 'astro:transitions/client';

const handleSearchSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
  e.preventDefault();
  const params = new URLSearchParams({ sede: 'norte' });
  navigate(`/catalogo?${params.toString()}`);
};
```

### 3.3 Sincronización de Ruta en Islas Persistidas (`transition:persist`)
Toda isla con `transition:persist` que evalúe la URL actual debe suscribirse al ciclo de vida de `<ClientRouter />`:

```tsx
useEffect(() => {
  const syncRoute = () => {
    setLivePath(window.location.pathname);
  };

  syncRoute();
  document.addEventListener('astro:page-load', syncRoute);
  window.addEventListener('popstate', syncRoute);

  return () => {
    document.removeEventListener('astro:page-load', syncRoute);
    window.removeEventListener('popstate', syncRoute);
  };
}, []);
```

### 3.4 Exclusión de Artefactos PWA en `src/middleware.ts`
Cualquier nuevo archivo estático vinculado al manifiesto o Service Worker debe estar excluido del pipeline de sesión D1 en [`src/middleware.ts`](../../src/middleware.ts):
- `/manifest.webmanifest`
- `/sw.js`
- `/apple-touch-icon.png`
- `/icons/*`

### 3.5 Caché de navegación, prefetch e invalidación

La navegación instantánea depende de tres invariantes que ningún cambio nuevo debe romper (ver [`docs/ADR_navegacion_instantanea.md`](../../docs/ADR_navegacion_instantanea.md)):

1. **HTML autenticado siempre privado.** Las respuestas HTML se cachean únicamente con `Cache-Control: private, max-age=<ttl>, stale-while-revalidate=<swr>` y `Vary: Cookie`, resueltas en [`src/lib/pwa/cache-policy.ts`](../../src/lib/pwa/cache-policy.ts). Prohibido `public` o cacheo CDN para HTML con shell personalizada.
2. **Toda acción mutante renueva la revisión.** Cada handler que escriba datos de dominio debe llamar `marcarRevisionNavegacion(context.cookies)` de [`src/lib/pwa/revision.ts`](../../src/lib/pwa/revision.ts). Sin esto, la siguiente navegación puede mostrar datos viejos.
3. **El SW nunca cachea HTML privado.** En [`public/sw.js`](../../public/sw.js) solo se cachean `/catalogo`, `/c/`, `/vehiculos/` y `/offline`. Admin, reservas, perfil, notificaciones y login quedan fuera.
4. **Prefetch solo de navegación segura.** `data-astro-prefetch` se aplica a enlaces GET same-origin; nunca a acciones destructivas, cierre de sesión o enlaces externos. El calentamiento respeta `saveData`, 2G y `document.prerendering`.

---

## 4. Checklist de Verificación Pre-Merge

Antes de dar por finalizada cualquier nueva funcionalidad de UI, ruta o flujo de navegación:

1. [ ] ¿La página utiliza `LayoutApp.astro` o `LayoutAdmin.astro`?
2. [ ] ¿Todas las navegaciones programáticas en `.tsx` usan `navigate()` de `'astro:transitions/client'` en lugar de `window.location.href`?
3. [ ] ¿Ningún enlace interno (`same-origin`) tiene `target="_blank"` ni `data-astro-reload`?
4. [ ] Si el componente usa `transition:persist`, ¿actualiza su estado reactivamente con `astro:page-load` en lugar de depender de props congeladas?
5. [ ] ¿Pasan satisfactoriamente `pnpm check` (0 errores, 0 warnings, 0 hints) y `pnpm build`?
6. [ ] Si la ruta debe ser instantánea, ¿está registrada en `cache-policy.ts` con su TTL?
7. [ ] Si la funcionalidad muta datos, ¿el handler llama `marcarRevisionNavegacion(context.cookies)`?
