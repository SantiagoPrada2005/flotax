# **ADR: Arquitectura de Estilos y Adopción de Tailwind CSS v4 con Vite**

# **Ficha Técnica de la Decisión Arquitectónica**

| Campo | Detalle |
| :--- | :--- |
| **Código** | ADR-ALQ-003 |
| **Título** | Adopción de Tailwind CSS v4 con `@tailwindcss/vite` y Sistema de Tokens en 3 Capas |
| **Estado** | **Aprobado / Estándar de Ingeniería** |
| **Fecha** | 2026-10-01 |
| **Responsables** | Santiago Prada, Julián, Javier |
| **Documento Padre** | [PRJ_arquitectura_y_stack_tecnico_alquiler_vehiculos.md](file:///Users/santiago/proyectos/movix/docs/PRJ_arquitectura_y_stack_tecnico_alquiler_vehiculos.md) |
| **Regla de Gobernanza** | [.agents/rules/tailwind-v4-styling-governance.md](file:///Users/santiago/proyectos/movix/.agents/rules/tailwind-v4-styling-governance.md) |
| **Etiquetas** | `#estilos` `#tailwind-v4` `#vite` `#astro` `#react19` `#design-tokens` `#mobile-ergonomics` |

---

## 1. Contexto y Planteamiento del Problema

El sistema de alquiler de vehículos está diseñado como un **monolito serverless** sobre **Astro 7+** y **Vite**, desplegado en la red perimetral de **Cloudflare Pages / Workers**. Su interfaz de usuario responde a un modelo híbrido:
1. **Shell y páginas SSR en Astro (`.astro`):** Catálogo rápido, vistas administrativas protegidas y renderizado en el edge.
2. **Islas interactivas en React 19 (`.tsx`):** Registro fotográfico/video pericial para check-in/out, cálculos reactivos de tarifas, calendario interactivo de disponibilidad y datagrid operativo de cartera.

Se requería definir el estándar de estilizado resolviendo la disyuntiva entre **CSS Puro (Scoped en Astro + CSS Modules en React)** frente a **Tailwind CSS v4** compilado a través del motor Vite, asegurando:
- Consistencia estética absoluta sin duplicación de sintaxis ni cambio de contexto entre archivos `.astro` y `.tsx`.
- Cero sobrecarga en el bundle servido en el Edge (Cloudflare Pages).
- Velocidad de desarrollo alta para un equipo ágil de 3 ingenieros administrando flota tanto en escritorio como en dispositivos móviles de campo.
- Blindaje inviolable de ergonomía móvil (regla de los 16px en iOS WebKit y touch targets de 44x44px).

---

## 2. Opciones Evaluadas

### Opción A: CSS Puro (Astro Scoped Styles + CSS Modules en React + Custom Properties)
* **Descripción:** Utilizar el bloque `<style>` integrado de Astro para componentes de servidor y archivos `.module.css` para cada isla de React 19, compartiendo variables globales en `tokens.css`.
* **Desventajas Identificadas:**
  - **Fractura de paradigmas:** El equipo debe gestionar dos formas de escribir estilos (scoped tags en Astro vs. modules importados en React).
  - **Fatiga de nombrado de clases (Naming Fatigue):** Creación innecesaria de nombres abstractos (BEM) para componentes efímeros de UI.
  - **Riesgo de CSS huérfano:** Con el tiempo, estilos no utilizados en módulos de CSS no siempre son purgados de manera óptima por el empaquetador, afectando el tamaño del bundle.
  - **Fricción en variantes interactivas:** Mayor código boilerplate para estados como `:hover`, `:focus-visible`, `:disabled` y consultas de medios responsivas.

### Opción B: Tailwind CSS v4 impulsado nativamente por `@tailwindcss/vite` (Opción Seleccionada)
* **Descripción:** Incorporar el nuevo compilador nativo de Tailwind v4 directamente en la tubería de Vite, configurando los tokens de diseño dentro del propio CSS (`@theme`) sin archivo `tailwind.config.js`.
* **Ventajas Identificadas:**
  - **Lenguaje ubicuo:** La misma paleta de utilidades opera idénticamente en componentes de Astro y en islas de React 19.
  - **Compilación ultra-eficiente:** Tailwind v4 utiliza Rust y Lightning CSS mediante `@tailwindcss/vite`, entregando HMR instantáneo y empaquetado directo sin la lentitud de capas PostCSS obsoletas.
  - **Purga y dead-code elimination estricta:** Solo las clases empleadas en el código fuente se empaquetan en el CSS final de Cloudflare Pages.
  - **Control por tokens centralizados:** La directiva `@theme` permite mapear variables CSS estándar directamente a clases semánticas (`bg-brand-primary`, `rounded-touch`).

---

## 3. Matriz Comparativa y Decisión

| Criterio | Opción A: CSS Puro / Modules | Opción B: Tailwind CSS v4 con Vite | Veredicto |
| :--- | :---: | :---: | :---: |
| **Cohesión Astro + React 19** | Baja (doble convención) | Máxima (unificada) | **Tailwind v4** |
| **Tiempo de Compilación / HMR** | Medio | Instantáneo (Rust / Vite plugin) | **Tailwind v4** |
| **Mantenibilidad en Equipo Pequeño** | Media (alto boilerplate) | Alta (estilos declarativos en sitio) | **Tailwind v4** |
| **Gobernanza de Tokens** | Alta (CSS Variables) | Alta (`@theme` en CSS puro) | **Empate técnico** |
| **Bundle Final en Cloudflare Edge** | Variable (riesgo de fugas) | Mínimo y podado en build | **Tailwind v4** |

**Decisión:** Se aprueba formalmente el uso de **Tailwind CSS v4** como motor de estilos oficial del proyecto, sujeto a una **Arquitectura en 3 Capas**.

---

## 4. Estructura Arquitectónica en 3 Capas (Tiered Styling)

Para evitar la anarquía de utilidades arbitrarias o la degradación del sistema visual, el código debe respetar la separación por capas:

```
src/
├── styles/
│   └── tokens.css         # Tier 0: Fuente de la verdad (Tokens @theme + Blindaje Universal)
├── components/
│   ├── ui/                # Tier 1: Primitivas agnósticas Astro (Button, Card, Input)
│   └── react/             # Tier 2: Islas reactivas React 19 (Formularios, Calendarios, Tablas)
```

### Capa 0: Tokens y Blindaje de Plataforma (`src/styles/tokens.css`)
Contiene los valores semánticos de diseño y las reglas globales de plataforma que **no deben delegarse a clases individuales**:
1. Declaración `@theme` de Tailwind v4 (colores de marca, superficies, radios, fuentes tipográficas).
2. **Blindaje de inputs móviles:** Regla `font-size: 16px !important` para dispositivos móviles (`max-width: 768px`) que erradica el auto-zoom destructivo de WebKit en iOS.
3. **Márgenes de scroll:** `scroll-margin` en campos de texto para evitar que el teclado virtual tape los controles activos.

### Capa 1: Primitivas de UI (`src/components/ui/`)
Componentes base desarrollados en Astro (`.astro`):
- Componen las utilidades de Tailwind v4 vinculadas a los tokens.
- Cumplen la regla de accesibilidad táctil: dimensiones mínimas de interacción de **44x44px**.
- Aceptan extensiones de clase mediante `class:list={[defaultClasses, Astro.props.class]}`.

### Capa 2: Islas Interactivas React 19 (`src/components/react/`)
Componentes interactivos de alta complejidad (`.tsx`):
- Emplean la misma nomenclatura utilitaria que la Capa 1.
- Queda prohibida la creación de archivos `*.module.css` o el uso de librerías CSS-in-JS en tiempo de ejecución.

---

## 5. Implementación Técnica en Vite y Astro

### Dependencias requeridas:
```bash
pnpm add tailwindcss @tailwindcss/vite
```

### Configuración en `astro.config.mjs`:
```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  adapter: cloudflare(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()]
  }
});
```

### Definición canónica de tokens en `src/styles/tokens.css`:
```css
@import "tailwindcss";

@theme {
  --color-brand-primary: #131211;
  --color-brand-accent: #2563eb;
  --color-status-success: #16a34a;
  --color-status-warning: #f59e0b;
  --color-status-danger: #dc2626;

  --color-surface-canvas: #f1f0ec;
  --color-surface-card: #ffffff;
  --color-surface-elevated: #fbfbf9;
  --color-border-subtle: #e5e5e0;

  --font-display: "Space Grotesk", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  --radius-touch: 20px;
  --radius-card: 16px;
  --radius-input: 12px;
}

@media screen and (max-width: 768px) {
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]),
  textarea,
  select {
    font-size: 16px !important;
  }
}

input, textarea, select {
  scroll-margin-top: 80px;
  scroll-margin-bottom: 80px;
}
```

---

## 6. Prohibiciones y Modos de Falla Mitigados

1. **Cero clases arbitrarias de color y espaciado:** Prohibido el uso de `bg-[#131211]`, `w-[1376px]` o `p-[64px]`. Se deben emplear tokens o la escala estándar de Tailwind.
2. **Cero fragmentación de módulos:** Prohibido mezclar Tailwind con archivos CSS Modules aislados en React.
3. **Cero dispersión de reglas de accesibilidad:** Las reglas ergonómicas críticas para el teléfono móvil se centralizan en la Capa 0 y se auditan con `pnpm check`.
