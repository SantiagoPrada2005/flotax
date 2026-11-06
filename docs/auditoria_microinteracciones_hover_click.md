# Auditoría y Plan de Erradicación del AI Slop en Hover, Press y Click (FlotaX)

> **Código de Auditoría:** AUD-FLX-MOTION-001  
> **Fecha de Emisión:** 5 de Noviembre de 2026  
> **Ámbito:** `src/components/**`, `src/styles/tokens.css`, `src/layouts/**` y `src/pages/**`  
> **Fuentes de verdad contrastadas:** [`design/exports/Motion.html`](../design/exports/Motion.html), [`design/exports/Button System.html`](../design/exports/Button%20System.html), [`design/exports/Botones.html`](../design/exports/Botones.html), [`design/exports/Card Language.html`](../design/exports/Card%20Language.html), [`RUL-FLX-021`](../.agents/rules/apple-design-governance.md), [`RUL-FLX-005`](../.agents/rules/ux-principles.md) y [`RUL-FLX-002`](../.agents/rules/pen-fidelity.md)  
> **Veredicto global:** 🔴 **Alta / Needs work**. El problema no es "demasiada animación": es **feedback sin contrato**. Hay 730 declaraciones `hover:` frente a 94 `active:`; el botón canónico existe pero no tiene ningún consumidor real; y el foco de teclado se elimina en 70 declaraciones.

---

## 1. Resumen Ejecutivo

FlotaX es un instrumento operativo móvil. En un patio, con una mano y a pleno sol, el usuario necesita saber tres cosas en menos de 100 ms: **qué se puede tocar, qué acaba de pasar y qué está pasando ahora**. El código actual responde bien a la primera pregunta en escritorio, y mal a las otras dos en teléfono.

La auditoría encontró tres desequilibrios estructurales:

1. **Se diseñó hover, no press.** 730 utilidades `hover:` contra 94 `active:`. Tailwind v4 compila `hover:` dentro de `@media (hover:hover)`, así que en un teléfono ese 89 % de las declaraciones hover/active no existe. La respuesta táctil más extendida es `.ios-press-bounce`: un resorte que encoge un 12 % (`scale(0.88)`) a botones, enlaces y tarjetas por igual, y tarda 340 ms en volver, sin distinguir su función.
2. **El hover es una coreografía, no una señal.** Las tarjetas cambian sombra, borde, color de título, escala de imagen, opacidad de caption y posición de flecha al mismo tiempo. El export canónico [`Motion.html`](../design/exports/Motion.html) pide lo contrario: **1 propiedad por animación, 120–180 ms, "si el ojo lo nota entero, es demasiado"**.
3. **El clic no tiene semántica ni estados.** Hay 386 `<button>` crudos y ningún consumidor real del primitivo [`Button.tsx`](../src/components/ui/Button.tsx) (solo se reexporta desde `ui/index.ts`). Hay 22 elementos no-button con `onClick`, tres `<article role="button">` sin `onKeyDown`, un `<button>` anidado dentro de un `<a>`, y 70 declaraciones que borran el foco (14 sin sustituto en el mismo elemento y varias que dependen de un borde de 1 px en el contenedor).

**La causa raíz no es estética: es de gobierno.** No existe una capa de interacción canónica que impida repetir estos patrones. Cada componente resolvió sus estados por su cuenta, y el resultado es un dialecto distinto por pantalla.

### Scorecard

| Dimensión | Estado | Evidencia |
| :--- | :--- | :--- |
| Consistencia de press | 🔴 | 7 magnitudes distintas (0.88, 0.90, 0.95, 0.96, 0.98, 0.985, 0.99) más la ausencia total de press |
| Disciplina de hover | 🔴 | 26 sombras, 34 transforms, 32 `group-hover` de movimiento |
| Foco de teclado | 🔴 | `focus-visible:` en 4 de 71 archivos con `<button>`; 70 `focus:outline-none/hidden`, 14 sin sustituto en el mismo elemento |
| Semántica de clic | 🔴 | 3 controles en `div` sin teclado + 3 `article role="button"` sin `onKeyDown`; `<button>` dentro de `<a>` |
| Presupuesto de motion | 🟠 | 162 `transition-all`; 56 duraciones > 240 ms |
| Ergonomía táctil | 🟠 | 21 `h-8 w-8`, 18 `min-h-[38px]`, 17 `min-h-[40px]`, sin área extendida |
| Cobertura de estados | 🟠 | 243 `.ios-press-bounce`; 13 archivos con hover y ningún press |
| Deuda de código muerto | 🟢 | 3 primitivas "slop" sin uso; 3 enlaces `href="#"` |

### Quick wins (primer día, sin refactor)

1. **Foco global:** una regla `:focus-visible` en `tokens.css` devuelve el teclado a los 386 botones de una vez.
2. **Redefinir `.ios-press-bounce`:** pasar de `0.88/340 ms` a `0.98/120 ms` corrige 243 usos con un solo cambio.
3. **Borrar las 3 primitivas muertas** y sus exports en `ui/index.ts`.
4. **Quitar `hover:scale` y `hover:shadow` de las 5 tarjetas más visibles** (catálogo, KPI, share card).
5. **Bajar `duration-300` a `120–150 ms`** en controles; reservar 240/320 ms solo para sheets y cambio de pantalla.

Ninguno de estos cinco cambios requiere tocar lógica de negocio. Todos son reversibles y se pueden medir con el script de la sección 8.

---

## 2. Qué significa "AI Slop" en Este Proyecto

En FlotaX, "AI slop" no es un color ni una tipografía. Es **decoración interactiva sin función**, importada de landing pages y aplicada a software operativo:

- El hover que levita la tarjeta, ilumina el borde y hace zoom a la foto porque "se ve premium".
- El botón que se encoge un 12 % y rebota 340 ms porque "se siente Apple".
- El CTA con borde cónico animado y barrido de brillo cada 3 s porque "llama la atención".
- El icono que rota 45° al pasar el ratón porque "da vida".
- El `focus:outline-none` porque el anillo "afeaba" el diseño.

La prueba de fuego es la del propio export canónico: **cada animación debe justificarse en una frase** (jerarquía, historia, feedback o cambio de estado). Si la frase es "porque se ve bien", es slop. Si la animación desaparece y no se pierde información, también.

### Lo que sí funciona y debe preservarse

- Existe un contrato visual canónico claro en [`Motion.html`](../design/exports/Motion.html) y [`Button System.html`](../design/exports/Button%20System.html). No hay que inventar el sistema: hay que cumplirlo.
- Los tokens de color y los `.fx-btn-*` ya cubren claro/oscuro con contraste AA.
- El bloque `prefers-reduced-motion` de [`tokens.css`](../src/styles/tokens.css#L938) cubre las animaciones decorativas nombradas (aunque no las utilidades de Tailwind).
- [`MisReservasHub.tsx`](../src/components/reservas/MisReservasHub.tsx#L745) implementa el patrón correcto para una fila clicable: `role="button"`, `tabIndex={0}` y `onKeyDown`.
- El primitivo [`Button.tsx`](../src/components/ui/Button.tsx#L50) ya define `focus-visible:ring-2` y tamaños de 44/52 px. El problema es que no se usa.

---

## 3. Método y Límites

**Método:** auditoría estática sobre 132 archivos de `src/components/**` (83 con `hover:`), el CSS compilado en `dist/client/_astro/LayoutApp.94eeIbqV.css`, los exports de `design/exports/` y las reglas de `.agents/rules/`. Se ejecutaron `pnpm check` (259 archivos, 0 errores, 0 warnings, 0 hints) y `pnpm build` (exitoso) como línea base el 5 de noviembre de 2026.

**Límites:**

- No se realizaron capturas en dispositivo ni mediciones de INP. Los hallazgos son verificables por código y por el CSS de build; la validación visual queda en la matriz de QA de la sección 10.
- Los conteos son ocurrencias de clase, no elementos renderizados. Un mismo elemento puede acumular varias utilidades; sirven como presupuesto de deuda, no como censo exacto.
- No se evalúa la paleta, el copy ni la arquitectura de datos salvo cuando afectan directamente al estado interactivo.

**Nota técnica importante:** Tailwind v4 sí envuelve las utilidades `hover:` en `@media (hover:hover)` (verificado en el CSS compilado). Por eso este informe no pide "añadir media queries": pide **dejar de diseñar solo para hover** y completar press y foco. El CSS propio (`.fx-btn-*`, `.shiny-cta`) no está envuelto y sí puede producir hover pegajoso en táctil.

---

## 4. Inventario Cuantitativo

| Métrica | Valor | Lectura |
| :--- | ---: | :--- |
| Componentes en `src/components` | 132 | 83 contienen `hover:` (63 %) |
| Utilidades `hover:` | 730 | 630 en operación, 100 en landing |
| Utilidades `active:` | 94 | Ratio hover:press = **7,8 : 1** |
| Utilidades `group-hover:` | 50 | 32 son transforms (scale/translate/rotate) |
| Usos de `.ios-press-bounce` | 243 en 53 archivos | Feedback único, `scale(0.88)`, 340 ms |
| Archivos con hover y sin press | 13 | Incluye panel de notificaciones, disponibilidad y pasos del wizard |
| Magnitudes de press distintas | 7 + ausencia | 0.88, 0.90, 0.95, 0.96, 0.98, 0.985, 0.99, sin press |
| `transition-all` | 162 | Anima propiedades de layout y pintura |
| Duraciones > 240 ms | 56 | 45 × 300 ms, 7 × 500 ms, 4 × 700 ms |
| `hover:shadow-*` | 26 | Elevación que aparece y desaparece |
| `hover:scale/translate/rotate` | 34 | Movimiento en el eje Z/X al pasar el ratón |
| `focus-visible:` | 30 en 4 archivos | `Button.astro`, `Button.tsx`, `LoginFlow`, `Configuración` |
| `focus:outline-none/hidden` | 70 | 14 líneas sin sustituto declarado en el mismo elemento |
| `<button>` crudos | 386 | 0 consumos del primitivo `Button` (solo reexport) |
| Elementos no-button con `onClick` | 22 coincidencias | 3 controles reales (2 filas de Caja + dropzone); el resto son backdrops, filas con rol, un atajo de foco o falsos positivos |
| Touch targets < 44 px | 21 `h-8 w-8` + 18 `min-h-[38px]` + 17 `min-h-[40px]` + 7 `min-h-[36px]` | Sin pseudo-elemento que amplíe el área |
| Animaciones decorativas | 2 `animate-ping`, 1 `animate-bounce`, 3 `animate-float` | Landing y dashboard |
| Primitivas sin uso | 3 | `shiny-button.tsx`, `text-roll.tsx`, `testimonial.tsx` |
| Enlaces `href="#"` | 3 | Footer legal |

### Distribución por archivo (top 12)

| Archivo | `hover:` | Riesgo principal |
| :--- | ---: | :--- |
| [`CajaDashboardIsland.tsx`](../src/components/caja/CajaDashboardIsland.tsx) | 49 | Filas `div` clicables, hover en cada movimiento, 9 controles de 38 px |
| [`FleetInventoryManager.tsx`](../src/components/flota/FleetInventoryManager.tsx) | 37 | Zoom de imagen 500 ms, hover en toda la fila |
| [`PerfilEditorCard.tsx`](../src/components/perfil/PerfilEditorCard.tsx) | 32 | `active:scale-95` en 7 controles + `transition-all` |
| [`TelemetryBentoGrid.tsx`](../src/components/dashboard/TelemetryBentoGrid.tsx) | 32 | Hover en celdas de datos y gráficos |
| [`LandingFooter.astro`](../src/components/landing/LandingFooter.astro) | 30 | Hover de color correcto, pero 3 enlaces muertos |
| [`LocalCatalogShareCard.tsx`](../src/components/flota/LocalCatalogShareCard.tsx) | 29 | 11 botones con `ios-press-bounce`, foco ausente |
| [`UserDropdownMenu.tsx`](../src/components/navigation/UserDropdownMenu.tsx) | 28 | Hover + teclado en menú |
| [`LocalCatalogShowcase.tsx`](../src/components/flota/LocalCatalogShowcase.tsx) | 28 | Zoom de imagen en cada tarjeta |
| [`ConfiguracionIsland.tsx`](../src/components/configuracion/ConfiguracionIsland.tsx) | 27 | Mezcla de switches y botones |
| [`MisReservasHub.tsx`](../src/components/reservas/MisReservasHub.tsx) | 21 | Buena semántica de fila, mal press |
| [`CajaKpiCard.tsx`](../src/components/caja/CajaKpiCard.tsx) | 20 | `<article role=button>` sin `onKeyDown` |
| [`AlquilerDetalleView.tsx`](../src/components/reservas/AlquilerDetalleView.tsx) | 16 | Hover sobre imágenes y tabs |

---

## 5. Los Ocho Patrones de Slop

### S1 · El press con siete dialectos (y ningún modelo canónico)

**Severidad:** 🔴 Alta  
**Evidencia:** [`tokens.css:235`](../src/styles/tokens.css#L235) define `.ios-press-bounce` con `transform: scale(0.88) translateY(1px)`, `will-change: transform` permanente y un resorte que baja en 90 ms pero tarda 340 ms en volver. Se usa 243 veces en 53 archivos. Encima conviven `active:scale-95` (30), `active:scale-[0.98]` (21), `active:scale-[0.99]` (8), `active:scale-[0.985]` (4), `active:scale-[0.96]` (4), `active:scale-98` (3) y `active:scale-90` (1). En el primitivo [`Button.tsx:50`](../src/components/ui/Button.tsx#L50) conviven tres declaraciones de tiempo que compiten en cascada: `transition` de Tailwind (150 ms), `.ios-press-bounce` (340 ms) y `.fx-btn-*` (200 ms). El resultado depende de qué clase gane, no de una decisión de diseño.

**Por qué importa:** un mismo toque produce respuestas distintas según el componente. Un botón con `.fx-btn-*` se encoge al 98 %, un elemento que solo tenga `.ios-press-bounce` al 88 % durante 340 ms, y un elemento con `active:scale-95` al 95 %. En un control de 44 px, un 12 % son 5 px por lado: el elemento "salta" bajo el dedo y arrastra el texto.

**Contrato canónico:**

- [`Motion.html`](../design/exports/Motion.html): press = **120 ms**.
- [`Button System.html`](../design/exports/Button%20System.html): `PRESSED · sombra interna`; `HOVER · 120 ms`; foco = anillo de 2 px; disabled = 40 %.
- [`Card Language.html`](../design/exports/Card%20Language.html): tarjeta interactiva `idle → pressed · escala 0,98 · sin sombra`.

**Fix:** un solo modelo por tier:

- Botón: `:active` con `box-shadow: inset 0 1px 2px rgb(0 0 0 / .28)`, sin `transform`, 120 ms.
- Tarjeta/fila: `:active { transform: scale(.98) }`, sin sombra, 120 ms.
- Eliminar `.ios-press-bounce` o redefinirlo a `.fx-press` con 0.98/120 ms y sin `will-change`.

---

### S2 · El hover coreografiado

**Severidad:** 🟠 Media (solo escritorio, pero define la percepción del producto)  
**Evidencia:** [`CajaKpiCard.tsx:126`](../src/components/caja/CajaKpiCard.tsx#L126) combina en una sola clase `hover:border-[#2D6BFF]/40`, `hover:shadow-2xl`, `group-hover:text-blue-300`, `group-hover:translate-x-0.5` y `animate-pulse` en un halo. [`VehicleCatalogCard.tsx:34`](../src/components/flota/VehicleCatalogCard.tsx#L34) suma `hover:shadow-[...]`, `hover:border-[...]`, `transition-all`, `group-hover:text-black` en el título y `group-hover:scale-[1.03]` en la imagen. [`CajaKpiCard.tsx:365`](../src/components/caja/CajaKpiCard.tsx#L365) escala el icono un 5 %; [`CajaKpiCard.tsx:615`](../src/components/caja/CajaKpiCard.tsx#L615) desplaza la flecha.

**Por qué importa:** el ojo no sabe qué mirar. Si todo se mueve, nada comunica jerarquía. Además, cada propiedad extra es una transición que compite con el frame y una razón más para que el componente se sienta "plantilla".

**Contrato canónico:** `Motion.html`: **1 propiedad por animación**, 120–180 ms, "si el ojo lo nota entero, es demasiado". `Card Language`: la elevación de la tarjeta es estática; el press no lleva sombra.

**Fix:** el hover de una tarjeta solo cambia **borde o tinte de superficie**, 120 ms. Se eliminan sombra, escala de imagen, color de título y desplazamiento de flecha. Si la tarjeta necesita invitar al clic en escritorio, se usa `cursor` + un chevron estático, no cinco efectos.

---

### S3 · El press que no existe (y el tap highlight apagado)

**Severidad:** 🔴 Alta  
**Evidencia:** 13 archivos tienen `hover:` y ningún `active:` ni `.ios-press-bounce`. Entre ellos, [`PanelNotificaciones.tsx`](../src/components/notificaciones/PanelNotificaciones.tsx), [`VehicleAvailabilityIsland.tsx`](../src/components/flota/disponibilidad/VehicleAvailabilityIsland.tsx), [`Step8Revision.tsx`](../src/components/flota/wizard/Step8Revision.tsx) y [`FleetCatalogList.tsx`](../src/components/flota/FleetCatalogList.tsx). En PWA standalone, [`tokens.css:307`](../src/styles/tokens.css#L307) desactiva `-webkit-tap-highlight-color`; si el componente no tiene `:active`, el toque no produce **ninguna** señal visual.

**Por qué importa:** en iOS/Android, `hover` no se aplica (Tailwind lo encierra en `@media (hover:hover)`). El press es la única confirmación de que el sistema recibió el toque. Sin él, el usuario toca dos veces, o cree que la app se congeló. Esto es especialmente grave en acciones de patio: confirmar una entrega, abrir una inspección, cambiar disponibilidad.

**Fix:** ningún control interactivo sin estado `:active` (o `:disabled`/`:loading`). En PWA, el press visual es obligatorio porque el highlight nativo está apagado. Añadir una prueba de QA específica: "tocar en modo standalone y ver cambio antes de 100 ms".

---

### S4 · El foco invisible

**Severidad:** 🔴 Crítica (accesibilidad)  
**Evidencia:** 70 declaraciones `focus:outline-none` / `focus:outline-hidden`; solo 4 archivos usan `focus-visible:` (`Button.astro`, `Button.tsx`, `LoginFlow` y `Configuración`) de 71 archivos con `<button>`. Casos con foco realmente invisible: [`LoginFlow.tsx:429`](../src/components/auth/LoginFlow.tsx#L429) (botón "Crea tu cuenta" con `hover:underline` y `focus:outline-none`), [`LoginFlow.tsx:479`](../src/components/auth/LoginFlow.tsx#L479), [`LoginFlow.tsx:577`](../src/components/auth/LoginFlow.tsx#L577), [`PortalSwitchCard.tsx:116`](../src/components/perfil/PortalSwitchCard.tsx#L116) (`role="switch"` con `focus:outline-hidden`) y [`TopBarSearch.tsx:147`](../src/components/navigation/TopBarSearch.tsx#L147). En otros casos, como [`LocalCatalogShareCard.tsx:535`](../src/components/flota/LocalCatalogShareCard.tsx#L535), el único indicio es un cambio de borde de 1 px en el contenedor: perceptible, pero por debajo de lo que pide el contrato.

**Por qué importa:** un usuario de teclado no puede operar el login, el buscador, el switch de portal ni los modales. Es un fallo WCAG 2.4.7 (Focus Visible) y contradice la lente de accesibilidad de [`RUL-FLX-021`](../.agents/rules/apple-design-governance.md). Además, el foco es el "hover del teclado": si se borra, la interfaz deja de ser operable sin puntero.

**Contrato canónico:** `Button System`: `FOCUS · anillo 2 px`. `Botones.html`: `FOCUS · anillo coral 2` (en FlotaX, token de foco canónico).

**Fix:** una regla global en `tokens.css` (unlayered, gana a las utilidades) que garantice foco visible a todo lo interactivo, y eliminar los `focus:outline-none` sin sustituto. No basta con `focus:border`: en un input sobre fondo claro, un borde de 1 px no es perceptible a 2 m.

---

### S5 · `transition-all` y duraciones fuera de spec

**Severidad:** 🟠 Media  
**Evidencia:** 162 `transition-all`; 45 `duration-300`, 7 `duration-500`, 4 `duration-700` (56 duraciones por encima de 240 ms, casi todas en tarjetas y controles que no son cambio de pantalla). Ejemplos: [`FleetInventoryManager.tsx:507`](../src/components/flota/FleetInventoryManager.tsx#L507) (`duration-500` en zoom de imagen), [`PerfilEditorCard.tsx:565`](../src/components/perfil/PerfilEditorCard.tsx#L565) (`transition-all` en inputs), [`VehicleCatalogCard.tsx:34`](../src/components/flota/VehicleCatalogCard.tsx#L34) (`transition-all` en la tarjeta completa).

**Por qué importa:** `transition-all` anima también `width`, `height`, `top`, `left`, `border-width` y `background-position`. Eso produce repintados, saltos de layout y, en listas largas, jank en el scroll. Una transición de 300 ms para un cambio de color se percibe lenta; 120 ms se percibe instantánea.

**Contrato canónico:** `Motion.html`: `120 ms press/toggle`, `180 ms reveal`, `240 ms hojas/paneles`, `320 ms cambio de pantalla`; `ease-out 0.2/0.8/0.3/1`; `1 propiedad`.

**Fix:** reemplazar `transition-all` por `transition-colors`, `transition-transform` o `transition-shadow` según la propiedad real. Bajar `duration-300` a `duration-150`/`duration-120` en controles. Reservar 240/320 ms solo para sheets y cambios de pantalla.

---

### S6 · El adorno en elementos que no son interactivos

**Severidad:** 🟠 Media  
**Evidencia:** `group-hover` sobre títulos ([`VehicleCatalogCard.tsx:39`](../src/components/flota/VehicleCatalogCard.tsx#L39)), captions ([`CajaKpiCard.tsx:605`](../src/components/caja/CajaKpiCard.tsx#L605)), iconos de navegación ([`BottomNavIsland.tsx:94`](../src/components/navigation/BottomNavIsland.tsx#L94), 8 iconos con `group-hover:scale-110`) y flechas decorativas. `hover:rotate-45` en un indicador que no es un botón ([`CajaKpiCard.tsx:402`](../src/components/caja/CajaKpiCard.tsx#L402)). 26 `hover:shadow-*` y 34 transforms de hover.

**Por qué importa:** el hover debe indicar **que algo se puede accionar**. Si el título cambia de color pero el contenedor no es el target, el usuario aprende a desconfiar de las señales. En un dock móvil, `group-hover:scale-110` en 8 iconos es invisible en táctil y ruidoso en iPad con trackpad.

**Fix:** el hover se aplica al **target real**, no a sus hijos decorativos. Un icono puede cambiar de color si el contenedor es el botón; no debe escalar. Los títulos no cambian de color por hover salvo que sean enlaces.

---

### S7 · El clic sin semántica

**Severidad:** 🔴 Crítica  
**Evidencia:**

- [`CajaKpiCard.tsx:123`](../src/components/caja/CajaKpiCard.tsx#L123): `<article role="button" tabIndex={0} onClick={...}>` sin `onKeyDown`; se enfoca con Tab pero Enter/Space no hacen nada.
- [`CajaDashboardIsland.tsx:910`](../src/components/caja/CajaDashboardIsland.tsx#L910) y [`CajaDashboardIsland.tsx:1051`](../src/components/caja/CajaDashboardIsland.tsx#L1051): filas `<div onClick>` sin rol, sin `tabIndex`, sin teclado.
- [`LoginFlow.tsx:517`](../src/components/auth/LoginFlow.tsx#L517): `<div className="... cursor-pointer" onClick={...}>` que solo enfoca el input de OTP; es un atajo de puntero aceptable, no un control, y no debe convertirse en botón.
- [`Step6Fotografia.tsx`](../src/components/flota/wizard/Step6Fotografia.tsx): dropzone `<div onDrop onClick>`; el `<input type="file">` está oculto (`className="hidden"`), así que no hay camino de teclado.
- [`VehicleCatalogCard.tsx:31`](../src/components/flota/VehicleCatalogCard.tsx#L31) y [`VehicleCatalogCard.tsx:85`](../src/components/flota/VehicleCatalogCard.tsx#L85): `<button>` de favorito dentro de `<a>` (contenido interactivo anidado, HTML inválido, riesgo de doble navegación).
- [`LandingFooter.astro:134`](../src/components/landing/LandingFooter.astro#L134): tres enlaces `href="#"` que no llevan a ninguna parte.
- [`Button.tsx:57`](../src/components/ui/Button.tsx#L57): un `<a>` recibe `role="button"`, lo que borra la semántica de enlace (abrir en pestaña nueva, lector de pantalla).

**Por qué importa:** el clic es la acción central del producto. Un div clicable no aparece en el orden de tabulación, no responde a Enter/Space, no anuncia su rol y no funciona con VoiceOver/TalkBack. Un botón dentro de un enlace produce activaciones dobles y un DOM inválido. Los enlaces muertos erosionan la confianza.

**Fix:** `<button type="button">` para acciones, `<a href>` para navegación, nunca `role="button"` en un ancla. Para tarjetas con acción secundaria (favorito), usar un contenedor con un enlace estirado (`::after` inset) y el botón como hermano por encima, no anidado. Para filas, `<button className="w-full text-left">` o `<a>`; si es imposible, `role`, `tabIndex` y `onKeyDown` para Enter y Space. Backdrops de modal pueden ser `div`, pero el modal debe tener cierre accesible y `Esc`.

---

### S8 · El CTA de feria y las primitivas muertas

**Severidad:** 🟠 Media (landing) / 🟢 Baja (deuda)  
**Evidencia:** [`LandingHeroIsland.tsx:410`](../src/components/landing/LandingHeroIsland.tsx#L410) usa `.shiny-cta`: borde cónico animado, `transition: 800ms`, barrido de brillo infinito de 3 s, `@property` y `mask-image` ([`tokens.css:437`](../src/styles/tokens.css#L437)). El título usa `.shiny-text` con barrido infinito de 6 s ([`tokens.css:602`](../src/styles/tokens.css#L602)) y las HUD cards usan `.shiny-card` con borde cónico animado ([`tokens.css:632`](../src/styles/tokens.css#L632)). Además, `ui/shiny-button.tsx`, `ui/text-roll.tsx` y `ui/testimonial.tsx` no tienen ningún uso, y `ui/index.ts` los exporta como si fueran parte del sistema.

**Por qué importa:** el CTA principal es el elemento que más debe parecer fiable, no el más animado. Un borde que gira y un brillo que barre cada 3 s compiten con el texto y convierten una acción operativa en un anuncio. En rendimiento, `conic-gradient` + `mask-image` + animación infinita es de lo más caro que se puede poner en un hero. Las primitivas muertas aumentan la superficie de mantenimiento y confunden a futuros agentes.

**Fix:** CTA primario sólido, con hover de color 120 ms y press de sombra interna. Un solo momento orquestado en el hero (el scroll) es suficiente. Eliminar `.shiny-text`, `.shiny-card`, `.shiny-cta` y los tres componentes sin uso. Si el equipo quiere conservar "un guiño" de marca, que sea estático o se active una sola vez, no en bucle.

---

## 6. Contrato de Interacción Canónico (Propuesta)

Este contrato traduce los exports de diseño a una regla aplicable por componente. No inventa estética nueva: fija los estados que hoy faltan.

### 6.1 Matriz de estados

| Estado | Disparador | Botón (Tier A) | Tarjeta / fila (Tier B) | Landing (Tier C) |
| :--- | :--- | :--- | :--- | :--- |
| **Rest** | — | Fondo y borde token | Superficie + borde 1 px | Igual |
| **Hover** | Solo `@media (hover:hover)` | Cambio de fondo/borde, 120 ms; sombra solo si la define el CSS canónico del botón | Solo borde o tinte; **sin sombra ni escala** | Máx. 1 transform + 1 color, 180 ms |
| **Active** | Pointer o touch | Sombra interna, sin `transform`, 120 ms | `scale(.98)`, sin sombra, 120 ms | `scale(.98)` |
| **Focus-visible** | Teclado | Anillo 2 px, offset 2 px | Anillo 2 px | Anillo 2 px |
| **Disabled** | — | 40 % opacidad, `cursor: not-allowed`, sin hover | 40 % | 40 % |
| **Loading** | Async | Spinner + label persistente + `aria-busy="true"` | Skeleton con la forma final | n/a |
| **Selected** | Estado persistente | Indicador lleno, sin depender de hover | Barra/check persistente | n/a |

### 6.2 Escala de motion

| Token | Valor | Uso |
| :--- | :--- | :--- |
| `--fx-duration-press` | `120ms` | Press, toggle, cambio de color |
| `--fx-duration-hover` | `120ms` | Hover de color/borde |
| `--fx-duration-reveal` | `180ms` | Aparición de tarjeta/contenido |
| `--fx-duration-sheet` | `240ms` | Bottom sheet, modal, panel |
| `--fx-duration-page` | `320ms` | Cambio de pantalla |
| `--fx-ease-out` | `cubic-bezier(0.2, 0.8, 0.3, 1)` | Entradas y press |
| `--fx-ease-in-out` | `cubic-bezier(0.75, 0, 0.25, 1)` | Movimientos de panel |

**Reglas duras:**

1. Una animación = una propiedad. Nunca `transition-all`.
2. Ninguna interacción supera 320 ms; press y hover, 120 ms.
3. Sin `will-change` en listas ni en elementos repetidos.
4. Sin animación infinita en un CTA primario.
5. `prefers-reduced-motion`: se desactivan transforms y animaciones decorativas; se conservan spinners y cambios de opacidad esenciales.
6. Hover solo bajo `@media (hover:hover) and (pointer:fine)`. En CSS propio, envolverlo explícitamente.

### 6.3 Reglas por tier

- **Tier A (controles operativos):** botones, icon buttons, inputs, tabs, switches. Press obligatorio, foco visible, 44 px mínimo, disabled/loading. Hover solo color/borde.
- **Tier B (superficies navegables):** tarjetas de vehículo, filas de caja, resultados. Press `scale(.98)`, foco visible, sin hover de elevación. Toda la tarjeta es un solo target; las acciones secundarias van fuera del target principal.
- **Tier C (landing):** permitido un momento orquestado y un hover de 180 ms con una propiedad. Prohibido el bucle de brillo, el borde cónico animado y el `animate-ping` decorativo.

---

## 7. Plan de Erradicación por Fases

**Esfuerzo total estimado:** 10,5 días-persona (1 dev senior); 6–7 días calendario con 2 devs en paralelo.  
**Estrategia:** contrato primero, primitivo segundo, instancias tercero. No se hace un big-bang de 386 botones.

| Fase | Duración | Objetivo | Entregables | Criterio de salida |
| :--- | ---: | :--- | :--- | :--- |
| **0. Línea base y congelación** | 0,5 d | Medir y evitar que la deuda crezca | Script `audit-interactions.mjs`, snapshot de conteos, checklist de PR | El script falla con los budgets actuales y pasa en un archivo nuevo limpio |
| **1. Fundación de interacción** | 1,5 d | Un solo modelo de estados | Tokens de motion, foco global, `.fx-btn-*` reescritos, `.fx-press`, `.fx-pressable` | `Button`, tokens y foco cumplen el contrato; 0 `ios-press-bounce` nuevos |
| **2. Primitivo + top 5** | 2 d | Adoptar el botón canónico y limpiar los 5 archivos con más deuda | `Button` con `href`/`loading`, `IconButton`, `PressableCard`; CajaDashboard, CajaKpiCard, Perfil, FleetInventory, Configuración | Esos 5 archivos: 0 `transition-all`, 0 hover transform, 100 % foco, press único |
| **3. Barrido operativo** | 2,5 d | Resto de pantallas de operación | Telemetría, catálogo local, share card, menú de usuario, reservas, login, wizards | 0 `ios-press-bounce` en operación; 0 targets < 44 px; press uniforme |
| **4. Semántica de clic y a11y** | 1,5 d | Que todo lo clicable sea operable | 3 controles reales convertidos (2 filas de Caja + dropzone), `article` con teclado, fin del anidamiento `<a><button>`, enlaces muertos | 0 `div`/`article` clicable sin teclado; 0 interactivo anidado; `Esc` en modales |
| **5. Landing de-slop** | 1,5 d | Un solo momento, no una feria | CTA sólido, retirada de `shiny-*`, hover de 1 propiedad, sin `ping/bounce/float` decorativos | 0 animación infinita en CTA; 0 `shiny-*`; budgets de landing |
| **6. Guardrails y documentación** | 1 d | Que no vuelva | CI, regla en `.agents/rules`, checklist, matriz de QA, doc actualizado | CI bloquea regresiones; `pnpm check && pnpm build` verdes |

### Fase 0 · Línea base y congelación (0,5 d)

1. Crear `scripts/audit-interactions.mjs` con los budgets de la sección 8. Ejecutarlo con `node`.
2. Guardar el snapshot actual en el propio informe (sección 4) y en el PR.
3. Añadir al checklist de PR: "¿El componente tiene press, foco y disabled? ¿Usa `transition-all`? ¿Añade un hover transform?".
4. Congelar nuevas excepciones: cualquier `hover:scale`, `ios-press-bounce` o `focus:outline-none` requiere justificación en el PR.

**Por qué primero:** sin medición, el barrido se convierte en una revisión infinita. El script es barato y convierte "slop" en un número que baja.

### Fase 1 · Fundación (1,5 d)

**1.1 Tokens de motion y foco global** en [`tokens.css`](../src/styles/tokens.css):

```css
:root {
  --fx-duration-press: 120ms;
  --fx-duration-hover: 120ms;
  --fx-duration-reveal: 180ms;
  --fx-duration-sheet: 240ms;
  --fx-duration-page: 320ms;
  --fx-ease-out: cubic-bezier(0.2, 0.8, 0.3, 1);
  --fx-ease-in-out: cubic-bezier(0.75, 0, 0.25, 1);
}

/* Red de seguridad: gana a las utilidades porque no está en @layer. */
:where(button, a[href], [role="button"], summary, input, select, textarea):focus-visible {
  outline: 2px solid var(--fx-border-focus);
  outline-offset: 2px;
}
```

**1.2 Reescribir `.fx-btn-*`:**

```css
.fx-btn-primary {
  transition:
    background-color var(--fx-duration-press) var(--fx-ease-out),
    border-color var(--fx-duration-press) var(--fx-ease-out),
    color var(--fx-duration-press) var(--fx-ease-out);
}
.fx-btn-primary:hover:not(:disabled) {
  background-color: var(--fx-btn-primary-hover-bg);
}
.fx-btn-primary:active:not(:disabled) {
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.28);
  transform: none;
}
.fx-btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

**1.3 Reemplazar `.ios-press-bounce`** por `.fx-press` (0.98, 120 ms, sin `will-change`) y `.fx-pressable` para tarjetas. Mantener un alias temporal de `.ios-press-bounce` durante la migración, pero con el nuevo comportamiento, para no romper 243 usos de golpe.

**1.4 Limpiar el parche oscuro:** las reglas `html.dark button...:not([class*="dark:hover:"])` de [`tokens.css:1322`](../src/styles/tokens.css#L1322) existen porque los hover claros se escribieron sin variante oscura. Una vez normalizados los componentes, se eliminan. Mientras tanto, no añadir nuevas.

**Criterio de salida:** un botón de prueba con las clases viejas y otro con las nuevas producen el mismo press de 120 ms; el foco se ve en ambos temas; `pnpm check` verde.

### Fase 2 · Primitivo y top 5 (2 d)

**2.1 Arreglar [`Button.tsx`](../src/components/ui/Button.tsx):**

- `<a>` sin `role="button"`; el `href` conserva semántica de enlace.
- `loading?: boolean` con spinner, label persistente y `aria-busy`.
- `disabled` también en el branch de enlace (con `aria-disabled` y bloqueo de navegación).
- Tamaños: `sm` de 36 px solo en desktop; en táctil, hit area de 44 px vía `::before` o `min-h-[44px]`.
- Un solo timing: eliminar `transition` suelto y dejar que `.fx-btn-*` gobierne.

**2.2 Añadir `IconButton` y `PressableCard`.** `IconButton` garantiza 44×44, `aria-label` obligatorio y foco visible. `PressableCard` encapsula `scale(.98)` y el foco, sin hover de elevación.

**2.3 Migrar los 5 archivos con más deuda:** CajaDashboard, CajaKpiCard, PerfilEditor, FleetInventory, Configuración. En cada uno:

- Reemplazar `<div onClick>` por `<button>` o `<a>`.
- Quitar `hover:shadow-*`, `group-hover:scale-*`, `group-hover:translate-*`.
- Unificar `active:scale-*` a `.fx-press` / `.fx-pressable`.
- Añadir foco visible y `disabled`/`loading` donde falte.
- Sustituir `transition-all` por propiedades concretas.

**Criterio de salida:** esos 5 archivos pasan el script sin excepciones; QA táctil en iPhone y Android.

### Fase 3 · Barrido operativo (2,5 d)

Ordenar por tráfico y riesgo, no por número de `hover:`:

1. **Caja y cobros:** [`CajaDashboardIsland.tsx`](../src/components/caja/CajaDashboardIsland.tsx), [`CajaKpiCard.tsx`](../src/components/caja/CajaKpiCard.tsx), modales de arqueo, garantía, transferencia y comprobante.
2. **Flota y catálogo:** [`FleetInventoryManager.tsx`](../src/components/flota/FleetInventoryManager.tsx), [`LocalCatalogShareCard.tsx`](../src/components/flota/LocalCatalogShareCard.tsx), [`LocalCatalogShowcase.tsx`](../src/components/flota/LocalCatalogShowcase.tsx), [`VehicleCatalogCard.tsx`](../src/components/flota/VehicleCatalogCard.tsx), [`VehicleSearchSpotlight.tsx`](../src/components/flota/VehicleSearchSpotlight.tsx).
3. **Reservas y disponibilidad:** [`MisReservasHub.tsx`](../src/components/reservas/MisReservasHub.tsx), [`AlquilerDetalleView.tsx`](../src/components/reservas/AlquilerDetalleView.tsx), [`VehicleAvailabilityIsland.tsx`](../src/components/flota/disponibilidad/VehicleAvailabilityIsland.tsx).
4. **Navegación y cuenta:** [`BottomNavIsland.tsx`](../src/components/navigation/BottomNavIsland.tsx), [`UserDropdownMenu.tsx`](../src/components/navigation/UserDropdownMenu.tsx), [`TopBarSearch.tsx`](../src/components/navigation/TopBarSearch.tsx), [`LoginFlow.tsx`](../src/components/auth/LoginFlow.tsx), [`ConfiguracionIsland.tsx`](../src/components/configuracion/ConfiguracionIsland.tsx).
5. **Wizards:** pasos 1–8 de flota, entrega y mantenimiento.

**Regla de oro por archivo:** si un `hover:` no se puede justificar con "indica que esto es accionable" o "confirma que el puntero está encima", se elimina.

### Fase 4 · Semántica de clic y a11y (1,5 d)

- Convertir los 3 controles reales: 2 filas de Caja y el dropzone de fotos. El `div` de LoginFlow que enfoca el OTP se conserva como atajo de puntero.
- Añadir `onKeyDown` (Enter/Space) a los 3 `<article role="button">` de CajaKpiCard, o convertirlos a `<button>`.
- Resolver el `<button>` dentro del `<a>` de VehicleCatalogCard con enlace estirado + botón hermano.
- Reemplazar los 3 `href="#"` del footer por rutas reales o deshabilitarlos visualmente.
- Verificar `Esc`, foco inicial y retorno de foco en todos los modales.
- Añadir `aria-expanded` en menús/desplegables y `aria-pressed` en toggles.

### Fase 5 · Landing de-slop (1,5 d)

- CTA del hero: fondo sólido, hover de color 120 ms, press de sombra interna. Sin borde cónico ni barrido.
- Retirar `.shiny-text` y `.shiny-card`; el HUD puede quedarse con una entrada única de 180 ms, no con borde girando.
- Eliminar `animate-ping`, `animate-bounce` y `animate-float` decorativos; conservar solo los que comunican estado (por ejemplo, un punto de "en vivo" si es real).
- Reducir el hover de las tarjetas de categoría a una propiedad (borde o tinte), 180 ms.
- Medir LCP/INP antes y después; el hero debería mejorar al quitar `conic-gradient` + `mask-image` + animación infinita.

### Fase 6 · Guardrails (1 d)

- CI: `node scripts/audit-interactions.mjs` en el pipeline, junto a `pnpm check` y `pnpm build`.
- Regla nueva en `.agents/rules/` (por ejemplo `interaction-states.md`) que cite este contrato y los budgets.
- Checklist de PR con 6 preguntas: press, foco, disabled/loading, sin `transition-all`, sin hover transform en operación, touch target.
- Matriz de QA manual (sección 10) adjunta al PR de cada fase.

---

## 8. Guardrails Automatizados y Budgets

El script debe ser simple, determinista y sin dependencias. Estos son los budgets propuestos:

| Regla | Budget | Alcance |
| :--- | ---: | :--- |
| `transition-all` | 0 | Todo `src/` |
| `duration-*` > 320 ms | 0 | Operación; landing permite 500 ms solo en fondo de hero |
| `hover:scale-*`, `hover:translate-*`, `hover:rotate-*` | 0 | Operación; landing ≤ 6 |
| `hover:shadow-*` | 0 | Operación; landing ≤ 4 |
| `group-hover:scale/translate/rotate` | 0 | Operación |
| `.ios-press-bounce` | 0 | Todo `src/` (tras Fase 3) |
| `active:scale-9*` (0.90–0.99 fuera de 0.98) | 0 | Todo `src/` |
| `focus:outline-none` sin `focus-visible` en el mismo elemento | 0 | Todo `src/` |
| `div`/`article` con `onClick` sin `role` + `tabIndex` + `onKeyDown` | 0 | Todo `src/` |
| `<button>` dentro de `<a>` | 0 | Todo `src/` |
| Touch targets < 44 px sin área extendida | 0 | Operación |
| `animate-ping/bounce/float` | 0 | Operación |
| Primitivas sin uso | 0 | `src/components/ui/` |

**Esqueleto del script:**

```js
// scripts/audit-interactions.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src';
const RULES = [
  { id: 'no-transition-all', re: /transition-all/g, budget: 0 },
  { id: 'no-press-bounce', re: /ios-press-bounce/g, budget: 0 },
  { id: 'no-hover-transform', re: /hover:(scale|rotate|-?translate)-/g, budget: 6, scope: 'landing' },
  { id: 'no-focus-kill', re: /focus:outline-(none|hidden)/g, budget: 0, requires: /focus-visible/ },
  { id: 'no-clickable-div', re: /<(div|article)[^>]*onClick/g, budget: 0, requires: /onKeyDown/ },
];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(tsx|astro)$/.test(entry.name)) yield path;
  }
}

// Por cada archivo: contar ocurrencias, imprimir `archivo:regla:total`.
// Si el total supera el budget, o falta `requires` en el archivo, salir con código 1.
// Las reglas con scope "landing" solo aplican a src/components/landing.
```

**Nota:** es un esqueleto, no un parser de JSX. Las expresiones regulares no entienden atributos multilínea ni strings; por eso cada regla debe tener una allowlist por archivo y el reporte debe revisarse en el PR. Node 22+ incluye `fs.globSync` si se prefiere evitar `walk`. No añadir dependencias nuevas solo para esto.

**Cómo evitar falsos positivos:**

- Las expresiones regulares se aplican sobre el archivo completo, no sobre JSX parseado; un comentario que mencione `transition-all` contaría. Mantener el script con una allowlist explícita por archivo y revisar el diff del reporte.
- No bloquear `transition-all` en el CSS de terceros ni en `dist/`.
- El budget de landing se revisa manualmente; el objetivo es que no crezca.

---

## 9. Worklist Priorizada

| # | Archivo | Acción principal | Fase |
| ---: | :--- | :--- | :--- |
| 1 | [`CajaDashboardIsland.tsx`](../src/components/caja/CajaDashboardIsland.tsx) | Filas a `<button>`, quitar hover de 49 clases, press único | 2 |
| 2 | [`CajaKpiCard.tsx`](../src/components/caja/CajaKpiCard.tsx) | Quitar halo/animación, teclado en `article`, press 0.98 | 2 |
| 3 | [`PerfilEditorCard.tsx`](../src/components/perfil/PerfilEditorCard.tsx) | `active:scale-95` → `.fx-press`, inputs con foco visible | 2 |
| 4 | [`FleetInventoryManager.tsx`](../src/components/flota/FleetInventoryManager.tsx) | Zoom 500 ms fuera, hover de fila a tinte | 2 |
| 5 | [`ConfiguracionIsland.tsx`](../src/components/configuracion/ConfiguracionIsland.tsx) | Switches con foco y press; sin `transition-all` | 2 |
| 6 | [`TelemetryBentoGrid.tsx`](../src/components/dashboard/TelemetryBentoGrid.tsx) | Hover de datos solo color; sin transforms | 3 |
| 7 | [`LocalCatalogShareCard.tsx`](../src/components/flota/LocalCatalogShareCard.tsx) | 11 botones a primitivo; foco; 44 px | 3 |
| 8 | [`LocalCatalogShowcase.tsx`](../src/components/flota/LocalCatalogShowcase.tsx) | Quitar zoom de imágenes; foco en buscador | 3 |
| 9 | [`UserDropdownMenu.tsx`](../src/components/navigation/UserDropdownMenu.tsx) | Hover + teclado + `aria-expanded` | 3 |
| 10 | [`MisReservasHub.tsx`](../src/components/reservas/MisReservasHub.tsx) | Conservar semántica; unificar press | 3 |
| 11 | [`VehicleCatalogCard.tsx`](../src/components/flota/VehicleCatalogCard.tsx) | Quitar sombra/zoom hover; resolver anidamiento | 3 |
| 12 | [`LoginFlow.tsx`](../src/components/auth/LoginFlow.tsx) | Foco visible en 4 controles; conservar el atajo de foco del OTP | 3 |
| 13 | [`BottomNavIsland.tsx`](../src/components/navigation/BottomNavIsland.tsx) | Quitar `group-hover:scale-110` de 8 iconos | 3 |
| 14 | [`LandingHeroIsland.tsx`](../src/components/landing/LandingHeroIsland.tsx) | CTA sólido; retirar `shiny-*` | 5 |
| 15 | [`tokens.css`](../src/styles/tokens.css) | Motion tokens, foco global, `.fx-btn-*`, `.fx-press` | 1 |
| 16 | [`Button.tsx`](../src/components/ui/Button.tsx) | `href` sin `role`, `loading`, un timing | 1–2 |
| 17 | [`ui/index.ts`](../src/components/ui/index.ts) | Dejar de exportar slop muerto | 0 |
| 18 | [`LandingFooter.astro`](../src/components/landing/LandingFooter.astro) | Reemplazar `href="#"` | 4 |

---

## 10. Matriz de QA Manual

Cada PR de fase debe pasar esta matriz antes de merge. No se sustituye por `pnpm check`.

| Escenario | Qué mirar | Criterio |
| :--- | :--- | :--- |
| iPhone Safari (PWA standalone) | Press en botón, tarjeta y fila | Cambio visible en < 100 ms; sin doble toque; sin zoom |
| iPhone Safari (navegador) | Tap highlight vs press propio | El press propio aparece; el highlight nativo no es la única señal |
| Android Chrome | Press y ripple nativo | Sin doble feedback; sin hover pegajoso |
| iPad con trackpad | Hover + clic | Hover discreto; press claro; foco visible |
| Desktop teclado | Tab/Enter/Space/Esc | Orden lógico; foco visible; sin trampas; modales cierran con Esc |
| `prefers-reduced-motion` | CTA, hero, sheets | Sin transforms ni bucles; la información sigue completa |
| Zoom 200 % / texto grande | Layout y targets | Sin solapamientos; 44 px se mantienen |
| Tema claro / oscuro | Contraste del foco y disabled | Anillo ≥ 3:1 contra el fondo adyacente |
| Lista larga (caja, flota) | Scroll con hover/press | Sin jank; sin `will-change` masivo |

**Evidencia requerida:** un video corto (o GIF) por superficie crítica, no capturas estáticas. El press es temporal; una captura no lo demuestra.

---

## 11. Decisiones Abiertas y Riesgos

### Decisiones que necesitan aprobación

1. **Modelo de press en botones:** sombra interna (Button System) vs `scale(.98)` (Card Language). Recomendación: sombra interna en botones, `scale(.98)` en tarjetas. No mezclar.
2. **Alcance de la landing:** conservar un momento orquestado (scroll del hero) y retirar el resto, o alinear toda la landing al contrato de producto. Recomendación: conservar el scroll, retirar `shiny-*`.
3. **Adopción de primitivos:** migrar los 386 botones al componente `Button` o normalizar por CSS y adoptar el primitivo solo en código nuevo. Recomendación: híbrido. CSS primero (impacto inmediato), primitivo para los flujos críticos.
4. **Tamaño compacto:** el export `Button System` admite 36 px; la gobernanza exige 44 px. Recomendación: 36 px visuales con hit area de 44 px en táctil, no 36 px de área real.
5. **Hover en escritorio:** ¿se conserva algún hover de elevación en tarjetas para indicar clic? Recomendación: no; borde + cursor + press es suficiente.

### Riesgos

| Riesgo | Impacto | Mitigación |
| :--- | :--- | :--- |
| Quitar hover de elevación hace que las tarjetas parezcan "planas" | Percepción de menor calidad | Borde más claro, chevron estático y press 0.98; QA con usuarios |
| Migración masiva de botones rompe flujos | Regresión funcional | Fases por archivo, no codemod global; `pnpm check` + prueba manual |
| El foco global choca con utilidades `outline-none` | Foco inconsistente | Regla global unlayered + eliminación progresiva de overrides |
| El CTA sólido baja conversión en landing | Métrica de negocio | A/B test; el CTA actual tiene animación infinita que distrae |
| `prefers-reduced-motion` global rompe loaders | Estados de carga sin feedback | Excluir spinners y transiciones de opacidad esenciales |
| Dos devs tocan los mismos archivos | Conflictos | Un archivo, un dueño por fase; orden de la worklist |

---

## 12. Anexos

### A. Comandos para reproducir el inventario

```bash
# Conteo de estados
grep -rho 'hover:' src --include='*.tsx' --include='*.astro' | wc -l
grep -rho 'active:' src --include='*.tsx' --include='*.astro' | wc -l
grep -rho 'focus-visible:' src --include='*.tsx' --include='*.astro' | wc -l
grep -rho 'ios-press-bounce' src --include='*.tsx' --include='*.astro' | wc -l

# Duraciones y transiciones
grep -rhoE 'duration-[0-9]+' src --include='*.tsx' --include='*.astro' | sort | uniq -c | sort -rn
grep -rhoE 'transition(-all|-colors|-transform|-opacity)?' src --include='*.tsx' --include='*.astro' | sort | uniq -c | sort -rn

# Foco y semántica
grep -rn 'focus:outline-none\|focus:outline-hidden' src --include='*.tsx' --include='*.astro'
grep -rn 'role="button"' src --include='*.tsx' --include='*.astro'
grep -rn '<button' src --include='*.tsx' --include='*.astro' | wc -l
```

### B. Regla de revisión para un componente nuevo

Antes de declarar un componente terminado:

- [ ] Tiene `rest`, `hover` (solo pointer), `active`, `focus-visible`, `disabled` y `loading`.
- [ ] El press dura 120 ms y cambia una sola propiedad (sombra interna o `scale(.98)`).
- [ ] El hover no mueve más de una propiedad y no escala imágenes.
- [ ] El foco se ve en claro y oscuro, con 2 px de anillo y offset.
- [ ] El target táctil mide al menos 44×44 px.
- [ ] No usa `transition-all`.
- [ ] No tiene animación infinita decorativa.
- [ ] Funciona con teclado (Tab, Enter, Space, Esc) y con lector de pantalla.
- [ ] Funciona con `prefers-reduced-motion`.
- [ ] No añade `will-change` en listas.

### C. Definición de "slop" para este proyecto

> Slop es cualquier estado interactivo cuyo valor se agota en el propio efecto: una sombra que aparece, un icono que gira, un borde que brilla o un botón que rebota sin informar de disponibilidad, jerarquía o resultado. Si al eliminar el efecto el usuario sigue sabiendo lo mismo, el efecto era slop.

---

## 13. Estado de Ejecución

- **Rama:** `fix-interaction-contract`
- **Fecha de cierre:** 6 de noviembre de 2026
- **Alcance cerrado:** Tareas 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10b y 11 del [plan de implementación](./plans/2026-11-05-interaction-contract.md).

### 13.1 Tareas completadas

| Tarea | Entregable | Estado |
| :--- | :--- | :--- |
| **1** | Guardrail `scripts/audit-interactions.mjs`, baseline inicial, script `pnpm audit:interactions` y retirada de `shiny-button.tsx`, `text-roll.tsx` y `testimonial.tsx`. | ✅ |
| **2** | Tokens de motion, regla global `:focus-visible`, reescritura de `.fx-btn-*`, `.fx-press`, `.fx-pressable` y alias `.ios-press-bounce` a 120 ms / `scale(0.98)`. | ✅ |
| **3** | Primitiva `Button` con `href`/`loading`, nueva `IconButton` y barrel sin las primitivas muertas. | ✅ |
| **4** | `CajaKpiCard`: halo y `animate-pulse` retirados, hover de elevación eliminado, teclado y press canónicos. | ✅ |
| **5** | `CajaDashboardIsland`: filas nativas con teclado, targets de 44 px, press unificado y `transition-all` retirado. | ✅ |
| **6** | `PerfilEditorCard` y `ConfiguracionIsland`: press canónico, foco visible y switches con `aria-checked`. | ✅ |
| **7** | `FleetInventoryManager` y `LocalCatalogShareCard`: zoom/hover de elevación retirados, press y foco unificados. | ✅ |
| **8** | `VehicleCatalogCard` (favorito fuera del `<a>`), `LocalCatalogShowcase` y `BottomNavIsland` sin `group-hover:scale`. | ✅ |
| **9** | `LoginFlow`, `TopBarSearch`, `PortalSwitchCard` y `MisReservasHub`: foco restaurado, press y targets corregidos. | ✅ |
| **10** | Landing de-slop: CTA sólido, retirada de `.shiny-*` y del brillo/borde animado; footer sin `href="#"`. | ✅ |
| **10b** | Barrido de la landing viva (`LandingHeader`, `LandingBookingIsland`, `LandingFleetShowcaseIsland`, `LandingFeatured`, `LandingSteps`, `LandingTrust`, `LandingFaq`, `LandingFinalCta`, `LandingPriceBreakdown`). | ✅ |
| **11** | Regla [`RUL-FLX-024`](../.agents/rules/interaction-states.md), baseline final, sección de estado, endurecimiento de primitivas y corrección del reset de `prefers-reduced-motion`. | ✅ |

### 13.2 Conteos antes / después

Los valores "antes" son el baseline generado en la Tarea 1 (estado pre-migración); los valores "después" son el baseline regenerado en la Tarea 11 con `node scripts/audit-interactions.mjs --update`.

| Regla del guardrail | Antes | Después | Δ |
| :--- | ---: | ---: | ---: |
| `transition-all` | 162 | 84 | −78 |
| `duration-* > 320ms` | 11 | 10 | −1 |
| `hover:scale/rotate/translate` | 4 | 2 | −2 |
| `hover:shadow-*` | 27 | 9 | −18 |
| `group-hover:scale/rotate/translate` | 32 | 8 | −24 |
| `ios-press-bounce` | 243 | 144 | −99 |
| `focus:outline-none/hidden` | 70 | 53 | −17 |
| `div/article onClick` sin `onKeyDown` | 17 | 11 | −6 |
| **Total** | **566** | **321** | **−245 (−43,3 %)** |

El baseline final escanea 142 archivos y conserva deuda en 56 de ellos. **No se declara deuda cero**: 321 ocurrencias siguen registradas y el guardrail impide que crezcan.

### 13.3 Deuda restante (honesta)

**Archivos fuera del alcance de las migraciones (51 de los 56 con deuda).** Permanecen sin cambios de interacción, principalmente:

- `dashboard/` (7 archivos): bento, telemetría y tarjetas Spline con `transition-all`, `hover:shadow`, `group-hover` y 22 `ios-press-bounce`.
- `caja/` (7 archivos): modales y flujo de caja con 17 `transition-all`, 18 `focus:outline-none` y 7 `ios-press-bounce`. `CajaKpiCard` y `CajaDashboardIsland` ya están limpios.
- `flota/` (20 archivos fuera de `LocalCatalogShareCard`): wizards de alta, disponibilidad y spotlight con 17 `transition-all`, 42 `ios-press-bounce`, 22 `focus:outline-none` y 2 filas clicables sin teclado.
- `verificacion/` (3 archivos): 23 `transition-all`, 1 `hover:shadow` y 1 duración > 320 ms.
- `navigation/` (7 archivos): modales de instalación y menús con 31 `ios-press-bounce`, 7 `transition-all` y 5 contenedores clicables sin teclado.
- `reservas/` (2 archivos), `alquiler/` (2), `auth/` (2 fuera de `LoginFlow`) y `notificaciones/` (1): press heredado, foco ausente y `transition-all` en flujos que no estaban en la worklist de este milestone.

**Residuales en archivos ya tocados (5).**

| Archivo | Conteo restante | Lectura |
| :--- | :--- | :--- |
| [`LoginFlow.tsx`](../src/components/auth/LoginFlow.tsx) | `clickable-div-no-keydown=1` | Es el `div` que enfoca el OTP como atajo de puntero; la Tarea 9 pidió conservarlo. El detector lo cuenta porque el archivo no declara `onKeyDown`. |
| [`LocalCatalogShareCard.tsx`](../src/components/flota/LocalCatalogShareCard.tsx) | `clickable-div-no-keydown=1` | Backdrop del modal que cierra al hacer clic; el cierre también existe en botones y no se añadió teclado al fondo. |
| [`LandingFooter.astro`](../src/components/landing/LandingFooter.astro) | `transition-all=1` | Barra inferior fija; la transición es funcional (posicionamiento), no un hover. Se conserva para no cambiar el comportamiento. |
| [`LandingCategories.astro`](../src/components/landing/LandingCategories.astro) | `group-hover-transform=1` | Código muerto: no lo importa ninguna página ni componente. |
| [`LandingHeroIsland.tsx`](../src/components/landing/LandingHeroIsland.tsx) | `transition-all=1`, `duration-over-320=1` | Código muerto: `index.astro` usa `LandingHero.astro`, no este island. |

**Capa de parche de hover en modo oscuro.** Sigue en [`tokens.css`](../src/styles/tokens.css#L1146-L1172) (`html.dark button/a ... .hover\:bg-white:hover` y `.hover\:bg-\[\#EDEDED\]:hover`). Existe porque hay hover claros sin variante oscura; su retirada exige un barrido completo de modo oscuro y quedó fuera de este milestone. No se deben añadir nuevas dependencias de ese parche.

**Código muerto pendiente.** Además de las tres primitivas eliminadas en la Tarea 1, siguen sin consumidores [`LandingHeroIsland.tsx`](../src/components/landing/LandingHeroIsland.tsx), [`LandingCategories.astro`](../src/components/landing/LandingCategories.astro) y [`Button.astro`](../src/components/ui/Button.astro). [`Button.tsx`](../src/components/ui/Button.tsx) e [`IconButton.tsx`](../src/components/ui/IconButton.tsx) están exportados y endurecidos, pero hoy **no tienen consumidores reales**: las migraciones usaron las clases CSS canónicas (`.fx-btn-*`, `.fx-press`, `.fx-pressable`). La adopción del primitivo queda como deuda de una fase posterior.

**Menores diferidos que afectan al contrato.**

- El alias `.ios-press-bounce` sigue en 144 usos; su eliminación se aplazó y sus declaraciones deben permanecer sincronizadas con `.fx-press` hasta entonces (comentario en `tokens.css`).
- No hay CI porque el repositorio no tiene `.github/`; `pnpm audit:interactions`, `pnpm check` y `pnpm build` son la puerta local documentada en `RUL-FLX-024`.
- El guardrail es un contador de texto: cuenta comentarios y strings, y evalúa `onKeyDown` por archivo, no por elemento. Sus cifras son un presupuesto de deuda, no un censo exacto.
- La rama `<a>` de `Button` no reenvía props arbitrarias de ancla (`target`, `rel`, `data-*`); está documentado en su JSDoc y debe resolverse antes de que un consumidor las necesite.
- Algunos botones operativos ya migrados (por ejemplo, los de `PerfilEditorCard`) usan `.fx-press` (`scale`) en lugar de `.fx-btn-*` (sombra interna). Es una desviación menor del contrato de press de botón; no se corrigió aquí porque implicaría tocar componentes ya migrados. En Tier C el `scale(0.98)` sí es el press canónico.
- El reset de `prefers-reduced-motion` ya no fuerza `opacity: 1` en `.fx-press`/`.fx-pressable`/`.ios-press-bounce`; el 40 % de un control `disabled` se conserva. La verificación es estática sobre el CSS, no una captura en dispositivo.

### 13.4 Verificación de cierre

```text
node scripts/audit-interactions.mjs  → exit 0 · 142 archivos escaneados · 56 con deuda · OK
pnpm check                           → Result (257 files): 0 errors, 0 warnings, 0 hints
pnpm build                           → Complete! (SSR Cloudflare, sin errores)
```

**Fin del informe.**
