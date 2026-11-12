/**
 * Define el modo de portal activo en la aplicación.
 * - 'CLIENTE': Interfaz orientada al consumidor/arrendatario (catálogo, reservas personales, dock de cliente).
 * - 'ADMIN': Interfaz orientada a operaciones de patio y administración (flota, entregas, caja, dock de operador).
 */
export type ModoPortal = 'CLIENTE' | 'ADMIN';

export const COOKIE_PORTAL_MODO = 'movix_portal_modo';

export interface UsuarioCapacidadPortal {
  esSuperAdmin: boolean;
  tieneRolPatio: boolean;
}

/**
 * Resuelve determinísticamente el modo de portal inicial o persistido para un usuario.
 * - Usuarios sin permisos de patio/administración: siempre 'CLIENTE'.
 * - Operarios/SuperAdmins con cookie explícita ('CLIENTE' | 'ADMIN'): respetan su preferencia persistida.
 * - Operarios/SuperAdmins sin cookie o con valor inválido: 'ADMIN' por defecto (evita fugas a cliente).
 */
export function resolverModoPortalInicial(
  usuario: UsuarioCapacidadPortal,
  cookieModo?: string | null
): ModoPortal {
  const tieneCapacidadOperador = usuario.esSuperAdmin || usuario.tieneRolPatio;

  if (!tieneCapacidadOperador) {
    return 'CLIENTE';
  }

  if (cookieModo === 'CLIENTE') {
    return 'CLIENTE';
  }

  if (cookieModo === 'ADMIN') {
    return 'ADMIN';
  }

  return 'ADMIN';
}
