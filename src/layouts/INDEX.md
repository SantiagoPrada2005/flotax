# Índice: `src/layouts`

**Responsabilidad**: Layouts estructurales compartidos para la interfaz de usuario en Astro.
**Capa Arquitectónica**: Presentation Layer

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`LayoutAdmin.astro`](./LayoutAdmin.astro) | Layout Astro Principal | Componente `<LayoutAdmin title="...">` | `@/styles/app.css` |

## Invariantes y Reglas del Directorio

- Los layouts deben proveer la estructura semántica HTML básica (`<!DOCTYPE html>`, `<head>`, `<body>`) y slots tipados.

<!-- Reconciled by codebase-index -->
