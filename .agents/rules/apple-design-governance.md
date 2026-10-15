# Rule: Apple Human Interface Guidelines (HIG) & Apple Software Aesthetics Governance

**Código:** RUL-FLX-021  
**Proyecto:** FlotaX — Sistema de Alquiler y Gestión de Flota de Vehículos  
**Hereda de:** [`.agents/skills/apple-design/SKILL.md`](file:///Users/santiago/proyectos/movix/.agents/skills/apple-design/SKILL.md) y [`.agents/skills/apple-design/references/`](file:///Users/santiago/proyectos/movix/.agents/skills/apple-design/references)  
**Ámbito:** Obligatorio al concebir, estructurar, diseñar o refactorizar cualquier componente en `src/components/`, vistas en `src/pages/` y layouts en `src/layouts/`.

---

## 1. Misión de Diseño: Estética de Software Apple en FlotaX

FlotaX debe lucir, sentirse y operar con la calidad, pulido y sobriedad de los productos de software de Apple (iOS, iPadOS, macOS):
- **Claridad, Deferencia y Profundidad**: La interfaz cede el protagonismo al contenido operativo (vehículos, reservas, caja, inspecciones) mediante capas visuales lúcidas, tipografía impecable y espacios generosos.
- **Armonía con la Paleta Canónica FlotaX**: La estética de Apple se materializa a través de la paleta neutra canónica (`#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`), adoptando el sistema de elevación por superficies de Apple (Canvas base -> Secondary Card -> Elevated Floating Layer).

---

## 2. Los 7 Mandamientos de Apple Design para Componentes FlotaX

### 1. Materiales, Translucidez & Liquid Glass (`materials.md`, `liquid-glass.md`)
- **Capas Funcionales Translúcidas**: Barras de navegación superior (`TopBar`), cápsula de navegación inferior (`BottomNav`), toolbars y encabezados flotantes deben usar `backdrop-blur` (`backdrop-blur-xl` / `backdrop-blur-2xl`) con fondos semitransparentes (`bg-white/80` en temas claros o `bg-[#1F2937]/80` / `bg-[#111827]/80` en temas oscuros).
- **Bordes de Luz Submilimétricos**: En lugar de bordes negros o gruesos, usar bordes sutiles y traslúcidos que simulen el reflejo de luz en cristal: `border border-white/20 dark:border-white/10` o `inset 0 1px 1px 0 rgba(255,255,255,0.8)`.
- **Prohibido el Blur en Contenido**: El desenfoque y los materiales translúcidos pertenecen **únicamente** a la capa funcional flotante (navigation, modales, sheets, toolbars), nunca como fondo de texto de lectura o tarjetas de contenido denso.

### 2. Radio de Curvatura Continuo & Squircles (`layout.md`, `buttons.md`)
- Apple no usa esquinas redondeadas circulares rígidas ni esquinas puntiagudas. Emplea curvas de radio continuo (squircles / superelipses).
- **Jerarquía Concéntrica de Radios**:
  - Contenedores modales / Paneles de fondo: `rounded-[24px]` o `rounded-3xl` (24px a 32px).
  - Tarjetas principales (Vehículo, Alquiler): `rounded-[20px]` o `rounded-2xl` (16px a 20px).
  - Inputs, botones y controles internos: `rounded-[14px]` o `rounded-xl` (12px a 14px).
  - Badges, segmented toggles y avatares: `rounded-full` (pastilla continua).
  - *Regla concéntrica*: El radio del contenedor externo siempre debe ser mayor que el de los elementos hijos para evitar choques visuales de esquinas.

### 3. Tipografía & Jerarquía Óptica (`typography.md`)
- **Pila Tipográfica de Sistema**: Respetar la pila nativa Apple (`-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui`).
- **Tracking Óptico**:
  - Títulos grandes (Display / Headings): `tracking-tight` o `tracking-tighter` (`-0.02em` a `-0.03em`).
  - Textos de cuerpo y etiquetas pequeñas: `tracking-normal` o levemente expandido para máxima legibilidad.
- **Tabular Figures en Datos Numéricos**:
  - Toda cifra monetaria, kilometraje, VIN, porcentaje de combustible/batería o contador debe utilizar `tabular-nums` (`font-mono` o variante tabular) para evitar saltos de ancho al actualizarse.

### 4. Touch Targets & Ergonomía de Pulgar (`accessibility.md`, `layout.md`)
- **Regla Inflexible de 44x44pt**: Todo control táctil (botones, íconos clickeables, selectores, checkboxes) debe contar con un área de interacción mínima de `44x44px` (`min-h-[44px] min-w-[44px]`).
- **Bottom-Heavy Ergonomics**: Los botones de acción primaria (CTA, Confirmar, Check-in, Siguiente) deben ubicarse en la mitad inferior de la pantalla, al alcance natural del pulgar con una mano.
- **Escudo WebKit 16px**: Todo campo de texto debe tener al menos `16px` de fuente computada (`text-base`) para evitar el zoom molesto de iOS Safari.

### 5. Microinteracciones Elásticas & Feedback Háptico/Visual (`motion.md`, `feedback.md`)
- **Efecto de Presión Apple**: Todo botón y tarjeta interactiva debe proporcionar retroalimentación física inmediata al pulsarse:
  - Clase canónica: `.ios-press-bounce` o `active:scale-[0.97] transition-transform duration-150 ease-out`.
- **Segmented Controls**: Los selectores de modo o filtros (ej: Autos / Motos / Vans, o Disponible / Alquilado) deben ser segmented controls con pastilla deslizante y sombra sutil elevada, exactamente como en iOS y macOS.
- **Sheets & Modales**:
  - En móvil: Bottom Sheets con indicador grabber superior (`w-9 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto my-2`), deslizables hacia abajo para descartar.
  - En desktop: Modales compactos centrados con fade suave y escala (`scale-95` a `scale-100`).

### 6. Iconografía Coherente & Weight-Matched (`icons.md`, `sf-symbols.md`)
- Los íconos deben pertenecer a una única familia geométrica (ej. Lucide Icons en modo stroke unificado de `1.5px` a `2px`).
- El grosor del trazo del ícono debe coincidir con el peso de la tipografía adyacente (ej. trazo `1.5px` junto a texto regular/medium, trazo `2px` junto a texto semibold).
- Los íconos en navegación inferior (dock/tab bar) deben usar variante de contorno en estado inactivo y variante rellena/sólida en estado activo.

### 7. Auditoría a Través de las 5 Lentes de `apple-design`
Al revisar o crear cualquier componente, evaluar según:
1. **Accesibilidad**: Contraste ≥ 4.5:1 para texto normal, soporte `prefers-reduced-motion`, foco de teclado visible.
2. **Convenciones de Plataforma**: Jerarquía clara, toolbars donde corresponde, tabs que navegan y no disparan acciones destructivas.
3. **Craft & Punto de Vista**: El componente no debe parecer una plantilla genérica ni tener bordes de alto contraste innecesarios.
4. **Interacción**: Estados de loading inmediatos, prevención de errores con confirmaciones antes de acciones destructivas.
5. **Redacción (Copywriting)**: Títulos concisos en title-style o sentence-case consistente, etiquetas de botón que indican la acción exacta ("Guardar Cambios" en lugar de "Enviar").

---

## 3. Protocolo de Creación de Componentes

Antes de declarar un componente terminado en `src/components/ui/` o módulos de dominio:
1. **Consultar Referencias HIG**: Revisar el archivo correspondiente en `.agents/skills/apple-design/references/hig/{componente}.md` (ej: `buttons.md`, `segmented-controls.md`, `text-fields.md`, `modality.md`, `materials.md`).
2. **Verificar Cumplimiento**: Comprobar que implementa squircles, touch target de 44px, feedback `active:scale-[0.97]`, y colores canónicos.
3. **Verificación Técnica**: Ejecutar `pnpm check` para confirmar 0 errores TypeScript/Astro.
