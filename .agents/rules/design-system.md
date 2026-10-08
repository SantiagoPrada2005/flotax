# Rule: FlotaX Design System & Visual Architecture Governance

**Código:** RUL-FLX-001  
**Proyecto:** FlotaX / Movo — Sistema de Alquiler y Gestión de Flota de Vehículos  
**Directorio Fuente de Verdad:** [`design/exports/`](file:///Users/santiago/proyectos/movix/design/exports), [`design/design-export.html`](file:///Users/santiago/proyectos/movix/design/design-export.html) y [`src/styles/tokens.css`](file:///Users/santiago/proyectos/movix/src/styles/tokens.css)  
**Ámbito:** Todas las interfaces (`src/pages/**`), componentes (`src/components/**`), layouts (`src/layouts/**`) y estilos globales.

---

## 1. La Jerarquía de 4 Capas de Componentes (Separación Estricta)

Todos los elementos de la interfaz en FlotaX deben adherirse estrictamente a la jerarquía de 4 niveles:

```
Nivel 0: Design Tokens & Escudo Ergonómico (Fuente Única) -> src/styles/tokens.css
Nivel 1: Primitivas UI Agnósticas (Átomos / Moléculas)   -> src/components/ui/
Nivel 2: Componentes de Dominio (Flota, Reservas, Pagos) -> src/components/{flota|reservas|pagos|auth}/
Nivel 3: Shells & Layouts Adaptativos (Mobile First)    -> src/layouts/ (LayoutApp, LayoutAdmin, LayoutAuth)
```

### Nivel 0: Design Tokens & Paleta Canónica
- **Sin valores arbitrarios:** Queda prohibido hardcodear códigos hex (`#EDEDED`, `#111827`, etc.) o paddings arbitrarios directamente en los componentes si corresponden a variables globales.
- **Consumo obligatorio de tokens:**
  - **Paleta Canónica Obligatoria:**
    - Base / Canvas: `#EDEDED` (`--color-surface-canvas`, `--color-palette-100`)
    - Borde / Divisor: `#9CA3AF` (`--color-border-subtle`, `--color-palette-300`)
    - Texto secundario / Muted: `#4B5563` (`--color-text-muted`, `--color-palette-500`)
    - Interactivo / Botones / CTA: `#1F2937` (`--color-brand-secondary`, `--color-palette-700`)
    - Títulos / Énfasis / Brand Core: `#111827` (`--color-brand-primary`, `--color-palette-900`)
  - **Tipografía:**
    - Display / Títulos: `Space Grotesk` (`font-display`)
    - Cuerpo / Lectura / Formularios: `Inter` (`font-body`)
    - Datos / Moneda / Placas / VIN / Código: `JetBrains Mono` (`font-mono`)
  - **Radios de curvatura:**
    - Inputs y controles: `12px` (`rounded-input` / `rounded-[12px]`)
    - Tarjetas y paneles: `16px` o `20px` (`rounded-card` / `rounded-[20px]`)
    - Contenedores modales / Login: `24px` (`rounded-[24px]`)
    - Chips / Badges / Avatares: `9999px` (`rounded-full`)

### Nivel 1: Primitivas UI (`src/components/ui/`)
- 100% agnósticas de lógica de negocio (botones, inputs, badges, checkboxes, tarjetas genéricas, modales).
- Target táctil mínimo garantizado: **44x44px** en todos los elementos interactivos (`min-h-[44px]`).

### Nivel 2: Componentes de Dominio de FlotaX
- Componentes organizados por dominio:
  - `vehiculos/`: Tarjetas de vehículo, estado de motor, inspección, combustible/batería.
  - `reservas/`: Calendario semanal/mensual, selector de fechas de alquiler, check-in/check-out.
  - `pagos/`: Desglose de depósito, tarjetas de método de pago, recibo de alquiler.
  - `auth/`: Login form, OTP verification, Google OAuth button, perfil de conductor/operador.

### Nivel 3: Shells & Layouts
- `LayoutApp.astro`: Contenedor principal responsive con Sidebar desktop y BottomNav móvil.
- `LayoutAdmin.astro`: Shell de control operativo y analítica.
- `LayoutAuth.astro`: Shell centrado y mobile-first para flujos de autenticación y onboarding.

---

## 2. Principios de Interfaz FlotaX (Mobile-First & Ergonomía Operativa)

1. **Mobile-First por Diseño:**
   - La operación de flota y alquiler ocurre principalmente en el patio de maniobras, taller o recepción desde dispositivos móviles (smartphones/tablets).
   - Todo formulario y flujo debe ser 100% operable con una sola mano (zona inferior cómoda para el pulgar).
2. **Escudo Anti-Zoom en iOS WebKit (La Regla de los 16px):**
   - En viewports `< 768px`, todo `<input>`, `<select>` y `<textarea>` tiene `font-size: 16px !important` garantizado por `src/styles/tokens.css`.
3. **Legibilidad Operativa Inmediata (Glanceability):**
   - El estado de los vehículos (Disponible, Alquilado, Mantenimiento, Retenido) y las credenciales de acceso deben poder leerse en menos de 2 segundos mediante jerarquía tipográfica limpia y contraste accesible (WCAG AA/AAA).

---

## 3. Prohibiciones Estrictas

1. **NO Usar Colores de Otros Proyectos:**
   - Prohibido el uso de naranjas `#FF5A1F` o paletas cálidas de otros sistemas en la identidad base. La paleta canónica es la escala monocromática/slate canónica: `#EDEDED`, `#9CA3AF`, `#4B5563`, `#1F2937`, `#111827`.
2. **NO Reducir Touch Targets a Menos de 44px:**
   - Todo botón, link de acción o switch debe medir al menos 44x44px de área de pulsación.
3. **NO Deshabilitar el Viewport Scale:**
   - Prohibido `user-scalable=no` o `maximum-scale=1`.
4. **Cero Invención Visual sin Consultar `design/`:**
   - Ante cualquier duda sobre disposición o componentes, inspeccionar previamente los exports de `design/exports/` y `design/design-export.html`.
