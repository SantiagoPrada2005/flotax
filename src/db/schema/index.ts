// Better Auth Core Schemas
export * from './auth';

// Multi-Tenant Rental Locales Domain Schemas
export * from './locales';
export * from './miembros';
export * from './clientes_local';
export * from './invitaciones';
export * from './transferencias';
export * from './incidentes';
export * from './vehiculos';
export * from './notificaciones';
export * from './caja';
export * from './verificaciones';

// Tabla histórica de administración (se conserva por compatibilidad del esquema D1).
// Sus alias NO deben colisionar con los de `@/lib/auth` (`RolUsuario`, `UsuarioAutenticado`).
export { usuarioAdmin, rolesValidos } from './usuarios_admin';
export type {
  RolUsuarioAdmin,
  UsuarioAdminPublico,
  UsuarioAdminSelect,
  UsuarioAdminInsert,
} from './usuarios_admin';
