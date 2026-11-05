# Rule: Gobernanza del Sistema de Temas Canónico (Light / Dark Mode & Anti-FOUC)

**Código:** RUL-FLX-023  
**Ámbito:** Todas las interfaces (`src/pages/**`), layouts (`src/layouts/**`), componentes Astro y React 19 (`src/components/**`), lógica de temas (`src/lib/theme/**`) y estilos (`src/styles/tokens.css`).  
**Estado:** Activo y de estricto cumplimiento para cualquier agente o desarrollador.

---

## 1. Misión y Principio de Invarianza

FlotaX implementa una arquitectura dual de temas (Modo Claro y Modo Oscuro) basada estrictamente en la paleta canónica de 5 colores neutros más el acento azul canónico `#2D6BFF` y los códigos semánticos de estado (Ámbar, Esmeralda, Rosa).

> [!IMPORTANT]
> **REGLA ABSOLUTA DE CONTRASTE Y PROHIBICIÓN DE `!important` INDISCRIMINADO:**  
> 1. Queda estrictamente prohibido introducir reglas globales en CSS que fuercen colores de texto o fondos con `!important` sobre clases genéricas (ej. `html.dark .text-[#111827] { color: #ededed !important; }` o `html.dark .bg-white { background-color: #1f2937 !important; }`).  
> 2. Todo componente interactivo, píldora activa, badge de estado y panel debe garantizar legibilidad óptima y contraste WCAG 2.2 AA / AAA de forma contextual y simétrica.  
> 3. Las píldoras o botones activos que inviertan sus colores en modo oscuro (ej. fondo blanco con texto oscuro) deben preservar su contraste sin ser destruidos por cascadas globales.

---

## 2. Los 5 Colores Canónicos y su Proyección Dual

| Rol Semántico | Modo Claro (`[data-theme="light"]`) | Modo Oscuro (`html.dark`, `[data-theme="dark"]`) | Justificación y Regla de Uso |
| :--- | :--- | :--- | :--- |
| **Canvas Base** | `#EDEDED` | `#111827` | Fondo estructural de la página y layout. |
| **Superficie de Tarjeta** | `#FFFFFF` | `#1F2937` | Contenedores principales, tarjetas bento y modales. |
| **Texto Primario** | `#111827` | `#EDEDED` | Títulos, métricas principales y nombres de unidades. |
| **Texto Secundario** | `#4B5563` | `#D1D5DB` / `#E5E7EB` | Descripciones, metadatos y etiquetas secundarias. |
| **Borde / Divisor** | `rgba(156,163,175,0.35)` | `rgba(156,163,175,0.22)` | Separadores sutiles y bordes de contorno. |
| **Acento Canónico** | `#2D6BFF` | `#2D6BFF` | Halo pericial, curvas de rendimiento y focos de atención. |

---

## 3. Arquitectura Anti-FOUC (Flash of Unstyled/Incorrect Theme)

Para erradicar por completo el parpadeo blanco inicial en recargas o navegaciones:

1. **Inyección Inmediata en el Primer Byte**:
   - En `<html ...>` se debe renderizar directamente el atributo `style="background-color: ...; color-scheme: ..."` según la cookie de sesión o el encabezado `sec-ch-prefers-color-scheme`.
   - El script `<script is:inline>` debe ubicarse al inicio absoluto de `<head>`, antes de cualquier script diferido o stylesheet, ejecutando de forma síncrona:
     ```js
     var t = localStorage.getItem('flotax_theme') || 'sistema';
     var d = t === 'oscuro' || (t === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches);
     document.documentElement.classList.toggle('dark', d);
     document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light');
     document.documentElement.style.backgroundColor = d ? '#111827' : '#ededed';
     ```
2. **Sincronización SPA (ClientRouter)**:
   - Toda transición SPA de Astro debe registrar la sincronización en los eventos `astro:after-swap` y `astro:page-load` para mantener la continuidad cromática.
3. **Meta Theme-Color Reactivo**:
   - `<meta name="theme-color">` debe alternar sincrónicamente entre `#EDEDED` y `#111827`.

---

## 4. Selector Oscuro Canónico en Tailwind CSS v4

En Tailwind CSS v4 (`@tailwindcss/vite`), la directiva canónica obligatoria al inicio de `src/styles/tokens.css` es:

```css
@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));
```

Esto garantiza que las utilidades `dark:bg-...`, `dark:text-...`, `dark:border-...` respondan inmediatamente tanto al modo manual (clase `.dark` o `data-theme="dark"`) como a las preferencias del sistema.

---

## 5. Regla de Preservación de Vistas Previas

Cuando un componente contenga vistas previas o mockups temáticos fijos (por ejemplo, en la selección de apariencia de `ConfiguracionIsland.tsx`):
- Se debe marcar el contenedor con `data-preserve-theme="light"` o `data-preserve-theme="dark"`.
- Los estilos globales de fallback de `tokens.css` deben incluir el selector de exclusión `:not([data-preserve-theme]):not([data-preserve-theme] *)` para no mutar componentes diseñados deliberadamente para exhibir el aspecto opuesto.

---

## 6. Transición Fluida Blanco/Azul Pericial (View Transitions)

El cambio manual de tema debe ejecutarse mediante la API nativa de View Transitions cuando esté disponible:
```typescript
if (!reduceMotion && 'startViewTransition' in document) {
  document.documentElement.classList.add('flotax-theme-transitioning');
  const transicion = document.startViewTransition(() => mutarDOM());
  transicion.finished.finally(() => {
    document.documentElement.classList.remove('flotax-theme-transitioning');
  });
}
```
La animación en CSS debe proyectar el halo azul canónico `#2D6BFF` sin desfase de layout ni parpadeos destructivos.

---

## 7. Gobernanza Canónica de Botones y Controles Interactivos (RUL-FLX-023-BTN)

Para evitar la regresión recurrente de botones con fondos claros y textos blancos o ilegibles en modo oscuro:

### 7.1 Variables Semánticas Centralizadas de Botones
FlotaX dispone en `src/styles/tokens.css` de variables dedicadas para las 4 variantes canónicas:

| Rol de Botón | Variable Semántica | Modo Claro | Modo Oscuro |
| :--- | :--- | :--- | :--- |
| **Primario (Fondo)** | `--fx-btn-primary-bg` | `#111827` | `#EDEDED` |
| **Primario (Texto)** | `--fx-btn-primary-text` | `#EDEDED` | `#111827` |
| **Primario (Hover)** | `--fx-btn-primary-hover-bg` | `#1F2937` | `#FFFFFF` |
| **Secundario (Fondo)** | `--fx-btn-secondary-bg` | `rgba(237,237,237,0.75)` | `rgba(255,255,255,0.10)` |
| **Secundario (Texto)** | `--fx-btn-secondary-text` | `#111827` | `#EDEDED` |
| **Secundario (Hover)** | `--fx-btn-secondary-hover-bg` | `#EDEDED` | `rgba(255,255,255,0.18)` |
| **Outline (Fondo)** | `--fx-btn-outline-bg` | `#FFFFFF` | `rgba(31,41,55,0.60)` |
| **Outline (Texto)** | `--fx-btn-outline-text` | `#111827` | `#EDEDED` |
| **Outline (Hover)** | `--fx-btn-outline-hover-bg` | `#EDEDED` | `rgba(255,255,255,0.12)` |
| **Ghost (Fondo)** | `--fx-btn-ghost-bg` | `transparent` | `transparent` |
| **Ghost (Hover)** | `--fx-btn-ghost-hover-bg` | `rgba(17,24,39,0.06)` | `rgba(255,255,255,0.08)` |
| **Deshabilitado** | `--fx-btn-disabled-bg / text` | `rgba(156,163,175,0.20)` | `rgba(255,255,255,0.05)` |

### 7.2 Reutilización de Clases y Componentes
1. **Componentes Canónicos**:
   - En islas React 19: consumir siempre `<Button variant="primary|secondary|outline|ghost">` desde `@/components/ui/Button`.
   - En plantillas Astro: consumir `<Button variant="...">` desde `@/components/ui/Button.astro`.
2. **Clases de Utilidad Canónicas**:
   - `.fx-btn-primary`, `.fx-btn-secondary`, `.fx-btn-outline`, `.fx-btn-ghost`.
   - Todos los SVGs dentro de botones deben heredar color con `currentColor`.
3. **Mapeo de Clases Locales cuando no se use el componente**:
   - Cuando se definan botones con clases Tailwind directas, es **estrictamente obligatorio** proveer la variante oscura explícita:
     ```tsx
     // Correcto:
     className="border border-[#9CA3AF]/45 bg-[#EDEDED]/55 text-[#111827] hover:bg-[#EDEDED] dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/20 dark:hover:text-white"
     ```

---

## 8. Los 9 Mandamientos de Gobernanza Temática (Obligatorios para Agentes y Desarrolladores)

Cualquier agente de IA o desarrollador que cree o modifique una página, formulario, botón, tarjeta o modal debe cumplir estrictamente:

1. **PROHIBIDO MODIFICAR EL MODO CLARO**: El modo claro es canónico y perfecto. No alterar sus colores, contrastes ni estilos.
2. **Utilizar las variables semánticas existentes**: Consumir `--fx-bg-*`, `--fx-text-*`, `--fx-border-*` y `--fx-btn-*`.
3. **Reutilizar componentes canónicos**: Preferir `<Button>`, `<Card>`, modales y badges de `@/components/ui/`.
4. **Cero colores hardcodeados sin simetría**: Si se aplica `bg-white` o `bg-[#EDEDED]`, debe acompañarse de `dark:bg-[#1F2937]` o `dark:bg-white/10` y sus correspondientes colores de texto contrastados.
5. **Definir los 5 estados de interacción**: Normal, hover, active, focus y disabled deben tener contraste probado WCAG AAA en ambos temas.
6. **Iconos siempre contrastados**: Todo `<svg>` en botones o controles debe usar `currentColor` o definir su variante `dark:text-...` de modo que nunca desaparezca.
7. **No usar parches globales destructivos**: Prohibido agregar reglas globales con `!important` que rompan componentes con contraste intencional.
8. **Crear nuevas variables centralizadas**: Si una nueva funcionalidad exige un nuevo rol de color, debe añadirse a `tokens.css` para **ambos temas** y registrarse en este documento.
9. **Doble verificación obligatoria**: Todo trabajo debe pasar `pnpm check` (0 errores, 0 warnings, 0 hints) y `pnpm build` antes de finalizar.


