export interface ReservaAccesoLectura {
  readonly localId?: string | null | undefined;
  readonly clienteId?: string | null | undefined;
  readonly tokenAccesoPublico?: string | null | undefined;
}

export interface UsuarioAccesoLectura {
  readonly id: string;
  readonly esSuperAdmin?: boolean | null | undefined;
  readonly localActivo?: {
    readonly id: string;
    readonly rol?: string | null | undefined;
  } | null | undefined;
}

/**
 * Valida si un usuario o invitado tiene permiso de lectura sobre una reserva.
 * Reglas de acceso:
 * 1. Super Administrador global -> permitido.
 * 2. Colaborador asignado al mismo localId de la reserva -> permitido.
 * 3. Cliente dueño de la reserva (`usuario.id === reserva.clienteId`) -> permitido.
 * 4. Invitado con `tokenQuery` exacto que coincida con `reserva.tokenAccesoPublico` (ambos no vacíos) -> permitido.
 * 5. Cualquier otro caso -> denegado.
 */
export function validarAccesoReservaLectura(
  reserva: ReservaAccesoLectura | null | undefined,
  usuario: UsuarioAccesoLectura | null | undefined,
  tokenQuery?: string | null | undefined
): boolean {
  if (!reserva) {
    return false;
  }

  // 1. SuperAdmin
  if (usuario?.esSuperAdmin) {
    return true;
  }

  // 2. Colaborador en el mismo local
  if (usuario?.localActivo?.id && reserva.localId) {
    if (usuario.localActivo.id === reserva.localId) {
      return true;
    }
  }

  // 3. Cliente dueño
  if (usuario?.id && reserva.clienteId) {
    if (usuario.id === reserva.clienteId) {
      return true;
    }
  }

  // 4. Token de acceso público para invitados (o consulta con token)
  const tokenLimpio = typeof tokenQuery === 'string' ? tokenQuery.trim() : '';
  const tokenReserva =
    typeof reserva.tokenAccesoPublico === 'string'
      ? reserva.tokenAccesoPublico.trim()
      : '';

  if (tokenLimpio.length > 0 && tokenReserva.length > 0) {
    if (tokenLimpio === tokenReserva) {
      return true;
    }
  }

  return false;
}

/**
 * Determina si la ruta actual es una vista de detalle con token público de invitado:
 * - `/reservas/<codigo>` o `/reservas/<codigo>/entrega`
 * - con `?token=...` no vacío
 * Bloquea estrictamente `/reservas` (raíz), `/perfil`, `/admin/*` y cualquier ruta sin token.
 */
export function esRutaDetalleConTokenPublico(
  pathname: string,
  searchParams?:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | string
    | null
    | undefined
): boolean {
  if (!pathname || typeof pathname !== 'string') {
    return false;
  }

  // Normalizar pathname quitando trailing slash
  const pathNormalizado =
    pathname.endsWith('/') && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

  // Patrón exacto: /reservas/<codigo> o /reservas/<codigo>/entrega
  const match = pathNormalizado.match(/^\/reservas\/([^/]+)(?:\/entrega)?$/);
  if (!match) {
    return false;
  }

  const codigo = match[1];
  if (!codigo || codigo === 'entrega') {
    return false;
  }

  // Extraer token
  let token: string | null = null;
  if (searchParams instanceof URLSearchParams) {
    token = searchParams.get('token');
  } else if (typeof searchParams === 'string') {
    const sp = new URLSearchParams(searchParams);
    token = sp.get('token');
  } else if (searchParams && typeof searchParams === 'object') {
    const val = searchParams.token;
    token = Array.isArray(val)
      ? val[0] ?? null
      : typeof val === 'string'
        ? val
        : null;
  }

  return typeof token === 'string' && token.trim().length > 0;
}
