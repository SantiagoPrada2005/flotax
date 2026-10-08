# AGENTS.md — Manual de Operación y Gobernanza para Agentes de IA

> **Proyecto:** FlotaX (Movix) — Sistema Operativo y Gestión Perimetral de Alquiler de Flotas de Vehículos  
> **Directorio Raíz:** [`/Users/santiago/proyectos/movix`](file:///Users/santiago/proyectos/movix)  
> **Ámbito:** Obligatorio para todos los agentes de Inteligencia Artificial (Antigravity, Cursor, Claude Code, Copilot, etc.) y desarrolladores que operen en este repositorio.

---

## 1. Misión Estratégica y Alineación de Producto (FlotaX)

FlotaX es una plataforma integral, moderna y móvil de gestión perimetral para el alquiler y control operativo de flotas de vehículos (automóviles, motocicletas, monopatines eléctricos y utilitarios).

### FlotaX NO es:
- ❌ Una aplicación de notas o productividad personal.
- ❌ Un CRM genérico o ERP pesado de escritorio tradicional.
- ❌ Una tienda de comercio electrónico tradicional.

### FlotaX ES:
- ✅ Un **sistema operativo móvil y ágil para administradores de patio, recepcionistas y clientes**:
  - Catálogo y disponibilidad en tiempo real de unidades con estados inequívocos: *Disponible*, *Reservado*, *En Mantenimiento*, *Fuera de Servicio*.
  - Gestión integral del ciclo de alquiler: reserva, check-in, entrega con inspección pericial fotográfica en Cloudflare R2, prórroga, devolución y cobro.
  - Liquidación de tarifas, depósitos de garantía y caja operativa.
  - Autenticación segura y sin contraseñas (Email OTP y Google OAuth) con Better Auth sobre Cloudflare D1.
  - Enfoque **Mobile-First Operativo**: Todo flujo crítico debe ser completable desde un teléfono en terreno con una sola mano.

*Referencia de gobierno:* [`.agents/rules/product-alignment.md`](file:///Users/santiago/proyectos/movix/.agents/rules/product-alignment.md)

---

## 2. Stack Tecnológico Canónico

| Capa / Rol | Tecnología Canónica | Justificación y Regla de Uso |
| :--- | :--- | :--- |
| **Plataforma & Runtime** | [Cloudflare Pages / Workers](file:///Users/santiago/proyectos/movix/wrangler.jsonc) | V8 Isolates con cold starts < 5 ms. Bindings directos vía `cloudflare:workers`. |
| **Framework Fullstack** | [Astro 7+](file:///Users/santiago/proyectos/movix/astro.config.mjs) (`@astrojs/cloudflare`) | SSR perimetral con motor Vite. Enrutamiento, Server Islands y Astro Actions tipadas. |
| **Motor de Reactividad** | [React 19](file:///Users/santiago/proyectos/movix/package.json) (`@astrojs/react`) | Islas interactivas cliente (`useActionState`, `useOptimistic`). Prohibido DOM imperativo. |
| **Base de Datos & ORM** | [Cloudflare D1](file:///Users/santiago/proyectos/movix/wrangler.jsonc) + [Drizzle ORM](file:///Users/santiago/proyectos/movix/drizzle.config.ts) | SQLite en el edge (`drizzle-orm/d1`). Tipado estricto `$inferSelect` / `$inferInsert`. |
| **Almacenamiento Multimedia** | Cloudflare R2 (`BUCKET_MULTIMEDIA`) | Zero egress para fotos periciales de inspección, videos y contratos PDF. |
| **Autenticación & Sesiones** | [Better Auth](file:///Users/santiago/proyectos/movix/src/lib/auth/) | Email OTP + Google OAuth, tablas Drizzle dedicadas (`user`, `session`, `account`, `verification`). |
| **Mensajería & Email** | Cloudflare Send Email (`env.EMAIL`) | Envío transaccional de códigos OTP y contratos sin dependencias externas pesadas. |
| **Estilos & Diseño** | [Tailwind CSS v4](file:///Users/santiago/proyectos/movix/src/styles/tokens.css) (`@tailwindcss/vite`) | Compilación nativa Vite, arquitectura en 3 capas de estilos y tokens canónicos. |
| **Validación de Esquemas** | [Zod v4](file:///Users/santiago/proyectos/movix/package.json) (`zod` `^4.6.5`) | Cumplimiento estricto con APIs modernas de Zod 4 (`z.email()`, `z.treeifyError()`). |
| **Gestor de Paquetes** | [pnpm](file:///Users/santiago/proyectos/movix/package.json) | Único gestor permitido en el proyecto (`pnpm-lock.yaml`). |

---

## 3. Las 10 Reglas de Oro y Verificaciones Bloqueantes (Zero-Tolerance Gates)

Cualquier cambio de código debe cumplir estrictamente estas 10 normas antes de considerarse terminado:

### 1. Puerta de Calidad Inviolable (`pnpm check` + `pnpm build`)
- **Tolerancia cero**: Todo trabajo debe finalizar con:
  ```bash
  pnpm check
  ```
  El resultado debe ser estrictamente:
  ```text
  Result (X files):
  - 0 errors
  - 0 warnings
  - 0 hints
  ```
- Tras pasar `pnpm check`, debe ejecutarse `pnpm build` para confirmar el empaquetado SSR para Cloudflare.
- *Referencia:* [`.agents/rules/astro-check.md`](file:///Users/santiago/proyectos/movix/.agents/rules/astro-check.md)

### 2. Gestor de Paquetes Exclusivo: `pnpm`
- **PROHIBIDO** usar `npm`, `npx`, `yarn` o `bun`.
- Siempre usar `pnpm install`, `pnpm add <pkg>`, `pnpm <script>`, `pnpm dlx <pkg>`.
- *Referencia:* [`.agents/rules/engines.md`](file:///Users/santiago/proyectos/movix/.agents/rules/engines.md)

### 3. Tolerancia Cero al Código Obsoleto y Estándares Zod 4
- **PROHIBIDO** código, librerías o llamadas marcadas como `@deprecated` (`TS6385`, `TS6387`).
- En Zod 4:
  - ❌ Prohibido: `z.string().email(...)` ➔ ✅ Canónico: `z.email({ error: '...' })`.
  - ❌ Prohibido: `error.flatten()` o `error.format()` ➔ ✅ Canónico: `z.treeifyError(error)` o `error.issues`.
  - ❌ Prohibido: `{ message: '...' }` en métodos que esperan `{ error: '...' }`.
- *Referencia:* [`.agents/rules/no-deprecated-code.md`](file:///Users/santiago/proyectos/movix/.agents/rules/no-deprecated-code.md)

### 4. Bindings Modernos de Cloudflare Workers
- Importar bindings siempre desde `cloudflare:workers`:
  ```typescript
  import { env } from 'cloudflare:workers';
  const db = env.DB;
  const bucket = env.BUCKET_MULTIMEDIA;
  ```
- ❌ **ESTRICTAMENTE PROHIBIDO**: `Astro.locals.runtime.env` o `context.locals.runtime`.
- Usar `Astro.request.cf` para geolocalización y `caches` global estándar.
- *Referencia:* [`.agents/rules/cloudflare-runtime-bindings.md`](file:///Users/santiago/proyectos/movix/.agents/rules/cloudflare-runtime-bindings.md)

### 5. Arquitectura de Islas Reactivas (React 19) vs Astro SSR
- Astro gestiona la renderización SSR, layouts, routing y endpoints de servidor.
- La interactividad del cliente (cámara de inspección, calendarios, formularios dinámicos) pertenece **exclusivamente a islas React 19 (`.tsx`)**.
- ❌ **ESTRICTAMENTE PROHIBIDO** escribir manipulación imperativa del DOM (`document.createElement()`, `el.appendChild()`, `el.innerHTML = ...`, controladores vanilla de DOM).
- *Referencia:* [`.agents/rules/reactive-islands.md`](file:///Users/santiago/proyectos/movix/.agents/rules/reactive-islands.md)

### 6. Orquestación de Páginas y Límite de Líneas (<150 LOC)
- Las páginas en [`src/pages/**`](file:///Users/santiago/proyectos/movix/src/pages) son **orquestadores delgados**:
  - Máximo **150 líneas de código**.
  - No deben contener lógica pesada de negocio ni marcado HTML masivo inline.
  - La UI se divide en:
    - **Tier 1 (UI Agnóstica)**: [`src/components/ui/`](file:///Users/santiago/proyectos/movix/src/components) (Botones, inputs, tarjetas, badges).
    - **Tier 2 (Módulos de Dominio)**: [`src/components/{dominio}/`](file:///Users/santiago/proyectos/movix/src/components) (Cards de vehículos, inspecciones, auth).
- *Referencia:* [`.agents/rules/page-architecture.md`](file:///Users/santiago/proyectos/movix/.agents/rules/page-architecture.md)

### 7. Paleta Canónica Movix (Invarianza Cromática)
- La paleta se compone **únicamente** de 5 valores canónicos neutros:
  - `#EDEDED` (Superficie clara / texto blanco)
  - `#9CA3AF` (Gris tenue / bordes sutiles / textos secundarios)
  - `#4B5563` (Gris medio / bordes activos / acentos interactivos)
  - `#1F2937` (Gris oscuro / tarjetas / superficies secundarias)
  - `#111827` (Negro profundo / fondo base de la aplicación)
- ❌ Prohibido introducir acentos no autorizados (naranjas, morados, verdes saturados) aunque aparezcan en borradores externos.
- *Referencia:* [`.agents/rules/color-palette-governance.md`](file:///Users/santiago/proyectos/movix/.agents/rules/color-palette-governance.md) y [`src/styles/tokens.css`](file:///Users/santiago/proyectos/movix/src/styles/tokens.css)

### 8. Ergonomía Móvil y Regla de los 16px en WebKit
- Todo campo `<input>`, `<textarea>` y `<select>` debe tener un tamaño de fuente computado **mínimo de 16px (`1rem` / `text-base`)**.
  - Evita el zoom automático permanente y destructivo de iOS Safari.
- ❌ **ESTRICTAMENTE PROHIBIDO** usar `maximum-scale=1, user-scalable=no` en `<meta name="viewport">` (viola WCAG 2.1).
- Zonas de toque mínimas de 44x44px y ergonomía adaptada a una mano.
- *Referencia:* [`.agents/rules/mobile-input-governance.md`](file:///Users/santiago/proyectos/movix/.agents/rules/mobile-input-governance.md) y [`.agents/rules/mobile-deep-work.md`](file:///Users/santiago/proyectos/movix/.agents/rules/mobile-deep-work.md)

### 9. Schema-First y Tipado Extremo a Extremo con Drizzle ORM
- Las tablas en [`src/db/schema/*.ts`](file:///Users/santiago/proyectos/movix/src/db/schema) son la **única fuente de verdad** para los modelos del dominio.
- Derivar tipos con `$inferSelect` y `$inferInsert`. Prohibido crear interfaces TypeScript manuales duplicadas o usar aserciones de tipo (`as`, `as any`, `as unknown as`).
- El tipado estricto debe fluir de forma continua e ininterrumpida desde las columnas de D1 hasta los componentes Astro y las islas React 19.
- **Sincronización documental obligatoria**: Siempre que se cree o modifique una tabla en `src/db/schema/`, se debe actualizar [`docs/database.md`](file:///Users/santiago/proyectos/movix/docs/database.md) (y su diagrama Mermaid de clases) en el mismo paso.
- *Referencias:* [`.agents/rules/drizzle-end-to-end-type-safety.md`](file:///Users/santiago/proyectos/movix/.agents/rules/drizzle-end-to-end-type-safety.md), [`.agents/rules/schema-first-typing.md`](file:///Users/santiago/proyectos/movix/.agents/rules/schema-first-typing.md), [`.agents/rules/database-documentation.md`](file:///Users/santiago/proyectos/movix/.agents/rules/database-documentation.md) y [`.agents/rules/drizzle-d1.md`](file:///Users/santiago/proyectos/movix/.agents/rules/drizzle-d1.md)

### 10. Utilidades Centralizadas y Sin "Junk Drawer"
- ❌ Prohibido crear archivos cajón de sastre como `utils.ts` o `helpers.ts`.
- Las utilidades deben categorizarse por dominio semántico en `src/lib/{dominio}/`.
- Para fechas y tiempo en cliente, consumir siempre [`src/lib/time/client-time.ts`](file:///Users/santiago/proyectos/movix/src/lib/time/client-time.ts).
- *Referencias:* [`.agents/rules/centralized-utilities.md`](file:///Users/santiago/proyectos/movix/.agents/rules/centralized-utilities.md) y [`.agents/rules/client-time-context.md`](file:///Users/santiago/proyectos/movix/.agents/rules/client-time-context.md)

---

## 4. Estructura de Directorios del Repositorio

```text
movix/
├── .agents/                      # Gobernanza de IA, reglas operativas y skills
│   ├── rules/                    # Reglas canónicas del proyecto (.md)
│   └── skills/                   # Antigravity Skills especializadas
├── design/                       # Especificaciones UI/UX y exportaciones vectoriales
│   ├── design.pen                # Archivo fuente de Pencil
│   └── exports/                  # Archivos HTML canónicos exportados (fuente de verdad visual)
├── docs/                         # Documentación técnica, ADRs y contratos funcionales
│   ├── database.md               # Esquema de base de datos y diagrama Mermaid canónico
│   ├── user-flows.md             # Especificación de flujos de usuario y rutas
│   └── ...
├── drizzle/                      # Migraciones SQL generadas por drizzle-kit
├── src/                          # Código fuente de la aplicación
│   ├── actions/                  # Astro Actions (RPC servidor tipado con validación Zod)
│   ├── components/               # Componentes UI organizados en 2 Tiers
│   │   ├── auth/                 # Componentes del dominio de autenticación
│   │   ├── navigation/           # Barras de navegación (TopBar, BottomNav, Sidebar)
│   │   ├── ui/                   # Tier 1: Primitivas agnósticas (Button, Input, Card, Modal)
│   │   └── ...                   # Tier 2: Módulos de dominio (flota, inspecciones, caja)
│   ├── db/                       # Base de datos D1 y Drizzle ORM
│   │   └── schema/               # Definición modular de esquemas SQLite
│   ├── layouts/                  # Layouts de Astro (LayoutApp, LayoutAdmin, etc.)
│   ├── lib/                      # Lógica de dominio y clientes categorizados por carpeta
│   │   ├── auth/                 # Configuración de Better Auth, RBAC, guardias y sesiones
│   │   ├── email/                # Servicio y templates para Cloudflare Send Email
│   │   └── time/                 # Formateo centralizado de tiempo y fechas
│   ├── pages/                    # Rutas y páginas de Astro (<150 LOC por archivo)
│   │   ├── api/                  # Endpoints REST específicos (auth, email webhooks)
│   │   └── ...                   # Vistas públicas y administrativas
│   ├── styles/                   # Tokens y directivas globales de Tailwind CSS v4
│   │   └── tokens.css            # Definición de capas @theme y variables de color
│   ├── env.d.ts                  # Declaraciones de tipos para Cloudflare y Astro
│   └── middleware.ts             # Middleware perimetral de sesiones y autenticación
├── astro.config.mjs              # Configuración de Astro con adaptador @astrojs/cloudflare
├── drizzle.config.ts             # Configuración de Drizzle Kit para D1 SQLite
├── package.json                  # Manifiesto de paquetes y scripts de pnpm
├── tsconfig.json                 # Configuración estricta de TypeScript (strictest)
├── wrangler.jsonc                # Configuración de Workers, D1 y R2
└── INDEX.md                      # Índice maestro del repositorio (mantenido con codebase-index)
```

---

## 5. Directorio de Reglas Canónicas (`.agents/rules/`)

Consulta siempre el archivo de regla correspondiente antes de realizar cambios estructurales:

| Código | Archivo de Regla | Ámbito y Propósito |
| :--- | :--- | :--- |
| **RUL-FLX-001** | [`user-flows.md`](file:///Users/santiago/proyectos/movix/.agents/rules/user-flows.md) | Consulta obligatoria antes de agregar páginas, botones de acción o navegación. |
| **RUL-FLX-002** | [`pen-fidelity.md`](file:///Users/santiago/proyectos/movix/.agents/rules/pen-fidelity.md) | Fidelidad visual estricta basada en [`design/exports/`](file:///Users/santiago/proyectos/movix/design/exports). |
| **RUL-FLX-003** | [`color-palette-governance.md`](file:///Users/santiago/proyectos/movix/.agents/rules/color-palette-governance.md) | Paleta de 5 colores canónicos neutros. Prohibido colores no autorizados. |
| **RUL-FLX-004** | [`product-alignment.md`](file:///Users/santiago/proyectos/movix/.agents/rules/product-alignment.md) | Propósito estratégico: sistema operativo perimetral de alquiler de vehículos. |
| **RUL-FLX-005** | [`ux-principles.md`](file:///Users/santiago/proyectos/movix/.agents/rules/ux-principles.md) | Diseño centrado en acciones operativas en tiempo real en patio. |
| **RUL-FLX-006** | [`ux-copywriting.md`](file:///Users/santiago/proyectos/movix/.agents/rules/ux-copywriting.md) | Redacción humana sin tecnicismos ni jerga interna del backend. |
| **RUL-FLX-007** | [`mobile-deep-work.md`](file:///Users/santiago/proyectos/movix/.agents/rules/mobile-deep-work.md) | Flujos móviles secuenciales en pantallas ≤430px para operarios en campo. |
| **RUL-FLX-018** | [`no-deprecated-code.md`](file:///Users/santiago/proyectos/movix/.agents/rules/no-deprecated-code.md) | Tolerancia cero a APIs `@deprecated` (`TS6385`, `TS6387`) y Zod 4 compliance. |
| **RUL-FLX-019** | [`drizzle-end-to-end-type-safety.md`](file:///Users/santiago/proyectos/movix/.agents/rules/drizzle-end-to-end-type-safety.md) | Tipado estricto E2E con Drizzle ORM, zero aserciones (`as`) e inferencia nativa. |
| — | [`astro-check.md`](file:///Users/santiago/proyectos/movix/.agents/rules/astro-check.md) | Ejecución obligatoria de `pnpm check` (0 errores, 0 warnings, 0 hints). |
| — | [`engines.md`](file:///Users/santiago/proyectos/movix/.agents/rules/engines.md) | Uso exclusivo de `pnpm` y TypeScript super estricto (cero `any`). |
| — | [`cloudflare-runtime-bindings.md`](file:///Users/santiago/proyectos/movix/.agents/rules/cloudflare-runtime-bindings.md) | Acceso moderno a bindings vía `cloudflare:workers` (nunca `locals.runtime.env`). |
| — | [`reactive-islands.md`](file:///Users/santiago/proyectos/movix/.agents/rules/reactive-islands.md) | React 19 para interactividad cliente; prohibición de manipulación DOM imperativa. |
| — | [`page-architecture.md`](file:///Users/santiago/proyectos/movix/.agents/rules/page-architecture.md) | Páginas orquestadoras <150 LOC y jerarquía en Tier 1 y Tier 2 de componentes. |
| — | [`mobile-input-governance.md`](file:///Users/santiago/proyectos/movix/.agents/rules/mobile-input-governance.md) | Regla de los 16px en WebKit para inputs; prohibido deshabilitar el viewport. |
| — | [`drizzle-d1.md`](file:///Users/santiago/proyectos/movix/.agents/rules/drizzle-d1.md) | Acceso a D1 únicamente mediante Drizzle ORM y sqlite primitives. |
| — | [`schema-first-typing.md`](file:///Users/santiago/proyectos/movix/.agents/rules/schema-first-typing.md) | Schemas de Drizzle como fuente única de verdad para tipos de dominio. |
| — | [`database-documentation.md`](file:///Users/santiago/proyectos/movix/.agents/rules/database-documentation.md) | Actualización obligatoria de [`docs/database.md`](file:///Users/santiago/proyectos/movix/docs/database.md) al modificar esquemas. |
| — | [`tailwind-v4-styling-governance.md`](file:///Users/santiago/proyectos/movix/.agents/rules/tailwind-v4-styling-governance.md) | 3 capas de estilos en Tailwind v4 y uso de tokens canónicos. |
| — | [`centralized-utilities.md`](file:///Users/santiago/proyectos/movix/.agents/rules/centralized-utilities.md) | Prohibición de archivos `utils.ts` monolíticos; agrupación por dominio. |
| — | [`client-time-context.md`](file:///Users/santiago/proyectos/movix/.agents/rules/client-time-context.md) | Manejo consistente de tiempo/fecha cliente vs servidor perimetral. |
| — | [`vite-dependency-bundling.md`](file:///Users/santiago/proyectos/movix/.agents/rules/vite-dependency-bundling.md) | Manejo de empaquetado de dependencias y sourcemaps en Vite. |

---

## 6. Procedimientos Operativos Canónicos (Runbooks)

### 6.1 Runbook A: Crear o Modificar una Pantalla (`src/pages/`)
1. **Revisar Especificación de Flujo**: Consultar [`docs/user-flows.md`](file:///Users/santiago/proyectos/movix/docs/user-flows.md) y [`design/exports/`](file:///Users/santiago/proyectos/movix/design/exports).
2. **Estructura Delgada (<150 LOC)**:
   - Extraer lógica de datos y mutaciones a Astro Actions o Server Endpoints.
   - Extraer UI visual a componentes en `src/components/{dominio}/` o `src/components/ui/`.
3. **Manejo de Sesión & Layout**:
   - Envolver en el layout administrativo o público correspondiente ([`LayoutAdmin.astro`](file:///Users/santiago/proyectos/movix/src/layouts/LayoutAdmin.astro) o [`LayoutApp.astro`](file:///Users/santiago/proyectos/movix/src/layouts/LayoutApp.astro)).
   - Comprobar permisos con los guards en [`src/lib/auth/guard.ts`](file:///Users/santiago/proyectos/movix/src/lib/auth/guard.ts).
4. **Verificación**: Ejecutar `pnpm check`.

### 6.2 Runbook B: Crear una Isla Reactiva (`src/components/react/` o `.tsx`)
1. **Evaluar Necesidad de React**: Solo crear isla si requiere interactividad rica en cliente (formularios con `useActionState`, cámara pericial, drag & drop, calendarios interactivos).
2. **Prohibición de Scripts Vanilla**: Nunca usar TypeScript imperativo manipulando el DOM.
3. **Importación con Directiva de Cliente**: En la página `.astro`, incluir la directiva de hidratación adecuada (`client:load`, `client:visible` o `client:idle`).
4. **Ergonomía de Formularios**: Todos los `<input>` deben tener clases de tamaño de fuente que aseguren al menos `16px` (`text-base`).
5. **Verificación**: Ejecutar `pnpm check`.

### 6.3 Runbook C: Modificar o Crear Tablas de Base de Datos (`src/db/schema/`)
1. **Crear o Editar Schema**: Definir la tabla en [`src/db/schema/{modulo}.ts`](file:///Users/santiago/proyectos/movix/src/db/schema) usando `sqliteTable` de `drizzle-orm/sqlite-core`.
2. **Re-exportar**: Exportar la tabla y sus relaciones en [`src/db/schema/index.ts`](file:///Users/santiago/proyectos/movix/src/db/schema/index.ts).
3. **Derivar Tipos**: Exportar tipos inferidos:
   ```typescript
   export type Vehiculo = typeof vehiculos.$inferSelect;
   export type NuevoVehiculo = typeof vehiculos.$inferInsert;
   ```
4. **Generar Migración**:
   ```bash
   pnpm db:generate
   ```
5. **Sincronizar Documentación Inmediatamente**:
   - Actualizar el diagrama Mermaid y las especificaciones en [`docs/database.md`](file:///Users/santiago/proyectos/movix/docs/database.md).
6. **Verificación**: Ejecutar `pnpm check`.

### 6.4 Runbook D: Crear una Astro Action (`src/actions/`)
1. **Definir Entrada con Zod 4**:
   ```typescript
   import { defineAction } from 'astro:actions';
   import { z } from 'zod';

   export const crearVehiculo = defineAction({
     input: z.object({
       placa: z.string().min(1, { error: 'La placa es obligatoria' }),
       correo: z.email({ error: 'Correo no válido' }),
     }),
     handler: async (input, context) => {
       // Obtener DB desde cloudflare:workers
       import { env } from 'cloudflare:workers';
       // Lógica de negocio
     },
   });
   ```
2. **Manejo de Errores UX**: Devolver mensajes amigables para el usuario operador, nunca errores internos de SQL o bindings.
3. **Verificación**: Ejecutar `pnpm check`.

---

## 7. Protocolo Pre-Flight Obligatorio Antes de Responder al Usuario

Todo agente debe completar esta rutina de control de calidad antes de considerar cualquier tarea completada:

```bash
# 1. Verificar tipado estricto y cero errores/warnings en Astro y TypeScript
pnpm check

# 2. Verificar compilación exitosa del bundle para Cloudflare Workers
pnpm build
```

Si alguno de estos comandos falla o emite alertas/hints, **el agente debe corregir la causa raíz de inmediato** antes de devolver el control al usuario.
