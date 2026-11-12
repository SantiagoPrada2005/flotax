// Better Auth Core Schemas
export * from './auth';

// Multi-Tenant Rental Locales & RBAC Domain Schemas
export * from './locales';
export * from './politicas_local';
export * from './miembros';
export * from './permisos_miembro';
export * from './clientes_local';
export * from './invitaciones';
export * from './transferencias';
export * from './incidentes';

// Fleet, Documents & R2 Longitudinal Multimedia Domain Schemas
export * from './vehiculos';
export * from './documentos_vehiculo';
export * from './multimedia_vehiculo';
export * from './mantenimientos';

// Reservations, Legal Contracts & R2 Pericial Inspections Domain Schemas
export * from './reservas';
export * from './contratos';
export * from './eventos_alquiler';
export * from './inspecciones';

// Notifications, Treasury (Caja) & KYC Identity Verification Domain Schemas
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
