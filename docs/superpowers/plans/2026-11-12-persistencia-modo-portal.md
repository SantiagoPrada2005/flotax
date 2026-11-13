# Persistencia de Estado y Redirecciones entre Modo Cliente y Modo Operario — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar las fugas y redirecciones accidentales de operadores hacia vistas de clientes garantizando la persistencia estricta del modo de portal (`ADMIN` vs `CLIENTE`) en cookies, middleware, layout SSR, dock flotante y flujos de entrega.

**Architecture:** Se establece el modo de portal (`modoPortal: 'CLIENTE' | 'ADMIN'`) como ciudadano de primera clase en `Astro.locals` resuelto perimetralmente en `src/middleware.ts` con persistencia en cookie segura `movix_portal_modo`. Las páginas compartidas (`/perfil`, `/configuracion`, `/notificaciones`, `/reservas/[codigo]/entrega`) adoptan dinámicamente `navVariant` según `locals.modoPortal`. `BottomNavIsland` sincroniza su variante con `document.documentElement.dataset.portalModo` evitando la degradación a cliente durante View Transitions, y el asistente de entrega pericial redirige al entorno administrativo correspondiente al concluir o cancelar.

**Tech Stack:** Astro 7+ SSR (`@astrojs/cloudflare`), React 19 (`useActionState`, `useTransition`), Tailwind CSS v4, Better Auth, Cloudflare D1 + Drizzle ORM, Node Test Runner (`node --test`).

**Spec:** Requerimiento del usuario para resolver la asimetría de navegación donde los clientes operan correctamente sin fugas pero los operarios sufren constantes redirecciones al portal cliente perdiendo su contexto de trabajo en patio.

## Global Constraints

- Tolerancia cero a errores en `pnpm check` (0 errors, 0 warnings, 0 hints).
- Uso exclusivo de `pnpm` como gestor de paquetes.
- Prohibido el uso de APIs `@deprecated` y cumplimiento estricto con Zod 4.
- Bindings de Cloudflare Workers siempre vía `cloudflare:workers` (nunca `locals.runtime.env`).
- React 19 para interactividad cliente; prohibida la manipulación imperativa del DOM.
- Paleta canónica Movix de 5 colores neutros (`#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`).
- Zonas táctiles mínimas de 44x44px y tipografía >= 16px en inputs.

## Review Focus

1. **Operador con cookie ausente o nueva sesión**: al iniciar sesión un usuario con rol de patio, el middleware debe resolver por defecto `ADMIN`, persistir la cookie `movix_portal_modo = 'ADMIN'` y nunca enviarlo a `/catalogo`.
2. **Navegación compartida (Perfil, Configuración, Notificaciones)**: un operador que accede a su perfil o ajustes no debe perder la barra lateral de escritorio ni el dock de patio móvil.
3. **Flujo de Entrega y Peritaje**: al completar o cancelar una entrega en `/reservas/[codigo]/entrega`, el operador debe regresar a `/admin/reservas/[codigo]` y no a `/reservas/[codigo]`.
4. **Protección de ingreso a `/reservas`**: si un usuario en modo `ADMIN` visita `/reservas` o `/reservas/[codigo]`, debe ser redirigido inmediatamente a `/admin/reservas` o `/admin/reservas/[codigo]`.
5. **Conmutación explícita bidireccional**: si un operador conmuta deliberadamente a `Modo Personal`, debe permanecer en modo cliente sin ser forzado a `/admin` hasta que decida volver explícitamente a `Modo Operador`.

---

### Task 1: Contratos de Tipos y Pruebas Unitarias de Resolución de Modo Portal

**Files:**
- Create: `tests/portal_modo_persistencia.test.ts`
- Modify: `src/env.d.ts:4-17`
- Modify: `src/lib/auth/session.ts:1-35`

**Interfaces:**
- Consumes: `App.Locals`, `UsuarioSesion`
- Produces: `ModoPortal` type (`'CLIENTE' | 'ADMIN'`), helper `resolverModoPortalInicial(usuario, cookieModo)`

- [ ] **Step 1: Write the failing unit tests for portal mode resolution and transition logic**

```typescript
// tests/portal_modo_persistencia.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverModoPortalInicial, type ModoPortal } from '../src/lib/auth/portal-modo';

test('resolverModoPortalInicial: usuario sin rol de patio siempre es CLIENTE', () => {
  const modo = resolverModoPortalInicial({ esSuperAdmin: false, tieneRolPatio: false }, 'ADMIN');
  assert.equal(modo, 'CLIENTE');
});

test('resolverModoPortalInicial: operador sin cookie por defecto es ADMIN', () => {
  const modo = resolverModoPortalInicial({ esSuperAdmin: false, tieneRolPatio: true }, undefined);
  assert.equal(modo, 'ADMIN');
});

test('resolverModoPortalInicial: operador con cookie CLIENTE respeta CLIENTE', () => {
  const modo = resolverModoPortalInicial({ esSuperAdmin: false, tieneRolPatio: true }, 'CLIENTE');
  assert.equal(modo, 'CLIENTE');
});

test('resolverModoPortalInicial: operador con cookie ADMIN respeta ADMIN', () => {
  const modo = resolverModoPortalInicial({ esSuperAdmin: true, tieneRolPatio: false }, 'ADMIN');
  assert.equal(modo, 'ADMIN');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./tests/register-loader.mjs --test tests/portal_modo_persistencia.test.ts`  
Expected: FAIL with "Cannot find module '../src/lib/auth/portal-modo'"

- [ ] **Step 3: Implement `src/lib/auth/portal-modo.ts` and update `src/env.d.ts`**

Create `src/lib/auth/portal-modo.ts`:
- Define `export type ModoPortal = 'CLIENTE' | 'ADMIN';`
- Define `export const COOKIE_PORTAL_MODO = 'movix_portal_modo';`
- Implement `resolverModoPortalInicial(usuario: { esSuperAdmin: boolean; tieneRolPatio: boolean }, cookieModo?: string | null): ModoPortal`
- Update `src/env.d.ts` to include `modoPortal: import('./lib/auth/portal-modo').ModoPortal;` in `App.Locals`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./tests/register-loader.mjs --test tests/portal_modo_persistencia.test.ts`  
Expected: PASS (4 tests passing)

- [ ] **Step 5: Verify TypeScript compilation**

Run: `pnpm check`  
Expected: 0 errors, 0 warnings, 0 hints

- [ ] **Step 6: Commit**

```bash
git add src/env.d.ts src/lib/auth/portal-modo.ts tests/portal_modo_persistencia.test.ts
git commit -m "feat(auth): add portal mode contracts and resolution unit tests"
```

---

### Task 2: Blindaje de Middleware Perimetral y Redirecciones Inteligentes

**Files:**
- Modify: `src/middleware.ts:40-274`
- Modify: `src/pages/home.astro:1-20`
- Modify: `tests/portal_modo_persistencia.test.ts`

**Interfaces:**
- Consumes: `resolverModoPortalInicial`, `COOKIE_PORTAL_MODO`, `context.locals.usuario`
- Produces: `context.locals.modoPortal` hidratado en cada petición y redirecciones perimetrales preventivas

- [ ] **Step 1: Write integration tests for route guarding behavior**

Add tests to `tests/portal_modo_persistencia.test.ts`:
- Test route redirect rules:
  - If `modoPortal === 'ADMIN'` and path is `/reservas` -> returns `/admin/reservas`
  - If `modoPortal === 'ADMIN'` and path is `/reservas/ABC-123` -> returns `/admin/reservas/ABC-123`
  - If `modoPortal === 'ADMIN'` and path is `/reservas/ABC-123/entrega` -> no redirect (allowed for vehicle inspection)
  - If `modoPortal === 'CLIENTE'` and path is `/admin` -> returns `/catalogo`

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./tests/register-loader.mjs --test tests/portal_modo_persistencia.test.ts`  
Expected: FAIL on route helper assertion

- [ ] **Step 3: Update `src/lib/auth/portal-modo.ts` with route destination helpers and implement middleware logic**

In `src/lib/auth/portal-modo.ts`:
- Implement `evaluarRedireccionModoPortal(pathname: string, modoPortal: ModoPortal, tieneRolPatio: boolean): string | null`

In `src/middleware.ts`:
- Initialize `context.locals.modoPortal = 'CLIENTE'` in Step 1.
- In Step 6: evaluate `esPersonal = Boolean(rawUser.esSuperAdmin || (localActivo && localActivo.rol !== 'USUARIO'))`.
- Resolve `context.locals.modoPortal` using `resolverModoPortalInicial`.
- If `esPersonal` and no cookie was present, persist `context.cookies.set('movix_portal_modo', 'ADMIN', COOKIE_OPTIONS)`.
- If `isAdminRoute(pathname)` and user is `esPersonal`: ensure `context.locals.modoPortal = 'ADMIN'` and refresh cookie.
- Guard `/reservas` and `/reservas/[codigo]` (excluding `/entrega`): if `context.locals.modoPortal === 'ADMIN'`, redirect to `/admin/reservas` or `/admin/reservas/${codigo}`.
- Update auth page redirect (`/login`, `/registro`): redirect to `context.locals.modoPortal === 'ADMIN' ? '/admin' : '/catalogo'`.

In `src/pages/home.astro`:
- Use `Astro.locals.modoPortal === 'ADMIN' ? Astro.redirect('/admin') : Astro.redirect('/catalogo')`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import ./tests/register-loader.mjs --test tests/portal_modo_persistencia.test.ts`  
Expected: PASS

- [ ] **Step 5: Verify Astro check**

Run: `pnpm check`  
Expected: 0 errors, 0 warnings, 0 hints

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts src/lib/auth/portal-modo.ts src/pages/home.astro tests/portal_modo_persistencia.test.ts
git commit -m "feat(middleware): enforce persistent portal mode and prevent operator leak to client routes"
```

---

### Task 3: Adaptabilidad de Layout SSR y Prevención de Degradación del Dock Móvil

**Files:**
- Modify: `src/layouts/LayoutApp.astro:60-201`
- Modify: `src/components/navigation/BottomNav.astro:1-21`
- Modify: `src/components/navigation/BottomNavIsland.tsx:63-125, 592-620`
- Modify: `src/components/navigation/TopBarIsland.tsx:23-50`

**Interfaces:**
- Consumes: `Astro.locals.modoPortal`, `data-portal-modo` attribute
- Produces: Persistent admin shell on shared pages (`/perfil`, `/configuracion`, etc.) and synchronized mobile dock

- [ ] **Step 1: Write unit tests for dock variant resolution with HTML dataset**

Add tests to `tests/portal_modo_persistencia.test.ts`:
- Test `resolverVarianteDock(pathname: string, datasetModo?: string, propVariant?: string): 'admin' | 'client'`
- Verify that on `/perfil` with `datasetModo === 'ADMIN'`, dock resolves `'admin'` instead of `'client'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./tests/register-loader.mjs --test tests/portal_modo_persistencia.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement layout attribute and BottomNavIsland synchronization**

In `src/layouts/LayoutApp.astro`:
- Add `data-portal-modo={Astro.locals.modoPortal}` to `<html>`.

In `src/components/navigation/BottomNav.astro`:
- Pass `modoPortal={Astro.locals.modoPortal}` to `BottomNavIsland`.

In `src/components/navigation/BottomNavIsland.tsx`:
- Accept optional `modoPortal?: 'ADMIN' | 'CLIENTE'`.
- In `updateTabFromPath`:
  ```typescript
  const portalDataset = document.documentElement.dataset.portalModo as 'ADMIN' | 'CLIENTE' | undefined;
  const modoActivo = portalDataset ?? (path.startsWith('/admin') ? 'ADMIN' : 'CLIENTE');
  const nextIsAdmin = modoActivo === 'ADMIN';
  const nextItems = nextIsAdmin ? adminItems : clientItems;
  ```
- Keep indicator movement and tab highlights settled on shared routes without crashing or resetting state.

In `src/components/navigation/TopBarIsland.tsx`:
- Synchronize `isAdminVariant` with `navVariant === 'admin' || (typeof document !== 'undefined' && document.documentElement.dataset.portalModo === 'ADMIN')`.
- Ensure brand link points to `/admin` when in operator mode.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import ./tests/register-loader.mjs --test tests/portal_modo_persistencia.test.ts`  
Expected: PASS

- [ ] **Step 5: Verify Astro check**

Run: `pnpm check`  
Expected: 0 errors, 0 warnings, 0 hints

- [ ] **Step 6: Commit**

```bash
git add src/layouts/LayoutApp.astro src/components/navigation/BottomNav.astro src/components/navigation/BottomNavIsland.tsx src/components/navigation/TopBarIsland.tsx tests/portal_modo_persistencia.test.ts
git commit -m "fix(navigation): preserve admin shell and dock items across ClientRouter transitions"
```

---

### Task 4: Sincronización de Páginas Compartidas (`/perfil`, `/configuracion`, `/notificaciones`)

**Files:**
- Modify: `src/pages/perfil/index.astro:50-67`
- Modify: `src/pages/configuracion/index.astro:1-16`
- Modify: `src/pages/notificaciones/index.astro:1-16`

**Interfaces:**
- Consumes: `Astro.locals.modoPortal`
- Produces: Correct `navVariant` ('admin' | 'client') and back button navigation targets

- [ ] **Step 1: Check existing pages and verify props passed to `LayoutApp`**

Read `src/pages/perfil/index.astro`, `src/pages/configuracion/index.astro`, and `src/pages/notificaciones/index.astro`.

- [ ] **Step 2: Update `src/pages/perfil/index.astro`**

- Read `const modoOperador = Astro.locals.modoPortal === 'ADMIN';`
- Pass `navVariant={modoOperador ? 'admin' : 'client'}` to `LayoutApp`.
- Pass `modoActual={Astro.locals.modoPortal}` to `PerfilEditorCard`.

- [ ] **Step 3: Update `src/pages/configuracion/index.astro`**

- Read `const modoOperador = Astro.locals.modoPortal === 'ADMIN';`
- Pass `navVariant={modoOperador ? 'admin' : 'client'}`, `showBack={true}`, and `backHref={modoOperador ? '/admin' : '/catalogo'}` to `LayoutApp`.

- [ ] **Step 4: Update `src/pages/notificaciones/index.astro`**

- Replace manual cookie read with `const modoOperador = Astro.locals.modoPortal === 'ADMIN';`.
- Pass `navVariant={modoOperador ? 'admin' : 'client'}` and `backHref={modoOperador ? '/admin' : '/catalogo'}`.

- [ ] **Step 5: Verify Astro check and tests**

Run: `pnpm check && pnpm test`  
Expected: 0 errors and all tests passing

- [ ] **Step 6: Commit**

```bash
git add src/pages/perfil/index.astro src/pages/configuracion/index.astro src/pages/notificaciones/index.astro
git commit -m "fix(pages): dynamically adapt navigation shell on shared utility pages"
```

---

### Task 5: Corrección de Retorno en Entrega Pericial (`VehiculoEntregaWizard` y `AlquilerDetalleView`)

**Files:**
- Modify: `src/pages/reservas/[codigo]/entrega.astro:25-39`
- Modify: `src/components/reservas/VehiculoEntregaWizard.tsx:180-185, 465-475, 1050-1065`
- Modify: `src/components/reservas/AlquilerDetalleView.tsx:1380-1405`

**Interfaces:**
- Consumes: `Astro.locals.modoPortal`, `modo` ('admin' | 'client')
- Produces: Safe return to `/admin/reservas/[codigo]` for operators completing or cancelling vehicle delivery

- [ ] **Step 1: Inspect `VehiculoEntregaWizard.tsx` props and navigation calls**

Read lines where `navigate('/reservas/' + reserva.codigo)` is called (Escape key, close 'X' button, finish button).

- [ ] **Step 2: Add `retornoHref?: string` prop to `VehiculoEntregaWizard.tsx`**

- Define `retornoHref?: string | undefined` in `VehiculoEntregaWizardProps`.
- Replace hardcoded `/reservas/${reserva.codigo}` with `const destinoVolver = retornoHref ?? `/reservas/${reserva.codigo}`;`.
- Update Escape key handler (line 182), cancel button (line 467), and finish synthesis button (line 1056) to navigate to `destinoVolver`.

- [ ] **Step 3: Update `src/pages/reservas/[codigo]/entrega.astro`**

- Read `const modoOperador = Astro.locals.modoPortal === 'ADMIN';`
- Set `navVariant={modoOperador ? 'admin' : 'client'}` on `<LayoutApp>`.
- Pass `retornoHref={modoOperador ? `/admin/reservas/${codigo}` : `/reservas/${codigo}`}` to `<VehiculoEntregaWizard>`.

- [ ] **Step 4: Update `AlquilerDetalleView.tsx`**

- When `modo === 'admin'`, ensure delivery button click preserves admin context or navigates with return expectation.

- [ ] **Step 5: Verify Astro check and tests**

Run: `pnpm check && pnpm test`  
Expected: 0 errors, all tests passing

- [ ] **Step 6: Commit**

```bash
git add src/components/reservas/VehiculoEntregaWizard.tsx src/pages/reservas/[codigo]/entrega.astro src/components/reservas/AlquilerDetalleView.tsx
git commit -m "fix(reservas): return operators to admin inspection detail upon vehicle delivery completion"
```

---

### Task 6: Conmutador Bidireccional en Menú de Usuario y Tarjeta de Perfil

**Files:**
- Modify: `src/components/navigation/UserDropdownMenu.tsx:145-220`
- Modify: `src/components/navigation/TopBarIsland.tsx:230-245`
- Modify: `src/components/perfil/PortalSwitchCard.tsx:11-55, 108-148`
- Modify: `src/components/perfil/PerfilEditorCard.tsx:120-144, 400-470`

**Interfaces:**
- Consumes: `actions.portal.cambiarModoPortal`, `Astro.locals.modoPortal`
- Produces: Direct one-click switching between `Modo Operador` and `Modo Personal` from TopBar and Profile

- [ ] **Step 1: Update `PortalSwitchCard.tsx` to support bidirectional toggling**

- Add `modoActual?: 'ADMIN' | 'CLIENTE'` to `PortalSwitchCardProps`.
- Set `aria-checked={modoActual === 'ADMIN'}`.
- If `modoActual === 'ADMIN'`:
  - Label: "Modo Operador Activo".
  - Action: "Cambiar a Modo Personal (Alquilar)".
  - On click: calls `actions.portal.cambiarModoPortal({ modo: 'CLIENTE' })` and navigates to `/catalogo`.
- If `modoActual === 'CLIENTE'`:
  - Label: "Modo Operativo Disponible".
  - Action: "Entrar a patio →".
  - On click: calls `actions.portal.cambiarModoPortal({ modo: 'ADMIN' })` and navigates to `/admin`.

- [ ] **Step 2: Add portal mode switcher into `UserDropdownMenu.tsx`**

- Pass `tieneAccesoAdmin` and `modoPortal?: 'ADMIN' | 'CLIENTE'` to `UserDropdownMenu`.
- In `UserDropdownMenu.tsx`, when `autenticado && tieneAccesoAdmin`:
  - Render a clean Apple-style toggle item at the top of options:
    - If `modoPortal === 'ADMIN'`: "Cambiar a Modo Personal" with car icon -> switches to `CLIENTE` and navigates to `/catalogo`.
    - If `modoPortal === 'CLIENTE'`: "Cambiar a Modo Patio" with building icon -> switches to `ADMIN` and navigates to `/admin`.

- [ ] **Step 3: Update `PerfilEditorCard.tsx`**

- Update `handleConmutarPatio` to toggle according to `modoActual`.

- [ ] **Step 4: Run unit tests and Astro check**

Run: `pnpm check && pnpm test`  
Expected: 0 errors, 0 warnings, 0 hints and all tests passing

- [ ] **Step 5: Run production build verification**

Run: `pnpm build`  
Expected: Successful Cloudflare Pages SSR build with zero bundle warnings.

- [ ] **Step 6: Commit**

```bash
git add src/components/navigation/UserDropdownMenu.tsx src/components/navigation/TopBarIsland.tsx src/components/perfil/PortalSwitchCard.tsx src/components/perfil/PerfilEditorCard.tsx
git commit -m "feat(navigation): enable seamless bidirectional portal mode toggling across desktop and mobile"
```
