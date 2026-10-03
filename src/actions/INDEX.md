# Índice: `src/actions`

**Responsabilidad**: Capa de aplicación y casos de uso del servidor (Astro Server Actions) con validación estricta de esquemas Zod y control RBAC multi-tenant.
**Capa Arquitectónica**: Application Layer / Server Actions

## Manifiesto de Archivos

| Archivo | Rol / Patrón | Exports Públicos / API | Dependencias Clave |
| :--- | :--- | :--- | :--- |
| [`caja.ts`](./caja.ts) | Server Action / Caso de Uso | `registrarAbono` | `astro:actions`, `zod`, `@/lib/auth` |

## Invariantes y Reglas del Directorio

- Todas las Server Actions deben usar `defineAction` y validar inputs mediante esquemas `zod`.
- Se debe verificar la autenticación multi-tenant y los permisos RBAC (`requireLocalAuth` / `PERMISOS`) antes de ejecutar cualquier mutación.
- Nunca exponer credenciales ni mutaciones sin aislamiento por `localId`.

<!-- Reconciled by codebase-index -->
