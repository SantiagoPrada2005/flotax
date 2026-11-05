import { PERMISOS, type Permiso } from './permisos';

export const rolesSistema = [
  'SUPER_ADMIN',
  'DUENO',
  'ADMIN',
  'ASESOR',
  'ENCARGADO_FLOTA',
  'CONTADOR',
  'OPERATIVO',
  'AUDITOR_FINANCIERO',
  'USUARIO',
] as const;

export type RolSistema = (typeof rolesSistema)[number];
// Alias de retrocompatibilidad
export type RolUsuario = RolSistema;

export const modulosOperativosAdmin = [
  'PANEL',
  'RESERVAS_CONTRATOS',
  'ENTREGAS_RECEPCIONES',
  'CLIENTES',
  'FLOTA',
  'FINANZAS',
  'REPORTES',
  'CONFIGURACION',
] as const;
export type ModuloOperativoAdmin = (typeof modulosOperativosAdmin)[number];

/**
 * Sujeto de autorización que permite evaluar tanto un rol puro como un usuario
 * con overrides individuales (`permisosConcedidos` y `permisosRevocados` desde `permisos_miembro_local`).
 */
export interface SujetoAutorizacion {
  readonly rol: RolSistema;
  readonly esSuperAdmin?: boolean | undefined;
  readonly permisosConcedidos?: readonly Permiso[] | undefined;
  readonly permisosRevocados?: readonly Permiso[] | undefined;
}

const PERMISOS_ASESOR: readonly Permiso[] = [
  // Panel (Alertas ✓, Indicadores L)
  PERMISOS.PANEL_ALERTAS_LEER,
  PERMISOS.PANEL_ALERTAS_GESTIONAR,
  PERMISOS.PANEL_INDICADORES_LEER,
  // Reservas y contratos (✓)
  PERMISOS.RESERVAS_LEER,
  PERMISOS.RESERVAS_CREAR_MOSTRADOR,
  PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR,
  PERMISOS.CONTRATOS_LEER,
  PERMISOS.CONTRATOS_CREAR,
  PERMISOS.CONTRATOS_FINALIZAR,
  // Entregas y recepciones (Entrega ✓, Recepción ✓, Novedades R: registra pero no aprueba cargos)
  PERMISOS.INSPECCIONES_LEER,
  PERMISOS.INSPECCIONES_REGISTRAR,
  PERMISOS.INSPECCIONES_MULTIMEDIA_SUBIR,
  PERMISOS.NOVEDADES_REGISTRAR,
  // Clientes (✓)
  PERMISOS.CLIENTES_LEER,
  PERMISOS.CLIENTES_CREAR,
  PERMISOS.CLIENTES_ACTUALIZAR,
  PERMISOS.CLIENTES_VALIDAR_RIESGO,
  // Flota (L: lectura de unidades, documentos y mantenimientos)
  PERMISOS.FLOTA_LEER,
  PERMISOS.FLOTA_DOCUMENTOS_LEER,
  PERMISOS.FLOTA_MANTENIMIENTOS_LEER,
  // Finanzas (Pagos y abonos R: registra abonos de reservas)
  PERMISOS.CAJA_ABONOS_REGISTRAR,
  PERMISOS.CAJA_CARTERA_LEER,
  // Catálogo
  PERMISOS.CATALOGO_LEER,
];

const PERMISOS_ENCARGADO_FLOTA: readonly Permiso[] = [
  // Panel (Alertas ✓, Indicadores L)
  PERMISOS.PANEL_ALERTAS_LEER,
  PERMISOS.PANEL_ALERTAS_GESTIONAR,
  PERMISOS.PANEL_INDICADORES_LEER,
  // Reservas (Solicitudes y calendario L)
  PERMISOS.RESERVAS_LEER,
  // Entregas y recepciones (Entrega ✓, Recepción ✓, Novedades R)
  PERMISOS.INSPECCIONES_LEER,
  PERMISOS.INSPECCIONES_REGISTRAR,
  PERMISOS.INSPECCIONES_MULTIMEDIA_SUBIR,
  PERMISOS.NOVEDADES_REGISTRAR,
  // Flota (Unidades ✓, Documentos ✓, Mantenimientos ✓)
  PERMISOS.FLOTA_LEER,
  PERMISOS.FLOTA_CREAR,
  PERMISOS.FLOTA_ACTUALIZAR,
  PERMISOS.FLOTA_CAMBIAR_ESTADO,
  PERMISOS.FLOTA_DOCUMENTOS_LEER,
  PERMISOS.FLOTA_DOCUMENTOS_GESTIONAR,
  PERMISOS.FLOTA_MANTENIMIENTOS_LEER,
  PERMISOS.FLOTA_MANTENIMIENTOS_GESTIONAR,
  // Finanzas y Reportes (Gastos/Ganancia L, Ingresos/Ocupación L, Daños y uso L)
  PERMISOS.CAJA_BALANCE_LEER,
  PERMISOS.REPORTES_INGRESOS_OCUPACION_LEER,
  PERMISOS.REPORTES_DANOS_USO_LEER,
  // Configuración (Tipos y plantillas L)
  PERMISOS.CONFIG_PLANTILLAS_LEER,
  // Catálogo
  PERMISOS.CATALOGO_LEER,
];

const PERMISOS_CONTADOR: readonly Permiso[] = [
  // Panel (Alertas L, Indicadores ✓)
  PERMISOS.PANEL_ALERTAS_LEER,
  PERMISOS.PANEL_INDICADORES_LEER,
  // Reservas y contratos (L)
  PERMISOS.RESERVAS_LEER,
  PERMISOS.CONTRATOS_LEER,
  // Entregas y recepciones (Novedades y cargos L)
  PERMISOS.INSPECCIONES_LEER,
  // Clientes (L)
  PERMISOS.CLIENTES_LEER,
  // Flota (Documentos y alertas L, Mantenimientos L)
  PERMISOS.FLOTA_LEER,
  PERMISOS.FLOTA_DOCUMENTOS_LEER,
  PERMISOS.FLOTA_MANTENIMIENTOS_LEER,
  // Finanzas (✓)
  PERMISOS.CAJA_ABONOS_REGISTRAR,
  PERMISOS.CAJA_GASTOS_REGISTRAR,
  PERMISOS.CAJA_CARTERA_LEER,
  PERMISOS.CAJA_BALANCE_LEER,
  PERMISOS.CAJA_ARQUEO_CERRAR,
  // Reportes (✓)
  PERMISOS.REPORTES_INGRESOS_OCUPACION_LEER,
  PERMISOS.REPORTES_DANOS_USO_LEER,
  PERMISOS.REPORTES_EXPORTAR,
  // Propietarios y Auditoría
  PERMISOS.PROPIETARIOS_LEER,
  PERMISOS.AUDITORIA_LEER,
];

/**
 * Matriz canónica de asignación de permisos por rol en el sistema (DOC-UX-001 §13).
 *
 * - SUPER_ADMIN: Acceso absoluto a la plataforma global y a todos los locales.
 * - DUENO (Propietario): Titular del local con acceso completo a todos los módulos, plan y transferencia.
 * - ADMIN (Administrador): Gestiona operación, flota, finanzas y equipo; auditoría de lectura; no cambia plan ni transfiere propiedad.
 * - ASESOR: Atención comercial, reservas, contratos, clientes, entregas/recepciones y abonos.
 * - ENCARGADO_FLOTA: Gestión técnica de unidades, documentos, mantenimientos y peritajes R2.
 * - CONTADOR: Control financiero, caja, arqueos, gastos/ganancias por unidad y exportación de reportes.
 * - OPERATIVO: Alias operativo compatible con Encargado de Flota / Peritaje en terreno.
 * - AUDITOR_FINANCIERO: Alias compatible con Contador (lectura contable y auditoría).
 * - USUARIO: Cliente final que consulta catálogo, crea reservas y gestiona sus alquileres.
 */
export const MATRIZ_ROLES_PERMISOS: Readonly<Record<RolSistema, readonly Permiso[]>> = {
  SUPER_ADMIN: Object.values(PERMISOS),

  DUENO: [
    // Panel
    PERMISOS.PANEL_ALERTAS_LEER,
    PERMISOS.PANEL_ALERTAS_GESTIONAR,
    PERMISOS.PANEL_INDICADORES_LEER,
    // Reservas y Contratos
    PERMISOS.RESERVAS_LEER,
    PERMISOS.RESERVAS_CREAR_MOSTRADOR,
    PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR,
    PERMISOS.CONTRATOS_LEER,
    PERMISOS.CONTRATOS_CREAR,
    PERMISOS.CONTRATOS_MODIFICAR_TARIFA,
    PERMISOS.CONTRATOS_FINALIZAR,
    PERMISOS.CONTRATOS_ANULAR,
    // Entregas, Recepciones y Novedades R2
    PERMISOS.INSPECCIONES_LEER,
    PERMISOS.INSPECCIONES_REGISTRAR,
    PERMISOS.INSPECCIONES_MULTIMEDIA_SUBIR,
    PERMISOS.NOVEDADES_REGISTRAR,
    PERMISOS.NOVEDADES_CARGOS_APROBAR,
    // Clientes
    PERMISOS.CLIENTES_LEER,
    PERMISOS.CLIENTES_CREAR,
    PERMISOS.CLIENTES_ACTUALIZAR,
    PERMISOS.CLIENTES_VALIDAR_RIESGO,
    // Flota, Documentos y Mantenimientos
    PERMISOS.FLOTA_LEER,
    PERMISOS.FLOTA_CREAR,
    PERMISOS.FLOTA_ACTUALIZAR,
    PERMISOS.FLOTA_ELIMINAR,
    PERMISOS.FLOTA_CAMBIAR_ESTADO,
    PERMISOS.FLOTA_DOCUMENTOS_LEER,
    PERMISOS.FLOTA_DOCUMENTOS_GESTIONAR,
    PERMISOS.FLOTA_MANTENIMIENTOS_LEER,
    PERMISOS.FLOTA_MANTENIMIENTOS_GESTIONAR,
    // Caja y Finanzas
    PERMISOS.CAJA_ABONOS_REGISTRAR,
    PERMISOS.CAJA_GASTOS_REGISTRAR,
    PERMISOS.CAJA_CARTERA_LEER,
    PERMISOS.CAJA_BALANCE_LEER,
    PERMISOS.CAJA_ARQUEO_CERRAR,
    // Reportes
    PERMISOS.REPORTES_INGRESOS_OCUPACION_LEER,
    PERMISOS.REPORTES_DANOS_USO_LEER,
    PERMISOS.REPORTES_EXPORTAR,
    // Configuración y Gobierno del Local
    PERMISOS.CONFIG_PLANTILLAS_LEER,
    PERMISOS.CONFIG_PLANTILLAS_GESTIONAR,
    PERMISOS.CONFIG_TARIFAS_POLITICAS_LEER,
    PERMISOS.CONFIG_TARIFAS_POLITICAS_GESTIONAR,
    PERMISOS.LOCAL_GESTIONAR,
    PERMISOS.LOCAL_TRANSFERIR,
    PERMISOS.LOCAL_PLAN_CUENTA_GESTIONAR,
    PERMISOS.TRABAJADORES_INVITAR,
    PERMISOS.TRABAJADORES_GESTIONAR,
    PERMISOS.AUDITORIA_LEER,
    // Terceros y Catálogo
    PERMISOS.PROPIETARIOS_LEER,
    PERMISOS.PROPIETARIOS_GESTIONAR,
    PERMISOS.CATALOGO_LEER,
    PERMISOS.MIS_ALQUILERES_LEER,
    PERMISOS.RESERVA_CREAR,
  ],

  ADMIN: [
    PERMISOS.PANEL_ALERTAS_LEER,
    PERMISOS.PANEL_ALERTAS_GESTIONAR,
    PERMISOS.PANEL_INDICADORES_LEER,
    PERMISOS.RESERVAS_LEER,
    PERMISOS.RESERVAS_CREAR_MOSTRADOR,
    PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR,
    PERMISOS.CONTRATOS_LEER,
    PERMISOS.CONTRATOS_CREAR,
    PERMISOS.CONTRATOS_MODIFICAR_TARIFA,
    PERMISOS.CONTRATOS_FINALIZAR,
    PERMISOS.INSPECCIONES_LEER,
    PERMISOS.INSPECCIONES_REGISTRAR,
    PERMISOS.INSPECCIONES_MULTIMEDIA_SUBIR,
    PERMISOS.NOVEDADES_REGISTRAR,
    PERMISOS.NOVEDADES_CARGOS_APROBAR,
    PERMISOS.CLIENTES_LEER,
    PERMISOS.CLIENTES_CREAR,
    PERMISOS.CLIENTES_ACTUALIZAR,
    PERMISOS.CLIENTES_VALIDAR_RIESGO,
    PERMISOS.FLOTA_LEER,
    PERMISOS.FLOTA_CREAR,
    PERMISOS.FLOTA_ACTUALIZAR,
    PERMISOS.FLOTA_CAMBIAR_ESTADO,
    PERMISOS.FLOTA_DOCUMENTOS_LEER,
    PERMISOS.FLOTA_DOCUMENTOS_GESTIONAR,
    PERMISOS.FLOTA_MANTENIMIENTOS_LEER,
    PERMISOS.FLOTA_MANTENIMIENTOS_GESTIONAR,
    PERMISOS.CAJA_ABONOS_REGISTRAR,
    PERMISOS.CAJA_GASTOS_REGISTRAR,
    PERMISOS.CAJA_CARTERA_LEER,
    PERMISOS.CAJA_BALANCE_LEER,
    PERMISOS.CAJA_ARQUEO_CERRAR,
    PERMISOS.REPORTES_INGRESOS_OCUPACION_LEER,
    PERMISOS.REPORTES_DANOS_USO_LEER,
    PERMISOS.REPORTES_EXPORTAR,
    PERMISOS.CONFIG_PLANTILLAS_LEER,
    PERMISOS.CONFIG_PLANTILLAS_GESTIONAR,
    PERMISOS.CONFIG_TARIFAS_POLITICAS_LEER,
    PERMISOS.CONFIG_TARIFAS_POLITICAS_GESTIONAR,
    PERMISOS.LOCAL_GESTIONAR,
    PERMISOS.TRABAJADORES_INVITAR,
    PERMISOS.AUDITORIA_LEER,
    PERMISOS.PROPIETARIOS_LEER,
    PERMISOS.CATALOGO_LEER,
    PERMISOS.MIS_ALQUILERES_LEER,
    PERMISOS.RESERVA_CREAR,
  ],

  ASESOR: PERMISOS_ASESOR,
  ENCARGADO_FLOTA: PERMISOS_ENCARGADO_FLOTA,
  CONTADOR: PERMISOS_CONTADOR,

  // Aliases compatibles con membresías previas
  OPERATIVO: PERMISOS_ENCARGADO_FLOTA,
  AUDITOR_FINANCIERO: PERMISOS_CONTADOR,

  USUARIO: [
    PERMISOS.CATALOGO_LEER,
    PERMISOS.MIS_ALQUILERES_LEER,
    PERMISOS.RESERVA_CREAR,
  ],
};

const PERMISOS_ENTRADA_MODULO: Readonly<
  Record<ModuloOperativoAdmin, readonly Permiso[]>
> = {
  PANEL: [PERMISOS.PANEL_ALERTAS_LEER, PERMISOS.PANEL_INDICADORES_LEER],
  RESERVAS_CONTRATOS: [PERMISOS.RESERVAS_LEER, PERMISOS.CONTRATOS_LEER],
  ENTREGAS_RECEPCIONES: [
    PERMISOS.INSPECCIONES_LEER,
    PERMISOS.INSPECCIONES_REGISTRAR,
  ],
  CLIENTES: [PERMISOS.CLIENTES_LEER],
  FLOTA: [
    PERMISOS.FLOTA_LEER,
    PERMISOS.FLOTA_DOCUMENTOS_LEER,
    PERMISOS.FLOTA_MANTENIMIENTOS_LEER,
  ],
  FINANZAS: [
    PERMISOS.CAJA_CARTERA_LEER,
    PERMISOS.CAJA_BALANCE_LEER,
    PERMISOS.CAJA_ABONOS_REGISTRAR,
  ],
  REPORTES: [
    PERMISOS.REPORTES_INGRESOS_OCUPACION_LEER,
    PERMISOS.REPORTES_DANOS_USO_LEER,
  ],
  CONFIGURACION: [
    PERMISOS.CONFIG_PLANTILLAS_LEER,
    PERMISOS.CONFIG_TARIFAS_POLITICAS_LEER,
    PERMISOS.LOCAL_GESTIONAR,
  ],
};

function normalizarSujeto(
  sujetoORol: RolSistema | SujetoAutorizacion
): SujetoAutorizacion {
  if (typeof sujetoORol === 'string') {
    return { rol: sujetoORol };
  }
  return sujetoORol;
}

/**
 * Resuelve el conjunto efectivo de permisos de un rol o usuario aplicando:
 * 1. La matriz estricta del rol base (`MATRIZ_ROLES_PERMISOS[rol]`).
 * 2. Las concesiones individuales (`permisosConcedidos`).
 * 3. Las revocaciones individuales (`permisosRevocados`, con precedencia de seguridad).
 */
export function resolverPermisosEfectivos(
  sujetoORol: RolSistema | SujetoAutorizacion
): ReadonlySet<Permiso> {
  const sujeto = normalizarSujeto(sujetoORol);
  if (sujeto.esSuperAdmin || sujeto.rol === 'SUPER_ADMIN') {
    return new Set<Permiso>(Object.values(PERMISOS));
  }

  const base = MATRIZ_ROLES_PERMISOS[sujeto.rol] ?? [];
  const efectivos = new Set<Permiso>(base);

  if (sujeto.permisosConcedidos) {
    for (const p of sujeto.permisosConcedidos) {
      efectivos.add(p);
    }
  }

  if (sujeto.permisosRevocados) {
    for (const p of sujeto.permisosRevocados) {
      efectivos.delete(p);
    }
  }

  return efectivos;
}

/**
 * Devuelve `true` si el rol o sujeto posee el permiso solicitado (PoLP).
 */
export function tienePermiso(
  sujetoORol: RolSistema | SujetoAutorizacion,
  permisoRequerido: Permiso
): boolean {
  return resolverPermisosEfectivos(sujetoORol).has(permisoRequerido);
}

/**
 * Devuelve `true` si el rol o sujeto posee AL MENOS UNO de los permisos indicados.
 */
export function tieneAlgunPermiso(
  sujetoORol: RolSistema | SujetoAutorizacion,
  permisosRequeridos: readonly Permiso[]
): boolean {
  const efectivos = resolverPermisosEfectivos(sujetoORol);
  return permisosRequeridos.some((p) => efectivos.has(p));
}

/**
 * Devuelve `true` si el rol o sujeto posee TODOS los permisos indicados.
 */
export function tieneTodosLosPermisos(
  sujetoORol: RolSistema | SujetoAutorizacion,
  permisosRequeridos: readonly Permiso[]
): boolean {
  const efectivos = resolverPermisosEfectivos(sujetoORol);
  return permisosRequeridos.every((p) => efectivos.has(p));
}

/**
 * Determina si un colaborador puede visualizar y entrar a un módulo administrativo.
 */
export function puedeAccederModulo(
  sujetoORol: RolSistema | SujetoAutorizacion,
  modulo: ModuloOperativoAdmin
): boolean {
  const permisosEntrada = PERMISOS_ENTRADA_MODULO[modulo];
  return tieneAlgunPermiso(sujetoORol, permisosEntrada);
}

/**
 * Lanza error si el rol o sujeto no tiene el permiso requerido.
 */
export function requirePermiso(
  sujetoORol: RolSistema | SujetoAutorizacion,
  permisoRequerido: Permiso
): void {
  if (!tienePermiso(sujetoORol, permisoRequerido)) {
    throw new Error(`Permiso insuficiente: se requiere '${permisoRequerido}'`);
  }
}
