# ADR: Arquitectura PWA Standalone y Navegación Single Page App (SPA) con Astro 7 ClientRouter

**Estado:** Aprobado e Implementado  
**Fecha:** 2026-10-11  
**Stack:** Astro 7.3+ (`astro:transitions`), React 19, Cloudflare Workers SSR (`@astrojs/cloudflare` v14), Web App Manifest & Service Worker Estándar  
**Regla de Gobernanza Asociada:** [`.agents/rules/pwa-spa-governance.md`](../.agents/rules/pwa-spa-governance.md) (`RUL-FLX-020`)

---

## 1. Contexto y Problema

Al instalar FlotaX en un dispositivo móvil o agregarla a la pantalla de inicio (*Add to Home Screen* en iOS Safari / Android Chrome), la aplicación no se comportaba como una aplicación nativa ni como una Single Page Web App (SPA):

1. **Apertura como marcador de navegador:** La ausencia de `public/manifest.webmanifest` con `"display": "standalone"` y de las etiquetas meta de WebKit (`apple-mobile-web-app-capable`) hacía que el sistema operativo abriera la aplicación dentro de una pestaña normal del navegador con barra de direcciones y controles inferiores.
2. **Fuga al navegador externo al cambiar de ruta:** Sin un `"scope": "/"` explícito ni contención de enlaces en modo standalone, navegar entre rutas (`/catalogo`, `/reservas`, `/perfil`, `/admin`) abría ventanas modales internas de Safari/Chrome o forzaba recargas completas.
3. **Bloqueo de instalación nativa (WebAPK) en Android/Desktop:** Los motores Chromium exigen un Service Worker registrado con manejador `fetch` e íconos PNG (`192x192`, `512x512` y `maskable`) para habilitar la instalación real como aplicación del sistema.
4. **Fugas en el ciclo SPA (`<ClientRouter />`):**
   - El flujo de autenticación OTP ([`LoginFlow.tsx`](../src/components/auth/LoginFlow.tsx)) utilizaba `window.location.href`, provocando una recarga completa del documento.
   - La barra de navegación inferior ([`BottomNavIsland.tsx`](../src/components/navigation/BottomNavIsland.tsx)), persistida con `transition:persist="flotax-bottom-nav"`, calculaba si el usuario estaba en modo Administrador o Cliente a partir de sus props iniciales (`currentPath` y `variant`), las cuales no se re-evalúan durante las transiciones SPA entre `/catalogo` y `/admin`.

---

## 2. Evaluación de Alternativas

### Opción A (Elegida): Arquitectura PWA Nativa Estándar + `<ClientRouter />` de Astro 7 + `PwaRuntimeIsland`
Implementación basada directamente en estándares W3C (`manifest.webmanifest` + Service Worker ligero en `/sw.js`) combinada con el router SPA oficial de Astro 7 (`<ClientRouter />` y `navigate()` de `astro:transitions/client`) y una isla React persistida ([`PwaRuntimeIsland.tsx`](../src/components/navigation/PwaRuntimeIsland.tsx)).

- **Ventajas:**
  - Compatibilidad 100% nativa con **Astro 7.3+**, **Vite 8** y **`@astrojs/cloudflare` v14** sin dependencias rotas.
  - Control granular de seguridad sobre SSR: nunca cachea respuestas HTML autenticadas ni intercepta `/api/*` o `/_actions/*`.
  - Mantenimiento simple, auditable y alineado con la paleta cromática canónica (`#111827`, `#EDEDED`).

### Opción B (Descartada): `@vite-pwa/astro` + Workbox
- **Motivos de descarte:**
  - `@vite-pwa/astro@1.2.0` solo declara soporte en `peerDependencies` hasta Astro 5, generando conflictos con Astro 7 y el plugin de Cloudflare sobre Vite 8.
  - Workbox está diseñado primordialmente para sitios estáticos (SSG); en una aplicación 100% SSR con control de acceso RBAC y sesiones por cookies HTTP-only, el precacheo automático de rutas introduce riesgos de servir estados de sesión obsoletos.

---

## 3. Diseño de la Solución Implementada

```mermaid
flowchart TD
    subgraph Device["Dispositivo Móvil / Desktop (Modo Standalone)"]
        Manifest["/manifest.webmanifest<br/>display: standalone | scope: / | start_url: /home"]
        SW["Service Worker (/sw.js)"]
    end

    subgraph AppShell["LayoutApp.astro (App Shell Persistente)"]
        CR["Astro &lt;ClientRouter /&gt;"]
        PwaIsland["PwaRuntimeIsland<br/>(transition:persist)"]
        BottomNav["BottomNavIsland<br/>(transition:persist + livePath reactivo)"]
        Slot["&lt;main&gt; Contenido Dinámico SSR &lt;/main&gt;"]
    end

    subgraph Edge["Cloudflare Workers SSR"]
        MW["src/middleware.ts<br/>(Bypass de estáticos PWA + Sesión D1)"]
        HomeRouter["/home (Enrutador Inteligente)<br/>Staff -> /admin | Cliente/Visitante -> /catalogo"]
    end

    Manifest --> HomeRouter
    PwaIsland -->|Registra| SW
    PwaIsland -->|Si inicia en / en standalone| HomeRouter
    CR -->|Intercepta enlaces y navigate()| SW
    SW -->|/_astro/*, /icons/*, /images/*| CacheFirst["Cache-First (Instantáneo)"]
    SW -->|Navegación HTML SSR| NetworkFirst["Network-First -> MW -> Fallback Offline"]
    CR -->|Evento astro:page-load| BottomNav
```

### 3.1 Componentes Clave de la Arquitectura

| Archivo | Rol Arquitectónico |
| :--- | :--- |
| [`public/manifest.webmanifest`](../public/manifest.webmanifest) | Define `"display": "standalone"`, `"scope": "/"`, `"start_url": "/home"`, colores canónicos (`#EDEDED`) e íconos (`192x192`, `512x512`, `maskable`) + accesos directos (`shortcuts`). |
| [`public/sw.js`](../public/sw.js) | Service Worker con estrategia híbrida: *Bypass* en `/api/*` y `/_actions/*`, *Cache-First* en assets inmutables `/_astro/*` e íconos, y *Network-First* en navegaciones HTML con pantalla de respaldo offline. |
| [`src/lib/pwa/standalone.ts`](../src/lib/pwa/standalone.ts) | Funciones puras y tipadas (`isStandalonePwa`, `isSpaInterceptableUrl`, `registerPwaServiceWorker`) centralizadas bajo `src/lib/pwa/`. |
| [`src/components/navigation/PwaRuntimeIsland.tsx`](../src/components/navigation/PwaRuntimeIsland.tsx) | Isla React 19 persistida (`transition:persist="flotax-pwa-runtime"`) que registra el Service Worker, sincroniza `data-pwa-standalone="true"` en `<html>`, redirige `/` hacia `/home` cuando se abre como app instalada y evita que enlaces internos con `target="_blank"` escapen al navegador externo. |
| [`src/pages/home.astro`](../src/pages/home.astro) | Punto de entrada (`start_url`) que redirige automáticamente al personal de patio a `/admin` (respetando la cookie `movix_portal_modo`) y a clientes o visitantes al catálogo operativo `/catalogo`. |
| [`src/components/navigation/BottomNavIsland.tsx`](../src/components/navigation/BottomNavIsland.tsx) | Escucha `astro:page-load` y `popstate` para actualizar `livePath` reactivamente, cambiando sin recarga entre las pestañas de Cliente y las de Administración. |

---

## 4. Sostenibilidad y Reglas para Nuevos Desarrollos

Para evitar regresiones al agregar nuevas pantallas o módulos, todo el equipo y los agentes de IA deben cumplir la regla **[`RUL-FLX-020` (`pwa-spa-governance.md`)](../.agents/rules/pwa-spa-governance.md)**:

1. **Navegación programática exclusivamente vía `navigate()`** de `'astro:transitions/client'`.
2. **Cero `target="_blank"` o `data-astro-reload`** en rutas internas del mismo dominio.
3. **Uso obligatorio de `LayoutApp.astro` o `LayoutAdmin.astro`** en toda página de `src/pages/`.
4. **Reactividad ante `astro:page-load`** en cualquier componente que utilice `transition:persist`.
