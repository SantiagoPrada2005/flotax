# Rule: Contrato Canónico de Estados Interactivos y Presupuesto de Motion

- **Código:** `RUL-FLX-024`
- **Ámbito:** Todas las superficies interactivas de `src/components/**`, `src/layouts/**` y `src/pages/**`; tokens y clases de interacción en [`src/styles/tokens.css`](../../src/styles/tokens.css); primitivas de [`src/components/ui/`](../../src/components/ui/).
- **Estado:** Activo y de estricto cumplimiento para cualquier agente o desarrollador.
- **Hereda de:** [`RUL-FLX-021`](./apple-design-governance.md) (HIG y microinteracciones), [`RUL-FLX-023`](./theme-system.md) (botones canónicos en claro/oscuro) y [`RUL-FLX-005`](./ux-principles.md) (diseño centrado en la operación).

> **Autoridad funcional:** [`docs/auditoria_microinteracciones_hover_click.md`](../../docs/auditoria_microinteracciones_hover_click.md) (`AUD-FLX-MOTION-001`). Esta regla no inventa estética nueva: fija por escrito los estados que la auditoría ya definió y que las migraciones de [`docs/plans/2026-11-05-interaction-contract.md`](../../docs/plans/2026-11-05-interaction-contract.md) aplicaron.

---

## 1. Misión

FlotaX es un instrumento operativo móvil: en un patio, con una mano y a pleno sol, el usuario debe saber en menos de 100 ms **qué se puede tocar, qué acaba de pasar y qué está pasando ahora**. Todo estado interactivo debe informar de disponibilidad, jerarquía o resultado; si al eliminar el efecto el usuario sigue sabiendo lo mismo, el efecto es *slop* y no se implementa.

Regla de oro: **un estado, una señal, una propiedad**. Press y hover de operación duran 120 ms; el hover de la landing puede llegar a 180 ms. Ninguna interacción supera 320 ms.

---

## 2. Matriz Canónica de Estados

| Estado | Disparador | Tier A — Controles | Tier B — Tarjetas y filas | Tier C — Landing |
| :--- | :--- | :--- | :--- | :--- |
| **Rest** | — | Fondo, borde y texto con tokens canónicos; sin animación decorativa. | Superficie con borde de 1 px; sin sombra de espera. | Igual que Tier B; una sola entrada orquestada permitida. |
| **Hover** | Solo puntero fino: `@media (hover: hover) and (pointer: fine)`. | Cambia fondo, borde o color, 120 ms. Sombra solo si la define el CSS canónico `.fx-btn-*`. | Cambia solo borde o tinte, 120 ms. **Prohibido** sombra, escala o desplazamiento. | Máximo 1 propiedad visual (color, borde o tinte), 180 ms; el movimiento de hero es el único momento orquestado. |
| **Active** | Pointer o touch. | Botones `.fx-btn-*`: sombra interna, **sin `transform`**, 120 ms. Otros controles: `.fx-press`, 120 ms. | `.fx-pressable`: `transform: scale(0.98)`, sin sombra, 120 ms. Toda la tarjeta o fila es un solo target. | `scale(0.98)` en CTA y enlaces interactivos, 120 ms; sin sombra añadida. |
| **Focus-visible** | Teclado (`Tab`). | Anillo de 2 px con `outline-offset: 2px`; visible en claro y oscuro. | Anillo de 2 px; la tarjeta enfocada se distingue del resto. | Anillo de 2 px; nunca se elimina en CTAs, selects ni inputs. |
| **Disabled** | Atributo `disabled` o `aria-disabled`. | 40 % de opacidad, `cursor: not-allowed`, sin hover ni press. El 40 % debe sobrevivir a `prefers-reduced-motion`. | 40 % de opacidad y `cursor: not-allowed`; no reacciona a hover ni press. | n/a: la landing no deshabilita CTAs. |
| **Loading** | Operación asíncrona en curso. | Spinner de 16 px + label visible + `aria-busy="true"`; el ancho no salta. | Skeleton con la forma final del contenido; sin layout shift. | n/a: sin controles asíncronos. |
| **Selected** | Estado persistente (tab, filtro, switch, fila activa). | Indicador lleno o pastilla persistente + `aria-pressed` / `aria-checked` / `aria-selected`; no depende de hover. | Barra o check persistente; no se comunica solo con color de hover. | n/a: el estado activo de navegación es persistente, sin hover. |

### 2.1 Taxonomía de tiers

- **Tier A — Controles:** botones, icon buttons, inputs, selects, tabs, switches y chips accionables. Press obligatorio, foco visible, target mínimo de 44×44 px y estados disabled/loading cuando aplique.
- **Tier B — Superficies navegables:** tarjetas de vehículo, filas de caja, resultados, acordeones y celdas clicables. Press `scale(0.98)` y foco visible; sin hover de elevación. Las acciones secundarias (favorito, menú) viven fuera del target principal o por encima con `z-index` y `stopPropagation`, nunca anidadas dentro de un `<a>` o `<button>`.
- **Tier C — Landing:** permitido un momento orquestado (scroll del hero) y un hover de 180 ms con una propiedad. Prohibido el bucle de brillo, el borde cónico animado y cualquier animación infinita decorativa.

---

## 3. Tokens de Duración y Easing

Los tiempos viven en [`tokens.css`](../../src/styles/tokens.css) y no se escriben a mano en los componentes:

| Token | Valor | Uso canónico |
| :--- | :--- | :--- |
| `--fx-duration-press` | `120ms` | Press, toggle y cambio de color. |
| `--fx-duration-hover` | `120ms` | Hover de color, borde o tinte. |
| `--fx-duration-reveal` | `180ms` | Aparición de tarjeta, contenido o hover de landing. |
| `--fx-duration-sheet` | `240ms` | Bottom sheet, modal y panel. |
| `--fx-duration-page` | `320ms` | Cambio de pantalla o transición de ruta. |
| `--fx-ease-out` | `cubic-bezier(0.2, 0.8, 0.3, 1)` | Entradas, press y hover. |
| `--fx-ease-in-out` | `cubic-bezier(0.75, 0, 0.25, 1)` | Movimientos de panel, sheet y modal. |

**Reglas duras de motion:**

1. Una animación = una propiedad. Nunca `transition-all`.
2. Press y hover de operación: 120 ms; hover de landing: 180 ms. Ninguna interacción supera 320 ms.
3. Sin `will-change` en listas ni en elementos repetidos.
4. Sin animación infinita en un CTA primario ni bucles decorativos en la landing.
5. `prefers-reduced-motion: reduce` desactiva animaciones, transforms y transiciones decorativas; conserva spinners y cambios de opacidad esenciales. **No fuerza `opacity: 1` en controles deshabilitados**: el 40 % de disabled es información, no decoración.
6. Hover solo bajo `@media (hover: hover) and (pointer: fine)` en CSS propio.

---

## 4. Prohibiciones Duras

Queda prohibido en código nuevo y en cualquier archivo que se migre:

1. **`transition-all`** (o `transition: all`). Usar `transition-colors` o propiedades explícitas.
2. **Hover con transform o sombra en Tier A/B:** `hover:scale-*`, `hover:translate-*`, `hover:rotate-*`, `hover:shadow-*`, `group-hover:scale-*`, `group-hover:translate-*`, `group-hover:rotate-*`. El hover de operación solo cambia color, borde o tinte.
3. **Animación infinita en el CTA primario** (o en cualquier CTA de conversión): sin `animate-ping`, `animate-bounce`, `animate-float`, bordes cónicos ni barridos de brillo en bucle.
4. **`focus:outline-none` / `focus:outline-hidden` sin sustituto visible** en el mismo elemento. El mínimo es el anillo global de 2 px con offset 2 px.
5. **`ios-press-bounce` en código nuevo.** Es un alias deprecado de `.fx-press` que se conserva solo para los consumidores históricos; se elimina cuando el barrido termine. Su declaración y la de `.fx-press` deben permanecer sincronizadas hasta ese día.

También se rechazan en revisión: `active:scale-*` sueltos fuera de `.fx-press`/`.fx-pressable`, `<button>` dentro de `<a>`, `duration-*` mayor de 320 ms, enlaces `href="#"` y animaciones decorativas que no comuniquen estado.

---

## 5. Implementación Canónica

- **Botones:** `.fx-btn-primary`, `.fx-btn-secondary`, `.fx-btn-outline` y `.fx-btn-ghost` gobiernan color, hover, press y disabled. No añadir `transform` ni `transition-all` encima. Los botones nuevos de operación deben usar estas clases; `.fx-press` no sustituye el press de sombra interna de un botón canónico.
- **Press genérico:** `.fx-press` para controles y enlaces que no usen `.fx-btn-*`; `.fx-pressable` para tarjetas y filas. Ambos tienen `scale(0.98)` a 120 ms y se desactivan con `prefers-reduced-motion`.
- **Foco global:** la regla `:where(button, a[href], [role="button"], [role="switch"], summary, input, select, textarea):focus-visible` de `tokens.css` es el fallback. No sustituirla por `outline-none`.
- **Disabled:** 40 % de opacidad + `cursor: not-allowed`; ningún hover debe alcanzar a un control deshabilitado (`:hover:not(:disabled)`).
- **Primitivas React:** [`Button.tsx`](../../src/components/ui/Button.tsx) e [`IconButton.tsx`](../../src/components/ui/IconButton.tsx) renderizan `<button type="button">`. El spread de props va **antes** de `type` y `disabled`: un caller no puede convertir el botón en `submit` ni saltarse el estado bloqueado. En la rama `<a>` de `Button`, solo se reenvían `href`, `className`, `aria-label`, `aria-busy`, `aria-disabled`, `tabIndex` y el guard de `onClick`; props arbitrarias de ancla (`target`, `rel`, `data-*`) **no** se reenvían hoy (ver JSDoc del componente antes de depender de ellas).
- **Touch targets:** mínimo 44×44 px; un control visual de 36 px solo se acepta si extiende su área táctil a 44 px.

---

## 6. Verificación Obligatoria

Antes de declarar terminado cualquier cambio de interacción:

```bash
# Guardrail de deuda: falla si un archivo supera su baseline o si un archivo nuevo introduce slop.
pnpm audit:interactions

# Tipado y plantillas: 0 errores, 0 warnings, 0 hints.
pnpm check

# Empaquetado SSR para Cloudflare.
pnpm build
```

**Política del baseline:** [`scripts/interaction-baseline.json`](../../scripts/interaction-baseline.json) es un trinquete (*ratchet*): la deuda puede bajar, nunca subir. Un archivo nuevo debe entrar con 0 violaciones. **No se edita a mano**: se regenera con `node scripts/audit-interactions.mjs --update` únicamente después de una limpieza revisada. El delta del baseline es el punto de revisión manual del PR.

No hay CI configurado en este repositorio (no existe `.github/`); los tres comandos son la puerta local obligatoria y pueden conectarse a CI sin cambiar el contrato.

---

## 7. Checklist de un Componente Nuevo

- [ ] Tiene rest, hover (solo pointer), active, focus-visible y disabled; loading si es asíncrono.
- [ ] El press dura 120 ms y cambia una sola propiedad: sombra interna en botón, `scale(0.98)` en tarjeta/fila.
- [ ] El hover no mueve ni eleva nada en Tier A/B y no escala imágenes.
- [ ] El foco se ve en claro y oscuro, con anillo de 2 px y offset 2 px.
- [ ] El target táctil mide al menos 44×44 px.
- [ ] No usa `transition-all`, `ios-press-bounce` ni `focus:outline-none` sin sustituto.
- [ ] No tiene animación infinita decorativa ni `will-change` en listas.
- [ ] Funciona con teclado (Tab, Enter, Space, Esc) y con lector de pantalla.
- [ ] Funciona con `prefers-reduced-motion`, incluido el 40 % de disabled.
- [ ] `pnpm audit:interactions`, `pnpm check` y `pnpm build` en verde.

---

## 8. Referencias

- [`design/exports/Motion.html`](../../design/exports/Motion.html) — escala de tiempos, easing y regla "si el ojo lo nota entero, es demasiado".
- [`design/exports/Button System.html`](../../design/exports/Button%20System.html) — press con sombra interna, hover 120 ms, foco de 2 px y disabled al 40 %.
- [`design/exports/Card Language.html`](../../design/exports/Card%20Language.html) — tarjeta interactiva `idle → pressed` con `scale(0.98)` y sin sombra.
- [`docs/auditoria_microinteracciones_hover_click.md`](../../docs/auditoria_microinteracciones_hover_click.md) — diagnóstico, inventario y matriz de QA (`AUD-FLX-MOTION-001`).
- [`docs/plans/2026-11-05-interaction-contract.md`](../../docs/plans/2026-11-05-interaction-contract.md) — plan de erradicación por fases.
- [`src/styles/tokens.css`](../../src/styles/tokens.css) — tokens, `.fx-btn-*`, `.fx-press`, `.fx-pressable`, foco global y `prefers-reduced-motion`.
