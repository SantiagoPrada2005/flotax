import type { RolSistema } from './rbac';

export interface LocalActivoSesion {
  id: string;
  nombre: string;
  slug: string;
  rol: RolSistema;
  esDueno: boolean;
}

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  esSuperAdmin: boolean;
  activo: boolean;
  localOrigenId: string | null;

  // Local en el que está interactuando en la sesión actual
  localActivo: LocalActivoSesion | null;
}

// Tipo de retrocompatibilidad
export type UsuarioAutenticado = {
  id: string;
  nombre: string;
  correo: string;
  rol: RolSistema;
  activo: boolean;
  localActivo?: LocalActivoSesion | null;
};

/**
 * Aserción para asegurar que existe un usuario autenticado.
 */
export function assertUsuarioAutenticado(
  usuario: UsuarioSesion | null
): asserts usuario is UsuarioSesion {
  if (!usuario) {
    throw new Error('Usuario no autenticado');
  }
  if (!usuario.activo) {
    throw new Error('Cuenta de usuario inactiva o suspendida');
  }
}

/**
 * Aserción para asegurar que el usuario tiene un local activo seleccionado
 * (Obligatorio para empleados y dueños).
 */
export function assertLocalActivo(
  usuario: UsuarioSesion
): asserts usuario is UsuarioSesion & { localActivo: LocalActivoSesion } {
  if (!usuario.localActivo) {
    throw new Error('Debe seleccionar un local de alquiler activo para operar');
  }
}
