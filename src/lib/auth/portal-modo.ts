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

/**
 * Evalúa si una ruta debe redirigir preventivamente según el modo de portal activo
 * y las capacidades de patio del usuario.
 * - Si `modoPortal === 'ADMIN'` y `tieneRolPatio` y visita `/reservas` o `/reservas/[codigo]`
 *   (excluyendo `/reservas/[codigo]/entrega`), redirige a `/admin/reservas` o `/admin/reservas/[codigo]`.
 * - Si visita `/admin` (excluyendo `/admin/onboarding`) sin rol de patio en modo `CLIENTE`,
 *   redirige a `/catalogo`.
 */
export function evaluarRedireccionModoPortal(
  pathname: string,
  modoPortal: ModoPortal,
  tieneRolPatio: boolean
): string | null {
  if (modoPortal === 'ADMIN' && tieneRolPatio) {
    if (pathname === '/reservas' || pathname === '/reservas/') {
      return '/admin/reservas';
    }

    const matchReservaDetalle = /^\/reservas\/([^/]+)\/?$/.exec(pathname);
    if (matchReservaDetalle && matchReservaDetalle[1]) {
      return `/admin/reservas/${matchReservaDetalle[1]}`;
    }

    return null;
  }

  if (
    modoPortal === 'CLIENTE' &&
    !tieneRolPatio &&
    (pathname === '/admin' || pathname.startsWith('/admin/')) &&
    !pathname.startsWith('/admin/onboarding')
  ) {
    return '/catalogo';
  }

  return null;
}
