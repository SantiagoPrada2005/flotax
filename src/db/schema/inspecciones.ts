import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { contratosAlquiler } from './contratos';
import { localesAlquiler } from './locales';
import { multimediaVehiculo } from './multimedia_vehiculo';
import { reservas } from './reservas';
import {
  categoriasVehiculo,
  unidadesMedidaUso,
  vehiculos,
} from './vehiculos';

export const tiposActoInspeccion = ['ENTREGA', 'RECEPCION'] as const;
export type TipoActoInspeccion = (typeof tiposActoInspeccion)[number];

export const estadosGeneralesInspeccion = [
  'IMPECABLE',
  'OPTIMO',
  'CON_NOVEDAD',
] as const;
export type EstadoGeneralInspeccion =
  (typeof estadosGeneralesInspeccion)[number];

export const estadosPuntoInspeccionR2 = [
  'ORIGINAL',
  'VERIFICADO',
  'PROTEGIDO',
  'NOVEDAD',
] as const;
export type EstadoPuntoInspeccionR2 =
  (typeof estadosPuntoInspeccionR2)[number];

export const gravedadesNovedadInspeccion = [
  'LEVE',
  'MODERADA',
  'GRAVE',
] as const;
export type GravedadNovedadInspeccion =
  (typeof gravedadesNovedadInspeccion)[number];

export const nivelesCalificacionServicio = [
  'SOBRESALIENTE',
  'MUY_BUENO',
  'REGULAR',
  'ATENCION_REQUERIDA',
] as const;
export type NivelCalificacionServicio =
  (typeof nivelesCalificacionServicio)[number];

export const nivelesDesempenoVehiculo = [
  'IMPECABLE',
  'OPTIMO',
  'DETALLE_MENOR',
] as const;
export type NivelDesempenoVehiculo =
  (typeof nivelesDesempenoVehiculo)[number];

export const nivelesCombustibleEntregaCliente = [
  'MISMO_NIVEL',
  'CARGA_COMPLETA',
  'RECARGA_PENDIENTE',
] as const;
export type NivelCombustibleEntregaCliente =
  (typeof nivelesCombustibleEntregaCliente)[number];

export interface ItemDefinicionPlantillaInspeccion {
  codigo: string;
  nombre: string;
  categoriaSeccion: string;
  tipoRespuesta: 'ESTADO' | 'NUMERO' | 'NIVEL' | 'SI_NO' | 'TEXTO' | 'FOTO';
  obligatorio: boolean;
  exigeFotoEnNovedad: boolean;
}

export interface RespuestaItemChecklistInspeccion {
  codigo: string;
  nombre: string;
  estado: 'BIEN' | 'CON_NOVEDAD' | 'NO_APLICA';
  valorTextoONumero?: string | number | boolean;
  observacion?: string;
  multimediaIds?: string[];
}

/**
 * 1. Plantillas Versionadas de Inspección por Tipo de Unidad.
 * Responsabilidad única: Definir la estructura versionada de ítems de revisión por categoría.
 */
export const plantillasInspeccion = sqliteTable(
  'plantillas_inspeccion',
  {
    id: text('id').primaryKey(),
    localId: text('local_id').references(() => localesAlquiler.id, {
      onDelete: 'cascade',
    }), // NULL = plantilla base canónica de la plataforma
    categoriaVehiculo: text('categoria_vehiculo', {
      enum: categoriasVehiculo,
    }).notNull(),
    nombre: text('nombre').notNull(),
    version: integer('version').notNull().default(1),
    unidadMedidaUso: text('unidad_medida_uso', { enum: unidadesMedidaUso })
      .notNull()
      .default('KM'),
    itemsDefinicion: text('items_definicion', { mode: 'json' })
      .$type<ItemDefinicionPlantillaInspeccion[]>()
      .notNull(),
    activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
    creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('plantillas_inspeccion_cat_idx').on(
      t.categoriaVehiculo,
      t.activo,
      t.version
    ),
  ]
);

export type PlantillaInspeccionSelect = typeof plantillasInspeccion.$inferSelect;
export type PlantillaInspeccionInsert = typeof plantillasInspeccion.$inferInsert;

/**
 * 2. Actas de Inspección Pericial (Entrega y Recepción de Unidades).
 * Responsabilidad única: Registrar el acto formal de entrega o devolución,
 * medidores de odómetro/energía, respuestas del checklist y firmas probatorias.
 */
export const inspeccionesPericiales = sqliteTable(
  'inspecciones_periciales',
  {
    id: text('id').primaryKey(),
    localId: text('local_id')
      .notNull()
      .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
    reservaId: text('reserva_id')
      .notNull()
      .references(() => reservas.id, { onDelete: 'cascade' }),
    contratoId: text('contrato_id').references(() => contratosAlquiler.id, {
      onDelete: 'set null',
    }),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id),
    plantillaId: text('plantilla_id').references(() => plantillasInspeccion.id),
    plantillaVersion: integer('plantilla_version').notNull().default(1),

    tipoActo: text('tipo_acto', { enum: tiposActoInspeccion }).notNull(),
    inspectorId: text('inspector_id')
      .notNull()
      .references(() => user.id),

    medidorUso: integer('medidor_uso').notNull(), // Lectura de km u horas de motor
    nivelEnergiaPct: integer('nivel_energia_pct').notNull(), // 0..100
    estadoGeneral: text('estado_general', { enum: estadosGeneralesInspeccion })
      .notNull()
      .default('IMPECABLE'),

    respuestasChecklist: text('respuestas_checklist', { mode: 'json' })
      .$type<RespuestaItemChecklistInspeccion[]>()
      .notNull(),
    observaciones: text('observaciones'),

    firmaClienteR2Key: text('firma_cliente_r2_key'),
    firmaResponsableR2Key: text('firma_responsable_r2_key'),
    actaPdfR2Key: text('acta_pdf_r2_key'),

    iniciadaEn: integer('iniciada_en', { mode: 'timestamp' }).notNull(),
    finalizadaEn: integer('finalizada_en', { mode: 'timestamp' }),
    creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('inspecciones_reserva_tipo_idx').on(t.reservaId, t.tipoActo),
    index('inspecciones_vehiculo_idx').on(t.vehiculoId, t.creadoEn),
  ]
);

export type InspeccionPericialSelect =
  typeof inspeccionesPericiales.$inferSelect;
export type InspeccionPericialInsert =
  typeof inspeccionesPericiales.$inferInsert;

/**
 * 3. Puntos Interactivos de Inspección 360° y Novedades R2.
 * Responsabilidad única: Representar los puntos verificados o novedades sobre la anatomía
 * del vehículo y vincular sus evidencias multimedia de salida vs. retorno en R2.
 */
export const puntosInspeccionR2 = sqliteTable(
  'puntos_inspeccion_r2',
  {
    id: text('id').primaryKey(),
    localId: text('local_id')
      .notNull()
      .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
    reservaId: text('reserva_id')
      .notNull()
      .references(() => reservas.id, { onDelete: 'cascade' }),
    inspeccionId: text('inspeccion_id').references(
      () => inspeccionesPericiales.id,
      { onDelete: 'set null' }
    ),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id, { onDelete: 'cascade' }),

    zona: text('zona').notNull(), // Ej: 'Carrocería y Pintura Superior'
    etiqueta: text('etiqueta').notNull(), // Ej: 'Pintura Original Sin Rayones'
    dictamen: text('dictamen').notNull(),
    estado: text('estado', { enum: estadosPuntoInspeccionR2 })
      .notNull()
      .default('VERIFICADO'),
    gravedad: text('gravedad', { enum: gravedadesNovedadInspeccion }),

    // Coordenadas porcentuales sobre el visor interactivo del vehículo
    coordX: text('coord_x').notNull().default('50%'),
    coordY: text('coord_y').notNull().default('50%'),

    // Vínculos directos al historial multimedia en R2 (comparativa Salida vs Retorno)
    multimediaEntregaId: text('multimedia_entrega_id').references(
      () => multimediaVehiculo.id,
      { onDelete: 'set null' }
    ),
    multimediaRetornoId: text('multimedia_retorno_id').references(
      () => multimediaVehiculo.id,
      { onDelete: 'set null' }
    ),

    costoEstimado: integer('costo_estimado').notNull().default(0), // en COP
    generaCargoCliente: integer('genera_cargo_cliente', { mode: 'boolean' })
      .notNull()
      .default(false),
    reparado: integer('reparado', { mode: 'boolean' }).notNull().default(false),

    creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
    actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('puntos_r2_reserva_idx').on(t.reservaId, t.estado),
    index('puntos_r2_vehiculo_novedades_idx').on(
      t.vehiculoId,
      t.estado,
      t.reparado
    ),
  ]
);

export type PuntoInspeccionR2Select = typeof puntosInspeccionR2.$inferSelect;
export type PuntoInspeccionR2Insert = typeof puntosInspeccionR2.$inferInsert;

/**
 * 4. Evaluaciones de Entrega y Devolución del Servicio por el Cliente (Wizard 100dvh).
 * Responsabilidad única: Almacenar el checklist de autoverificación y la calificación
 * de calidad del servicio completada por el cliente al cerrar el alquiler.
 */
export const evaluacionesEntregaCliente = sqliteTable(
  'evaluaciones_entrega_cliente',
  {
    id: text('id').primaryKey(),
    reservaId: text('reserva_id')
      .notNull()
      .unique()
      .references(() => reservas.id, { onDelete: 'cascade' }),
    localId: text('local_id')
      .notNull()
      .references(() => localesAlquiler.id, { onDelete: 'cascade' }),
    vehiculoId: text('vehiculo_id')
      .notNull()
      .references(() => vehiculos.id),
    clienteId: text('cliente_id').references(() => user.id),

    calificacionGeneral: text('calificacion_general', {
      enum: nivelesCalificacionServicio,
    }).notNull(),
    puntajeNumerico: integer('puntaje_numerico').notNull(), // 2..5
    aspectosDestacados: text('aspectos_destacados', { mode: 'json' })
      .$type<string[]>()
      .notNull(),
    desempenoVehiculo: text('desempeno_vehiculo', {
      enum: nivelesDesempenoVehiculo,
    }).notNull(),
    comentarioOpcional: text('comentario_opcional'),

    // Checklist de entrega física reportado por el conductor
    cabinaSinObjetos: integer('cabina_sin_objetos', { mode: 'boolean' })
      .notNull()
      .default(true),
    telemetriaVerificada: integer('telemetria_verificada', { mode: 'boolean' })
      .notNull()
      .default(true),
    llavesEntregadas: integer('llaves_entregadas', { mode: 'boolean' })
      .notNull()
      .default(true),
    combustibleNivel: text('combustible_nivel', {
      enum: nivelesCombustibleEntregaCliente,
    })
      .notNull()
      .default('MISMO_NIVEL'),

    completadaEn: integer('completada_en', { mode: 'timestamp' }).notNull(),
  }
);

export type EvaluacionEntregaClienteSelect =
  typeof evaluacionesEntregaCliente.$inferSelect;
export type EvaluacionEntregaClienteInsert =
  typeof evaluacionesEntregaCliente.$inferInsert;
