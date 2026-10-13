# Index: `docs`

**Responsibility**: Documentación técnica, registros de decisiones arquitectónicas (ADRs), especificación del modelo de datos y lineamientos de UX/ergonomía.
**Architectural Layer**: Documentation / Architecture Knowledge Base

## File Manifest

| File | Role / Pattern | Public Exports / API | Key Dependencies |
| :--- | :--- | :--- | :--- |
| [`ADR_arquitectura_estilos_tailwind_v4_vite.md`](./ADR_arquitectura_estilos_tailwind_v4_vite.md) | ADR | Decisión de diseño: Tailwind v4 + Vite en Astro | Tailwind CSS v4, Vite |
| [`ADR_arquitectura_pwa_spa_client_router.md`](./ADR_arquitectura_pwa_spa_client_router.md) | ADR | Arquitectura PWA Standalone y Single Page App (SPA) con Astro 7 ClientRouter | `astro:transitions`, Service Worker, Web App Manifest |
| [`PRJ_arquitectura_y_stack_tecnico_alquiler_vehiculos.md`](./PRJ_arquitectura_y_stack_tecnico_alquiler_vehiculos.md) | Blueprint del Proyecto | Arquitectura global, Cloudflare D1, Astro, Better Auth y RBAC | Cloudflare D1, Better Auth |
| [`database.md`](./database.md) | Documento Técnico | Modelo relacional, tablas, tipos y diagramas ER de la base de datos | Drizzle ORM |
| [`mobile-inputs-and-ergonomics.md`](./mobile-inputs-and-ergonomics.md) | Lineamientos UX | Guía ergonómica para diseño táctil e interfaces móviles | - |
| [`user-flows.md`](./user-flows.md) | Documento Técnico & UX | User flows canónicos de FlotaX (Onboarding, Operación de reservas, Menú de personal, Roles y Matriz RBAC) | Mermaid |

## Invariants & Directory Rules

- All additions, deletions, or public API modifications must be reflected in this index.
- Maintain strict boundary encapsulation and domain layer separation.

<!-- Reconciled by codebase-index -->
