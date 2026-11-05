import { ActionError } from 'astro:actions';
import { tienePermiso } from './rbac';
import type { Permiso } from './permisos';
import type { UsuarioSesion, LocalActivoSesion } from './session';

export interface ContextWithLocals {
  locals: {
    usuario?: UsuarioSesion | null;
  };
}

/**
 * Guardia de servidor para Astro Actions y API endpoints.
 * Valida autenticación y permisos de forma declarativa en una sola línea.
 *
 * @example
 * ```ts
 * const usuario = requireAuth(context, PERMISOS.CATALOGO_LEER);
 * ```
 */
export function requireAuth(
  context: ContextWithLocals,
  permisoRequerido?: Permiso
): UsuarioSesion {
  const usuario = context.locals.usuario;

  if (!usuario) {
    throw new ActionError({
      code: 'UNAUTHORIZED',
      message: 'Debe iniciar sesión para ejecutar esta operación.',
    });
  }

  if (!usuario.activo) {
    throw new ActionError({
      code: 'FORBIDDEN',
      message: 'Su cuenta se encuentra inactiva o suspendida.',
    });
  }

  // Super administradores tienen autorización global
  if (usuario.esSuperAdmin) {
    return usuario;
  }

  if (permisoRequerido) {
    const sujeto = usuario.localActivo
      ? {
          rol: usuario.localActivo.rol,
          esSuperAdmin: usuario.esSuperAdmin,
          permisosConcedidos: usuario.localActivo.permisosConcedidos,
          permisosRevocados: usuario.localActivo.permisosRevocados,
        }
      : {
          rol: 'USUARIO' as const,
          esSuperAdmin: usuario.esSuperAdmin,
        };

    if (!tienePermiso(sujeto, permisoRequerido)) {
      throw new ActionError({
        code: 'FORBIDDEN',
        message: `No posee privilegios suficientes para la acción requerida (${permisoRequerido}).`,
      });
    }
  }

  return usuario;
}

/**
 * Guardia estricto para operaciones que OBLIGATORIAMENTE requieren un local activo
 * (ej. gestión de flota, caja, peritajes, invitaciones de personal).
 * Garantiza a TypeScript que `usuario.localActivo` no es nulo.
 *
 * @example
 * ```ts
 * const { localActivo } = requireLocalAuth(context, PERMISOS.CAJA_ABONOS_REGISTRAR);
 * console.log(localActivo.id); // Totalmente tipado
 * ```
 */
export function requireLocalAuth(
  context: ContextWithLocals,
  permisoRequerido?: Permiso
): UsuarioSesion & { localActivo: LocalActivoSesion } {
  const usuario = requireAuth(context, permisoRequerido);
  const localActivo = usuario.localActivo;

  if (!localActivo) {
    throw new ActionError({
      code: 'BAD_REQUEST',
      message: 'Debe seleccionar un local de alquiler activo para realizar esta operación.',
    });
  }

  return {
    ...usuario,
    localActivo,
  };
}
