# Auditoría UX/UI — Catálogo de Vehículos y Buscador/Filtros de FlotaX

> **Código de Auditoría:** AUD-FLX-CAT-001  
> **Fecha:** 2026-10-13  
> **Auditor:** Diseñador de Producto / Ingeniero Frontend Senior  
> **Severidad General:** 🔴 Alta — Se detectaron múltiples violaciones de gobernanza cromática, tokens y copywriting que requieren corrección inmediata.

---

## Ficha Técnica

| Campo | Valor |
| :--- | :--- |
| **Páginas Evaluadas** | `/catalogo` (`src/pages/catalogo/index.astro`), `/vehiculos/[id]` (`src/pages/vehiculos/[id].astro`) |
| **Componentes Evaluados** | `VehicleCatalogCard.tsx`, `CatalogSearchTrigger.tsx`, `BrandFilterBar.tsx`, `VehicleSearchSpotlight.tsx`, `VehicleSearchResultItem.tsx` |
| **Reglas Contrastadas** | `tailwind-v4-styling-governance.md`, `mobile-input-governance.md`, `pen-fidelity.md`, `ux-principles.md`, `client-time-context.md`, `color-palette-governance.md`, `ux-copywriting.md`, `design-system.md` |
| **Exports de Diseño Contrastados** | `Filtros Section.html`, `Group TARJETA DE VEHÍCULO.html`, `Barra de filtros.html`, `Panel Lista de Vehículos.html`, `Responsive Grid.html`, `Badges Status.html` |

---

## Resumen Ejecutivo

La implementación actual del catálogo de FlotaX presenta una UI visual moderna y bien orientada a mobile-first, pero acumula **deuda técnica y de gobernanza significativa** en 6 ejes principales:

1. **Violación masiva de tokens semánticos**: Se detectaron **177+ ocurrencias de hex codes crudos** en clases de Tailwind (ej. `text-[#18181B]`, `bg-[#F4F4F5]`, `border-[#E4E4E7]`) en lugar de usar los tokens semánticos definidos en `tokens.css` (ej. `text-brand-primary`, `bg-surface-canvas`).
2. **Colores fuera de la paleta canónica**: Se usan códigos hex que **no pertenecen** a la paleta canónica de 5 colores (`#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`), introduciendo grises Zinc como `#18181B`, `#71717A`, `#A1A1AA`, `#E4E4E7`, `#F4F4F5`, `#EAEAEB`, `#FAFAFA` y colores semánticos estándar de Tailwind (`emerald-*`, `amber-*`, `text-amber-500`).
3. **Copywriting en inglés**: Textos visibles para el usuario en inglés ("Find Your Perfect Ride", "Popular Cars", "Brand", "See All", "All Car", "top speed", "range (EPA est)", "rating") en un producto operativo colombiano cuya regla `ux-copywriting.md` exige español neutro.
4. **Fechas hardcodeadas sin contexto temporal**: El rango de reserva `10 Oct – 14 Oct` está quemado en el markup, sin usar `resolveClientTimeContext` ni derivar las fechas del contexto del usuario.
5. **Touch targets insuficientes**: El botón de favoritos en `VehicleCatalogCard.tsx` mide `h-8 w-8` (32x32px), violando el mínimo de 44x44px.
6. **Filtros desconectados del backend**: `BrandFilterBar` gestiona estado local pero **no filtra realmente** la lista de `VehicleCatalogCard` renderizada por el servidor.

---

## FASE 1: Exploración y Relevamiento del Estado Actual

### 1.1 Arquitectura de Archivos del Catálogo

```
src/pages/catalogo/index.astro          → Página de listado (67 LOC) ✅ <150
src/pages/vehiculos/[id].astro          → Página de detalle (190 LOC) 🔴 >150 LOC
src/components/flota/
├── VehicleCatalogCard.tsx              → Tarjeta premium de catálogo (140 LOC)
├── CatalogSearchTrigger.tsx            → Trigger de búsqueda/pill (71 LOC)
├── BrandFilterBar.tsx                  → Filtro de marcas horizontal (145 LOC)
├── VehicleSearchSpotlight.tsx          → Modal spotlight de búsqueda (149 LOC)
├── VehicleSearchResultItem.tsx         → Item de resultado de búsqueda (128 LOC)
└── FleetInventoryManager.tsx           → Gestión de inventario admin (24KB)
src/lib/flota/
├── types.ts                            → Tipos canónicos de dominio
├── mock-vehiculos.ts                   → Datos mock de la flota
├── disponibilidad.ts                   → Lógica de disponibilidad
└── repositorio.ts                      → Repositorio D1
```

### 1.2 Flujo de Datos del Catálogo

1. **SSR**: `catalogo/index.astro` llama a `listarVehiculos(db)` en frontmatter para obtener los vehículos desde D1 (o fallback a mock).
2. **Renderizado**: Cada vehículo se mapea a una isla `<VehicleCatalogCard client:visible />`.
3. **Búsqueda**: `CatalogSearchTrigger` despacha `flotax:open-search` (CustomEvent), pero **no hay listener** visible que abra `VehicleSearchSpotlight` desde la página del catálogo. El spotlight se monta en otro lugar o está incompleto.
4. **Filtro de marcas**: `BrandFilterBar` mantiene estado local (`useState`) pero **no propaga** el filtro hacia el listado de tarjetas renderizado por el servidor.

### 1.3 Elementos Visuales Identificados

| Elemento | Estado | Observación |
| :--- | :--- | :--- |
| Header con patio y rango de reserva | ⚠️ Hardcodeado | "FlotaX Patio Norte" y "10 Oct – 14 Oct" son strings estáticos |
| Pill de búsqueda | ✅ Funcional | Buena ergonomía, icono + placeholder + ⌘K |
| Botón de filtros (sliders) | ⚠️ Parcial | Abre search pero no hay drawer de filtros real |
| Carrusel de marcas | ⚠️ Visual Only | No filtra realmente la grilla |
| Tarjetas de vehículos | ✅ Premium | Diseño moderno con imagen, specs y favorito |
| Estado vacío | ✅ En Spotlight | Mensaje "No encontramos vehículos" bien diseñado |
| Badge de disponibilidad | ❌ Ausente en catálogo | Solo aparece en `VehicleSearchResultItem`, no en `VehicleCatalogCard` |
| Animaciones de entrada | ❌ Ausentes | No hay `animate-fade-up` ni stagger en las tarjetas |

---

## FASE 2: Contraste contra el Sistema de Diseño y Reglas del Proyecto

### 2.1 Violación de Tokens Semánticos y Paleta Canónica

**Hallazgo Crítico (RUL-FLX-003 + tailwind-v4-styling-governance):** Se detectaron **177+ instancias** de hex codes crudos en clases de Tailwind a lo largo de todos los componentes del catálogo. La regla `tailwind-v4-styling-governance.md` §3.1 prohíbe explícitamente `bg-[#131211]`, `text-[#2563eb]`, `border-[#E5E7EB]` y exige `bg-brand-primary`, `text-brand-accent`, `border-border-subtle`.

#### Colores NO canónicos introducidos (fuera de la paleta de 5)

| Hex Usado | Dónde | Token Canónico Correcto |
| :--- | :--- | :--- |
| `#18181B` (Zinc-900) | Textos principales en catálogo, tarjetas y detalle | `#111827` → `text-brand-primary` |
| `#71717A` (Zinc-500) | Labels secundarios y placeholders | `#4B5563` → `text-text-muted` |
| `#A1A1AA` (Zinc-400) | Año, sub-labels, separadores | `#9CA3AF` → `text-text-subtle` |
| `#E4E4E7` (Zinc-200) | Bordes de tarjetas y pills | `#9CA3AF` → `border-border-subtle` |
| `#F4F4F5` (Zinc-100) | Fondos de botones de búsqueda y bento cards | `#EDEDED` → `bg-surface-canvas` |
| `#EAEAEB` | Hover de búsqueda y favorito | Sin equivalente, usar `bg-surface-canvas` con hover |
| `#FAFAFA` | Hover de chips de marca | Sin equivalente, usar `bg-surface-canvas` |
| `#DC2626` (Red-600) | Corazón de favoritos (fill/stroke inline) | `--color-status-danger` → `text-status-danger` |

#### Colores semánticos de Tailwind sin tokenizar

| Clase Tailwind | Dónde | Problema |
| :--- | :--- | :--- |
| `text-amber-500` | Estrella de rating en `VehicleCatalogCard` | Color fuera de paleta canónica |
| `bg-emerald-500`, `text-emerald-700` | Badge de disponibilidad en `VehicleSearchResultItem` | Debe usar `--color-status-success` |
| `bg-amber-500`, `text-amber-700` | Badge "Reservado" en `VehicleSearchResultItem` | Debe usar `--color-status-warning` |
| `bg-emerald-50`, `border-emerald-600`, `text-emerald-800` | Filtro "Solo Disponibles" en `VehicleSearchSpotlight` | Debe usar tokens de status |
| `animate-pulse` en `bg-emerald-500` | Indicador de disponibilidad en header del catálogo | Color fuera de paleta |

### 2.2 Fidelidad Visual vs. `design/exports/`

**Hallazgo (RUL-FLX-002):** La implementación actual de tarjetas y filtros diverge significativamente de los exports de Pencil.

| Aspecto | Export de Diseño (`design/exports/`) | Implementación Actual | Gap |
| :--- | :--- | :--- | :--- |
| **Filtros** (`Filtros Section.html`) | Bottom sheet con grabber, título "Filtros", chips de tipo, rango de precio con slider, toggle "Solo Disponibles" | No existe drawer de filtros; solo `BrandFilterBar` horizontal + botón de sliders que abre spotlight | 🔴 Crítico |
| **Chips de categoría** (`Filtros Section.html`) | Chips con icono SVG + label, fondo `#131211` activo, fondo transparente inactivo con borde | `BrandFilterBar` usa logos de marca, no categorías de vehículo. Spotlight tiene chips pero sin iconos | ⚠️ Divergente |
| **Tarjeta de vehículo** (`Group TARJETA DE VEHÍCULO.html`) | Badge de estado (Disponible/Reservado) visible, placa en posición prominente, barra lateral de color según estado | Sin badge de estado ni placa visible en `VehicleCatalogCard`; solo en `VehicleSearchResultItem` | 🔴 Falta |
| **Grid responsive** (`Responsive Grid.html`) | 1 columna en ≤390px, 2 en tablet, 3-4 en desktop | Siempre 1 columna (`space-y-4` vertical) sin grid multi-columna en tablet/desktop | ⚠️ Sin grid |
| **Barra de filtros** (`Barra de filtros.html`) | Barra horizontal con campo de texto + botón de filtros + counter de resultados | `CatalogSearchTrigger` + `BrandFilterBar` separados; sin counter integrado en barra | ⚠️ Parcial |
| **Sombra de suelo** en tarjeta | Gradiente radial sutil debajo del vehículo | Implementado con `bg-[radial-gradient(...)]` — correcto conceptualmente pero hardcodea rgba | ✅/⚠️ |

### 2.3 Ergonomía Móvil y WebKit (mobile-input-governance)

| Chequeo | Estado | Detalle |
| :--- | :--- | :--- |
| `font-size: 16px` en inputs | ✅ Global | `tokens.css` tiene la regla `@media (max-width: 768px)` para inputs |
| Touch target 44x44px en botones | 🔴 Falla | **Botón de favoritos** en `VehicleCatalogCard` usa `h-8 w-8` (32x32px) — viola mínimo de 44x44px |
| Touch target en botón de filtros | ✅ Correcto | `h-11 w-11` (44x44px) en `CatalogSearchTrigger` |
| Touch target en chips de marca | ⚠️ Marginal | `px-4 py-2` (~38px alto). Debería ser mínimo `py-2.5` o `min-h-[44px]` |
| Touch target en CTA "Elegir fechas" | ✅ Correcto | `min-h-[44px] py-3.5 px-7` en `[id].astro` |
| `inputmode` semántico en inputs | N/A | No hay inputs de texto en la página del catálogo |

### 2.4 Manejo de Tiempos y Fechas (client-time-context)

**Hallazgo:** La página del catálogo muestra "10 Oct – 14 Oct · 4 días" como **texto estático hardcodeado** en `catalogo/index.astro` línea 28. No se invoca `resolveClientTimeContext` en ningún lugar del catálogo.

| Problema | Ubicación | Impacto |
| :--- | :--- | :--- |
| Rango de reserva quemado | `catalogo/index.astro:28` | Siempre muestra "10 Oct – 14 Oct" independiente de la fecha real o la reserva del usuario |
| Sin `resolveClientTimeContext` | `catalogo/index.astro` frontmatter | No se deriva `timeCtx.dateString` para la fecha actual del patio |
| Sin propagación de timezone | Toda la página | No se pasa `data-current-date` ni `timezone` a las islas React |

### 2.5 Animaciones y Microinteracciones

| Animación | Estado | Observación |
| :--- | :--- | :--- |
| `ios-press-bounce` en tarjetas y botones | ✅ Correcto | Escala a 0.88 con spring ease, duración 340ms / 90ms en active |
| `transition-transform group-hover:scale-[1.03]` en imagen | ✅ Suave | 300ms en la imagen del vehículo al hover de la tarjeta |
| **Animación de entrada de tarjetas** | ❌ Ausente | No hay `animate-fade-up` ni stagger en las tarjetas del catálogo. Los tokens CSS definen `fadeUp`, `delay-100..500` pero no se usan |
| **Transición del Spotlight** | ✅ Parcial | `animate-in fade-in duration-200` en overlay, pero sin spring animation de entrada del contenido |
| **Transición al abrir filtros** | ❌ No existe | No hay drawer de filtros que anime; `Filtros Section.html` muestra bottom sheet con grabber |
| **Skeleton/Loading** del grid | ❌ Ausente | No hay estado de carga skeleton mientras se obtienen los vehículos de D1 |
| CLS (Cumulative Layout Shift) | ⚠️ Riesgo | Las imágenes de vehículos no tienen `width`/`height` explícitos ni `aspect-ratio`, lo que puede causar CLS al cargar |

### 2.6 Copywriting y Idioma (ux-copywriting)

**Hallazgo (RUL-FLX-006):** Múltiples textos visibles al usuario están en inglés en un producto operativo colombiano que debe usar español neutro.

| Texto en Inglés | Archivo | Texto Correcto en Español |
| :--- | :--- | :--- |
| "Find Your Perfect Ride" | `catalogo/index.astro:35` | "Encuentra tu vehículo ideal" |
| "Popular Cars" | `catalogo/index.astro:49` | "Vehículos populares" o "Flota destacada" |
| "Brand" | `BrandFilterBar.tsx:109` | "Marca" |
| "See All" | `BrandFilterBar.tsx:116` | "Ver todas" |
| "All Car" | `BrandFilterBar.tsx:17` | "Todos" |
| "top speed" | `vehiculos/[id].astro:76` | "Velocidad máxima" |
| "range (EPA est)" | `vehiculos/[id].astro:104` | "Autonomía" |
| "rating" | `VehicleCatalogCard.tsx:131` | "Valoración" |
| "Car Detail" (title tag) | `vehiculos/[id].astro:24` | "Detalle del Vehículo" |

---

## FASE 3: Matriz Detallada de Correcciones y Mejoras

### 3.1 Buscador y Filtros de Vehículos

| ID | Problema | Severidad | Componente Afectado | Corrección Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| F-01 | **Drawer de filtros inexistente**: El diseño (`Filtros Section.html`) especifica un bottom sheet con grabber, chips de categoría, rango de precio y toggle de disponibilidad. Solo existe un botón que abre el spotlight | 🔴 Alta | `CatalogSearchTrigger.tsx`, nueva isla `FilterDrawer.tsx` | Crear isla React `FilterDrawer.tsx` como bottom sheet con los filtros definidos en `Filtros Section.html` |
| F-02 | **BrandFilterBar no filtra**: `onSelectBrand` se invoca pero no hay listener en `catalogo/index.astro` que filtre el listado SSR | 🔴 Alta | `BrandFilterBar.tsx`, `catalogo/index.astro` | Implementar filtrado reactivo: o bien query params + SSR re-render, o bien convertir el listado a una isla React que consuma el estado del filtro |
| F-03 | **Spotlight no montado en catálogo**: `CatalogSearchTrigger` despacha `flotax:open-search` pero `VehicleSearchSpotlight` no aparece montado en `catalogo/index.astro` | 🔴 Alta | `catalogo/index.astro` | Montar `<VehicleSearchSpotlight client:load />` con control de apertura vía event listener |
| F-04 | **Chips de categoría vs. chips de marca**: El diseño muestra chips de tipo de vehículo (Auto, SUV, Moto, Patineta) pero la implementación muestra marcas (BMW, Mercedes, Mazda) | ⚠️ Media | `BrandFilterBar.tsx` | Separar en dos componentes: `CategoryFilterChips` (tipo) y `BrandFilterBar` (marca), o unificar según el flujo real |
| F-05 | **Sin inputmode en campo de búsqueda del Spotlight** | ⚠️ Media | `VehicleSearchSpotlight.tsx` | Añadir `inputmode="search"` y `enterkeyhint="search"` al input del spotlight |

### 3.2 Tarjetas y Grid de Vehículos

| ID | Problema | Severidad | Componente Afectado | Corrección Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| T-01 | **Badge de disponibilidad ausente**: `VehicleCatalogCard` no muestra el estado (Disponible, Reservado, Mantenimiento) del vehículo | 🔴 Alta | `VehicleCatalogCard.tsx` | Añadir badge de estado usando tokens `--color-status-success/warning/danger` |
| T-02 | **Placa no visible**: La placa del vehículo no se muestra en la tarjeta del catálogo (sí en `VehicleSearchResultItem`) | ⚠️ Media | `VehicleCatalogCard.tsx` | Añadir la placa en `font-mono` debajo del año o junto al nombre |
| T-03 | **Grid siempre 1 columna**: El listado usa `space-y-4` (vertical stack) sin responsividad. En tablet/desktop debería usar 2-3 columnas | ⚠️ Media | `catalogo/index.astro:60` | Cambiar a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` |
| T-04 | **Touch target del botón favoritos insuficiente**: `h-8 w-8` (32x32px) < 44x44px mínimo | 🔴 Alta | `VehicleCatalogCard.tsx:76` | Cambiar a `h-11 w-11` (44x44px) o al menos añadir `min-h-[44px] min-w-[44px]` |
| T-05 | **Sin aspect-ratio en imagen del vehículo**: Las imágenes no declaran `aspect-ratio` ni `width`/`height`, causando CLS potencial | ⚠️ Media | `VehicleCatalogCard.tsx:94-98` | Añadir `aspect-[16/9]` o `aspect-[3/2]` al contenedor de la imagen |
| T-06 | **Sin animación de entrada**: Las tarjetas aparecen sin transición. Los tokens `animate-fade-up` y `delay-*` existen pero no se aplican | ⚠️ Media | `catalogo/index.astro:61-63` | Añadir `class="animate-fade-up"` con stagger delay en el wrapper de cada tarjeta |

### 3.3 Tokens y Paleta Cromática

| ID | Problema | Severidad | Archivos Afectados | Corrección Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| C-01 | **177+ hex codes crudos en clases de Tailwind** | 🔴 Alta | Todos los componentes de `src/components/flota/`, ambas páginas | Reemplazar todos los `text-[#18181B]` → `text-brand-primary`, `bg-[#F4F4F5]` → `bg-surface-canvas`, etc. según tabla de mapeo |
| C-02 | **Colores Zinc (no canónicos) introducidos** | 🔴 Alta | `VehicleCatalogCard.tsx`, `CatalogSearchTrigger.tsx`, `BrandFilterBar.tsx`, `catalogo/index.astro`, `vehiculos/[id].astro` | Mapear: `#18181B` → `#111827`, `#71717A` → `#4B5563`, `#A1A1AA` → `#9CA3AF`, `#E4E4E7` → `#9CA3AF`, `#F4F4F5` → `#EDEDED` |
| C-03 | **Sombras arbitrarias en tarjeta** | ⚠️ Media | `VehicleCatalogCard.tsx:33` | `shadow-[0_10px_30px_-5px_rgba(...)]` debe definirse como token en `tokens.css` (ej. `.shadow-card`, `.shadow-card-hover`) |
| C-04 | **Color rojo hardcodeado en favoritos** | ⚠️ Media | `VehicleCatalogCard.tsx:81-82` | Usar CSS variables: `fill={isFavorite ? 'var(--color-status-danger)' : 'none'}` |

### 3.4 Copywriting e Idioma

| ID | Problema | Severidad | Archivo | Corrección |
| :--- | :--- | :--- | :--- | :--- |
| L-01 | "Find Your Perfect Ride" → español | 🔴 Alta | `catalogo/index.astro:35` | "Encuentra tu vehículo ideal" |
| L-02 | "Popular Cars" → español | 🔴 Alta | `catalogo/index.astro:49` | "Flota destacada" |
| L-03 | "Brand" → español | ⚠️ Media | `BrandFilterBar.tsx:109` | "Marca" |
| L-04 | "See All" → español | ⚠️ Media | `BrandFilterBar.tsx:116` | "Ver todas" |
| L-05 | "All Car" → español | ⚠️ Media | `BrandFilterBar.tsx:17` | "Todos" |
| L-06 | "top speed" → español | ⚠️ Media | `vehiculos/[id].astro:76` | "Velocidad máxima" |
| L-07 | "range (EPA est)" → español | ⚠️ Media | `vehiculos/[id].astro:104` | "Autonomía" |
| L-08 | "rating" → español | ⚠️ Media | `VehicleCatalogCard.tsx:131` | "Valoración" |
| L-09 | "Car Detail" en title | ⚠️ Media | `vehiculos/[id].astro:24` | "Detalle del Vehículo" |

### 3.5 Tiempos y Fechas

| ID | Problema | Severidad | Archivo | Corrección |
| :--- | :--- | :--- | :--- | :--- |
| D-01 | Rango de reserva hardcodeado "10 Oct – 14 Oct" | 🔴 Alta | `catalogo/index.astro:28` | Derivar desde `resolveClientTimeContext` o la reserva activa del usuario. Eliminar string estático |
| D-02 | Sin propagación de timezone a islas | ⚠️ Media | `catalogo/index.astro` | Resolver `const timeCtx = resolveClientTimeContext(Astro.request)` en frontmatter y pasar a las islas |

### 3.6 Arquitectura de Página

| ID | Problema | Severidad | Archivo | Corrección |
| :--- | :--- | :--- | :--- | :--- |
| A-01 | `vehiculos/[id].astro` tiene 190 LOC > límite de 150 | ⚠️ Media | `vehiculos/[id].astro` | Extraer las 4 bento cards a un componente `VehicleSpecsBento.astro` y la barra de reserva a `ReservationBottomBar.astro` |
| A-02 | `formatCop` duplicado: existe en `[id].astro` y en `VehicleCatalogCard.tsx` y `VehicleSearchResultItem.tsx` | ⚠️ Media | 3 archivos | Centralizar en `src/lib/flota/format.ts` como `formatPrecioCOP(valor: number)` |

---

## FASE 4: Plan de Ejecución / Siguientes Pasos

### Prioridad 🔴 Alta (Sprint Actual)

| # | Tarea | Esfuerzo | Archivos a Modificar |
| :--- | :--- | :--- | :--- |
| 1 | **Refactor de tokens cromáticos**: Reemplazar todos los hex codes crudos por tokens semánticos de Tailwind v4 en los 5 componentes de flota y 2 páginas | Alto (2-3h) | Todos los archivos del catálogo |
| 2 | **Mapear colores Zinc a paleta canónica**: `#18181B` → `#111827`, `#71717A` → `#4B5563`, etc. en todo el ámbito | Alto (incluido en #1) | Ídem |
| 3 | **Traducir copywriting a español**: Reemplazar los 9 textos en inglés por sus equivalentes en español neutro | Bajo (30 min) | `catalogo/index.astro`, `BrandFilterBar.tsx`, `VehicleCatalogCard.tsx`, `vehiculos/[id].astro` |
| 4 | **Corregir touch target de favoritos**: `h-8 w-8` → `h-11 w-11` | Bajo (5 min) | `VehicleCatalogCard.tsx:76` |
| 5 | **Eliminar fecha hardcodeada**: Reemplazar "10 Oct – 14 Oct" por derivación dinámica con `resolveClientTimeContext` | Medio (30 min) | `catalogo/index.astro` |
| 6 | **Montar VehicleSearchSpotlight en catálogo**: Conectar el spotlight al catálogo con el evento `flotax:open-search` | Medio (45 min) | `catalogo/index.astro` |

### Prioridad ⚠️ Media (Siguiente Sprint)

| # | Tarea | Esfuerzo | Archivos a Modificar |
| :--- | :--- | :--- | :--- |
| 7 | **Crear drawer de filtros**: Implementar `FilterDrawer.tsx` como bottom sheet según `Filtros Section.html` con chips de categoría, rango de precio y toggle de disponibilidad | Alto (3-4h) | Nueva isla `FilterDrawer.tsx`, `catalogo/index.astro` |
| 8 | **Implementar grid responsive**: Cambiar de `space-y-4` a `grid grid-cols-1 sm:grid-cols-2 gap-4` | Bajo (15 min) | `catalogo/index.astro:60` |
| 9 | **Añadir badge de estado en tarjeta**: Disponible / Reservado / Mantenimiento | Medio (30 min) | `VehicleCatalogCard.tsx` |
| 10 | **Conectar BrandFilterBar al listado**: Implementar filtrado real por marca | Medio (1h) | `BrandFilterBar.tsx`, `catalogo/index.astro` |
| 11 | **Refactorizar `vehiculos/[id].astro`**: Extraer bento cards y barra de reserva a componentes separados para bajar de 190 a <150 LOC | Medio (45 min) | `vehiculos/[id].astro`, nuevos componentes |
| 12 | **Centralizar `formatPrecioCOP`**: Crear `src/lib/flota/format.ts` y eliminar duplicados | Bajo (15 min) | 3 archivos + nuevo archivo |
| 13 | **Añadir aspect-ratio a imágenes**: Prevenir CLS con `aspect-[16/9]` | Bajo (10 min) | `VehicleCatalogCard.tsx`, `vehiculos/[id].astro` |
| 14 | **Añadir animaciones de entrada**: `animate-fade-up` con stagger en las tarjetas del catálogo | Bajo (20 min) | `catalogo/index.astro` |
| 15 | **Tokenizar sombras de tarjeta**: Definir `.shadow-card` y `.shadow-card-hover` en `tokens.css` | Bajo (15 min) | `tokens.css`, `VehicleCatalogCard.tsx` |

### Prioridad 🟢 Baja (Backlog)

| # | Tarea | Esfuerzo |
| :--- | :--- | :--- |
| 16 | **Skeleton loading**: Añadir estados de carga skeleton para el listado de tarjetas | Medio |
| 17 | **Añadir placa visible en tarjeta**: Mostrar placa en `font-mono` en la tarjeta del catálogo | Bajo |
| 18 | **Separar chips de marca vs. categoría**: Alinear con los dos niveles de filtrado del diseño | Medio |
| 19 | **Animación spring del Spotlight**: Mejorar la transición de entrada del contenido con `--ease-spring-ios` | Bajo |

---

## Apéndice: Tabla de Mapeo de Tokens

Referencia rápida para el refactor de tokens (Tarea #1):

| Hex Crudo / Clase Arbitraria | Token Semántico CSS | Clase Tailwind v4 |
| :--- | :--- | :--- |
| `#111827` | `--color-brand-primary` | `text-brand-primary`, `bg-brand-primary` |
| `#1F2937` | `--color-brand-secondary` | `text-brand-secondary`, `bg-brand-secondary` |
| `#4B5563` | `--color-text-muted` | `text-text-muted` |
| `#9CA3AF` | `--color-border-subtle` / `--color-text-subtle` | `border-border-subtle`, `text-text-subtle` |
| `#EDEDED` | `--color-surface-canvas` | `bg-surface-canvas` |
| `#FFFFFF` | `--color-surface-card` | `bg-surface-card` |
| `#18181B` → Mapear a `#111827` | `--color-brand-primary` | `text-brand-primary` |
| `#71717A` → Mapear a `#4B5563` | `--color-text-muted` | `text-text-muted` |
| `#A1A1AA` → Mapear a `#9CA3AF` | `--color-text-subtle` | `text-text-subtle` |
| `#E4E4E7` → Mapear a `#9CA3AF` | `--color-border-subtle` | `border-border-subtle` |
| `#F4F4F5` → Mapear a `#EDEDED` | `--color-surface-canvas` | `bg-surface-canvas` |
| `emerald-*` | `--color-status-success` | `text-status-success`, `bg-status-success` |
| `amber-*` | `--color-status-warning` | `text-status-warning`, `bg-status-warning` |
| `red-*` / `#DC2626` | `--color-status-danger` | `text-status-danger` |

---

> **Nota Final:** Este documento debe mantenerse actualizado conforme se ejecuten las correcciones. Cada tarea completada debe marcarse con ✅ y la fecha de resolución.
