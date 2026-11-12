/**
 * Define el modo de portal activo en la aplicación.
 * - 'CLIENTE': Interfaz orientada al consumidor/arrendatario (catálogo, reservas personales, dock de cliente).
 * - 'ADMIN': Interfaz orientada a operaciones de patio y administración (flota, entregas, caja, dock de operador).
 */
export type ModoPortal = 'CLIENTE' | 'ADMIN';

export const COOKIE_PORTAL_MODO = 'movix_portal_modo';

export const COOKIE_PORTAL_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30, // 30 días de persistencia
};

export interface UsuarioCapacidadPortal {
  esSuperAdmin: boolean;
  tieneRolPatio: boolean;
}

export interface UsuarioPerfilOperativo {
  esSuperAdmin: boolean;
  localActivo?: { rol: string } | null | undefined;
}

/**
 * Determina si un usuario posee capacidades operativas de patio (SuperAdmin o rol distinto a 'USUARIO').
 */
export function esUsuarioPersonal(
  usuario: UsuarioPerfilOperativo | null | undefined
): boolean {
  if (!usuario) {
    return false;
  }

  return Boolean(
    usuario.esSuperAdmin ||
      (usuario.localActivo && usuario.localActivo.rol !== 'USUARIO')
  );
}

/**
 * Sanitiza el parámetro `retorno` en el flujo de entrega para prevenir open-redirects.
 * Solo permite rutas internas relativas bajo `/admin` o `/reservas`, sin `//` ni backslashes (`\`).
 */
export function sanitizarRetornoEntrega(
  retornoParam?: string | null
): string | undefined {
  if (
    !retornoParam ||
    !retornoParam.startsWith('/') ||
    retornoParam.startsWith('//') ||
    retornoParam.includes('\\')
  ) {
    return undefined;
  }

  if (retornoParam.startsWith('/admin') || retornoParam.startsWith('/reservas')) {
    return retornoParam;
  }

  return undefined;
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

/**
 * Resuelve la variante visual del dock / barra superior ('admin' | 'client')
 * priorizando el atributo `data-portal-modo` del documento para evitar degradación
 * a la vista cliente cuando el operador navega por rutas compartidas (`/perfil`, `/configuracion`).
 */
export function resolverVarianteDock(
  pathname: string,
  datasetModo?: string,
  propVariant?: string
): 'admin' | 'client' {
  if (datasetModo === 'ADMIN') {
    return 'admin';
  }

  if (datasetModo === 'CLIENTE') {
    return 'client';
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/') || propVariant === 'admin') {
    return 'admin';
  }

  return 'client';
}
