# Rule: Phoenix UX & Product Interaction Standards (Action-First Governance)

## 1. El Software es una Herramienta, NO un Manual de Instrucciones

Phoenix es un sistema ejecutivo de alto rendimiento. Los directivos y usuarios avanzados lo abren para **actuar y enfocarse**, no para leer teoría sobre productividad.

### Prohibición de Texto Didáctico Fijo:
- **NO citas célebres estáticas:** Prohibido incrustar citas motivacionales (ej. Brian Tracy) como bloques de texto permanentes en los encabezados o cuerpos de página. Si se desea incluir inspiración, debe ser opcional o rotativa en micro-momentos (ej. al completar una racha), nunca un obstáculo visual fijo.
- **NO lecciones teóricas en pantalla:** Prohibido explicar conceptos como el Sistema de Activación Reticular (SAR), la Ley del 80/20, el método ABCDE o las reglas 3-P en párrafos fijos en la UI. El software debe **aplicar** el método de forma intuitiva, no dar una clase sobre él.
- **NO enumeración pesada de pasos:** Evitar banners del tipo `PASO 1: VACIADO MENTAL & CAPTURA DUAL`. Utilizar flujos continuos con jerarquía visual natural y títulos directos (ej. `1. Descarga de Pendientes`).

---

## 2. Prohibición Estricta de Showcases de Desarrollo en Producción

Las pantallas operativas del usuario (`/`, `/goals`, `/tunnel`, `/night`, `/journal`, `/insights`, `/chat`) deben contener **únicamente herramientas funcionales**.

- **Prohibido colocar demos de primitivas:** Nunca incrustar barras o tarjetas que muestren chips de colores, badges de ejemplo o primitivas de botones dentro del dashboard del usuario.
- **Prohibido colocar demostraciones de auras o animaciones:** Las auras (`RaysAura`), órbitas (`OrbitSystem`) y símbolos no deben usarse como decoración inerte. Nunca deben existir celdas dedicadas a "mostrar cómo se ven las auras".
- Las pruebas y muestras visuales pertenecen exclusivamente al catálogo de desarrollo (`/motion`).

---

## 3. El Hub NO es un Índice de Tarjetas Explicativas de Otras Páginas

- **Prohibido el "Dashboard de Teasers":** La pantalla principal (`/`) nunca debe llenarse de tarjetas que solo resumen o invitan a ir a otras páginas (`Abrir Cuaderno →`, `Ver Cierre Nocturno →`, `Ver Radar KRA →`). El usuario ya dispone de la barra de navegación global en el `AppShell`.
- **Enfoque en Trabajo Diario Real:** La pantalla de inicio es el **Cockpit de Foco**:
  1. **Sapo A-1 de Hoy:** Tarea crítica prominente con botón directo `[ Iniciar Enfoque A-1 ]` y toggle para marcar completada.
  2. **Lista Interactiva de Prioridades:** Checkboxes funcionales para tachar tareas directamente en la vista y formulario rápido en línea para agregar nuevas tareas del día.
  3. **Métricas Clave:** Contadores concisos de hoy (tareas completadas, minutos enfocados, racha).

---

## 4. Componentes Complejos: Patrón Glance Card + Pantalla Dedicada (Ver mobile-deep-work.md)

- **Prohibido comprimir herramientas densas en tarjetas secundarias:** Interfaces de alta carga cognitiva, operativa o analítica —tales como la **Matriz ABCDE**, el **Cuaderno de Metas Diarias**, las **Competencias Clave (Radar KRA)**, las **Métricas de IA** o el **Asesor Conversacional**— **nunca deben vivirse apretadas** dentro de cards secundarias con scrolls internos en mobile.
- **Doble Representación Mandatoria:**
  1. **Glance Card (En Hub o Dashboard):** Resumen visual de alto nivel legible en 3 segundos + máxima 1 micro-acción inmediata + botón prominente `[ Abrir Herramienta Dedicada ↗ ]`.
  2. **Pantalla Dedicada (Deep Work):** Vista a pantalla completa (`100dvh`), con ergonomía optimizada para el pulgar, espacio generoso para manipulación profunda y cero distracciones secundarias.
- Consultar la regla completa en `.agents/rules/mobile-deep-work.md`.

---

## 5. Singularidad de la Física de Movimiento (Cero Repetición de Diseños Animados)

- **Una física por metáfora de dominio:** Cada animación debe pertenecer exclusivamente a un concepto funcional:
  - **Escaneo Óptico:** Barrido vertical láser (`phx-laser-sweep`), exclusivo para el escáner de cuaderno físico en `/night`.
  - **Estudio de Voz:** Ondas concéntricas de sonido (`phx-acoustic-ripple`) y barras armónicas (`phx-equalizer-bar`), exclusivas para el micrófono y audio en `/journal`.
  - **Conversación:** Deslizamiento suave de burbujas (`phx-bubble-glide`), exclusivo para el flujo de mensajes en `/chat`.
  - **Validación 3-P:** Salto elástico sutil (`phx-dot-pop`), exclusivo para confirmar el cumplimiento de reglas en el cuaderno de `/goals`.
- **Prohibido repetir el mismo diseño animado en distintos componentes:**
  - No colocar rayos solares (`RaysAura`) alrededor de micrófonos o modales genéricos.
  - No saturar el reloj del Modo Túnel (`/tunnel`) con anillos planetarios u órbitas girando en direcciones opuestas; el dial de foco debe ser un instrumento zen, limpio y libre de mareos visuales.
  - Eliminar keyframes muertos que no aporten a la interacción inmediata del usuario.

---

## 6. Jerarquía Visual Centrada en la Acción (Action-First Hierarchy)

Cada pantalla debe permitir la interacción principal inmediatamente (**Above the Fold**), sin obligar al usuario a hacer scroll para esquivar bloques explicativos:

| Pantalla | Acción Protagónica Inmediata | Antipatrón Prohibido |
| :--- | :--- | :--- |
| **`/` Hub** | Sapo A-1 + Lista interactiva de tareas con checkbox. | Tarjetas resumen de otras páginas y citas motivacionales. |
| **`/goals` Metas** | Cuaderno de metas listo para tipear de inmediato. | Párrafos introductorios sobre cómo redactar metas al despertar. |
| **`/tunnel` Túnel** | Reloj limpio y legible con controles (+-5m, Pausa, Completar). | Órbitas y rayos rotatorios saturando el temporizador. |
| **`/night` Cierre** | Campo de captura inmediata y selección de A-1 con un toque. | Múltiples banners didácticos de pasos. |
| **`/journal` Bitácora** | Botón central de grabación acústica y acceso al chat. | Chat conversacional comprimido en una tarjeta lateral. |
| **`/chat` Asesor IA** | Experiencia completa de mensajería con el asesor. | Diálogo embebido dentro de otra página con scroll truncado. |

---

## 7. Microcopy Conciso y Humano (Better-Writing Standard)

- **Verbos de acción:** Los botones deben iniciar con verbos específicos (`Iniciar Enfoque`, `Agregar tarea`, `Abrir Asesor`), nunca términos pasivos o vagos.
- **Eliminación de jerga robótica y mayúsculas masivas:** Prohibido el uso de estilo terminal o ciencia ficción redundante (`PHOENIX // HORA DE ORO // DECK DE FOCO`, `SINGLE-HANDLING // AISLAMIENTO TOTAL`, `0% LUZ AZUL`). Usar microcopy sobrio, elegante y humano (`Foco Diario`, `Enfoque Activo`, `Modo Nocturno`).
- **Regla del 60%:** Toda etiqueta o texto explicativo que pueda eliminarse sin que el usuario pierda comprensión operativa, **debe ser eliminado**.
