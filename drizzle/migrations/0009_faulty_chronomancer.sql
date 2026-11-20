ALTER TABLE `locales_alquiler` ADD `latitud` real;--> statement-breakpoint
ALTER TABLE `locales_alquiler` ADD `longitud` real;--> statement-breakpoint
ALTER TABLE `politicas_local` ADD `domicilio_habilitado` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `politicas_local` ADD `radio_cobertura_km` real DEFAULT 15 NOT NULL;--> statement-breakpoint
ALTER TABLE `politicas_local` ADD `km_incluidos_domicilio` real DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `politicas_local` ADD `tarifa_domicilio_base` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `politicas_local` ADD `tarifa_domicilio_por_km` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `politicas_local` ADD `zona_cobertura_etiqueta` text DEFAULT 'Medellín y Área Metropolitana' NOT NULL;--> statement-breakpoint
ALTER TABLE `reservas` ADD `entrega_latitud` real;--> statement-breakpoint
ALTER TABLE `reservas` ADD `entrega_longitud` real;--> statement-breakpoint
ALTER TABLE `reservas` ADD `entrega_referencia` text;--> statement-breakpoint
ALTER TABLE `reservas` ADD `distancia_entrega_km` real;--> statement-breakpoint
ALTER TABLE `reservas` ADD `recargo_entrega_domicilio` integer DEFAULT 0 NOT NULL;