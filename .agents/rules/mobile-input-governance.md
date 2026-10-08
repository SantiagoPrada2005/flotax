# Rule: Mobile Input Ergonomics & WebKit Auto-Zoom Governance (The 16px Rule)

## 1. El Problema Técnico: iOS WebKit Auto-Zoom & Descalibración de Pantalla

En navegadores basados en WebKit (iOS Safari, y cualquier navegador webview en iOS), existe una regla fija de accesibilidad del motor:
* **Si el tamaño de fuente computado (`font-size`) de un `<input>`, `<textarea>` o `<select>` es menor a `16px` (`1rem`), el navegador activa automáticamente un zoom centrado en el campo de texto cuando recibe el foco.**
* **Impacto crítico:** Cuando el usuario termina de escribir o toca fuera del campo (`blur`), **WebKit NO restaura el nivel de zoom anterior**. La pantalla queda permanentemente agrandada, desplazando la barra superior fija (`phx-top-bar`), montando la barra flotante (`phx-floating-pill-nav`) en el medio de la interfaz y generando un scroll horizontal que rompe la estética y frustra al usuario.

---

## 2. Antipatrón Prohibido (Zero-Viewport-Disabling Policy)

> [!CAUTION]
> **ESTÁ ESTRICTAMENTE PROHIBIDO usar `maximum-scale=1, user-scalable=no` en `<meta name="viewport">`.**
> 1. Viola el estándar de accesibilidad **WCAG 2.1 (Criterio de Éxito 1.4.4: Redimensionamiento de texto hasta un 200%)**.
> 2. Safari en iOS ignora este bloqueo para el pellizco táctil de usuarios pero mantiene comportamientos erráticos, mientras que Android sí lo bloquea, aislando a usuarios con baja visión.
> 3. El problema es tipográfico y ergonómico, nunca del viewport.

---

## 3. Los 6 Mandamientos Arquitectónicos de Inputs en FlotaX

### 1. El Umbral de 16px en Mobile (`max-width: 768px`)
Todo campo interactivo de texto debe garantizar un piso mínimo de `16px` (`1rem`) en dispositivos móviles:
```css
/* src/styles/tokens.css */
@media screen and (max-width: 768px) {
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]),
  textarea,
  select {
    font-size: 16px !important;
    font-size: 1rem !important;
  }
}
```
En pantallas de escritorio (`sm:` / `>768px`), el componente puede reducirse fluidamente a `0.875rem` (14px) o `0.9375rem` (15px) para preservar la densidad ejecutiva del diseño.

### 2. Viewport con `interactive-widget=resizes-content`
El layout maestro (`src/layouts/LayoutApp.astro`) debe contener:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, interactive-widget=resizes-content, viewport-fit=cover" />
```
Esto sincroniza la apertura y cierre del teclado virtual con el espacio utilizable real del layout viewport en iOS 15.4+ y Android Chrome.

### 3. Márgenes de Scroll (`scroll-margin`)
Para evitar que el teclado virtual o la cabecera fija corten visualmente el campo que se está editando, todo campo debe incluir:
```css
input, textarea, select {
  scroll-margin-top: 80px;
  scroll-margin-bottom: 80px;
}
```

### 4. Ocultamiento Suave de la Barra de Navegación Flotante (`phx-floating-pill-nav`)
Cuando el teclado virtual se despliega en móviles, los elementos `position: fixed` inferiores pueden flotar en el tercio medio de la pantalla tapando el texto. Es mandatario ocultar la barra flotante mientras haya un input enfocado:
```css
body:has(input:focus, textarea:focus, select:focus) .phx-floating-nav-wrapper {
  opacity: 0;
  pointer-events: none;
  transform: translateY(20px);
  transition: opacity 150ms ease, transform 150ms ease;
}
```

### 5. Ergonomía Táctil y Prevención de Fatiga (Mobile Typing UX)
Para maximizar la velocidad de captura y minimizar errores tipográficos:
1. **Target Táctil Mínimo:** Todo input en mobile debe medir al menos **44px de altura** (`min-height: 44px;`) con un padding horizontal de al menos 12px a 14px.
2. **`inputmode` Semántico:**
   - Números, duraciones o códigos: `inputmode="numeric"`.
   - Búsqueda o comandos: `inputmode="search"`.
   - Texto estándar: `inputmode="text"`.
3. **`enterkeyhint` Explícito:**
   - Chat o mensajes: `enterkeyhint="send"`.
   - Formularios de un solo paso o tareas: `enterkeyhint="done"`.
   - Listas secuenciales (ej. Cuaderno espiral de metas): `enterkeyhint="next"`.
4. **Control de Autocorrección y Capitalización:**
   - Tareas, metas o reflexiones: `autocapitalize="sentences" autocorrect="on" spellcheck="true"`.
   - Tags, códigos o identificadores: `autocapitalize="off" autocorrect="off" spellcheck="false"`.

### 6. Gobernanza en Islas de React (Vite Client Islands)
En componentes React como `ChatComposer.tsx`, `SpiralNotebookIsland.tsx` o `TunnelTacticalCard.tsx`:
* **Prohibido** fijar estilos inline rígidos como `style={{ fontSize: '0.8125rem' }}` o `style={{ fontSize: '0.9375rem' }}` sin evaluar mobile.
* Preferir `fontSize: '1rem'` o delegar el tamaño a clases CSS responsivas para no romper la regla de contención global.

---

## 4. Checklist de Verificación de Inputs para Agentes

Antes de aprobar, refactorizar o añadir cualquier componente con entrada de texto:
- [ ] ¿El `<input>`, `<textarea>` o `<select>` computa a `16px` (`1rem`) en viewport ≤768px?
- [ ] ¿El touch target tiene al menos 44px de altura (`min-height: 44px`)?
- [ ] ¿Tiene atributos semánticos acordes (`inputmode`, `enterkeyhint`, `autocapitalize`)?
- [ ] ¿Al hacer focus no se rompe ni se descuadra el viewport de la pantalla?
- [ ] ¿La barra flotante inferior se desvanece limpiamente al escribir para no interferir con el teclado?
- [ ] ¿Se evitó el uso de `user-scalable=no` en el viewport?
