export const PERMISOS = {
  // --- MÓDULO FLOTA ---
  FLOTA_LEER: 'flota:leer',
  FLOTA_CREAR: 'flota:crear',
  FLOTA_ACTUALIZAR: 'flota:actualizar',
  FLOTA_ELIMINAR: 'flota:eliminar',
  FLOTA_CAMBIAR_ESTADO: 'flota:cambiar_estado',

  // --- MÓDULO CLIENTES ---
  CLIENTES_LEER: 'clientes:leer',
  CLIENTES_CREAR: 'clientes:crear',
  CLIENTES_ACTUALIZAR: 'clientes:actualizar',
  CLIENTES_VALIDAR_RIESGO: 'clientes:validar_riesgo',

  // --- MÓDULO CONTRATOS Y RESERVAS ---
  CONTRATOS_LEER: 'contratos:leer',
  CONTRATOS_CREAR: 'contratos:crear',
  CONTRATOS_MODIFICAR_TARIFA: 'contratos:modificar_tarifa',
  CONTRATOS_FINALIZAR: 'contratos:finalizar',
  CONTRATOS_ANULAR: 'contratos:anular',

  // --- MÓDULO INSPECCIONES ---
  INSPECCIONES_LEER: 'inspecciones:leer',
  INSPECCIONES_REGISTRAR: 'inspecciones:registrar',
  INSPECCIONES_MULTIMEDIA_SUBIR: 'inspecciones:multimedia_subir',

  // --- MÓDULO CAJA Y FINANZAS ---
  CAJA_ABONOS_REGISTRAR: 'caja:abonos_registrar',
  CAJA_GASTOS_REGISTRAR: 'caja:gastos_registrar',
  CAJA_CARTERA_LEER: 'caja:cartera_leer',
  CAJA_BALANCE_LEER: 'caja:balance_leer',
  CAJA_ARQUEO_CERRAR: 'caja:arqueo_cerrar',

  // --- PROPIETARIOS TERCEROS ---
  PROPIETARIOS_LEER: 'propietarios:leer',
  PROPIETARIOS_GESTIONAR: 'propietarios:gestionar',

  // --- ADMINISTRACIÓN DE LOCAL / TENANT ---
  LOCAL_GESTIONAR: 'local:gestionar',
  LOCAL_TRANSFERIR: 'local:transferir',
  TRABAJADORES_INVITAR: 'trabajadores:invitar',
  TRABAJADORES_GESTIONAR: 'trabajadores:gestionar',

  // --- ADMINISTRACIÓN GLOBAL DE PLATAFORMA ---
  USUARIOS_GESTIONAR: 'usuarios:gestionar',
  LOCALES_CREAR: 'locales:crear',

  // --- MÓDULO CATÁLOGO & CLIENTE FINAL ---
  CATALOGO_LEER: 'catalogo:leer',
  MIS_ALQUILERES_LEER: 'mis_alquileres:leer',
  RESERVA_CREAR: 'reserva:crear',
} as const;

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS];
