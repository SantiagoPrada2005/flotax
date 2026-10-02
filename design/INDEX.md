# Índice: `design`

**Responsabilidad**: Diseños visuales vectoriales (Pencil / .pen), assets gráficos exportados y especificaciones UI/UX.
**Capa Arquitectónica**: Design System / Visual Assets

## Subdirectorios y Módulos Hijos

| Subdirectorio | Responsabilidad | Índice |
| :--- | :--- | :--- |
| [`design-assets/`](./design-assets/) | Assets gráficos crudos (SVG, PNG, iconos) | *(Directorio de Assets)* |
| [`exports/`](./exports/) | Componentes visuales exportados y renders HTML de diseño | *(Exportaciones HTML de Pencil)* |

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`design.pen`](./design.pen) | Archivo Fuente Pencil | Sistema de diseño de interfaces, tokens y mockups completos | Pencil App |

## Invariantes y Reglas del Directorio

- `design.pen` es la fuente canónica de diseño para tokens de color, componentes y layout.

<!-- Reconciled by codebase-index -->
