# Rule: Phoenix Strategic Purpose & Alignment Governance (PRJ-PHX-001)

Esta regla define el marco obligatorio para **validar, juzgar y autorizar** cualquier propuesta, cambio de código, arquitectura o diseño de interfaz frente al propósito fundacional y las directivas funcionales de **Phoenix** ([PRJ_especificaciones_funcionales_phoenix.md](file:///Users/santiago/proyectos/phoenix/PRJ_especificaciones_funcionales_phoenix.md)).

---

## 1. El Axioma Fundamental: Software como Director Teleológico

Phoenix **NO** es:
- Un gestor pasivo de tareas infinitas (no es Todoist, Asana o Trello).
- Una wiki o repositorio documental desestructurado (no es Notion).
- Una herramienta colaborativa ni un gestor de tickets de equipo (no es Jira).
- Un sistema que premia métricas de vanidad (tachar 20 microtareas triviales mientras se pospone la difícil).

Phoenix **ES**:
- Un **director teleológico** que entrena, custodia y fuerza la atención del usuario hacia su **Propósito Principal Definido** a lo largo de un ciclo circadiano de 24 horas y una auditoría semanal de equilibrio vital (Brian Tracy).

---

## 2. El Protocolo de Juicio de Implementación (Gatekeeper Checklist)

Antes de escribir o aprobar código para una nueva pantalla, componente o endpoint, la solución debe superar este filtro de 5 preguntas:

1. **¿Elimina o reduce la fatiga por decisión?**  
   - *Falla:* Si presenta al usuario listas infinitas, opciones abrumadoras o requiere configurar flujos complejos antes de actuar.
   - *Pasa:* Si prescribe con claridad meridiana qué hacer ahora (ej. designación clara de la tarea A-1).

2. **¿Protege el principio de *Eat That Frog!* y *Single-Handling*?**  
   - *Falla:* Si permite saltar arbitrariamente a tareas secundarias cómodas sin haber confrontado la tarea crítica A-1, o si llena de distracciones el modo de trabajo profundo.
   - *Pasa:* Si aísla deliberadamente la tarea A-1 en el Modo Túnel y bloquea el acceso a pendientes B, C y D hasta finalizar al 100%.

3. **¿Respeta la arquitectura funcional de separación cognitiva (Determinista vs. Sistema 1 vs. Sistema 2)?**  
   - *Lógica Determinista:* Cronómetros, bloqueos, rachas, cálculo de horas y disparadores horarios.
   - *Sistema 1 (Juicio Rápido < 150ms):* Validación booleana estricta (ej. 3-Ps: Presente, Positivo, Personal), triaje ABCDE inmediato. Cero generación de prosa innecesaria.
   - *Sistema 2 (Reflexivo / Multimodal):* Transcripción de libretas físicas (Visión IA), micro-entrevistas concisas de audio (Voz IA), facilitación de las 20 ideas y balance dominical.
   - *Falla:* Si se usa un LLM pesado y lento para validar reglas booleanas simples, o si se sobrecarga la interfaz con agentes conversacionales donde un control determinista es superior.

4. **¿Se alinea con el ciclo circadiano de 24 horas y los 5 módulos canónicos?**
   - **Módulo 1 (Cierre Nocturno):** Modo Ultra-Dark (OLED #000000), cero luz azul (ámbar/rojo tenue), captura dual (digital/voz o escaneo de cuaderno físico), triaje ABCDE, sapo A-1 y cierre cognitivo de voz breve (30-45s).
   - **Módulo 2 (Activación Matutina):** Cuaderno diario en blanco de 10-15 metas vitales escritas de memoria (sin ver el día anterior), con validación instantánea de las 3-Ps (Presente, Positivo, Personal).
   - **Módulo 3 (Ejecución A-1 y Hora de Oro):** Cronómetro de estudio previo a inputs externos, Modo Túnel inmersivo y registro de victoria antes del mediodía.
   - **Módulo 4 (Bitácora Diaria):** Micro-entrevista por voz rápida (1-2 min de audio, 2-3 preguntas de seguimiento precisas) y extracción automática de métricas duras (energía, fricciones, lead measures).
   - **Módulo 5 (Dirección Estratégica Semanal):** Radar de 5-7 KRAs con identificación del cuello de botella, taller de las 20 ideas (Mindstorming) y termómetro de los 4 pilares vitales (Carrera, Salud, Familia, Finanzas).

5. **¿Cumple los Criterios de No-Alcance (Límites de Producto)?**
   - Prohibido agregar chats grupales, asignaciones a terceros o jerarquías corporativas.
   - Prohibido agregar editores de bloques extensos o bases de datos libres tipo Notion.
   - Prohibido felicitar o gamificar el volumen bruto de tareas accesorias.

---

## 3. Criterios de Rechazo Inmediato (Hard Veto)

Cualquier PR o implementación será **rechazada inmediatamente** si incurre en:
- **Violación de UX Directiva:** Explicaciones teóricas fijas en la UI (el usuario viene a actuar, no a leer manuales). Ver [ux-principles.md](file:///Users/santiago/proyectos/phoenix/.agents/rules/ux-principles.md).
- **Contaminación Circadiana:** Fondos claros, destellos azules o animaciones estridentes en la experiencia nocturna.
- **Multitarea o Falsa Productividad:** Permitir iniciar tareas B o C mientras la A-1 no ha sido completada o explícitamente reasignada con fricción consciente.
- **Fuga de Alcance Colaborativo:** Intentar convertir Phoenix en un software para equipos o empresas. Es un instrumento personal e intransferible de rendimiento y soberanía mental.
