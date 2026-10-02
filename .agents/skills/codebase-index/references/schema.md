# Especificación y Esquema del Manifiesto `INDEX.md`

Este documento define el contrato formal que debe cumplir cada archivo `INDEX.md` generado en el repositorio.

---

## 1. Estructura Canónica

Cada `INDEX.md` debe respetar estrictamente las siguientes secciones:

```markdown
# Índice: `<ruta-relativa>`

**Responsabilidad**: <1-2 oraciones explicando el propósito del directorio y su frontera de dominio>
**Capa Arquitectónica**: <Capa técnica según Clean Architecture o DDD>

## Subdirectorios y Módulos Hijos

| Subdirectorio | Responsabilidad | Índice |
| :--- | :--- | :--- |
| [`nombre/`](./nombre/) | Propósito del submódulo | [INDEX.md](./nombre/INDEX.md) |

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`archivo.ts`](./archivo.ts) | <Rol funcional/patrón> | <Funciones, tipos o clases principales> | <Librerías o módulos externos> |

## Invariantes y Reglas del Directorio

- <Regla de frontera o convención arquitectónica>
- <Restricción de dependencias o estado>

<!-- Reconciled by codebase-index -->
```

---

## 2. Definición de Campos y Columnas

### Encabezado
- **Ruta Relativa**: Ruta desde la raíz del proyecto (e.g. `src/actions/` o `/` para la raíz).
- **Responsabilidad**: No una descripción genérica como "contiene archivos ts", sino el propósito del dominio (e.g. *"Gestión de la capa de orquestación de casos de uso y mutaciones del lado del servidor"*).
- **Capa Arquitectónica**: 
  - `Domain` (Entidades de negocio puras, reglas centrales)
  - `Application` (Casos de uso, Server Actions, orquestación)
  - `Infrastructure` (Base de datos Drizzle/D1, clientes externos, servicios Cloudflare)
  - `Presentation` (Páginas Astro, componentes visuales, layouts)
  - `Shared / Cross-Cutting` (Utilidades comunes, tipos transversales)

### Manifiesto de Archivos
1. **Archivo**: Nombre del archivo con enlace relativo Markdown (`[`nombre.ts`](./nombre.ts)`).
2. **Rol / Patrón**: Patrón arquitectónico o funcional (e.g., `Server Action`, `Drizzle Relational Schema`, `Factory / DB Client`, `Astro Island`, `Pure Utility`, `Type Definition`).
3. **Exports Públicos / API**: Lista concisa de símbolos exportados que otros módulos consumen (`getVehicles()`, `VehicleSchema`, `useAuth()`). No duplicar código ni tipos internos.
4. **Dependencias Clave**: Módulos externos o acoplamientos importantes (`drizzle-orm`, `zod`, `cloudflare:workers`).

### Invariantes y Reglas
Obligaciones técnicas del directorio. Ejemplos:
- *"Prohibido importar `@cloudflare/workers` en componentes de presentación del cliente."*
- *"Todas las funciones deben retornar tipos `Result<T, E>` validados con Zod."*

---

## 3. Principio de Brevedad y Alta Densidad Informativa

- Los índices deben tener una longitud óptima (típicamente entre 20 y 80 líneas).
- Nunca pegar código fuente dentro del `INDEX.md`.
- El objetivo del índice es permitir a un agente o desarrollador saber **qué hace cada archivo y cuál es su contrato público sin tener que abrir el archivo**.
