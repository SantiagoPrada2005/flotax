# Rule: Paleta de Colores Canónica & Gobernanza Cromática (FlotaX)

**Código:** RUL-FLX-003  
**Fuente de Verdad Cromática:** Paleta Canónica Movix/FlotaX  
**Ámbito:** Todas las interfaces (`src/pages/**`), componentes (`src/components/**`), estilos (`src/styles/tokens.css`) y exports de diseño.

---

## 1. Regla Suprema de Fidelidad Cromática (Palette Invariance)

> [!IMPORTANT]
> **AUNQUE LOS DISEÑOS O EXPORTS EN `design/` O PENCIL CONTENGAN COLORES DIFERENTES (ej. fondos cálidos `#F6F5F1`, acentos naranjas `#FF5A1F`, grises cálidos `#6E6C66`, etc.), ES ESTRICTAMENTE OBLIGATORIO RESPETAR Y APLICAR LA PALETA CANÓNICA ESPECIFICADA AQUÍ.**
> 
> Ningún componente o vista puede introducir colores fuera de esta paleta para fondos, superficies, bordes, textos principales y acentos primarios de marca.

---

## 2. Los 5 Colores Canónicos de la Paleta

| Nombre Semántico | Hex | Rol y Uso Exclusivo en la Arquitectura | Clase Tailwind v4 |
| :--- | :--- | :--- | :--- |
| **Light Gray / Canvas** | `#EDEDED` | Superficie base, canvas general, fondo de inputs, contenedores secundarios claros | `bg-surface-canvas`, `bg-brand-50` |
| **Cool Gray / Border** | `#9CA3AF` | Bordes sutiles, outlines, bordes de inputs y tarjetas, divisores, texto secundario suave | `border-border-subtle`, `text-brand-300` |
| **Slate / Muted Text** | `#4B5563` | Texto de lectura secundaria, placeholders, subtítulos descriptivos, labels secundarios | `text-text-muted`, `text-brand-500` |
| **Deep Charcoal / Interactive** | `#1F2937` | Botones de acción principal (CTA), cards oscuras destacadas, íconos y textos semibold | `bg-brand-secondary`, `bg-brand-700` |
| **Obsidian Dark / Brand Core** | `#111827` | Fondos de alto contraste, texto principal de títulos (`h1`, `h2`), color primario de marca | `text-brand-primary`, `bg-brand-900` |

---

## 3. Mapeo Canónico de Tokens (`src/styles/tokens.css`)

Todo componente debe consumir tokens semánticos definidos bajo `@theme` en Tailwind CSS v4:

```css
@theme {
  /* Escala de la paleta canónica */
  --color-palette-100: #EDEDED;
  --color-palette-300: #9CA3AF;
  --color-palette-500: #4B5563;
  --color-palette-700: #1F2937;
  --color-palette-900: #111827;

  /* Asignación semántica directa */
  --color-brand-primary: #111827;
  --color-brand-secondary: #1F2937;
  --color-brand-accent: #1F2937;

  --color-surface-canvas: #EDEDED;
  --color-surface-card: #FFFFFF;
  --color-surface-elevated: #EDEDED;
  --color-surface-sidebar: #EDEDED;

  --color-border-subtle: #9CA3AF;
  --color-text-muted: #4B5563;
  --color-text-subtle: #9CA3AF;
}
```

---

## 4. Reglas de Aplicación en UI & Mobile-First

1. **Jerarquía Visual de Textos**:
   - Títulos protagónicos (`font-display font-bold`): usar `#111827` (`text-brand-primary`).
   - Subtítulos y placeholders: usar `#4B5563` (`text-text-muted`).
   - Textos de labels o notas sutiles: usar `#111827` con peso semibold o `#4B5563`.
2. **Superficies e Inputs**:
   - Contenedores e inputs con fondo `#EDEDED` deben tener outline/borde de `1px solid #9CA3AF` y `rounded-[12px]`.
3. **Botones de Acción (CTAs)**:
   - Botón principal de login/submit: fondo `#1F2937`, texto blanco `#FFFFFF`, con hover sutil (`hover:bg-brand-primary`).
   - Botón social o secundario: fondo `#EDEDED`, borde `#9CA3AF`, texto `#111827`.
4. **Mobile First**:
   - Todo touch-target interactivo (inputs, botones, links, checkboxes) debe respetar el mínimo de **44x44px** y `font-size: 16px` en mobile para prevenir zoom de WebKit.
