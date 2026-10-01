# Rule: UX Copywriting & Zero Technical Leakage (Human-Centric Language)

## 1. El Usuario es un Ser Humano Ejecutivo, NO un Desarrollador
Phoenix es un software directivo de rendimiento personal para ejecutivos, emprendedores y profesionales de alto impacto. La interfaz de usuario **nunca** debe hacer sentir al usuario que está inspeccionando una base de datos, un worker, una API o un catálogo de componentes internos.

### 🚫 Prohibición Estricta de Fuga de Términos Técnicos e Internos:
- **Cero menciones de infraestructura o persistencia**: Prohibido escribir en la UI o en mensajes al usuario términos como `D1`, `Cloudflare`, `Worker`, `Base de datos`, `API`, `Binding`, `localStorage`, `Cache` o `SQLite`.
  - *Mal:* `"Modo inmersivo activo en D1"`, `"Sin tareas registradas para hoy en la base de datos"`, `"Fallo al conectar con la API"`.
  - *Bien:* `"Sesión de concentración activa"`, `"No tienes tareas pendientes para hoy"`, `"No pudimos actualizar la tarea. Comprueba tu conexión e intenta de nuevo"`.
- **Cero referencias a artefactos de diseño o Figma/Pen**: Prohibido exponer nombres de componentes, tokens o capas de prototipado.
  - *Mal:* `"FIRMA VISUAL · RAYOS & FOCO"`, `"Bespoke A-1 Frog Card"`, `"Frame Hero"`, `"Primitivas visuales"`.
  - *Bien:* `"SESIÓN DE CONCENTRACIÓN"`, `"TU SAPO A-1 · ENFOQUE ÚNICO"`, `"TEMPORIZADOR"`.
- **Cero jergas internas de arquitectura de software**: Prohibido usar expresiones como `"Túnel vivo"`, `"Single-Handling crudo"`, `"Polling activo"`, `"Renderizado local"`.
  - *Mal:* `"TÚNEL VIVO"`, `"SINGLE-HANDLING (CRÍTICO)"`.
  - *Bien:* `"TÚNEL ACTIVO"`, `"ENFOQUE ÚNICO"`.

---

## 2. Alineación Metodológica Elegante (Brian Tracy sin Jerga Pseudo-Científica)
Phoenix bebe de la metodología de Brian Tracy (*Eat That Frog!*, *Metas 3-P*, *La Hora de Oro*), pero debe aplicarla con naturalidad ejecutiva y elegancia:

- **Sapo A-1**: Es el concepto insignia para la tarea de máximo impacto matutino. Utilizarlo con orgullo pero con claridad operativa: `"TU SAPO A-1 · ENFOQUE ÚNICO"`.
- **Triaje de Consecuencias (ABCDE)**: No llamarlo *"Triaje de Alta Densidad"* (suena a emergencias médicas o código militar). Llamarlo `"Priorización por Importancia"` o `"Priorización de Consecuencias"`.
- **Metas 3-P y Cuaderno**: Evitar saturar al usuario con tecnicismos neurológicos como *"Activación del SAR"* o llamar a la meta ancla *"META #1 (ANCLA)"*. Usar `"Reprogramación Matutina"`, `"Metas Diarias 3-P"` y `"OBJETIVO PRINCIPAL"`.
- **Modo Túnel**: Usar estados orientados al usuario (`"Sesión en curso"`, `"Listo para enfocar"`, `"Espacio protegido · Sin distracciones"`), no estados mecánicos de máquinas de estado (`"TÚNEL EN PROGRESO"`, `"SESIÓN DISPONIBLE"`).

---

## 3. Principios de Redacción (Directrices Better-Writing)

1. **Voz Activa y Verbo al Inicio de las Acciones**:
   - Botones siempre con verbo de acción descriptivo: `"Iniciar Túnel"`, `"Ver todas las tareas"`, `"Abrir Cuaderno de Metas"`.
   - Prohibido botones crípticos o pasivos como `"OK"`, `"Ir"`, `"Abrir Matriz ABCDE Completa"`.

2. **Estados Vacíos con Orientación Hacia Adelante**:
   - Los estados vacíos nunca deben encogerse de hombros ni decir *"Sin datos"*.
   - Deben orientar al usuario sobre qué significa ese espacio y cuál es el paso inmediato para llenarlo (ej. `"No tienes tareas para hoy. Planifica tu día con el Cierre Nocturno"` con botón directo).

3. **Cero Números Ficticios Hardcodeados**:
   - No mostrar porcentajes inventados o hardcodeados como `"OBJETIVO 82%"` a menos que sean calculados a partir de los datos reales del usuario. Si es un indicador de intención, usar texto cualitativo: `"ENFOQUE PROFUNDO"` o `"CONCENTRACIÓN"`.

4. **Traducción y Claridad en Español**:
   - Mantener un español neutro, sobrio, formal y cercano.
   - Si se usa un anglicismo metodológico consagrado, acompañarlo o sustituirlo por su equivalente intuitivo:
     - `Single-Handling` ➔ `Enfoque Único`
     - `Cockpit` ➔ `Centro de Enfoque` / `Panel Principal`
     - `Glance` ➔ `Resumen Rápido`
