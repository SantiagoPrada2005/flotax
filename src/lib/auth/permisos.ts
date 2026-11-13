export const PERMISOS = {
  // --- 1. MÓDULO PANEL DE CONTROL ---
  PANEL_ALERTAS_LEER: 'panel:alertas_leer',
  PANEL_ALERTAS_GESTIONAR: 'panel:alertas_gestionar',
  PANEL_INDICADORES_LEER: 'panel:indicadores_leer',

  // --- 2. MÓDULO RESERVAS Y CONTRATOS ---
  RESERVAS_LEER: 'reservas:leer',
  RESERVAS_CREAR_MOSTRADOR: 'reservas:crear_mostrador',
  RESERVAS_CONFIRMAR_RECHAZAR: 'reservas:confirmar_rechazar',
  CONTRATOS_LEER: 'contratos:leer',
  CONTRATOS_CREAR: 'contratos:crear',
  CONTRATOS_MODIFICAR_TARIFA: 'contratos:modificar_tarifa',
  CONTRATOS_FINALIZAR: 'contratos:finalizar',
  CONTRATOS_PAUSAR: 'contratos:pausar',
  CONTRATOS_ANULAR: 'contratos:anular',

  // --- 3. MÓDULO ENTREGAS, RECEPCIONES E INSPECCIÓN R2 ---
  INSPECCIONES_LEER: 'inspecciones:leer',
  INSPECCIONES_REGISTRAR: 'inspecciones:registrar',
  INSPECCIONES_MULTIMEDIA_SUBIR: 'inspecciones:multimedia_subir',
  NOVEDADES_REGISTRAR: 'novedades:registrar',
  NOVEDADES_CARGOS_APROBAR: 'novedades:cargos_aprobar',

  // --- 4. MÓDULO CLIENTES Y KYC ---
  CLIENTES_LEER: 'clientes:leer',
  CLIENTES_CREAR: 'clientes:crear',
  CLIENTES_ACTUALIZAR: 'clientes:actualizar',
  CLIENTES_VALIDAR_RIESGO: 'clientes:validar_riesgo',

  // --- 5. MÓDULO FLOTA, DOCUMENTOS Y MANTENIMIENTOS ---
  FLOTA_LEER: 'flota:leer',
  FLOTA_CREAR: 'flota:crear',
  FLOTA_ACTUALIZAR: 'flota:actualizar',
  FLOTA_ELIMINAR: 'flota:eliminar',
  FLOTA_CAMBIAR_ESTADO: 'flota:cambiar_estado',
  FLOTA_DOCUMENTOS_LEER: 'flota:documentos_leer',
  FLOTA_DOCUMENTOS_GESTIONAR: 'flota:documentos_gestionar',
  FLOTA_MANTENIMIENTOS_LEER: 'flota:mantenimientos_leer',
  FLOTA_MANTENIMIENTOS_GESTIONAR: 'flota:mantenimientos_gestionar',

  // --- 6. MÓDULO FINANZAS Y CAJA ---
  CAJA_ABONOS_REGISTRAR: 'caja:abonos_registrar',
  CAJA_GASTOS_REGISTRAR: 'caja:gastos_registrar',
  CAJA_CARTERA_LEER: 'caja:cartera_leer',
  CAJA_BALANCE_LEER: 'caja:balance_leer',
  CAJA_ARQUEO_CERRAR: 'caja:arqueo_cerrar',

  // --- 7. MÓDULO REPORTES Y ANALÍTICA ---
  REPORTES_INGRESOS_OCUPACION_LEER: 'reportes:ingresos_ocupacion_leer',
  REPORTES_DANOS_USO_LEER: 'reportes:danos_uso_leer',
  REPORTES_EXPORTAR: 'reportes:exportar',

  // --- 8. MÓDULO CONFIGURACIÓN Y GOBERNANZA DE LOCAL ---
  CONFIG_PLANTILLAS_LEER: 'config:plantillas_leer',
  CONFIG_PLANTILLAS_GESTIONAR: 'config:plantillas_gestionar',
  CONFIG_TARIFAS_POLITICAS_LEER: 'config:tarifas_politicas_leer',
  CONFIG_TARIFAS_POLITICAS_GESTIONAR: 'config:tarifas_politicas_gestionar',
  LOCAL_GESTIONAR: 'local:gestionar',
  LOCAL_TRANSFERIR: 'local:transferir',
  LOCAL_PLAN_CUENTA_GESTIONAR: 'local:plan_cuenta_gestionar',
  TRABAJADORES_INVITAR: 'trabajadores:invitar',
  TRABAJADORES_GESTIONAR: 'trabajadores:gestionar',
  AUDITORIA_LEER: 'auditoria:leer',

  // --- 9. PROPIETARIOS TERCEROS Y PLATAFORMA GLOBAL ---
  PROPIETARIOS_LEER: 'propietarios:leer',
  PROPIETARIOS_GESTIONAR: 'propietarios:gestionar',
  USUARIOS_GESTIONAR: 'usuarios:gestionar',
  LOCALES_CREAR: 'locales:crear',

  // --- 10. MÓDULO CATÁLOGO & CLIENTE FINAL ---
  CATALOGO_LEER: 'catalogo:leer',
  MIS_ALQUILERES_LEER: 'mis_alquileres:leer',
  RESERVA_CREAR: 'reserva:crear',
} as const;

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS];

export const LISTA_PERMISOS_CANONICOS: readonly Permiso[] =
  Object.values(PERMISOS);
