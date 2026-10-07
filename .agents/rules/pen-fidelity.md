# Rule: Pen Design Fidelity & Visual Signature Governance (FlotaX / Movo)

**Código:** RUL-FLX-002  
**Directorio Fuente de Verdad:** [`design/exports/`](file:///Users/santiago/proyectos/movix/design/exports) (HTML Exports canónicos de Pencil) y [`design/design.pen`](file:///Users/santiago/proyectos/movix/design/design.pen)  
**Ámbito:** Todas las pantallas (`src/pages/**`), componentes agnósticos (`src/components/ui/**`), islas interactivas (`src/components/react/**`) y estilos (`src/styles/tokens.css`).  

---

## 1. Mandato Estricto de Inspección en `design/exports/`

Antes de escribir, maquetar o modificar cualquier componente, pantalla, tarjeta, modal o layout en FlotaX, **el agente o desarrollador DEBE consultar estrictamente los archivos exportados de Pencil ubicados en [`design/exports/`](file:///Users/santiago/proyectos/movix/design/exports/)**.

1. **Localizar el Export Canónico:**
   - La fidelidad visual ya no se infiere ni se adivina: se extrae directamente del archivo HTML exportado correspondiente en `design/exports/*.html`.
   - Ejemplos de mapeo canónico:
     - **Botones y Acciones:** [`design/exports/Button System.html`](file:///Users/santiago/proyectos/movix/design/exports/Button%20System.html) y [`design/exports/Botones.html`](file:///Users/santiago/proyectos/movix/design/exports/Botones.html).
     - **Entradas y Formularios:** [`design/exports/input-system.html`](file:///Users/santiago/proyectos/movix/design/exports/input-system.html), [`design/exports/Selects.html`](file:///Users/santiago/proyectos/movix/design/exports/Selects.html), [`design/exports/Check · Radio · Switch.html`](file:///Users/santiago/proyectos/movix/design/exports/Check%20·%20Radio%20·%20Switch.html).
     - **Tarjetas de Vehículo y Flota:** [`design/exports/Group TARJETA DE VEHÍCULO.html`](file:///Users/santiago/proyectos/movix/design/exports/Group%20TARJETA%20DE%20VEH%C3%8DCULO.html), [`design/exports/Group TARJETA COMPACTA.html`](file:///Users/santiago/proyectos/movix/design/exports/Group%20TARJETA%20COMPACTA.html), [`design/exports/Group LISTA DE VEHÍCULOS.html`](file:///Users/santiago/proyectos/movix/design/exports/Group%20LISTA%20DE%20VEH%C3%8DCULOS.html).
     - **Flujos de Reserva y Pagos:** [`design/exports/Flujo de reserva.html`](file:///Users/santiago/proyectos/movix/design/exports/Flujo%20de%20reserva.html), [`design/exports/C06 Reservas  Alquileres.html`](file:///Users/santiago/proyectos/movix/design/exports/C06%20Reservas%20%20Alquileres.html), [`design/exports/Group MÉTODOS DE PAGO — 02.html`](file:///Users/santiago/proyectos/movix/design/exports/Group%20M%C3%89TODOS%20DE%20PAGO%20%E2%80%94%2002.html).
     - **Calendarios y Fechas:** [`design/exports/Fecha  Hora.html`](file:///Users/santiago/proyectos/movix/design/exports/Fecha%20%20Hora.html), [`design/exports/E Range Picker  States.html`](file:///Users/santiago/proyectos/movix/design/exports/E%20Range%20Picker%20%20States.html), [`design/exports/Vista Semanal — Calendario.html`](file:///Users/santiago/proyectos/movix/design/exports/Vista%20Semanal%20%E2%80%94%20Calendario.html).
     - **Badges y Estados:** [`design/exports/Badges Status.html`](file:///Users/santiago/proyectos/movix/design/exports/Badges%20Status.html), [`design/exports/Row type badges.html`](file:///Users/santiago/proyectos/movix/design/exports/Row%20type%20badges.html).
     - **Filtros y Navegación:** [`design/exports/Barra de filtros.html`](file:///Users/santiago/proyectos/movix/design/exports/Barra%20de%20filtros.html), [`design/exports/Navegación.html`](file:///Users/santiago/proyectos/movix/design/exports/Navegaci%C3%B3n.html), [`design/exports/App Bar.html`](file:///Users/santiago/proyectos/movix/design/exports/App%20Bar.html).
     - **Vistas Móviles y Ergonomía:** [`design/exports/Mobile.html`](file:///Users/santiago/proyectos/movix/design/exports/Mobile.html), [`design/exports/Mobile-First.html`](file:///Users/santiago/proyectos/movix/design/exports/Mobile-First.html), [`design/exports/Claves móviles.html`](file:///Users/santiago/proyectos/movix/design/exports/Claves%20m%C3%B3viles.html).

2. **Extracción Fiel de Estructura y Microcopy:**
   - Extraer las proporciones, jerarquía tipográfica, radios de curvatura (`rounded-[20px]`, `rounded-[16px]`, `rounded-[12px]`, `rounded-full`), espaciados internos y etiquetas exactas desde el HTML exportado.

3. **Traducción Obligatoria a Tokens Semánticos de Tailwind v4:**
   - **Regla de oro:** No copiar ciegamente colores hex crudos (como `#131211`, `#2563EB`, `#FFFFFF`, `#F1F0EC`) ni estilos inline en los componentes Astro/React.
   - Todo valor visual extraído del export debe mapearse al token semántico de `tokens.css` y las reglas de [`.agents/rules/tailwind-v4-styling-governance.md`](file:///Users/santiago/proyectos/movix/.agents/rules/tailwind-v4-styling-governance.md):
     - Fondo canvas `#F1F0EC` / `#FBFBF9` → `bg-surface-canvas` / `bg-surface-elevated`
     - Fondo tarjetas `#FFFFFF` → `bg-surface-card`
     - Texto oscuro `#131211` → `text-brand-primary`
     - Bordes `#E5E4DF` / `#E5E5E0` → `border-border-subtle`
     - Accento `#2563EB` → `text-brand-accent` / `bg-brand-accent`
     - Tipografías: `font-display` (Space Grotesk), `font-body` (Inter), `font-mono` (JetBrains Mono / Geist Mono).

---

## 2. Política de Cero Invención Visual (Zero Generic Fallback)

Queda estrictamente prohibido:
- **Inventar componentes desde cero** o usar patrones visuales genéricos predeterminados cuando existe un archivo correspondiente en `design/exports/`.
- **Alterar el lenguaje visual de tarjetas**: Las tarjetas de vehículo, resúmenes y estados deben respetar las proporciones, la disposición de chips de estado, métricas y botones observados en `design/exports/Group TARJETA DE VEHÍCULO.html` y exports afines.
- **Modificar radios de curvatura arbitrariamente**: FlotaX utiliza una identidad táctil específica (chips circulares de 100px, badges de 20px, tarjetas de 16-20px e inputs de 12px).

---

## 3. Protocolo de Inspección Pre-Implementación (Paso a Paso)

Antes de crear o modificar una vista o componente:
1. **Paso 1:** Identificar el elemento a implementar (ej. Selector de rango de fechas para alquiler).
2. **Paso 2:** Buscar en `design/exports/` el export relevante (ej. `E Range Picker  States.html` o `Fecha  Hora.html`).
3. **Paso 3:** Leer el HTML exportado utilizando `view_file` para inspeccionar la jerarquía DOM, clases Tailwind utilizadas por el diseñador y estados interactivos (hover, active, disabled, selected).
4. **Paso 4:** Implementar el componente en Astro o React 19 usando clases utilitarias de Tailwind v4 enlazadas a los tokens del proyecto.
5. **Paso 5:** Verificar que la apariencia sea idéntica a la maqueta exportada, cumpliendo al mismo tiempo con la accesibilidad táctil móvil (mínimo 44x44px).

---

## 4. Checklist de Aprobación de Fidelidad Visual

Antes de dar por completado cualquier cambio visual:
- [ ] ¿Se inspeccionó el archivo correspondiente en `design/exports/*.html` antes de programar?
- [ ] ¿Se respetaron los textos, etiquetas y microcopy presentes en el export?
- [ ] ¿Se mapearon todos los colores y radios a tokens semánticos de Tailwind v4 en lugar de usar valores hex quemados?
- [ ] ¿Los botones, inputs y selectores respetan los estados mostrados en `design/exports/Button System.html` e `input-system.html`?
- [ ] ¿Pasa la verificación técnica con `pnpm check` (0 errores, 0 warnings)?
