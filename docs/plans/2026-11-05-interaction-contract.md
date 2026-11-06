# Plan de Implementación: Contrato de Interacción (AUD-FLX-MOTION-001)

> **Spec / autoridad:** [`docs/auditoria_microinteracciones_hover_click.md`](../auditoria_microinteracciones_hover_click.md)
> **Rama:** `fix-interaction-contract`
> **Objetivo:** erradicar el slop de hover/press/click mediante un contrato de estados, primitivas canónicas y guardrails, y migrar las superficies de mayor tráfico.
> **Fuera de alcance:** paleta, copy, lógica de negocio, rediseño completo de la landing más allá del CTA y del hero.

---

## Global Constraints

Estos valores son obligatorios en todas las tareas. El revisor los recibe textualmente.

1. **Duraciones canónicas:** press 120 ms, hover 120 ms, reveal 180 ms, sheet 240 ms, cambio de pantalla 320 ms. Una animación = una propiedad. Prohibido `transition-all`.
2. **Press de botón:** `box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.28)`, sin `transform`, 120 ms. **Press de tarjeta/fila:** `transform: scale(0.98)`, sin sombra, 120 ms.
3. **Foco:** anillo de 2 px con offset 2 px, visible en claro y oscuro. Prohibido `focus:outline-none` sin sustituto visible.
4. **Hover:** solo bajo `@media (hover: hover) and (pointer: fine)` en CSS propio. En Tier A/B (operación) no hay `hover:scale`, `hover:translate`, `group-hover:scale`, `hover:rotate` ni `hover:shadow-*`. El hover solo cambia color, borde o tinte, 120 ms.
5. **Touch targets:** mínimo 44×44 px. Un control visual de 36 px solo se acepta si extiende su área táctil a 44 px.
6. **Disabled:** 40 % de opacidad, `cursor: not-allowed`, sin hover.
7. **Sin animación infinita en CTA primario.** Sin `will-change` en listas o elementos repetidos.
8. **Paleta:** solo tokens canónicos existentes (`#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`) y los tokens de marca/estado ya definidos. No introducir hex nuevos.
9. **Sin dependencias nuevas.** Sin CSS-in-JS, sin módulos CSS, sin manipulación imperativa del DOM.
10. **Verificación por tarea:** `pnpm check` debe devolver 0 errores, 0 warnings y 0 hints; `pnpm build` debe completar. No se acepta una tarea con cualquiera de los dos en rojo.
11. **Alcance:** no renombrar rutas, no cambiar copy salvo que la tarea lo pida, no tocar lógica de datos ni acciones de servidor.
12. **Commits:** conventional commits en español o inglés, un commit por tarea como mínimo; el implementer reporta SHA y asunto.

---

## Task 1: Guardrail de interacciones y eliminación de primitivas muertas

**Fase:** 0
**Archivos:** `scripts/audit-interactions.mjs` (nuevo), `scripts/interaction-baseline.json` (nuevo), `package.json`, `src/components/ui/index.ts`, `src/components/ui/shiny-button.tsx`, `src/components/ui/text-roll.tsx`, `src/components/ui/testimonial.tsx`, `docs/INDEX.md`.

**Contexto:** la auditoría midió la deuda con grep manual. Esta tarea crea el medidor reproducible y retira tres primitivas que no tienen ningún consumidor. No se toca todavía el CSS `shiny-*` porque `LandingHeroIsland.tsx` usa esas clases; se retiran en la Tarea 10.

**Requisitos:**

1. Crear `scripts/audit-interactions.mjs` (ESM, Node, sin dependencias) que recorra `src/**/*.tsx` y `src/**/*.astro` y cuente, por archivo y total, estas reglas:
   - `transition-all`
   - `duration-*` con valor > 320
   - `hover:` con `scale`, `rotate` o `translate`
   - `hover:shadow-*`
   - `group-hover:` con `scale`, `rotate` o `translate`
   - `ios-press-bounce`
   - `focus:outline-none` y `focus:outline-hidden`
   - `onClick` en `div` o `article` sin `onKeyDown` en el mismo archivo (conteo aproximado, documentado)
2. El script compara contra `scripts/interaction-baseline.json` (mapa `archivo -> { regla: conteo }`, más `totals`). Si un archivo existente supera su baseline, o un archivo nuevo tiene conteo > 0, imprime las diferencias y sale con código 1. Si todo está dentro del baseline, sale con 0.
3. Flag `--update` para reescribir el baseline con los conteos actuales. El baseline inicial se genera con `node scripts/audit-interactions.mjs --update` y debe reflejar el estado real del repo en esta rama.
4. Añadir a `package.json` el script `"audit:interactions": "node scripts/audit-interactions.mjs"`.
5. Eliminar `src/components/ui/shiny-button.tsx`, `src/components/ui/text-roll.tsx` y `src/components/ui/testimonial.tsx`; quitar sus exports de `src/components/ui/index.ts`. Verificar con `grep -rn "shiny-button\|text-roll\|testimonial" src --include="*.tsx" --include="*.astro"` que no quedan importaciones.
6. No modificar `docs/INDEX.md`: el plan y la auditoría ya están indexados en el commit base.
7. No eliminar `.shiny-cta`, `.shiny-text` ni `.shiny-card` de `tokens.css` en esta tarea.

**Criterios de aceptación:**

- `node scripts/audit-interactions.mjs` sale 0 después de generar el baseline.
- `node scripts/audit-interactions.mjs --update` es idempotente.
- `grep` de las tres primitivas no encuentra consumidores.
- `pnpm check` y `pnpm build` verdes.
- El baseline contiene los conteos reales (debe incluir `ios-press-bounce`, `transition-all`, etc.), no un archivo vacío.

---

## Task 2: Tokens de interacción, foco global y botones canónicos

**Fase:** 1
**Archivos:** `src/styles/tokens.css` (único archivo de esta tarea). No tocar `Button.tsx` ni `Button.astro`; su limpieza es la Tarea 3.

**Contexto:** hoy conviven tres sistemas de tiempo en un botón y un press de `0.88` en 243 elementos. Esta tarea fija el contrato en la capa CSS. Es la de mayor impacto y la de menor riesgo: cambia tokens y clases, no lógica.

**Requisitos:**

1. Añadir a `:root` (o al bloque de tokens existente):
   ```css
   --fx-duration-press: 120ms;
   --fx-duration-hover: 120ms;
   --fx-duration-reveal: 180ms;
   --fx-duration-sheet: 240ms;
   --fx-duration-page: 320ms;
   --fx-ease-out: cubic-bezier(0.2, 0.8, 0.3, 1);
   --fx-ease-in-out: cubic-bezier(0.75, 0, 0.25, 1);
   ```
2. Añadir una regla global de foco visible, fuera de `@layer`, para que gane a las utilidades:
   ```css
   :where(button, a[href], [role="button"], [role="switch"], summary, input, select, textarea):focus-visible {
     outline: 2px solid var(--fx-border-focus);
     outline-offset: 2px;
   }
   ```
   Aceptar que los componentes que ya tienen `focus-visible:ring-2` muestren anillo + outline durante la migración; se limpia en las tareas de migración.
3. Reescribir los cuatro `.fx-btn-*` (primary, secondary, outline, ghost):
   - `transition` solo para `background-color`, `border-color`, `color`, `box-shadow`, con `var(--fx-duration-press) var(--fx-ease-out)`.
   - `:active:not(:disabled)` con sombra interna y sin `transform`. Primary: `inset 0 1px 2px rgb(0 0 0 / 0.28)`. Secondary/outline/ghost: `inset 0 1px 2px rgb(0 0 0 / 0.16)`.
   - `:disabled` con `opacity: 0.4` y `cursor: not-allowed`.
   - Eliminar `transition: all` y `transform: scale(0.98)` de estas reglas.
4. Añadir exactamente:
   ```css
   .fx-press,
   .fx-pressable {
     transition:
       transform var(--fx-duration-press) var(--fx-ease-out),
       background-color var(--fx-duration-press) var(--fx-ease-out),
       border-color var(--fx-duration-press) var(--fx-ease-out),
       color var(--fx-duration-press) var(--fx-ease-out);
   }
   .fx-press:active,
   .fx-pressable:active {
     transform: scale(0.98);
   }
   ```
   Sin `will-change`.
5. Redefinir `.ios-press-bounce` como alias temporal de `.fx-press`: `scale(0.98)`, 120 ms, sin `will-change`, sin `translateY(1px)`. Mantener el nombre para no romper los 243 usos; se retira en tareas posteriores.
6. Añadir `.fx-press`, `.fx-pressable` y `.ios-press-bounce` al bloque `@media (prefers-reduced-motion: reduce)` existente, con `transition: none !important; transform: none !important;`.
7. No tocar las reglas `html.dark ... :not([class*="dark:hover:"])` de `tokens.css`. Su retirada exige un barrido completo de modo oscuro y queda fuera de este milestone; se documenta como deuda en la Tarea 11.
8. No tocar `Button.tsx`/`Button.astro` en esta tarea; el primitivo se limpia en la Tarea 3.

**Criterios de aceptación:**

- `grep -n "transition: all" src/styles/tokens.css` no devuelve reglas de `.fx-btn-*`.
- `.ios-press-bounce:active` contiene `scale(0.98)` y su `transition` es de 120 ms; no contiene `will-change`.
- La regla global de foco existe y usa `--fx-border-focus`.
- `pnpm check` y `pnpm build` verdes.
- El script de la Tarea 1 sigue saliendo 0 (el baseline no se actualiza en esta tarea; los conteos deben bajar o mantenerse).

---

## Task 3: Primitiva Button e IconButton

**Fase:** 2.1–2.2
**Archivos:** `src/components/ui/Button.tsx`, `src/components/ui/Button.astro`, `src/components/ui/IconButton.tsx` (nuevo), `src/components/ui/index.ts`.

**Contexto:** el botón canónico existe pero no se consume. Antes de migrar 386 botones hay que arreglar su semántica y su API. `Button.astro` está sin uso; se mantiene por paridad de la capa Tier 1.

**Requisitos:**

1. `Button.tsx`:
   - En la rama `href`, renderizar `<a href={href}>` sin `role="button"`; conservar la semántica de enlace.
   - Si `disabled` y hay `href`, añadir `aria-disabled="true"`, `tabIndex={-1}` y un `onClick` que haga `event.preventDefault()`.
   - Añadir `loading?: boolean`. Con `loading`: `aria-busy="true"`, `disabled` en `<button>` o `aria-disabled` en `<a>`, spinner SVG inline de 16 px, label visible y sin cambio de ancho.
   - No usar `ios-press-bounce` en la base; el press lo gobierna `.fx-btn-*`.
   - Quitar `transition` de la base (el timing vive en `.fx-btn-*`).
   - Tamaños: `sm` conserva 36 px visuales en desktop, pero en móvil (`max-sm`) debe tener `min-h-[44px]`; `md` 44 px; `lg` 52 px. Los `iconOnly` deben ser 44×44 como mínimo.
   - Mantener `focus-visible:ring-2` o confiar en el foco global; no añadir `focus:outline-none` sin sustituto.
2. `Button.astro`: espejo de los cambios de semántica (`<a>` sin `role="button"`), foco y tamaños. No añadir `loading` si complica el tipado de Astro; documentarlo en el reporte.
3. Crear `IconButton.tsx`:
   - Props: `aria-label: string` obligatorio, `variant?: 'primary' | 'secondary' | 'outline' | 'ghost'` (default `ghost`), `size?: 'md' | 'lg'` (44 o 52), `disabled`, `children`.
   - Renderiza `<button type="button">` con `min-h-[44px] min-w-[44px]`, `.fx-btn-*`, `focus-visible`, `aria-label`.
   - Sin `title` como sustituto de `aria-label`.
4. Exportar `IconButton` desde `src/components/ui/index.ts`; el barrel no debe exportar las tres primitivas eliminadas.
5. No migrar consumidores en esta tarea; solo la primitiva y la API.

**Criterios de aceptación:**

- `grep -n 'role="button"' src/components/ui/Button.tsx src/components/ui/Button.astro` no devuelve nada.
- `loading` renderiza `aria-busy` y el label sigue presente.
- `IconButton` exige `aria-label` en TypeScript.
- `pnpm check` y `pnpm build` verdes.

---

## Task 4: CajaKpiCard (halo, hover y teclado)

**Fase:** 2.3
**Archivos:** `src/components/caja/CajaKpiCard.tsx`.

**Contexto:** es el ejemplo más visible de slop: halo difuso, borde azul y sombra 2xl en hover, `animate-pulse` decorativo, y `<article role="button" tabIndex={0}>` sin `onKeyDown`. El archivo tiene 627 líneas; limitar el cambio a las tarjetas y sus estados.

**Requisitos:**

1. Eliminar los dos `div` de halo (`blur-3xl`, `bg-[#2D6BFF]/12`, `bg-white/5`) y el `animate-pulse` decorativo del pill de tesorería. No eliminar puntos de estado que comuniquen información real.
2. En las tarjetas clicables:
   - Quitar `hover:border-[#2D6BFF]/40`, `hover:shadow-2xl`, `hover:shadow-md`, `group-hover:text-blue-300`, `group-hover:scale-105` y `group-hover:translate-x-0.5`.
   - Quitar `transition-all`; usar `transition-colors` o `transition-[background-color,border-color,color]`.
   - Reemplazar `ios-press-bounce` por `fx-pressable` (o `fx-press` si es un control pequeño).
   - Si el `article` es clicable, añadir `onKeyDown` que active con Enter y Space, o convertirlo en `<button>` si no contiene controles internos. Si contiene botones internos, mantener `role="button"` + `tabIndex` + `onKeyDown` y asegurar `stopPropagation` en los hijos.
3. Los controles de 38 px (`min-h-[38px]`) deben pasar a 44 px o extender su área con un pseudo-elemento; documentar cuáles.
4. Quitar `transition-all` de los controles internos y unificar el press con `.fx-press`; no dejar `active:scale-*` sueltos.
5. Añadir foco visible a los controles que hoy dependen de `focus:outline-none`; usar la regla global o `focus-visible:ring-2`.
6. No cambiar la lógica de datos, los textos ni la estructura de las métricas.

**Criterios de aceptación:**

- No quedan `hover:shadow`, `group-hover:scale`, `group-hover:translate`, `animate-pulse` decorativo ni `transition-all` en el archivo.
- Ningún `article` clicable sin `onKeyDown`.
- No quedan `min-h-[38px]` sin área extendida.
- `pnpm check` y `pnpm build` verdes; `pnpm audit:interactions` no aumenta.

---

## Task 5: CajaDashboardIsland (filas, press y targets)

**Fase:** 2.3
**Archivos:** `src/components/caja/CajaDashboardIsland.tsx`.

**Contexto:** 49 `hover:`, dos filas `<div onClick>` sin teclado, 9 controles de 38 px y múltiples `ios-press-bounce`. Es el archivo operativo con más deuda. No reescribir la lógica de caja; solo la capa interactiva.

**Requisitos:**

1. Convertir las dos filas `<div onClick>` (movimientos recientes y reportes) en `<button type="button" className="w-full text-left ...">` o `<a>` si navegan. Si se mantiene `div`, añadir `role="button"`, `tabIndex={0}`, `onKeyDown` para Enter/Space y `focus-visible`.
2. Quitar `hover:shadow-*`, `hover:scale-*`, `group-hover:scale-*` y `group-hover:translate-*` de las tarjetas y filas. Dejar solo cambios de tinte/borde.
3. Reemplazar `.ios-press-bounce` por `.fx-pressable` en tarjetas y `.fx-press` en botones; eliminar `active:scale-*` sueltos.
4. Llevar los 9 `min-h-[38px]` a `min-h-[44px]` o extender el área con `before:`; verificar que no se rompe el layout de la tabla.
5. Sustituir `transition-all` por propiedades concretas y bajar duraciones > 240 ms a 120–150 ms en controles.
6. Añadir foco visible donde falte; no dejar `focus:outline-none` sin sustituto.
7. No cambiar acciones, cálculos, queries ni textos.

**Criterios de aceptación:**

- Las dos filas son operables con teclado (o son botones nativos).
- No quedan `hover:shadow`, `hover:scale`, `group-hover:scale`, `group-hover:translate` ni `transition-all`.
- No quedan `min-h-[38px]` sin área extendida.
- `pnpm check`, `pnpm build` y `pnpm audit:interactions` en verde.

---

## Task 6: PerfilEditorCard y ConfiguracionIsland

**Fase:** 3
**Archivos:** `src/components/perfil/PerfilEditorCard.tsx`, `src/components/configuracion/ConfiguracionIsland.tsx`.

**Contexto:** Perfil tiene 7 `active:scale-95`, `transition-all` en inputs y botones, y `focus:outline-none`. Configuración mezcla switches y botones con estados inconsistentes.

**Requisitos:**

1. Perfil:
   - Reemplazar `active:scale-95` por `.fx-press` (quitar la utilidad `active:`).
   - Sustituir `transition-all` por `transition-colors` o `transition-[background-color,border-color,color]`.
   - Inputs: conservar `focus:border-*` pero añadir foco visible de 2 px (regla global o `focus-visible:ring-2`); no dejar `outline-none` sin sustituto.
   - Las filas clicables (`w-full ... p-3.5`) deben ser `<button type="button">` si no lo son; si ya lo son, mantener.
   - No cambiar la lógica de guardado ni los textos.
2. Configuración:
   - Unificar switches y botones con `.fx-press` / `.fx-btn-*`.
   - Quitar `transition-all` y hovers de elevación.
   - Asegurar `role="switch"` + `aria-checked` + foco visible en los toggles.
   - 44 px en los controles táctiles.
3. No tocar la lógica de permisos, sesión ni persistencia.

**Criterios de aceptación:**

- 0 `active:scale-95` y 0 `transition-all` en ambos archivos.
- Switches con `aria-checked` y foco visible.
- `pnpm check`, `pnpm build`, `pnpm audit:interactions` verdes.

---

## Task 7: FleetInventoryManager y LocalCatalogShareCard

**Fase:** 3
**Archivos:** `src/components/flota/FleetInventoryManager.tsx`, `src/components/flota/LocalCatalogShareCard.tsx`.

**Contexto:** Fleet usa zoom de imagen de 500 ms y hover en filas; ShareCard tiene 11 `ios-press-bounce`, cero `active:` y foco débil en 10 botones.

**Requisitos:**

1. Fleet:
   - Quitar `group-hover:scale-105` de las imágenes y `duration-500` en zoom.
   - Hover de fila: solo tinte/borde, 120–150 ms.
   - Quitar `transition-all`; usar propiedades concretas.
   - 44 px en acciones de fila.
2. ShareCard:
   - Reemplazar los 11 `ios-press-bounce` por `.fx-press` (o `Button`/`IconButton` cuando aplique).
   - Añadir foco visible a todos los botones; eliminar `focus:outline-none`.
   - Unificar press; no dejar `active:scale-*` sueltos.
   - Los botones de 46 px pueden quedarse, pero no bajar de 44 px.
   - No cambiar el copy ni la lógica de compartir/copiar.
3. No tocar fetch, acciones ni formato de enlaces.

**Criterios de aceptación:**

- 0 `ios-press-bounce`, 0 `group-hover:scale-105`, 0 `transition-all` en ambos archivos.
- Todos los botones de ShareCard con foco visible y press uniforme.
- `pnpm check`, `pnpm build`, `pnpm audit:interactions` verdes.

---

## Task 8: VehicleCatalogCard, LocalCatalogShowcase y BottomNav

**Fase:** 3
**Archivos:** `src/components/flota/VehicleCatalogCard.tsx`, `src/components/flota/LocalCatalogShowcase.tsx`, `src/components/navigation/BottomNavIsland.tsx`.

**Contexto:** VehicleCatalogCard anida un `<button>` de favorito dentro de un `<a>` (HTML inválido) y usa sombra + zoom en hover. LocalCatalogShowcase repite zoom de imagen. BottomNav escala 8 iconos en `group-hover`.

**Requisitos:**

1. VehicleCatalogCard:
   - Resolver el anidamiento: el `<a>` de la tarjeta y el `<button>` de favorito no pueden ser ancestro/descendiente. Usar un contenedor relativo con un enlace estirado (`absolute inset-0` o `::after`) y el botón como hermano por encima, con `z-index` y `stopPropagation`.
   - Quitar `hover:shadow-[...]`, `hover:border-[...]`, `group-hover:text-black` y `group-hover:scale-[1.03]` de la imagen.
   - `transition-all` → `transition-colors` o propiedades concretas.
   - `.ios-press-bounce` → `.fx-pressable`.
   - El botón de favorito debe medir 44×44 (hoy 32×32).
2. LocalCatalogShowcase:
   - Quitar `group-hover:scale-105` y los `transition-transform duration-300` asociados.
   - Unificar press y foco; no dejar `focus:outline-none` sin sustituto.
3. BottomNav:
   - Quitar `group-hover:scale-110` de los 8 iconos; el estado activo puede conservar `scale-105` estático o usar relleno/indicador.
   - Mantener el indicador activo y la navegación.
4. No cambiar rutas ni lógica de navegación.

**Criterios de aceptación:**

- 0 `<button>` dentro de `<a>` en VehicleCatalogCard; favorito 44×44.
- 0 `group-hover:scale` en los tres archivos.
- `pnpm check`, `pnpm build`, `pnpm audit:interactions` verdes.

---

## Task 9: LoginFlow, TopBarSearch, PortalSwitchCard y MisReservasHub

**Fase:** 3–4
**Archivos:** `src/components/auth/LoginFlow.tsx`, `src/components/navigation/TopBarSearch.tsx`, `src/components/perfil/PortalSwitchCard.tsx`, `src/components/reservas/MisReservasHub.tsx`.

**Contexto:** el foco de teclado está borrado en login, buscador y switch de portal. MisReservasHub ya tiene la semántica correcta de fila, pero su press no está unificado.

**Requisitos:**

1. LoginFlow:
   - Quitar `focus:outline-none` de los 4 controles (links y botones); añadir foco visible (global o `focus-visible:ring-2`).
   - Conservar el `div` que enfoca el OTP como atajo de puntero; no convertirlo en botón.
   - No cambiar el flujo de auth ni los textos.
2. TopBarSearch:
   - Añadir foco visible al input y al contenedor de la cápsula (`focus-within:ring-2` o regla global).
   - Quitar `focus:outline-none` sin sustituto.
   - 44 px en el botón de limpiar (hoy 24×24) mediante área extendida.
3. PortalSwitchCard:
   - `focus:outline-hidden` → anillo visible de 2 px.
   - Mantener `role="switch"`, `aria-checked` y `disabled`.
4. MisReservasHub:
   - Conservar `role="button"`, `tabIndex` y `onKeyDown`.
   - Reemplazar `ios-press-bounce` por `.fx-press`/`.fx-pressable`; quitar `transition-all` y hovers de elevación.
   - 44 px en acciones.
5. No tocar queries, acciones ni navegación.

**Criterios de aceptación:**

- 0 `focus:outline-none`/`focus:outline-hidden` sin sustituto en los cuatro archivos.
- Switch con anillo visible y `aria-checked`.
- `pnpm check`, `pnpm build`, `pnpm audit:interactions` verdes.

---

## Task 10: Landing de-slop

**Fase:** 5
**Archivos:** `src/components/landing/LandingHeroIsland.tsx`, `src/components/landing/LandingCategories.astro`, `src/components/landing/LandingFooter.astro`, `src/styles/tokens.css`.

**Contexto:** el hero usa `.shiny-cta`, `.shiny-text` y `.shiny-card`; el CTA tiene borde cónico animado y brillo infinito. El footer tiene 3 `href="#"`.

**Requisitos:**

1. CTA del hero:
   - Reemplazar `.shiny-cta` por un botón sólido con `.fx-btn-primary` (o clases equivalentes), sin borde cónico ni animación infinita.
   - Hover: solo color, 120 ms. Press: sombra interna.
   - Mantener el enlace `/catalogo` y el texto.
2. Retirar `.shiny-text` del título y `.shiny-card` de las HUD cards. Sustituir por superficies sólidas o translúcidas simples, sin borde animado.
3. Eliminar de `tokens.css` `.shiny-cta`, `.shiny-text`, `.shiny-card` y sus `@property`/keyframes si no tienen otros consumidores. Verificar con grep.
4. Quitar `animate-ping`, `animate-bounce` y `animate-float` decorativos **en los archivos de `src/components/landing/`**; conservar solo los que comuniquen estado real. Reducir el hover de categorías a una propiedad (borde o tinte), 180 ms.
5. Footer: reemplazar los 3 `href="#"` por rutas reales existentes o convertirlos en texto no interactivo; no dejar enlaces muertos.
6. No romper la animación GSAP de scroll del hero; si el CTA participa, preservar el hook/ref.

**Criterios de aceptación:**

- 0 `.shiny-cta`, `.shiny-text`, `.shiny-card` en `src/` y en `tokens.css`.
- 0 `href="#"` en el footer.
- 0 `animate-ping`/`animate-bounce` decorativos en `src/components/landing/`.
- `pnpm check`, `pnpm build`, `pnpm audit:interactions` verdes.

---

## Task 11: Regla de interacción, baseline final y documentación

**Fase:** 6
**Archivos:** `.agents/rules/interaction-states.md` (nuevo), `AGENTS.md`, `scripts/interaction-baseline.json`, `docs/auditoria_microinteracciones_hover_click.md`, `docs/INDEX.md`.

**Contexto:** el contrato debe quedar escrito y el guardrail debe reflejar el estado posterior a las migraciones. No se añade CI porque el repo no tiene `.github/`; se documenta el comando y se puede conectar después.

**Requisitos:**

1. Crear `.agents/rules/interaction-states.md` con:
   - La matriz de estados (rest/hover/active/focus-visible/disabled/loading/selected).
   - Los tokens de duración y easing.
   - Las reglas por tier (A/B/C) y las prohibiciones (`transition-all`, hover transform en operación, animación infinita en CTA, `focus:outline-none` sin sustituto).
   - Los comandos de verificación (`pnpm audit:interactions`, `pnpm check`, `pnpm build`).
   - Referencias a `design/exports/Motion.html`, `Button System.html` y `Card Language.html`.
2. Añadir la regla a la tabla de `.agents/rules/` en `AGENTS.md` (código `RUL-FLX-024` o el siguiente libre; verificar que no exista).
3. Ejecutar `node scripts/audit-interactions.mjs --update` para fijar el baseline posterior a las migraciones. El script debe salir 0.
4. Añadir al final de la auditoría una sección `## 13. Estado de Ejecución` con: rama, tareas completadas, conteos antes/después y pendientes (Fases 3–6 restantes si quedan).
5. Actualizar `docs/INDEX.md` si se añadieron documentos.
6. No modificar código de componentes, salvo el endurecimiento de primitivas del punto 9.
7. En `src/styles/tokens.css`, corregir el reset de `prefers-reduced-motion`: el `opacity: 1 !important` del bloque compartido no debe anular el 40 % de `:disabled`. Acotarlo a `:not(:disabled)` o retirar la declaración, y verificar con un botón `disabled` + `.fx-press`.
8. Añadir un comentario de sincronía entre `.fx-press` y `.ios-press-bounce` antes de que el alias se elimine en una fase posterior.
9. Endurecer las primitivas: en `Button.tsx` e `IconButton.tsx`, mover `{...props}` antes de `type`/`disabled` para que un caller no pueda convertir el botón en `submit`; añadir una nota JSDoc sobre las props no reenviadas en el branch `<a>`.

**Criterios de aceptación:**

- La regla existe, está enlazada desde `AGENTS.md` y no contradice la auditoría.
- Un botón `disabled` con `.fx-press` sigue al 40 % de opacidad bajo `prefers-reduced-motion`.
- Un caller que pase `type` a `Button` o `IconButton` no puede cambiar el `type="button"` por defecto.
- `node scripts/audit-interactions.mjs` sale 0 con el baseline actualizado.
- `pnpm check` y `pnpm build` verdes.
- La sección de estado de ejecución refleja la realidad, sin afirmar tareas no hechas.

---

## Orden y dependencias

1. Task 1 (guardrail + dead code) es independiente.
2. Task 2 (tokens) debe ir antes que cualquier migración.
3. Task 3 (primitivas) depende de Task 2.
4. Tasks 4–9 dependen de Task 2 y, cuando usen `Button`/`IconButton`, de Task 3. Se ejecutan en orden, un archivo o batch por tarea.
5. Task 10 depende de Task 2 (para el CTA sólido) y puede ir después de las migraciones operativas.
6. Task 11 va al final.

**Regla de alcance:** si una tarea descubre que un archivo es demasiado grande para el batch, se detiene y reporta `DONE_WITH_CONCERNS` con una propuesta de división; no se reestructura fuera del alcance.
