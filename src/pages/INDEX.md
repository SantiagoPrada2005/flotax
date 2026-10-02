# Índice: `src/pages`

**Responsabilidad**: Enrutamiento basado en archivos de Astro para páginas visuales y endpoints API REST.
**Capa Arquitectónica**: Presentation / API Routing Layer

## Subdirectorios y Módulos Hijos

| Subdirectorio | Responsabilidad | Índice |
| :--- | :--- | :--- |
| [`api/`](./api/) | Endpoints de API REST (e.g. Better Auth handler en `api/auth/[...all].ts`) | *(Submódulo API)* |

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`index.astro`](./index.astro) | Página / Ruta raíz `/` | Vista de inicio y dashboard | `@/layouts/LayoutAdmin.astro` |

## Invariantes y Reglas del Directorio

- Las rutas bajo `pages/` definen el árbol de navegación público del servidor.
- `api/auth/[...all].ts` despacha todas las peticiones de autenticación Better Auth mediante el método `auth.handler(request)`.

<!-- Reconciled by codebase-index -->
