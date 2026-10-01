# Guía de Ergonomía Móvil y Resolución del Auto-Zoom en Inputs

Este documento registra la arquitectura de entrada de texto en **Phoenix** (Astro + Vite Islands + React), explicando la causa técnica del auto-zoom en dispositivos móviles (especialmente iOS WebKit), las decisiones arquitectónicas implementadas y las mejores prácticas para futuros desarrollos.

---

## 1. El Problema: Auto-Zoom Involuntario en Pantallas Móviles

### Causa Raíz (WebKit Viewport Zoom)
En el motor **WebKit** (utilizado por Safari en iOS y por todos los navegadores alternativos en iOS), existe una directiva de accesibilidad fija:
> Si el tamaño de fuente computado (`font-size`) de un elemento de formulario interactivo (`<input>`, `<textarea>`, `<select>`) es **menor a 16px (1rem)**, el navegador forzará un zoom automático centrado en el input al recibir el foco.

### El Efecto Secundario Dañino
A diferencia de un zoom manual que el usuario controla conscientemente:
1. Al perder el foco (`blur`) o al pulsar "Listo" en el teclado virtual, **WebKit no devuelve la vista al nivel de zoom original**.
2. La interfaz queda descuadrada con un zoom permanente del ~115% al 125%.
3. Elementos fijos como `phx-top-bar` y la barra de navegación flotante `phx-floating-pill-nav` quedan desfasados o tapando el área visible.
4. Se introduce un scroll horizontal indeseado, arruinando la experiencia estética directiva.

---

## 2. Por qué NO Usar `user-scalable=no` (Anti-Patrón Descartado)

La solución rápida histórica consistía en colocar:
```html
<!-- ANTIPATRÓN: NUNCA USAR -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```

### Razones Técnicas para Rechazarlo:
1. **Accesibilidad (WCAG 2.1 - Criterio 1.4.4):** Impide que personas con dificultades visuales amplíen la página intencionalmente (requisito mínimo de escalado al 200%).
2. **Inconsistencia entre Motores:** Apple comenzó a ignorar `user-scalable=no` para gestos táctiles con los dedos en Safari iOS 10+, pero navegadores en Android (Chrome, Firefox) sí bloquean el zoom, empeorando la experiencia para usuarios de Android sin resolver el problema en iOS.
3. **Falsa Abstracción:** El problema es tipográfico y de escala física en el display, no de control de ventana gráfica.

---

## 3. Arquitectura Implementada en Phoenix

La solución en Phoenix ataca el problema en 3 niveles de defensa:

### Capa 1: Blindaje Universal en Tokens Globales (`src/styles/tokens.css`)
Debido a que `CircadianLayout.astro` carga `tokens.css` en todo el sitio, se estableció una regla de piso mínimo para pantallas móviles (`max-width: 768px`):

```css
/* src/styles/tokens.css */

/* Márgenes de respiración para que el teclado no tape el input */
input,
textarea,
select {
  scroll-margin-top: 80px;
  scroll-margin-bottom: 80px;
}

/* Piso de 16px estricto en móviles (anula cualquier zoom involuntario de WebKit) */
@media screen and (max-width: 768px) {
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]),
  textarea,
  select {
    font-size: 16px !important;
    font-size: 1rem !important;
  }
}

/* Ocultar barra flotante mientras el teclado está activo */
body:has(input:focus, textarea:focus, select:focus) .phx-floating-nav-wrapper {
  opacity: 0;
  pointer-events: none;
  transform: translateY(20px);
  transition: opacity 150ms ease, transform 150ms ease;
}
```

### Capa 2: Escala Tipográfica Responsiva en Componentes
Tanto en el componente base de Astro ([src/components/ui/Input.astro](file:///Users/santiago/proyectos/phoenix/src/components/ui/Input.astro)) como en los módulos específicos, la tipografía se define como:
* **Móvil (`<640px`):** `1rem` (16px) — confort visual, legibilidad clara y cero zoom.
* **Escritorio (`≥640px`):** `0.875rem` (14px) o `0.9375rem` (15px) — manteniendo la densidad visual ejecutiva.

### Capa 3: Sincronización con el Teclado Virtual (`interactive-widget`)
En `src/layouts/CircadianLayout.astro`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
```
El parámetro `interactive-widget=resizes-content` le indica al navegador móvil que ajuste el viewport cuando el teclado virtual aparece, evitando que elementos flotantes queden desconectados o cubran los inputs.

---

## 4. Guía de Experiencia de Usuario Móvil (Anti-Fatiga)

Escribir en una pantalla de 6 pulgadas con un teclado táctil es una de las tareas con mayor fricción digital. Para minimizar la fatiga:

### A. Invocar el Teclado Virtual Correcto (`inputmode`)
Ahorra al usuario tener que cambiar manualmente entre letras y números:
* **Duraciones / Minutos:** `inputmode="numeric"`
* **Búsqueda:** `inputmode="search"`
* **Mensajes / Asesor:** `inputmode="text"`

### B. Etiqueta Clara en la Tecla de Acción (`enterkeyhint`)
* `enterkeyhint="send"`: Para chat y reflexiones del asesor.
* `enterkeyhint="done"`: Para añadir una tarea o cerrar una edición.
* `enterkeyhint="next"`: Para formularios en secuencia (ej. el cuaderno de 10-15 metas).

### C. Autocorrección y Capitalización Estratégica
* En tareas y reflexiones: `autocapitalize="sentences"` y `autocorrect="on"` (ahorra pulsar mayúsculas en cada inicio).
* En códigos o tags: `autocapitalize="off"` y `autocorrect="off"` (evita que el corrector cambie términos intencionales).

### D. Altura Táctil Generosa (Ley de Fitts)
Todo input interactivo en móvil debe tener un objetivo táctil mínimo de **44px de altura** (`min-height: 44px;`) con un padding interno de al menos `10px 14px`.

### E. Textareas Auto-expandibles
Para áreas multilínea, utilizar la propiedad moderna CSS `field-sizing: content;` junto con `min-height: 48px; max-height: 240px;` para que la caja crezca naturalmente según lo escrito, evitando cajas diminutas con scroll interno.

### F. Smart Chips y Dictado por Voz
* **Preselecciones de 1 toque:** Prioridades (A, B, C, D) y estimaciones rápidas de tiempo (15m, 30m, 60m).
* **Captura por voz:** En `DualCaptureSheet.astro` y la bitácora conversacional, incentivar el botón de dictado con IA como alternativa de alta velocidad frente al tecleo manual.

---

## 5. Regla de Gobernanza para Agentes
La regla que los agentes autónomos deben consultar y seguir obligatoriamente se encuentra en:
[`.agents/rules/mobile-input-governance.md`](file:///Users/santiago/proyectos/phoenix/.agents/rules/mobile-input-governance.md)
