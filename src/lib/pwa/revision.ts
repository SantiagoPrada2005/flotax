import type { AstroCookies } from 'astro';

/**
 * Cookie de revisión de navegación.
 *
 * No es un token de seguridad: su único propósito es formar parte de la clave de
 * caché del navegador mediante `Vary: Cookie`. Cuando una acción mutante la
 * renueva, las respuestas HTML cacheadas con el valor anterior dejan de coincidir
 * y la siguiente navegación vuelve a red para mostrar datos frescos.
 */
export const COOKIE_REVISION_NAVEGACION = 'flotax_rev';

const OPCIONES_REVISION = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24,
} as const;

/**
 * Renueva la revisión de navegación. Debe invocarse en cada acción que mute datos
 * de dominio (reservas, flota, caja, perfil, notificaciones, verificación).
 */
export function marcarRevisionNavegacion(
  cookies: Pick<AstroCookies, 'set'>
): void {
  cookies.set(COOKIE_REVISION_NAVEGACION, crypto.randomUUID(), OPCIONES_REVISION);
}
