# Rule: Mobile Deep-Work Pattern & Complex Component Governance

## 1. El Problema de Densidad en Mobile (Cognitive Overload)

En viewports móviles (≤430px), incrustar herramientas complejas, densas o de manipulación fina dentro de tarjetas secundarias en dashboards multipropósito es un antipatrón crítico. Genera:
- Trampas de scroll (scroll dentro de scroll).
- Touch targets comprimidos (<44px) que provocan frustración táctil.
- Pérdida del estado de foco (el usuario compite visualmente con otros 4 widgets en pantalla).
- Truncamiento de datos y gráficos ilegibles.

---

## 2. El Patrón Canónico: Glance Card + Dedicated Deep-Work Route

Todo componente con alta carga operativa, analítica o cognitiva debe dividirse estrictamente en dos artefactos complementarios:

```
[ Dashboard / Hub Multi-Widget (Mobile) ]
       │
       ▼
┌───────────────────────────────────────────────┐
│ Tier 2: Summary / Glance Card (<260px)        │
│ • Estado esencial legible en 3 segundos       │
│ • Identidad visual viva (rayos, pulso, halos) │
│ • Máximo 1 micro-interacción directa          │
│ • CTA prominente: [ Abrir Herramienta ↗ ]    │
└──────────────────────┬────────────────────────┘
                       │ Clic / Tap
                       ▼
┌───────────────────────────────────────────────┐
│ Tier 4: Dedicated Fullscreen Route (100dvh)   │
│ • Diseñada ALREDEDOR DE LA FUNCIONALIDAD      │
│ • 1. Escenario Hero Protagónico               │
│ • 2. Auditoría o Diagnóstico en Vivo          │
│ • 3. Motor Operativo de Triage / Edición      │
│ • 4. Dock de Captura ergonómico (pulgar)      │
│ • 5. Salto directo a otros modos de foco      │
└───────────────────────────────────────────────┘
```

---

## 3. Regla de Identidad & Vida Visual en Cards Simples (Zero-Inert-Cards Policy)

**Prohibido crear cards planas, grises o inertes que solo listen texto.** Toda Glance Card o tarjeta simple de dominio debe incorporar la identidad visual viva de `design.pen`:

1. **Atmósfera y Geometría de Firma**:
   - Rayos sutiles angulares (`Icon name="ray"`) o micro-rotaciones dinámicas en hover.
   - Halos térmicos o micro-pulsos para destacar elementos críticos (ej. `phx-frog-pulse`, auras cálidas).
2. **Íconos Semánticos por Estado**:
   - Cada categoría o estado debe tener su ícono distintivo (ej. A: `target`, B: `bolt`, C: `sparkle`, D: `refresh`, E: `close`).
3. **Indicador de Proporción / Balance Visual**:
   - Barra o medidor de proporciones continuo que represente el estado holístico (ej. proporción 80/20, ratio de metas 3-P, balance KRA).
4. **Micro-interacciones Táctiles Elásticas**:
   - Checkboxes con salto elástico (`phx-dot-pop`), micro-desplazamiento en flechas de acción al hover y feedback inmediato sin recargas.

---

## 4. Regla de Páginas Dedicadas Construidas Alrededor de la Funcionalidad (Anti-Empty-Wrapper Policy)

**Prohibido pasar un componente en bruto a una página en blanco como mero envoltorio.** 
Una página dedicada de Deep Work (`Tier 4`) debe ser un **centro de comando funcional completo** diseñado alrededor del modelo mental del método, articulado obligatoriamente en 5 pilares:

1. **Pilar 1: Escenario Hero Protagónico (Hero Action Stage)**:
   - El elemento estelar o foco inmediato del día (ej. Sapo A-1, lienzo de foco del cuaderno, cuello de botella KRA) presentado con presencia y jerarquía visual máxima.
2. **Pilar 2: Auditoría o Diagnóstico en Vivo (Live Executive Audit)**:
   - Panel de verificación de disciplina ejecutiva (ej. Ley del 80/20 de Brian Tracy, Validador 3-P en tiempo real, Diagnóstico de brecha de habilidad).
3. **Pilar 3: Motor Operativo y de Triage (Execution & Classification Board)**:
   - Tablero estructurado por canales/categorías con reasignación táctil de un solo toque y filtros claros.
4. **Pilar 4: Dock de Captura Rápida Ergonómico (Thumb-Friendly Capture Dock)**:
   - Dock o barra de entrada accesible para el pulgar en mobile, con selectores rápidos de prioridad y tiempo sin modales intrusivos.
5. **Pilar 5: Conexión Fluida entre Modos Operativos**:
   - Enlace directo a otros estados de alta concentración (ej. desde el Sapo A-1 directo a `/tunnel`).

---

## 5. Catálogo de Componentes Complejos y su Mapeo Obligatorio

| Componente | Glance Card (Dashboard / Hub) | Dedicated Fullscreen Route |
| :--- | :--- | :--- |
| **Priorización ABCDE** | Sapo A-1 destacado + barra 80/20 + top 3 tareas + CTA `[ Ver Matriz ABCDE ]`. | Ruta `/tasks`: Centro de comando con Escenario Sapo A-1, Auditoría 80/20 Tracy, Matriz 5 Canales y Dock de captura. |
| **Cuaderno de Metas Diarias** | Meta estrella de hoy + indicador 3-P + racha activa + CTA `[ Abrir Cuaderno ]`. | Ruta `/goals`: Lienzo espiral inmersivo, Escenario de Meta Primaria, Validador 3-P en tiempo real, Historial matutino y Dock de redacción. |
| **Competencias Clave (Radar KRA)** | Score KRA global + radar sintético mini + KRA cuello de botella + CTA `[ Evaluar KRA ]`. | Ruta `/insights/kra`: Evaluación 1-10 interactiva, Diagnóstico de habilidad limitante y Plan de desarrollo ejecutivo. |
| **Métricas de IA & Asesor** | Índice de claridad mental + último insight clave + CTA `[ Consultar Asesor ]`. | Ruta `/chat` o `/insights/ai`: Hilo conversacional de pantalla completa, transcripciones y desglose analítico. |
| **Mindstorming 20 Ideas** | Pregunta foco activa + contador de ideas (`X / 20`) + CTA `[ Iniciar Ráfaga ]`. | Ruta `/mindstorming`: Lienzo de ráfaga mental a pantalla completa con cronómetro zen y feedback acústico. |

---

## 6. Reglas de Implementación Técnica en Astro & CSS

1. **Responsividad Adaptativa**:
   - En pantallas grandes (`≥1024px`), el componente de inmersión puede renderizarse como un panel lateral expandido o layout de dos columnas.
   - En mobile (`<768px`), el componente **DEBE** derivar a la ruta dedicada que capture el viewport completo (`100dvh`).
2. **Safe Areas & Bottom Bar**:
   - Toda página dedicada en mobile debe respetar `padding-bottom: calc(var(--spacing-8) + env(safe-area-inset-bottom))`.
3. **Hard LOC Limit en Páginas**:
   - Las páginas en `src/pages/*.astro` deben mantenerse por debajo de **150 LOC**, delegando sus 5 pilares en componentes modulares Tier 2 en `src/modules/{module}/ui/`.

---

## 7. Checklist de Verificación de Nuevos Componentes

Antes de aprobar o integrar cualquier componente de mediana o alta complejidad:
- [ ] ¿La Glance Card tiene vida visual (rayos de Pen, halo en elementos clave, íconos semánticos, medidor de proporción)?
- [ ] ¿La Glance Card tiene micro-animación táctil elástica (`phx-dot-pop`)?
- [ ] ¿La página dedicada está construida alrededor de la funcionalidad completa (Hero + Auditoría + Motor + Dock)?
- [ ] ¿La página dedicada evita ser un mero wrapper pasivo?
- [ ] ¿Se puede saltar fluidamente desde la página dedicada al modo de ejecución en foco (ej. `/tunnel`)?
- [ ] ¿La página dedicada está por debajo de 150 LOC?
