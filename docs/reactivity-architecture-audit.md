# Auditoría de Reactividad y Arquitectura de Islas en Phoenix

## 1. Diagnóstico del Problema y Antipatrón Detectado

### El Antipatrón: Manipulación Imperativa del DOM en Meta-Frameworks SSR
Durante la evolución rápida con agentes de IA, se introdujo un vicio técnico recurrente: intentar resolver la interactividad compleja y el streaming en Astro mediante **scripts imperativos de Vanilla TypeScript** (`document.createElement`, `appendChild`, `innerHTML`, `querySelector`) simulando controladores estilo MVC clásico de 2010.

### Puntos Críticos Identificados en el Código

1. **Streaming y Chat IA (`src/modules/cognitive/application/chat-client.ts`)**:
   - Construcción manual de nodos HTML (`createMessageRow`) con `document.createElement('div')` y asignación imperativa de clases.
   - Concatenación de chunks de streaming mutando directamente propiedades del DOM.
   - Dificultad extrema para mantener estados intermedios (reintentos, cancelación con `AbortController`, estados de error, animación de typing).

2. **Modo Túnel y Temporizadores de Enfoque (`src/pages/tunnel.astro`)**:
   - Monolito de más de 690 líneas que viola flagrantemente el límite de 150 LOC de `page-architecture.md`.
   - Lógica de cuenta regresiva, sincronización con Cloudflare D1 (`fetch('/api/tunnel/start')`), overlays de dopamina y eventos de teclado todos mezclados con `document.addEventListener('astro:page-load')`.
   - **Riesgo crítico de Memory Leaks**: En navegaciones de Astro con View Transitions, `astro:page-load` vuelve a adjuntar listeners si no existe una función explícita de `teardown` / limpieza.

---

## 2. Consecuencias Técnicas

| Problema | Impacto |
| :--- | :--- |
| **Fuga de Memoria (Zombie Listeners)** | Listeners de temporizadores, teclado y eventos de ventana acumulados en cada navegación de cliente. |
| **Desincronización Estado-UI** | No hay garantía de que el DOM refleje el estado real de la entidad; el estado queda disperso en `dataset` (`data-session-id`, `data-task-id`). |
| **Inviabilidad de Testing** | Los controladores imperativos acoplados a `document` global no se pueden testear unitariamente sin un entorno JSDOM simulado frágil. |
| **Violación de Principios de Diseño** | Se pierde el paradigma declarativo y la reactividad por diffing/virtual DOM. |

---

## 3. Arquitectura Objetivo: Arquitectura de Islas (Astro + React)

Astro no debe sustituirse por una SPA pura porque aporta:
- Rendering en el Edge con `@astrojs/cloudflare`.
- Rutas de API protegidas (`src/pages/api/*`).
- Sesiones y middleware con `Better Auth` en servidor.
- Acceso directo a base de datos D1 mediante Drizzle ORM.

### Regla de Oro de Separación de Responsabilidades:
- **Astro (`.astro`)**: Cascarón (Shell), Layouts, Routing (Tier 4), carga de datos en servidor (frontmatter SSR), componentes estáticos o puramente presentacionales sin estado interactivo complejo.
- **React (`.tsx`)**: Islas interactivas (`client:load`, `client:idle`, `client:visible`) para streaming de IA, temporizadores en tiempo real, grabador de audio, drag-and-drop y formularios con validación reactiva en vivo.

### Patrón Obligatorio para Islas: Container-Presentational + Custom Hooks

```
src/modules/{module}/ui/
├── components/           # Componentes Presentacionales puros (JSX, props, sin side-effects)
│   ├── MessageBubble.tsx
│   └── ChatComposer.tsx
├── hooks/                # Lógica de estado y side-effects (Streaming, AbortController, Timers)
│   └── useChatStream.ts
└── ChatAdvisorIsland.tsx # Container / Orquestador de la Isla
```
