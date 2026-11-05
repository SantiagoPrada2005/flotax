import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { localesAlquiler } from './locales';

/**
 * Políticas Operativas, Tarifarias y Datos Contractuales del Local (Relación 1:1 con locales_alquiler).
 * Responsabilidad única: Parametrizar porcentajes de abono, cobertura R2, sanciones de mora,
 * cargos operativos y datos legales del Arrendador para la generación de contratos.
 */
export const politicasLocal = sqliteTable('politicas_local', {
  id: text('id').primaryKey(),
  localId: text('local_id')
    .notNull()
    .unique()
    .references(() => localesAlquiler.id, { onDelete: 'cascade' }),

  // Reglas de reserva y liquidación automática
  abonoMinimoPct: integer('abono_minimo_pct').notNull().default(30),
  coberturaPericialPct: integer('cobertura_pericial_pct').notNull().default(8),
  recargoMoraDiariaPct: integer('recargo_mora_diaria_pct').notNull().default(200), // Cláusula 3: 200% diario
  recargoAdminFotomultaPct: integer('recargo_admin_fotomulta_pct').notNull().default(30), // Cláusula 6: 30%

  // Cargos por estado de retorno (Cláusula 8)
  cargoLavadoEstandar: integer('cargo_lavado_estandar').notNull().default(45000), // en COP
  limiteKmDiario: integer('limite_km_diario'), // NULL = kilometraje libre
  cargoKmAdicional: integer('cargo_km_adicional').notNull().default(0), // en COP

  // Datos legales del Arrendador para el Contrato de Arrendamiento Automotor
  nitArrendador: text('nit_arrendador'),
  representanteLegal: text('representante_legal'),
  municipioContractual: text('municipio_contractual').notNull().default('Medellín, Antioquia'),

  creadoEn: integer('creado_en', { mode: 'timestamp' }).notNull(),
  actualizadoEn: integer('actualizado_en', { mode: 'timestamp' }).notNull(),
});

export type PoliticaLocalSelect = typeof politicasLocal.$inferSelect;
export type PoliticaLocalInsert = typeof politicasLocal.$inferInsert;
