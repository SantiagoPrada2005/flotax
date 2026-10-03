# Índice: `docs`

**Responsabilidad**: Documentación técnica, registros de decisiones arquitectónicas (ADRs), especificación del modelo de datos y lineamientos de UX/ergonomía.
**Capa Arquitectónica**: Documentation / Architecture Knowledge Base

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`ADR_arquitectura_estilos_tailwind_v4_vite.md`](./ADR_arquitectura_estilos_tailwind_v4_vite.md) | ADR | Decisión de diseño: Tailwind v4 + Vite en Astro | Tailwind CSS v4, Vite |
| [`PRJ_arquitectura_y_stack_tecnico_alquiler_vehiculos.md`](./PRJ_arquitectura_y_stack_tecnico_alquiler_vehiculos.md) | Blueprint del Proyecto | Arquitectura global, Cloudflare D1, Astro, Better Auth y RBAC | Cloudflare D1, Better Auth |
| [`database.md`](./database.md) | Documento Técnico | Modelo relacional, tablas, tipos y diagramas ER de la base de datos | Drizzle ORM |
| [`mobile-inputs-and-ergonomics.md`](./mobile-inputs-and-ergonomics.md) | Lineamientos UX | Guía ergonómica para diseño táctil e interfaces móviles | - |
| [`reactivity-architecture-audit.md`](./reactivity-architecture-audit.md) | Auditoría Técnica | Auditoría sobre reactividad y arquitectura de componentes | - |

## Invariantes y Reglas del Directorio

- Las decisiones estructurales significativas deben documentarse como un nuevo ADR en esta carpeta.
- Mantener la documentación sincronizada con los esquemas reales de `src/db/schema/`.

<!-- Reconciled by codebase-index -->
