import { PERMISOS, type Permiso } from './permisos';

export const rolesSistema = [
  'SUPER_ADMIN',
  'DUENO',
  'ADMIN',
  'OPERATIVO',
  'AUDITOR_FINANCIERO',
  'USUARIO',
] as const;

export type RolSistema = (typeof rolesSistema)[number];
// Alias de retrocompatibilidad
export type RolUsuario = RolSistema;

/**
 * Matriz canónica de asignación de permisos por rol en el sistema.
 *
 * - SUPER_ADMIN: Acceso absoluto a la plataforma global y a todos los locales.
 * - DUENO: Titular del local con control total de su sede, personal y finanzas.
 * - ADMIN: Administrador operativo del local (altas, clientes, contratos, caja regular).
 * - OPERATIVO: Peritaje físico, subida multimedia a R2, check-in y check-out.
 * - AUDITOR_FINANCIERO: Acceso estrictamente de lectura contable, caja y cartera.
 * - USUARIO: Cliente final que consulta catálogo, crea reservas y ve sus alquileres.
 */
export const MATRIZ_ROLES_PERMISOS: Readonly<Record<RolSistema, readonly Permiso[]>> = {
  SUPER_ADMIN: Object.values(PERMISOS),

  DUENO: [
    // Flota
    PERMISOS.FLOTA_LEER,
    PERMISOS.FLOTA_CREAR,
    PERMISOS.FLOTA_ACTUALIZAR,
    PERMISOS.FLOTA_ELIMINAR,
    PERMISOS.FLOTA_CAMBIAR_ESTADO,
    // Clientes
    PERMISOS.CLIENTES_LEER,
    PERMISOS.CLIENTES_CREAR,
    PERMISOS.CLIENTES_ACTUALIZAR,
    PERMISOS.CLIENTES_VALIDAR_RIESGO,
    // Contratos
    PERMISOS.CONTRATOS_LEER,
    PERMISOS.CONTRATOS_CREAR,
    PERMISOS.CONTRATOS_MODIFICAR_TARIFA,
    PERMISOS.CONTRATOS_FINALIZAR,
    PERMISOS.CONTRATOS_ANULAR,
    // Inspecciones
    PERMISOS.INSPECCIONES_LEER,
    PERMISOS.INSPECCIONES_REGISTRAR,
    PERMISOS.INSPECCIONES_MULTIMEDIA_SUBIR,
    // Caja y Finanzas
    PERMISOS.CAJA_ABONOS_REGISTRAR,
    PERMISOS.CAJA_GASTOS_REGISTRAR,
    PERMISOS.CAJA_CARTERA_LEER,
    PERMISOS.CAJA_BALANCE_LEER,
    PERMISOS.CAJA_ARQUEO_CERRAR,
    // Terceros
    PERMISOS.PROPIETARIOS_LEER,
    PERMISOS.PROPIETARIOS_GESTIONAR,
    // Gestión del Local y Empleados
    PERMISOS.LOCAL_GESTIONAR,
    PERMISOS.LOCAL_TRANSFERIR,
    PERMISOS.TRABAJADORES_INVITAR,
    PERMISOS.TRABAJADORES_GESTIONAR,
    // Catálogo
    PERMISOS.CATALOGO_LEER,
  ],

  ADMIN: [
    PERMISOS.FLOTA_LEER,
    PERMISOS.FLOTA_CREAR,
    PERMISOS.FLOTA_ACTUALIZAR,
    PERMISOS.FLOTA_CAMBIAR_ESTADO,
    PERMISOS.CLIENTES_LEER,
    PERMISOS.CLIENTES_CREAR,
    PERMISOS.CLIENTES_ACTUALIZAR,
    PERMISOS.CLIENTES_VALIDAR_RIESGO,
    PERMISOS.CONTRATOS_LEER,
    PERMISOS.CONTRATOS_CREAR,
    PERMISOS.CONTRATOS_MODIFICAR_TARIFA,
    PERMISOS.CONTRATOS_FINALIZAR,
    PERMISOS.INSPECCIONES_LEER,
    PERMISOS.INSPECCIONES_REGISTRAR,
    PERMISOS.INSPECCIONES_MULTIMEDIA_SUBIR,
    PERMISOS.CAJA_ABONOS_REGISTRAR,
    PERMISOS.CAJA_GASTOS_REGISTRAR,
    PERMISOS.CAJA_CARTERA_LEER,
    PERMISOS.PROPIETARIOS_LEER,
    PERMISOS.CATALOGO_LEER,
  ],

  OPERATIVO: [
    PERMISOS.FLOTA_LEER,
    PERMISOS.FLOTA_CAMBIAR_ESTADO,
    PERMISOS.INSPECCIONES_LEER,
    PERMISOS.INSPECCIONES_REGISTRAR,
    PERMISOS.INSPECCIONES_MULTIMEDIA_SUBIR,
    PERMISOS.CATALOGO_LEER,
  ],

  AUDITOR_FINANCIERO: [
    PERMISOS.FLOTA_LEER,
    PERMISOS.CLIENTES_LEER,
    PERMISOS.CONTRATOS_LEER,
    PERMISOS.CAJA_CARTERA_LEER,
    PERMISOS.CAJA_BALANCE_LEER,
    PERMISOS.PROPIETARIOS_LEER,
  ],

  USUARIO: [
    PERMISOS.CATALOGO_LEER,
    PERMISOS.MIS_ALQUILERES_LEER,
    PERMISOS.RESERVA_CREAR,
  ],
};

/** Devuelve `true` si el rol posee el permiso solicitado (PoLP). */
export function tienePermiso(rol: RolSistema, permisoRequerido: Permiso): boolean {
  const permisosAsignados = MATRIZ_ROLES_PERMISOS[rol] ?? [];
  return permisosAsignados.includes(permisoRequerido);
}

/**
 * Lanza error si el rol no tiene el permiso requerido.
 */
export function requirePermiso(
  rol: RolSistema,
  permisoRequerido: Permiso,
): void {
  if (!tienePermiso(rol, permisoRequerido)) {
    throw new Error(`Permiso insuficiente: se requiere '${permisoRequerido}'`);
  }
}
