# Rule: Technical SEO, Indexability & Structured Data Governance

**Código:** RUL-FLX-022  
**Proyecto:** FlotaX — Sistema de Alquiler y Gestión de Flota de Vehículos  
**Directorio Fuente de Verdad:** [`src/layouts/LayoutApp.astro`](../../src/layouts/LayoutApp.astro), [`src/components/seo/SeoHead.astro`](../../src/components/seo/SeoHead.astro), [`src/lib/seo/`](../../src/lib/seo), [`public/robots.txt`](../../public/robots.txt), [`src/pages/sitemap.xml.ts`](../../src/pages/sitemap.xml.ts)  
**Ámbito:** Todas las páginas Astro en `src/pages/`, layouts, componentes de presentación visual, imágenes y metadatos de enrutamiento.

---

## 1. Misión y Propósito Arquitectónico

FlotaX opera bajo una arquitectura híbrida de **Server-Side Rendering (SSR) perimetral en Cloudflare Workers** con hidratación de islas interactivas React 19 y navegación SPA con `<ClientRouter />`.

Para garantizar que los motores de búsqueda (Googlebot, Bingbot) e indexadores sociales (Open Graph, Twitter Cards) rastreen, comprendan y posicionen las unidades de flota y patios en los primeros lugares de búsqueda local y transaccional, **el SEO técnico debe ser impecable, determinista y auditado en cada despliegue (puntuación Lighthouse SEO = 100)**.

Esta regla define los mandamientos obligatorios que todo desarrollador o agente de inteligencia artificial debe cumplir al crear o modificar páginas en FlotaX.

---

## 2. Los 7 Mandamientos Inviolables de SEO (Zero-Tolerance Gates)

### 1. Título y Meta Descripción Obligatorios en Toda Vista Pública
- **PROHIBIDO** crear páginas públicas en `src/pages/` sin proporcionar explícitamente `title` y `description` a [`LayoutApp.astro`](../../src/layouts/LayoutApp.astro).
- **Límites de extensión recomendados**:
  - `title`: Entre 40 y 60 caracteres. Debe terminar con `| FlotaX` o `· FlotaX`.
  - `description`: Entre 120 y 160 caracteres. Redacción persuasiva, humana, sin tecnicismos internos y con llamado a la acción claro (ej. *"Entrega en 3 minutos sin trámites"*).

### 2. URL Canónica Absoluta (`rel="canonical"`)
- Toda página indexable debe contar con una etiqueta `<link rel="canonical" href="..." />` con URL absoluta normalizada (sin trailing slash redundante).
- Resuelta automáticamente por [`SeoHead.astro`](../../src/components/seo/SeoHead.astro) a partir de `Astro.site` (`https://flotax.innovaweb.pro`). Si la vista admite parámetros de consulta que no alteran el contenido canónico (como filtros cosméticos o paginación en cliente), la página debe pasar `canonicalUrl` apuntando a la ruta limpia base.

### 3. Datos Estructurados Schema.org (JSON-LD Tipado)
- **PROHIBIDO** inyectar microformatos dispersos en el HTML o scripts JSON-LD construidos con concatenación manual de cadenas propensa a errores.
- Toda entidad de dominio debe utilizar los builders centralizados en [`src/lib/seo/schema.ts`](../../src/lib/seo/schema.ts):
  - **Landing (`/`)**: `AutoRental` y `Organization` con `SearchAction`.
  - **Catálogo (`/catalogo`, `/c/[slug]`)**: `CollectionPage` y `AutoRental` local.
  - **Detalle de Vehículo (`/vehiculos/[id]`)**: `Car` / `Vehicle` y `Product` con `Offer` (precio diario en COP, disponibilidad en tiempo real `InStock` / `OutOfStock` y vendedor `AutoRental`).
  - **Migas de pan**: `BreadcrumbList` en toda página subordinada.

### 4. Aislamiento Estricto de Rutas Privadas (`noindex, nofollow`)
- El motor de búsqueda solo debe rastrear áreas de captación y catálogo público.
- **Deben forzar `noindex, nofollow` obligatoriamente**:
  - Portal administrativo (`/admin/**` gestionado por `LayoutAdmin.astro`).
  - Portal privado de cliente (`/reservas/**`).
  - Verificación KYC y perfil (`/perfil/**`).
  - Notificaciones (`/notificaciones/**`).
  - Pasos transaccionales de checkout (`/alquilar/**`).
  - Autenticación (`/login`, `/registro`).
  - Errores y estado (`/offline`, `/404`, `/500`, `/error`).
- [`LayoutApp.astro`](../../src/layouts/LayoutApp.astro) aplica automáticamente `noindex: true` a estas rutas, pero cualquier flujo transaccional nuevo debe declararlo explícitamente con `noindex={true}`.

### 5. Jerarquía Semántica de Encabezados (Regla del `<h1>` Único)
- **Exactamente un solo `<h1>` por documento HTML**.
- El `<h1>` debe sintetizar la promesa central de la página (ej. en la landing: la propuesta de valor; en el catálogo: el nombre del patio o inventario; en la ficha: la marca y modelo del vehículo).
- Prohibido saltar niveles de encabezados (ej. pasar de `<h1>` directamente a `<h3>` sin un `<h2>` intermedio).

### 6. Integridad de Texto Alternativo (`alt`) en Imágenes
- **Tolerancia cero a `<img>` sin atributo `alt`** o con textos genéricos vacíos (`alt=""` o `alt="imagen"`).
- Para vehículos, el `alt` debe contener inequívocamente la marca y modelo: `alt={`${v.marca} ${v.modelo}`}`.
- Para avatares o iconos decorativos, usar `aria-hidden="true"` si no aportan valor semántico.

### 7. Gobernanza de Rastreo (`robots.txt` & `sitemap.xml`)
- Todo cambio estructural en el mapa de rutas públicas debe reflejarse en:
  - [`public/robots.txt`](../../public/robots.txt): Declaración de rutas permitidas y bloqueadas con puntero al sitemap.
  - [`src/pages/sitemap.xml.ts`](../../src/pages/sitemap.xml.ts): Endpoint dinámico perimetral que indexa las URLs vivas en Cloudflare D1.

---

## 3. Guía Rápida de Implementación en Páginas Astro

```astro
---
// src/pages/mi-seccion/ejemplo.astro
import LayoutApp from '@/layouts/LayoutApp.astro';
import { buildBreadcrumbSchema } from '@/lib/seo';

const breadcrumb = buildBreadcrumbSchema(
  [
    { name: 'Inicio', path: '/' },
    { name: 'Ejemplo', path: '/mi-seccion/ejemplo' },
  ],
  'https://flotax.innovaweb.pro'
);
---

<LayoutApp
  title="Título Específico (40-60 caracteres) | FlotaX"
  description="Descripción redactada para humanos con gancho comercial y palabras clave relevantes del vehículo o patio (120-160 caracteres)."
  canonicalUrl="https://flotax.innovaweb.pro/mi-seccion/ejemplo"
  ogImage="/images/landing/hero-vehicle.webp"
  ogType="website"
  structuredData={breadcrumb}
>
  <main class="w-full">
    <h1 class="font-display text-2xl font-black text-[#111827]">Encabezado Principal Único</h1>
    <!-- Contenido semántico -->
  </main>
</LayoutApp>
```

---

## 4. Verificación Obligatoria de Cumplimiento

Antes de dar por concluida cualquier tarea que afecte rutas, layouts o marcado visual:
1. `pnpm check`: Confirmar 0 errores, 0 warnings y 0 hints de TypeScript/Astro.
2. `pnpm build`: Confirmar que el endpoint `sitemap.xml.ts` compila correctamente para Cloudflare Workers.
3. Auditoría Lighthouse SEO: La puntuación debe mantenerse estrictamente en **100/100**.
