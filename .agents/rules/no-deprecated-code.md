# Rule: Zero-Tolerance Deprecated & Obsolete Code Governance (Modern API Standards & Zod 4 Compliance)

**Código:** RUL-FLX-018  
**Proyecto:** FlotaX — Sistema de Alquiler y Gestión de Flota de Vehículos  
**Directorio Fuente de Verdad:** [`src/`](file:///Users/santiago/proyectos/movix/src), [`package.json`](file:///Users/santiago/proyectos/movix/package.json)  
**Ámbito:** Todas las decisiones de implementación, generación de código, validación de esquemas y refactorizaciones en FlotaX.

---

## 1. Principio Fundamental: Tolerancia Cero al Código Obsoleto

Todo agente, desarrollador o asistente automatizado que opere sobre el repositorio de FlotaX tiene **estrictamente prohibido** introducir o mantener código, funciones, tipos o parámetros marcados como `@deprecated` (obsoletos) por TypeScript o por las librerías dependientes del proyecto.

Cualquier advertencia de compilación de TypeScript relacionada con obsolescencia (especialmente códigos diagnósticos **`TS6385`** y **`TS6387`**) constituye una **violación bloqueante** que debe resolverse inmediatamente antes de dar por concluida cualquier tarea.

---

## 2. Gobernanza Específica para Validación de Esquemas (Zod 4)

El proyecto utiliza **Zod v4** (`^4.6.5`). Las siguientes prácticas y patrones anteriores de Zod 3 están formalmente **prohibidos**:

### 2.1 Formato de Correos Electrónicos
- ❌ **PROHIBIDO**: `z.string().email(...)` *(método encadenado obsoleto)*.
- ✅ **CANÓNICO**: Usar la función de primer nivel `z.email(...)` o refinamiento explícito con `{ error: '...' }`:
  ```typescript
  // Correcto en Zod 4:
  const schema = z.object({
    correo: z.email({ error: 'Debe ser un correo electrónico válido' }),
  });
  ```

### 2.2 Formateo y Extracción de Errores
- ❌ **PROHIBIDO**: `error.flatten()` o `error.format()` *(métodos de instancia obsoletos)*.
- ✅ **CANÓNICO**: Usar `z.treeifyError(error)` o consumir directamente `error.issues`:
  ```typescript
  // Correcto en Zod 4:
  if (!parseResult.success) {
    const detalles = z.treeifyError(parseResult.error);
    const issues = parseResult.error.issues;
  }
  ```

### 2.3 Parámetro de Mensaje de Error
- ❌ **PROHIBIDO**: Pasar objetos `{ message: '...' }` a métodos de validación que esperan `{ error: '...' }`.
- ✅ **CANÓNICO**: Usar `{ error: 'Mensaje descriptivo' }`:
  ```typescript
  // Correcto en Zod 4:
  z.string().min(1, { error: 'El campo es obligatorio' });
  ```

---

## 3. Directrices Generales para Librerías del Stack

1. **Astro & Cloudflare Workers**:
   - Usar siempre las APIs modernas y tipadas provistas por `@astrojs/cloudflare` y `@cloudflare/workers-types`.
   - Prohibido recurrir a bindings o APIs legadas (`EmailMessage` crudo en lugar de `env.EMAIL.send(...)`).
2. **React 19 & Lucide Icons**:
   - Prohibido el uso de APIs descontinuadas de React (e.g. `defaultProps` en componentes funcionales, refs como strings).
   - Prohibido importar iconos o utilidades marcadas con aviso de deprecación en `lucide-react`.

---

## 4. Criterio de Aceptación Obligatorio en Cada Paso

Antes de concluir cualquier intervención:
1. Ejecutar:
   ```bash
   pnpm check
   ```
2. Constatar de forma obligatoria que el resultado refleje:
   ```
   Result (X files):
   - 0 errors
   - 0 warnings
   - 0 hints
   ```
   *(No se admiten excepciones ni advertencias de tipo hint o warning).*
3. Ejecutar `pnpm build` para confirmar que el empaquetado SSR y cliente para Cloudflare se genera sin fricción.
