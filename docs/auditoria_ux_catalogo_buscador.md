# Auditoría UX/UI Exhaustiva — Catálogo de Vehículos, Buscador y Filtros (FlotaX)

> **Código de Auditoría:** AUD-FLX-CAT-001  
> **Fecha de Emisión:** 13 de Octubre de 2026  
> **Ámbito de Evaluación:** `/catalogo` (`src/pages/catalogo/index.astro`), `/vehiculos/[id]` (`src/pages/vehiculos/[id].astro`), componentes de `src/components/flota/`  
> **Auditor Responsable:** Diseñador de Producto / Ingeniero Frontend Senior  
> **Severidad Global:** 🔴 **Alta** — Presencia crítica de 177+ valores hex crudos, ruptura de paleta canónica neutra, textos en inglés en aplicación operativa y componentes de filtrado desconectados.

---

## 1. Ficha Técnica y Marco Metodológico

| Dimensión | Especificación / Valor |
| :--- | :--- |
| **Páginas Auditadas** | • [`src/pages/catalogo/index.astro`](file:///src/pages/catalogo/index.astro) (Catálogo general de flota)<br>• [`src/pages/vehiculos/[id].astro`](file:///src/pages/vehiculos/[id].astro) (Ficha de detalle y reserva de unidad) |
| **Componentes Evaluados** | • `VehicleCatalogCard.tsx` (Tarjeta principal de catálogo)<br>• `CatalogSearchTrigger.tsx` (Pill y disparador de búsqueda rápida)<br>• `BrandFilterBar.tsx` (Barra/carrusel de filtrado por marcas)<br>• `VehicleSearchSpotlight.tsx` (Modal spotlight con búsqueda predictiva)<br>• `VehicleSearchResultItem.tsx` (Elemento de resultado dentro del spotlight) |
| **Reglas de Gobernanza Contrastadas** | • `RUL-FLX-003` / [`.agents/rules/color-palette-governance.md`](file:///Users/santiago/proyectos/movix/.agents/rules/color-palette-governance.md)<br>• `RUL-FLX-002` / [`.agents/rules/pen-fidelity.md`](file:///Users/santiago/proyectos/movix/.agents/rules/pen-fidelity.md)<br>• `RUL-FLX-005` / [`.agents/rules/ux-principles.md`](file:///Users/santiago/proyectos/movix/.agents/rules/ux-principles.md)<br>• `RUL-FLX-006` / [`.agents/rules/ux-copywriting.md`](file:///Users/santiago/proyectos/movix/.agents/rules/ux-copywriting.md)<br>• `RUL-FLX-007` / [`.agents/rules/mobile-deep-work.md`](file:///Users/santiago/proyectos/movix/.agents/rules/mobile-deep-work.md)<br>• [`.agents/rules/tailwind-v4-styling-governance.md`](file:///Users/santiago/proyectos/movix/.agents/rules/tailwind-v4-styling-governance.md)<br>• [`.agents/rules/mobile-input-governance.md`](file:///Users/santiago/proyectos/movix/.agents/rules/mobile-input-governance.md)<br>• [`.agents/rules/client-time-context.md`](file:///Users/santiago/proyectos/movix/.agents/rules/client-time-context.md)<br>• [`.agents/rules/page-architecture.md`](file:///Users/santiago/proyectos/movix/.agents/rules/page-architecture.md) |
| **Diseños Canónicos de Referencia (`design/exports/`)** | • `Filtros Section.html` (Bottom sheet canónico de filtros con grabber)<br>• `Barra de filtros.html` (Barra horizontal unificada)<br>• `Group TARJETA DE VEHÍCULO.html` (Tarjeta con badges de estado y placa)<br>• `Responsive Grid.html` (Matriz responsive 1/2/3 columnas)<br>• `Badges Status.html` (Tokens de disponibilidad y operación)<br>• `Motion.html` (Curvas de aceleración y escala de tiempos) |

---

## 2. Tabla Comparativa Completa de las 19 Inconsistencias Detectadas

| ID | Inconsistencia / Hallazgo | Componente o Archivo Afectado | Regla Infringida | Severidad | Estado Actual | Estado Canónico Deseado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **INC-01** | **177+ valores hex crudos en clases Tailwind** | Todos los componentes de `src/components/flota/` y páginas | `tailwind-v4-styling-governance.md` §3.1 | 🔴 Alta | Uso extensivo de clases como `text-[#18181B]`, `bg-[#F4F4F5]`, `border-[#E4E4E7]` | Tokens semánticos de Tailwind v4: `text-brand-primary`, `bg-surface-canvas`, `border-border-subtle` |
| **INC-02** | **Inyección de paleta Zinc no autorizada** | `VehicleCatalogCard.tsx`, `BrandFilterBar.tsx`, etc. | `RUL-FLX-003` (Invarianza cromática) | 🔴 Alta | Grises Zinc extraños (`#18181B`, `#71717A`, `#A1A1AA`, `#E4E4E7`, `#F4F4F5`) | Paleta canónica estricta de 5 tonos neutros (`#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`) |
| **INC-03** | **Copywriting en inglés en software operativo** | `catalogo/index.astro`, `[id].astro`, `BrandFilterBar.tsx` | `RUL-FLX-006` (`ux-copywriting.md`) | 🔴 Alta | Strings como "Find Your Perfect Ride", "Popular Cars", "Brand", "See All", "All Car" | Español neutro directo: "Encuentra tu vehículo ideal", "Flota destacada", "Marca", "Ver todas", "Todos" |
| **INC-04** | **Touch target de favoritos insuficiente (<44px)** | `VehicleCatalogCard.tsx` (botón de corazón) | `mobile-input-governance.md` §2.1 | 🔴 Alta | `h-8 w-8` (32x32px), zona táctil propensa a errores en patio | `h-11 w-11` (44x44px táctil mínimo) con centrado SVG |
| **INC-05** | **Rango de fechas y patio hardcodeados** | `catalogo/index.astro` (header informativo) | `client-time-context.md` | 🔴 Alta | String estático `"10 Oct – 14 Oct · 4 días"` quemado en HTML | Derivación reactiva y perimetral mediante `resolveClientTimeContext(Astro.request)` |
| **INC-06** | **Spotlight no montado en vista catálogo** | `catalogo/index.astro` / `CatalogSearchTrigger.tsx` | `RUL-FLX-005` (Operatividad real) | 🔴 Alta | `CatalogSearchTrigger` dispara evento CustomEvent huérfano | `<VehicleSearchSpotlight client:load />` montado y suscrito a `flotax:open-search` |
| **INC-07** | **Ausencia del drawer de filtros (`FilterDrawer`)** | `CatalogSearchTrigger.tsx` y vista catálogo | `RUL-FLX-002` vs `Filtros Section.html` | ⚠️ Media | Botón de filtros de sliders abre modal de búsqueda o no hace nada | Bottom Sheet interactivo con grabber, slider de precio, chips de tipo y toggle de disponibilidad |
| **INC-08** | **Disposición vertical rígida de una sola columna** | `catalogo/index.astro` (contenedor de lista) | `Responsive Grid.html` | ⚠️ Media | `space-y-4 flex flex-col` fijo en todos los anchos de pantalla | Grid responsivo: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` |
| **INC-09** | **Badge de disponibilidad ausente en tarjeta** | `VehicleCatalogCard.tsx` | `Group TARJETA DE VEHÍCULO.html` | ⚠️ Media | No se visualiza si la unidad está "Disponible", "Reservada" o "En Patio" | Badge semántico superior con punto pulsante y colores `--color-status-success/warning` |
| **INC-10** | **BrandFilterBar desconectado del listado** | `BrandFilterBar.tsx` / `catalogo/index.astro` | `RUL-FLX-005` (Coherencia reactiva) | ⚠️ Media | El clic cambia el estado visual del chip pero no filtra las tarjetas del SSR | Sincronización mediante URL params o isla contenedora `FleetCatalogList.tsx` |
| **INC-11** | **Exceso de líneas de código en página de detalle** | `src/pages/vehiculos/[id].astro` | `page-architecture.md` (límite 150 LOC) | ⚠️ Media | Archivo monolítico de 190 líneas de código | Descomposición en subcomponentes (`VehicleSpecsBento.astro`, `ReservationBar.astro`) <150 LOC |
| **INC-12** | **Función `formatCop` triplicada** | `[id].astro`, `VehicleCatalogCard.tsx`, `VehicleSearchResultItem.tsx` | `centralized-utilities.md` | ⚠️ Media | Copia idéntica de `Intl.NumberFormat('es-CO')` en 3 archivos | Función centralizada exportada desde `src/lib/flota/format.ts` |
| **INC-13** | **Riesgo de CLS en imágenes sin aspect-ratio** | `VehicleCatalogCard.tsx` y `[id].astro` | Directrices Web Vitals y diseño | ⚠️ Media | Contenedores de imagen sin `aspect-ratio` explícito ni dimensiones fijas | Clase nativa `aspect-[16/9]` o `aspect-[3/2]` con fondo contenedor esquelético |
| **INC-14** | **Ausencia de stagger de entrada en tarjetas** | `catalogo/index.astro` / `VehicleCatalogCard.tsx` | `Motion.html` (180ms revelar card) | ⚠️ Media | Las tarjetas aparecen en bloque súbito sin transición de montaje | Animación escalonada `animate-fade-up` con retrasos de 50ms por índice |
| **INC-15** | **Sombras arbitrarias sin tokenizar** | `VehicleCatalogCard.tsx` (`shadow-[0_10px_30px...]`) | `tailwind-v4-styling-governance.md` §3 | ⚠️ Media | Regla inline arbitraria con opacidades no estandarizadas | Utilidad `.shadow-card` y `.shadow-card-hover` registrada en capa `@utility` de tokens |
| **INC-16** | **Sin estado de carga / Skeleton en catálogo** | `catalogo/index.astro` / `VehicleCatalogCard.tsx` | `ux-principles.md` (Latencia perceptible) | 🟢 Baja | Espacio en blanco o flash de contenido durante carga de datos en borde | Placeholders de pulso neutro con estructura idéntica a la tarjeta final |
| **INC-17** | **Identificador de placa oculto en tarjeta** | `VehicleCatalogCard.tsx` | `Group TARJETA DE VEHÍCULO.html` | 🟢 Baja | La tarjeta solo muestra año, marca y modelo; omite la matrícula | Chip tipográfico `font-mono text-xs uppercase` con la placa visible |
| **INC-18** | **Confusión de niveles de filtrado (Marca vs Tipo)** | `BrandFilterBar.tsx` | `Filtros Section.html` | 🟢 Baja | Solo existen logos de fabricantes; faltan categorías de vehículos (SUV, Sedán, Moto) | Segmentación clara: chips de categoría funcional arriba, marcas secundarias abajo |
| **INC-19** | **Transición brusca en modal Spotlight** | `VehicleSearchSpotlight.tsx` | `Motion.html` (Curva spring iOS) | 🟢 Baja | Animación de opacidad simple sin traslación física ni amortiguación táctil | Entrada modal con curva `cubic-bezier(0.34, 1.56, 0.64, 1)` y escala de 0.96 a 1.0 |

---

## 3. Fichas Detalladas por Hallazgo (19 Casos)

---

### Hallazgo INC-01: Proliferación de 177+ Valores Hex Crudos en Clases Tailwind

- **Severidad:** 🔴 Alta  
- **Regla Violada:** `tailwind-v4-styling-governance.md` (Prohibición de valores arbitrarios de color).  
- **Ubicación Exacta:**  
  - `src/components/flota/VehicleCatalogCard.tsx`: líneas 33, 44, 52, 60, 68, 88, 102, 115, 128  
  - `src/components/flota/CatalogSearchTrigger.tsx`: líneas 22, 28, 35, 48, 56  
  - `src/components/flota/BrandFilterBar.tsx`: líneas 45, 62, 78, 95  
  - `src/pages/catalogo/index.astro`: líneas 22, 30, 48, 59  
- **Descripción:** Se detectaron más de 177 declaraciones de color hexadecimal crudo entre corchetes (ej. `text-[#18181B]`, `bg-[#F4F4F5]`, `border-[#E4E4E7]`). Esto evade el sistema de tokens semánticos de Tailwind v4, impidiendo el soporte consistente de modo oscuro y centralización de estilos.

#### Señalización de Captura
![Captura de pantalla: Recuadro rojo marcando las clases arbitrarias text-[#18181B] y bg-[#F4F4F5] en el inspector de elementos](docs/screenshots/inc-01-raw-hex-classes.png)  
*Señalar con recuadro rojo: En el árbol DOM y panel de estilos CSS del navegador, destacar los atributos `class` que contengan valores `[#...]`.*

#### Animación / Microinteracción
- **Comportamiento Actual:** Estático sin transiciones en cambios de estado o con valores de color no interpolables limpiamente.
- **Comportamiento Deseado:** Transiciones suaves de 120ms (`duration-120 ease-out`) al cambiar entre estados hover y active utilizando variables CSS.
- **Registro en Captura/GIF:** Grabar la inspección del elemento mostrando el reemplazo dinámico de variables `--color-*` en lugar de clases atómicas rotas.

#### Solución Canónica de Código (HTML / Tailwind v4)
```tsx
// ❌ ANTES (Con hex crudos arbitrarios):
<div className="bg-[#FFFFFF] border border-[#E4E4E7] text-[#18181B] p-4 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
  <span className="text-[#71717A] text-xs">Transmisión</span>
  <p className="text-[#18181B] font-bold">Automática</p>
</div>

// ✅ DESPUÉS (Tokens canónicos de Tailwind v4):
<div className="bg-surface-card border border-border-subtle text-brand-primary p-4 rounded-2xl shadow-card">
  <span className="text-text-muted text-xs">Transmisión</span>
  <p className="text-brand-primary font-bold">Automática</p>
</div>
```

---

### Hallazgo INC-02: Inyección de Paleta Zinc Foránea y Ruptura de Invarianza Cromática

- **Severidad:** 🔴 Alta  
- **Regla Violada:** `RUL-FLX-003` / `color-palette-governance.md` (5 tonos canónicos estrictos).  
- **Ubicación Exacta:**  
  - `src/components/flota/VehicleCatalogCard.tsx`: grises Zinc-900 (`#18181B`), Zinc-500 (`#71717A`), Zinc-200 (`#E4E4E7`).  
  - `src/components/flota/VehicleSearchResultItem.tsx`: badges con `emerald-500` y `amber-500` estándar de Tailwind.  
- **Descripción:** El diseño fue contaminado con la escala de grises de Shadcn/Tailwind Zinc en lugar de ceñirse estrictamente a la paleta neutra canónica: `#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`.

#### Señalización de Captura
![Captura de pantalla: Recuadro rojo marcando la discrepancia entre el fondo gris Zinc #F4F4F5 y el fondo canónico #EDEDED](docs/screenshots/inc-02-zinc-color-violation.png)  
*Señalar con recuadro rojo: Selector de color del inspector señalando los elementos con matices fríos de Zinc (#18181B, #71717A).*

#### Animación / Microinteracción
- **Comportamiento Actual:** Cambio abrupto entre contrastes cromáticos no balanceados.
- **Comportamiento Deseado:** Intercambio fluido con transiciones sobre tokens canónicos sin saltos lumínicos.
- **Registro en Captura/GIF:** Muestreo comparativo del histograma o cuentagotas de color comprobando el cumplimiento de la paleta canónica.

#### Solución Canónica de Código (HTML / Tailwind v4)
```tsx
// Tabla de reemplazo inmediato:
// #18181B -> text-brand-primary (#111827)
// #71717A -> text-text-muted     (#4B5563)
// #A1A1AA -> text-text-subtle    (#9CA3AF)
// #E4E4E7 -> border-border-subtle (#9CA3AF / opacidad canónica)
// #F4F4F5 -> bg-surface-canvas   (#EDEDED)

<div className="bg-surface-canvas text-brand-primary border-border-subtle">
  <span className="text-text-muted">Estado del patio</span>
</div>
```

---

### Hallazgo INC-03: Copywriting en Inglés en Sistema Operativo Local

- **Severidad:** 🔴 Alta  
- **Regla Violada:** `RUL-FLX-006` (`ux-copywriting.md` — Enfoque en español neutro operativo).  
- **Ubicación Exacta:**  
  - `src/pages/catalogo/index.astro`: línea 35 ("Find Your Perfect Ride"), línea 49 ("Popular Cars")  
  - `src/components/flota/BrandFilterBar.tsx`: línea 17 ("All Car"), línea 109 ("Brand"), línea 116 ("See All")  
  - `src/pages/vehiculos/[id].astro`: línea 24 ("Car Detail"), línea 76 ("top speed"), línea 104 ("range (EPA est)")  
  - `src/components/flota/VehicleCatalogCard.tsx`: línea 131 ("rating")  
- **Descripción:** La interfaz contiene cadenas de texto en inglés dirigidas a operadores y clientes de Colombia, generando fricción comunicacional y sensación de plantilla inacabada.

#### Señalización de Captura
![Captura de pantalla: Recuadro rojo sobre el encabezado 'Find Your Perfect Ride' y la etiqueta 'Popular Cars' en el home del catálogo](docs/screenshots/inc-03-english-copywriting.png)  
*Señalar con recuadro rojo: El titular principal H1 "Find Your Perfect Ride" y los botones de marca "See All" / "All Car".*

#### Animación / Microinteracción
- N/A (Problema de copywriting estático).
- **Registro en Captura:** Captura estática destacando con recuadro rojo los textos en inglés y la traducción al lado.

#### Solución Canónica de Código (HTML / Tailwind v4)
```astro
<!-- ❌ ANTES: -->
<h1 class="text-3xl font-bold text-brand-primary">Find Your Perfect Ride</h1>
<span class="text-xs uppercase tracking-wider text-text-muted">Popular Cars</span>
<button>See All</button>

<!-- ✅ DESPUÉS: -->
<h1 class="text-3xl font-bold text-brand-primary">Encuentra tu vehículo ideal</h1>
<span class="text-xs uppercase tracking-wider text-text-muted">Flota destacada</span>
<button class="text-sm font-semibold text-brand-primary hover:underline">Ver todas</button>
```

---

### Hallazgo INC-04: Touch Target Deficiente en Botón de Favoritos (<44px)

- **Severidad:** 🔴 Alta  
- **Regla Violada:** `mobile-input-governance.md` §2.1 y directrices de accesibilidad táctil WCAG 2.1 AAA.  
- **Ubicación Exacta:** `src/components/flota/VehicleCatalogCard.tsx`: línea 76.  
- **Descripción:** El botón de favoritos mide `h-8 w-8` (32x32px). En contexto operativo de patio o en dispositivos móviles, esto ocasiona toques erróneos o fallidos al navegar con una sola mano.

#### Señalización de Captura
![Captura de pantalla: Recuadro rojo y regla métrica indicando las dimensiones de 32x32px en el botón de favoritos superior](docs/screenshots/inc-04-favorite-touch-target.png)  
*Señalar con recuadro rojo: El círculo del botón de favorito en la esquina superior derecha de la tarjeta del vehículo con la etiqueta de cota 32px x 32px.*

#### Animación / Microinteracción (Fotograma a Fotograma)
- **Comportamiento Actual:** Sin respuesta elástica perceptible o clic fallido por área táctil pequeña.
- **Comportamiento Deseado (iOS Press Feedback - 120ms):**
  - **Frame 0 (0ms - Touch start):** Escala 1.0, opacidad 1.0.
  - **Frame 1 (40ms):** Reducción de escala a `scale(0.88)`, fondo cambia a `bg-surface-canvas`.
  - **Frame 2 (90ms - Touch release):** Rebote de retorno elástico a `scale(1.04)`.
  - **Frame 3 (120ms):** Reposo en `scale(1.0)` con color de corazón activo (`var(--color-status-danger)`).
- **Registro en GIF:** Grabar pulsación en pantalla táctil emulada en Chrome DevTools a 60fps con indicador visual de puntero táctil de 44px de diámetro.

#### Solución Canónica de Código (HTML / Tailwind v4)
```tsx
// ✅ DESPUÉS:
<button
  type="button"
  onClick={handleToggleFavorite}
  aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
  className="absolute top-3 right-3 z-10 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-surface-card/90 backdrop-blur-sm border border-border-subtle shadow-sm active:scale-88 transition-transform duration-120 cursor-pointer"
>
  <svg
    className={`h-5 w-5 transition-colors duration-120 ${
      isFavorite ? "text-status-danger fill-status-danger" : "text-brand-primary fill-none"
    }`}
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
</button>
```

---

### Hallazgo INC-05: Rango Temporal y Patio de Operación Hardcodeados

- **Severidad:** 🔴 Alta  
- **Regla Violada:** `client-time-context.md` (Manejo de tiempo perimetral).  
- **Ubicación Exacta:** `src/pages/catalogo/index.astro`: línea 28.  
- **Descripción:** El encabezado del catálogo imprime como texto plano estático `"10 Oct – 14 Oct · 4 días"` y `"FlotaX Patio Norte"`, ignorando la fecha real de la solicitud del cliente y la sucursal activa.

#### Señalización de Captura
![Captura de pantalla: Recuadro rojo sobre el pill del header que muestra '10 Oct – 14 Oct · 4 días'](docs/screenshots/inc-05-hardcoded-date-range.png)  
*Señalar con recuadro rojo: El contenedor tipo pill superior que contiene el texto de fechas fijas.*

#### Animación / Microinteracción
- N/A (Consistencia de datos y contexto de servidor).
- **Registro en Captura:** Comparación de la fecha del sistema vs. la fecha mostrada en la interfaz.

#### Solución Canónica de Código (HTML / Tailwind v4)
```astro
---
// src/pages/catalogo/index.astro
import { resolveClientTimeContext } from '~/lib/time/client-time';

const timeCtx = resolveClientTimeContext(Astro.request);
const fechaInicio = timeCtx.now;
const fechaFin = new Date(fechaInicio.getTime() + 4 * 24 * 60 * 60 * 1000);

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  timeZone: timeCtx.timeZone
});

const rangoEtiqueta = `${formatoFecha.format(fechaInicio)} – ${formatoFecha.format(fechaFin)} · 4 días`;
---

<div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-canvas border border-border-subtle text-xs font-medium text-brand-primary">
  <span class="inline-block h-2 w-2 rounded-full bg-status-success"></span>
  <span data-time-context={timeCtx.timeZone}>{rangoEtiqueta}</span>
</div>
```

---

### Hallazgo INC-06: Disparador de Búsqueda Desconectado del Modal Spotlight

- **Severidad:** 🔴 Alta  
- **Regla Violada:** `RUL-FLX-005` (Funcionalidad operativa completa sin callejones sin salida).  
- **Ubicación Exacta:** `src/components/flota/CatalogSearchTrigger.tsx`: línea 24; `src/pages/catalogo/index.astro`.  
- **Descripción:** `CatalogSearchTrigger` despacha un evento `flotax:open-search`, pero `VehicleSearchSpotlight` no está montado en `catalogo/index.astro`. Al hacer clic en el buscador o presionar `⌘K`, no ocurre ninguna acción.

#### Señalización de Captura
![Captura de pantalla: Recuadro rojo en el trigger de búsqueda y consola mostrando el evento CustomEvent sin escuchadores registrados](docs/screenshots/inc-06-unmounted-spotlight.png)  
*Señalar con recuadro rojo: El campo falso de búsqueda "Buscar por modelo, marca o placa... ⌘K" que no responde al clic.*

#### Animación / Microinteracción (Fotograma a Fotograma de Apertura)
- **Comportamiento Actual:** Clic sin respuesta visual alguna.
- **Comportamiento Deseado (Apertura de Spotlight - 180ms):**
  - **Frame 0 (0ms):** Backdrop invisible (`opacity: 0`), Modal Spotlight en `scale(0.96)`, `translateY(-8px)`.
  - **Frame 1 (60ms):** Backdrop alcanza `opacity: 0.5` con `backdrop-blur(4px)`. Modal en `scale(0.98)`.
  - **Frame 2 (120ms):** Modal en `scale(1.01)` y `translateY(0px)` siguiendo curva spring.
  - **Frame 3 (180ms):** Reposo en `scale(1.0)`, input enfocado automáticamente con teclado virtual visible en móvil.
- **Registro en GIF:** Demostración fluida del atajo de teclado `⌘K` o clic en el trigger abriendo instantáneamente el modal y enfocando el input.

#### Solución Canónica de Código (HTML / Tailwind v4)
```astro
<!-- En src/pages/catalogo/index.astro -->
<div class="sticky top-0 z-20 bg-surface-card/80 backdrop-blur-md pb-3">
  <CatalogSearchTrigger client:load />
</div>

<!-- Montaje canónico de la isla del modal -->
<VehicleSearchSpotlight client:idle vehiculos={vehiculos} />
```

---

### Hallazgo INC-07: Ausencia del Drawer Canónico de Filtros (`FilterDrawer`)

- **Severidad:** ⚠️ Media  
- **Regla Violada:** `RUL-FLX-002` (Fidelidad de export con `design/exports/Filtros Section.html`).  
- **Ubicación Exacta:** `src/components/flota/CatalogSearchTrigger.tsx`: botón de sliders.  
- **Descripción:** El diseño canónico estipula un Bottom Sheet desplegable con grabber superior, selector de tipo de vehículo (Automóvil, Camioneta, Utilitario, Moto), control deslizante de tarifa diaria ($80.000 - $500.000 COP) y switch de solo disponibles. Actualmente solo existe el botón con icono que carece de drawer.

#### Señalización de Captura
![Captura de pantalla: Recuadro rojo sobre el botón de filtros y panel canónico faltante extraído de Filtros Section.html](docs/screenshots/inc-07-missing-filter-drawer.png)  
*Señalar con recuadro rojo: El botón cuadrado de filtro adyacente a la barra de búsqueda comparado con el screenshot del drawer de diseño.*

#### Animación / Microinteracción (Fotograma a Fotograma del Bottom Sheet - 240ms)
- **Comportamiento Actual:** Botón estático sin despliegue.
- **Comportamiento Deseado (Despliegue Bottom Sheet):**
  - **Frame 0 (0ms):** Dim backdrop en `opacity-0`. Panel posicionado en `translateY(100%)`.
  - **Frame 1 (80ms):** Dim en `opacity-60`. Panel sube a `translateY(40%)`.
  - **Frame 2 (160ms):** Panel llega a `translateY(5%)` con aceleración elástica `cubic-bezier(0.2, 0.8, 0.3, 1)`.
  - **Frame 3 (240ms):** Reposo en `translateY(0)` anclado al fondo con esquinas redondeadas `rounded-t-3xl`.
- **Registro en GIF:** Grabación del gesto táctil de apertura y arrastre hacia abajo para cerrar mediante el grabber.

#### Solución Canónica de Código (HTML / Tailwind v4)
```tsx
// src/components/flota/FilterDrawer.tsx
export function FilterDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-primary/60 backdrop-blur-xs transition-opacity duration-240">
      <div className="w-full max-w-lg rounded-t-3xl bg-surface-card p-6 shadow-2xl transition-transform duration-240 ease-out translate-y-0">
        {/* Grabber táctil */}
        <div className="mx-auto -mt-2 mb-4 h-1.5 w-12 rounded-full bg-border-subtle" />
        
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle">
          <h2 className="text-xl font-bold text-brand-primary">Filtros</h2>
          <button onClick={onClose} className="text-sm font-semibold text-text-muted hover:text-brand-primary">
            Limpiar
          </button>
        </div>

        {/* Categorías de vehículo */}
        <div className="py-4 space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Tipo de unidad</label>
          <div className="flex flex-wrap gap-2">
            {['Todos', 'Automóvil', 'SUV', 'Utilitario', 'Moto'].map((tipo) => (
              <button
                key={tipo}
                className="h-11 min-h-[44px] px-4 rounded-xl border border-border-subtle text-sm font-medium text-brand-primary hover:bg-surface-canvas active:scale-95 transition"
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full h-12 min-h-[44px] rounded-xl bg-brand-primary text-surface-card font-bold hover:bg-brand-secondary active:scale-98 transition"
        >
          Aplicar filtros
        </button>
      </div>
    </div>
  );
}
```

---

### Hallazgo INC-08: Disposición Vertical Rígida de 1 Columna en Pantallas Grandes

- **Severidad:** ⚠️ Media  
- **Regla Violada:** `Responsive Grid.html` y directrices responsive.  
- **Ubicación Exacta:** `src/pages/catalogo/index.astro`: línea 60 (`space-y-4`).  
- **Descripción:** El catálogo renderiza las tarjetas en una columna única (`flex flex-col space-y-4`) sin adaptarse a dispositivos tablet (iPad de patio) ni pantallas de escritorio de recepción, desperdiciando el 60% del ancho útil.

#### Señalización de Captura
![Captura de pantalla: Recuadro rojo mostrando una tarjeta estirada horizontalmente de forma desproporcionada en monitor desktop](docs/screenshots/inc-08-one-column-grid.png)  
*Señalar con recuadro rojo: El contenedor general `.space-y-4` y el espacio en blanco sobrante a los costados.*

#### Animación / Microinteracción
- N/A (Layout adaptativo de cuadrícula).
- **Registro en Captura:** Comparativa responsiva en 3 resoluciones (390px, 768px, 1280px).

#### Solución Canónica de Código (HTML / Tailwind v4)
```astro
<!-- ❌ ANTES: -->
<div class="space-y-4 mt-6">
  {vehiculos.map((v) => <VehicleCatalogCard client:visible vehiculo={v} />)}
</div>

<!-- ✅ DESPUÉS (Canónico según Responsive Grid.html): -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mt-6">
  {vehiculos.map((v) => (
    <div class="w-full">
      <VehicleCatalogCard client:visible vehiculo={v} />
    </div>
  ))}
</div>
```

---

### Hallazgo INC-09: Badge de Disponibilidad Ausente en Tarjeta del Catálogo

- **Severidad:** ⚠️ Media  
- **Regla Violada:** `Group TARJETA DE VEHÍCULO.html` y `RUL-FLX-004` (Claridad de estados operativos).  
- **Ubicación Exacta:** `src/components/flota/VehicleCatalogCard.tsx`.  
- **Descripción:** La tarjeta no muestra si el vehículo está "Disponible", "Reservado" o "En Mantenimiento". El cliente u operador no sabe el estado de la unidad hasta intentar abrir el detalle.

#### Señalización de Captura
![Captura de pantalla: Recuadro rojo en la esquina superior izquierda de la tarjeta donde falta el badge de estado operativo](docs/screenshots/inc-09-missing-status-badge.png)  
*Señalar con recuadro rojo: El espacio sobre la imagen del vehículo donde debe residir el badge según `Group TARJETA DE VEHÍCULO.html`.*

#### Animación / Microinteracción
- **Comportamiento Actual:** Inexistente.
- **Comportamiento Deseado:** Indicador visual tipo pill con un punto de pulso suave (`animate-pulse`) en unidades disponibles.
- **Registro en GIF:** Animación de pulso del punto verde en el badge de disponibilidad.

#### Solución Canónica de Código (HTML / Tailwind v4)
```tsx
// ✅ DESPUÉS:
<div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-card/90 backdrop-blur-sm border border-border-subtle shadow-xs">
  <span className={`h-2 w-2 rounded-full ${
    vehiculo.estado === 'DISPONIBLE' 
      ? 'bg-status-success animate-pulse' 
      : vehiculo.estado === 'RESERVADO'
      ? 'bg-status-warning'
      : 'bg-status-danger'
  }`} />
  <span className="text-xs font-semibold text-brand-primary capitalize">
    {vehiculo.estado.toLowerCase()}
  </span>
</div>
```

---

### Hallazgo INC-10: `BrandFilterBar` Desconectado del Renderizado de Unidades

- **Severidad:** ⚠️ Media  
- **Regla Violada:** `RUL-FLX-005` (Coherencia en acciones de patio).  
- **Ubicación Exacta:** `src/components/flota/BrandFilterBar.tsx` y `src/pages/catalogo/index.astro`.  
- **Descripción:** Al pulsar los botones de marca (Toyota, Mazda, BMW), se activa el estado local del botón con un fondo negro, pero la lista de vehículos en el servidor no sufre ningún filtrado ni mutación.

#### Señalización de Captura
![Captura de pantalla: Recuadro rojo marcando el chip de marca seleccionado 'Mazda' y la lista mostrando aún vehículos de todas las marcas](docs/screenshots/inc-10-disconnected-brand-filter.png)  
*Señalar con recuadro rojo: La marca seleccionada activa contrastada con las tarjetas que no corresponden a dicha marca.*

#### Animación / Microinteracción (Transición de Filtrado - 180ms)
- **Comportamiento Actual:** El chip se ennegrece instantáneamente; las tarjetas debajo permanecen intactas.
- **Comportamiento Deseado:**
  - **Frame 0 (0ms):** Selección del chip de marca.
  - **Frame 1 (60ms):** Las tarjetas no concordantes se desvanecen (`opacity-0`, `scale-95`).
  - **Frame 2 (120ms):** Reordenamiento suave de la cuadrícula con CSS Grid transition o re-render fluido.
  - **Frame 3 (180ms):** Entrada de las tarjetas filtradas en `opacity-100` y `scale-100`.
- **Registro en GIF:** Clic en "Toyota" y respuesta instantánea reduciendo la lista solo a vehículos Toyota.

#### Solución Canónica de Código (HTML / Tailwind v4)
```astro
<!-- Estrategia recomendada: Sincronización nativa vía Query Params para preservar SSR -->
<script>
  window.addEventListener('flotax:filter-brand', ((e: CustomEvent<{ brand: string }>) => {
    const url = new URL(window.location.href);
    if (e.detail.brand === 'all') {
      url.searchParams.delete('marca');
    } else {
      url.searchParams.set('marca', e.detail.brand);
    }
    window.location.assign(url.toString());
  }) as EventListener);
</script>
```

---

### Hallazgo INC-11: Exceso de Complejidad y Líneas de Código en `vehiculos/[id].astro`

- **Severidad:** ⚠️ Media  
- **Regla Violada:** `page-architecture.md` (Límite estricto de 150 LOC por página orquestadora).  
- **Ubicación Exacta:** `src/pages/vehiculos/[id].astro`: 190 líneas de código.  
- **Descripción:** La página de detalle concentra marcado HTML extenso de las especificaciones del vehículo (bento cards de potencia, autonomía, velocidad) y el formulario de reserva inferior dentro de un mismo archivo.

#### Señalización de Captura
![Captura de pantalla: Recuadro rojo sobre el conteo de líneas de código (190 LOC) en el editor del archivo vehiculos/[id].astro](docs/screenshots/inc-11-loc-violation.png)  
*Señalar con recuadro rojo: Barra de estado del editor indicando `Line 190, Column 1`.*

#### Solución Canónica de Código (HTML / Tailwind v4)
```text
Refactorización modular:
src/pages/vehiculos/[id].astro (~75 LOC)
  ├── src/components/flota/VehicleDetailHero.astro (~45 LOC)
  ├── src/components/flota/VehicleSpecsBento.astro (~50 LOC)
  └── src/components/flota/VehicleBookingBar.astro (~40 LOC)
```

---

### Hallazgo INC-12: Redundancia de la Utilidad `formatCop`

- **Severidad:** ⚠️ Media  
- **Regla Violada:** `centralized-utilities.md` (Prohibición de código duplicado y disperso).  
- **Ubicación Exacta:** Declarada independientemente en `[id].astro`, `VehicleCatalogCard.tsx` y `VehicleSearchResultItem.tsx`.  
- **Descripción:** Cada componente implementa su propia instancia de `Intl.NumberFormat('es-CO')` con ligeras variaciones de sintaxis.

#### Señalización de Captura
![Captura de pantalla: Comparación lado a lado de la función formatCop duplicada en tres archivos](docs/screenshots/inc-12-duplicate-formatter.png)  
*Señalar con recuadro rojo: Las tres declaraciones idénticas de la función.*

#### Solución Canónica de Código (HTML / Tailwind v4)
```typescript
// src/lib/flota/format.ts
export function formatPrecioCOP(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(valor);
}
```

---

### Hallazgo INC-13: Inestabilidad Visual (CLS) por Contenedores de Imagen sin `aspect-ratio`

- **Severidad:** ⚠️ Media  
- **Regla Violada:** Principios de Core Web Vitals (Cumulative Layout Shift) y ergonomía visual.  
- **Ubicación Exacta:** `src/components/flota/VehicleCatalogCard.tsx`: líneas 94-98.  
- **Descripción:** El contenedor de la imagen del automóvil depende de la altura intrínseca del recurso cargado desde la CDN, lo que empuja el contenido hacia abajo abruptamente al renderizar la imagen.

#### Señalización de Captura
![Captura de pantalla: Registro del inspector de Chrome indicando Cumulative Layout Shift en la tarjeta al cargar](docs/screenshots/inc-13-image-cls.png)  
*Señalar con recuadro rojo: La sección del informe Lighthouse / Performance con métrica CLS > 0.1.*

#### Solución Canónica de Código (HTML / Tailwind v4)
```tsx
// ✅ DESPUÉS:
<div className="relative w-full aspect-[16/10] overflow-hidden rounded-xl bg-surface-canvas flex items-center justify-center">
  <img
    src={vehiculo.imagenUrl}
    alt={`${vehiculo.marca} ${vehiculo.modelo}`}
    loading="lazy"
    decoding="async"
    className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
  />
</div>
```

---

### Hallazgo INC-14: Entrada en Bloque de Tarjetas sin Escalonamiento (Stagger)

- **Severidad:** ⚠️ Media  
- **Regla Violada:** `Motion.html` (Principio de revelación secuencial en 180ms).  
- **Ubicación Exacta:** `src/pages/catalogo/index.astro`.  
- **Descripción:** Las tarjetas aparecen de golpe en el DOM sin animación secuencial que guíe la lectura natural del ojo.

#### Señalización de Captura
![Captura de pantalla: Línea de tiempo de carga mostrando el salto visual repentino de las tarjetas](docs/screenshots/inc-14-missing-stagger.png)  
*Señalar con recuadro rojo: Cuadro de redibujado de la página al completarse el hydration.*

#### Animación Fotograma a Fotograma (Stagger de Tarjetas)
- **Frame 0 (0ms):** Tarjetas en `opacity: 0`, `translateY(12px)`.
- **Frame 1 (60ms):** Tarjeta 1 sube a `opacity: 1`, `translateY(0)`.
- **Frame 2 (120ms):** Tarjeta 2 sube a `opacity: 1`, `translateY(0)`.
- **Frame 3 (180ms):** Tarjeta 3 sube a `opacity: 1`, `translateY(0)`.
- **Registro en GIF:** Vista de cascada secuencial suave al ingresar al catálogo.

#### Solución Canónica de Código (HTML / Tailwind v4)
```astro
{vehiculos.map((vehiculo, index) => (
  <div 
    class="animate-fade-up" 
    style={`animation-delay: ${index * 60}ms; animation-fill-mode: both;`}
  >
    <VehicleCatalogCard client:visible vehiculo={vehiculo} />
  </div>
))}
```

---

### Hallazgo INC-15: Sombras Arbitrarias sin Registro en Tokens del Sistema

- **Severidad:** ⚠️ Media  
- **Regla Violada:** `tailwind-v4-styling-governance.md` §3 y `tokens.css`.  
- **Ubicación Exacta:** `src/components/flota/VehicleCatalogCard.tsx`: línea 33.  
- **Descripción:** Se inyectó `shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)]` de forma manual, rompiendo la coherencia de elevaciones de la aplicación.

#### Señalización de Captura
![Captura de pantalla: Recuadro rojo sobre la regla inline de sombra en el archivo TSX](docs/screenshots/inc-15-arbitrary-shadow.png)  
*Señalar con recuadro rojo: La clase `shadow-[...]` arbitraria.*

#### Solución Canónica de Código (HTML / Tailwind v4)
```css
/* En src/styles/tokens.css */
@utility shadow-card {
  box-shadow: 0 4px 20px -2px rgba(17, 24, 39, 0.05);
}
@utility shadow-card-hover {
  box-shadow: 0 12px 32px -4px rgba(17, 24, 39, 0.12);
}
```

```tsx
// En el componente:
<div className="bg-surface-card rounded-2xl border border-border-subtle shadow-card hover:shadow-card-hover transition-shadow duration-200">
```

---

### Hallazgo INC-16: Ausencia de Skeleton de Carga en Catálogo

- **Severidad:** 🟢 Baja  
- **Regla Violada:** `ux-principles.md` (Prevención de latencia percibida en patio móvil).  
- **Ubicación Exacta:** `src/pages/catalogo/index.astro`.  
- **Descripción:** Cuando se activa SSR perimetral con consultas a Cloudflare D1, el usuario percibe un destello blanco hasta la hidratación total.

#### Señalización de Captura
![Captura de pantalla: Pantalla en blanco previa a la aparición del catálogo](docs/screenshots/inc-16-no-skeleton.png)  
*Señalar con recuadro rojo: Área central vacía de la pantalla en red 3G simulada.*

#### Solución Canónica de Código (HTML / Tailwind v4)
```astro
<!-- src/components/flota/VehicleCardSkeleton.astro -->
<div class="rounded-2xl border border-border-subtle bg-surface-card p-4 animate-pulse">
  <div class="w-full aspect-[16/10] rounded-xl bg-surface-canvas mb-4" />
  <div class="h-4 w-2/3 rounded-md bg-surface-canvas mb-2" />
  <div class="h-3 w-1/3 rounded-md bg-surface-canvas mb-4" />
  <div class="h-8 w-full rounded-xl bg-surface-canvas" />
</div>
```

---

### Hallazgo INC-17: Placa Oculta en la Tarjeta de Catálogo

- **Severidad:** 🟢 Baja  
- **Regla Violada:** `Group TARJETA DE VEHÍCULO.html` (Identificación inequívoca de flota).  
- **Ubicación Exacta:** `src/components/flota/VehicleCatalogCard.tsx`.  
- **Descripción:** Los administradores de patio necesitan identificar la unidad físicamente por su placa (matrícula colombiana, ej. `UBL-892`). Actualmente solo se muestra en el modal de búsqueda, obligando al operario a entrar al detalle.

#### Señalización de Captura
![Captura de pantalla: Tarjeta canónica en exports mostrando placa en contraste con la tarjeta web que la omite](docs/screenshots/inc-17-missing-license-plate.png)  
*Señalar con recuadro rojo: Posición de la placa en el diseño de referencia junto al año del modelo.*

#### Solución Canónica de Código (HTML / Tailwind v4)
```tsx
// ✅ Añadir en la cabecera de la tarjeta:
<div className="flex items-center justify-between mb-1">
  <span className="font-mono text-xs font-bold tracking-wider text-text-muted bg-surface-canvas px-2 py-0.5 rounded border border-border-subtle uppercase">
    {vehiculo.placa}
  </span>
  <span className="text-xs text-text-subtle">{vehiculo.anio}</span>
</div>
```

---

### Hallazgo INC-18: Mezcla de Filtros de Marca y Tipología Funcional

- **Severidad:** 🟢 Baja  
- **Regla Violada:** `Filtros Section.html` y jerarquía de búsqueda.  
- **Ubicación Exacta:** `src/components/flota/BrandFilterBar.tsx`.  
- **Descripción:** El usuario usualmente busca primero por tipo de necesidad (¿necesito un camión de carga, una moto o un sedán?) y luego por marca. Ofrecer únicamente marcas restringe la búsqueda de usuarios con presupuesto específico.

#### Señalización de Captura
![Captura de pantalla: Carrusel que solo expone marcas fabricantes sin discriminación de tipo de vehículo](docs/screenshots/inc-18-brand-vs-category.png)  
*Señalar con recuadro rojo: Barra horizontal de marcas destacando la falta de segmentación de tipo.*

#### Solución Canónica de Código (HTML / Tailwind v4)
```astro
<!-- Barra bifuncional: Segmento superior de tipo, secundario de fabricante -->
<div class="space-y-3">
  <CategoryFilterChips client:load />
  <BrandFilterBar client:load />
</div>
```

---

### Hallazgo INC-19: Animación Rígida sin Elasticidad Spring en Spotlight

- **Severidad:** 🟢 Baja  
- **Regla Violada:** `Motion.html` (Curva táctil iOS spring `cubic-bezier(0.34, 1.56, 0.64, 1)`).  
- **Ubicación Exacta:** `src/components/flota/VehicleSearchSpotlight.tsx`: línea 48.  
- **Descripción:** El modal entra con un simple fade lineal sin sensación de peso ni desaceleración física de sistema operativo móvil.

#### Señalización de Captura
![Captura de pantalla: Curva de transición lineal en el panel de animación de Chrome DevTools](docs/screenshots/inc-19-linear-motion.png)  
*Señalar con recuadro rojo: Inspector de curvas de animación mostrando la curva genérica.*

#### Animación Fotograma a Fotograma (Spring Modal)
- **Frame 0 (0ms):** Modal en `scale-95`, `opacity-0`.
- **Frame 1 (70ms):** Modal alcanza `scale-102`, `opacity-100`.
- **Frame 2 (140ms):** Amortiguación elástica a `scale-99`.
- **Frame 3 (200ms):** Reposo perfecto en `scale-100`.
- **Registro en GIF:** Captura a 60fps con el panel de animación de DevTools resaltando el spring curve.

#### Solución Canónica de Código (HTML / Tailwind v4)
```css
/* src/styles/tokens.css */
@utility transition-spring-modal {
  transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 180ms ease-out;
}
```

---

## 4. Plan de Acción Priorizado y Matriz de Ejecución

El plan de acción se divide en tres fases estrictas para garantizar despliegues controlados sin regresiones.

### 4.1 Prioridad 🔴 Alta (Sprint Operativo Inmediato — Bloqueantes)

| # | Tarea | Componentes Involucrados | Criterios de Aceptación (DoD) | Esfuerzo |
| :--- | :--- | :--- | :--- | :--- |
| **T-01** | **Refactor Masivo de Tokens y Reemplazo de Hex Crudos** | Todos los componentes de `src/components/flota/`, `catalogo/index.astro`, `[id].astro` | Cero ocurrencias de `[#...]` para colores en el código. Verificación con `grep_search`. Pasan 100% tokens canónicos. | 3h |
| **T-02** | **Erradicación de Escala Zinc y Alineación a Paleta Neutra** | `VehicleCatalogCard.tsx`, `BrandFilterBar.tsx`, `tokens.css` | 100% de los elementos cromáticos derivan de `#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`. | 2h |
| **T-03** | **Traducción y Estandarización de Copywriting al Español Neutro** | `catalogo/index.astro`, `BrandFilterBar.tsx`, `VehicleCatalogCard.tsx`, `[id].astro` | Eliminación de "Find Your Perfect Ride", "Popular Cars", "See All", "rating". Textos 100% en español operativo. | 45m |
| **T-04** | **Ampliación del Touch Target del Botón Favoritos a ≥44px** | `VehicleCatalogCard.tsx` | La caja táctil computa un mínimo de 44x44px en WebKit y Chrome. Ícono SVG centrado visualmente. | 30m |
| **T-05** | **Integración de Fechas Dinámicas con `resolveClientTimeContext`** | `src/pages/catalogo/index.astro` | Eliminado el texto fijo "10 Oct – 14 Oct". La fecha se deriva de la zona horaria del cliente vía request. | 45m |
| **T-06** | **Montaje y Conexión del `VehicleSearchSpotlight` en Catálogo** | `src/pages/catalogo/index.astro`, `CatalogSearchTrigger.tsx` | El atajo `⌘K` y el clic en el buscador abren el modal en cualquier resolución. | 45m |

### 4.2 Prioridad ⚠️ Media (Siguiente Iteración — Ergonomía y Arquitectura)

| # | Tarea | Componentes Involucrados | Criterios de Aceptación (DoD) | Esfuerzo |
| :--- | :--- | :--- | :--- | :--- |
| **T-07** | **Construcción del Bottom Sheet `FilterDrawer.tsx`** | `src/components/flota/FilterDrawer.tsx`, `CatalogSearchTrigger.tsx` | Drawer interactivo con grabber, slider de precios y chips según `Filtros Section.html`. | 3.5h |
| **T-08** | **Reestructuración a Cuadrícula Responsiva Multi-Columna** | `src/pages/catalogo/index.astro` | 1 columna en móvil (≤430px), 2 en tablet (768px), 3 en desktop (≥1024px). | 30m |
| **T-09** | **Integración de Status Badges en Tarjeta de Vehículo** | `VehicleCatalogCard.tsx` | Badge de estado visible en la esquina superior con indicador pulsante en unidades disponibles. | 45m |
| **T-10** | **Conexión Reactiva de Filtro de Marcas a la Lista de Flota** | `BrandFilterBar.tsx`, `catalogo/index.astro` | El clic en un chip de marca filtra instantáneamente las unidades sin romper SSR. | 1.5h |
| **T-11** | **Modularización de `vehiculos/[id].astro` (<150 LOC)** | `src/pages/vehiculos/[id].astro` | División en `VehicleSpecsBento.astro` y subcomponentes. El archivo principal no supera 120 LOC. | 1h |
| **T-12** | **Centralización de Formateador Monetario `formatPrecioCOP`** | `src/lib/flota/format.ts` | Eliminación de lógica duplicada en 3 archivos. Importación centralizada. | 20m |
| **T-13** | **Estabilización de Contenedores de Imagen (Prevención CLS)** | `VehicleCatalogCard.tsx`, `[id].astro` | Adición de `aspect-[16/10]` y atributos `loading="lazy"` / `decoding="async"`. | 30m |
| **T-14** | **Implementación de Revelado Secuencial (Stagger) en Grilla** | `catalogo/index.astro` | Las tarjetas se revelan secuencialmente con retraso de 60ms entre cada una. | 30m |
| **T-15** | **Tokenización de Sombras y Elevaciones en `tokens.css`** | `src/styles/tokens.css`, `VehicleCatalogCard.tsx` | Creación de utilidades `@utility shadow-card` y eliminación de sombras inline. | 30m |

### 4.3 Prioridad 🟢 Baja (Refinamiento y Pulido Estético)

| # | Tarea | Componentes Involucrados | Criterios de Aceptación (DoD) | Esfuerzo |
| :--- | :--- | :--- | :--- | :--- |
| **T-16** | **Implementación de Skeleton Loading para Tarjetas** | `src/components/flota/VehicleCardSkeleton.astro` | Carga esquelética fluida durante transiciones o carga de datos. | 1h |
| **T-17** | **Visibilidad de Placa de la Unidad en Tarjeta** | `VehicleCatalogCard.tsx` | Placa en tipografía monoespaciada visible en la cabecera de la tarjeta. | 25m |
| **T-18** | **Desacople de Filtros Funcionales (Categoría vs Marca)** | `src/components/flota/CategoryFilterChips.tsx` | Categorías funcionales de transporte separadas visualmente de los fabricantes. | 1.5h |
| **T-19** | **Curva Spring iOS en Transición del Modal Spotlight** | `VehicleSearchSpotlight.tsx`, `tokens.css` | Transición de entrada con curva elástica suave `cubic-bezier(0.34, 1.56, 0.64, 1)`. | 30m |

---

## 5. Protocolo de Verificación y Cierre de Auditoría

Previo a la entrega del informe final al Líder de Equipo, se debe certificar la ejecución de las pruebas automáticas del repositorio:

```bash
# 1. Verificación de tipos de TypeScript y Astro (Tolerancia cero a errores/warnings)
pnpm check

# 2. Compilación del empaquetado SSR para Cloudflare Pages / Workers
pnpm build
```

El estado de aprobación de este documento constituye la orden de trabajo para dar inicio a la Fase de Implementación técnica.
