# Índice: `src/db`

**Responsabilidad**: Capa de persistencia relacional, esquemas de tablas Drizzle ORM y configuración de base de datos para SQLite / Cloudflare D1.
**Capa Arquitectónica**: Infrastructure / Data Layer

## Subdirectorios y Módulos Hijos

| Subdirectorio | Responsabilidad | Índice |
| :--- | :--- | :--- |
| [`schema/`](./schema/) | Definición de esquemas de tablas Drizzle ORM (Better Auth, Locales, Miembros, etc.) | [INDEX.md](./schema/INDEX.md) |

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| *(Ninguno)* | - | - | - |

## Invariantes y Reglas del Directorio

- Todas las modificaciones de esquema deben ejecutarse mediante migraciones versionadas de Drizzle.
- Los módulos externos deben consumir la base de datos a través de los clientes instanciados en `src/lib/` o Server Actions en `src/actions/`.

<!-- Reconciled by codebase-index -->
