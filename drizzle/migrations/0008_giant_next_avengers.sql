CREATE TABLE `eventos_alquiler` (
	`id` text PRIMARY KEY NOT NULL,
	`local_id` text NOT NULL,
	`reserva_id` text NOT NULL,
	`contrato_id` text,
	`vehiculo_id` text NOT NULL,
	`tipo_evento` text NOT NULL,
	`dias_delta` integer DEFAULT 0 NOT NULL,
	`fecha_bloqueo_inicio` text,
	`fecha_bloqueo_fin` text,
	`modalidad_tarifa` text,
	`monto_delta` integer DEFAULT 0 NOT NULL,
	`clausula_o_texto` text,
	`actor_id` text,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reserva_id`) REFERENCES `reservas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contrato_id`) REFERENCES `contratos_alquiler`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `eventos_alquiler_reserva_idx` ON `eventos_alquiler` (`reserva_id`,`creado_en`);--> statement-breakpoint
CREATE INDEX `eventos_alquiler_local_tipo_idx` ON `eventos_alquiler` (`local_id`,`tipo_evento`,`creado_en`);--> statement-breakpoint
CREATE INDEX `eventos_alquiler_vehiculo_idx` ON `eventos_alquiler` (`vehiculo_id`,`creado_en`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reservas` (
	`id` text PRIMARY KEY NOT NULL,
	`codigo` text NOT NULL,
	`local_id` text NOT NULL,
	`vehiculo_id` text NOT NULL,
	`cliente_id` text,
	`fecha_inicio` text NOT NULL,
	`fecha_fin` text NOT NULL,
	`fecha_fin_original` text,
	`fecha_devolucion_real` text,
	`dias_alquiler` integer NOT NULL,
	`estado` text DEFAULT 'PENDIENTE' NOT NULL,
	`modalidad_entrega` text DEFAULT 'PATIO_PRINCIPAL' NOT NULL,
	`direccion_entrega` text,
	`sede_nombre` text NOT NULL,
	`token_acceso_publico` text,
	`precio_dia_cotizado` integer NOT NULL,
	`subtotal_tarifa_cotizado` integer NOT NULL,
	`cobertura_pericial_cotizada` integer NOT NULL,
	`total_cotizado` integer NOT NULL,
	`modalidad_pago_inicial` text DEFAULT 'ABONO_30' NOT NULL,
	`metodo_abono_inicial` text DEFAULT 'TRANSFERENCIA_PSE' NOT NULL,
	`monto_abono_reportado` integer DEFAULT 0 NOT NULL,
	`referencia_abono_inicial` text,
	`contacto_nombre` text NOT NULL,
	`contacto_tipo_documento` text,
	`contacto_numero_documento` text,
	`contacto_categoria_licencia` text,
	`contacto_telefono` text NOT NULL,
	`contacto_correo` text,
	`ley_1581_aceptada` integer DEFAULT true NOT NULL,
	`autorizado_sin_documentos_por_id` text,
	`nota_autorizacion_documentos` text,
	`motivo_cancelacion` text,
	`cancelado_por_id` text,
	`cancelado_en` integer,
	`motivo_rechazo` text,
	`creado_por_id` text,
	`confirmado_por_id` text,
	`creado_en` integer NOT NULL,
	`actualizado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`autorizado_sin_documentos_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelado_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`creado_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`confirmado_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_reservas`("id", "codigo", "local_id", "vehiculo_id", "cliente_id", "fecha_inicio", "fecha_fin", "fecha_fin_original", "fecha_devolucion_real", "dias_alquiler", "estado", "modalidad_entrega", "direccion_entrega", "sede_nombre", "token_acceso_publico", "precio_dia_cotizado", "subtotal_tarifa_cotizado", "cobertura_pericial_cotizada", "total_cotizado", "modalidad_pago_inicial", "metodo_abono_inicial", "monto_abono_reportado", "referencia_abono_inicial", "contacto_nombre", "contacto_tipo_documento", "contacto_numero_documento", "contacto_categoria_licencia", "contacto_telefono", "contacto_correo", "ley_1581_aceptada", "autorizado_sin_documentos_por_id", "nota_autorizacion_documentos", "motivo_cancelacion", "cancelado_por_id", "cancelado_en", "motivo_rechazo", "creado_por_id", "confirmado_por_id", "creado_en", "actualizado_en") SELECT "id", "codigo", "local_id", "vehiculo_id", "cliente_id", "fecha_inicio", "fecha_fin", "fecha_fin_original", "fecha_devolucion_real", "dias_alquiler", "estado", "modalidad_entrega", "direccion_entrega", "sede_nombre", "token_acceso_publico", "precio_dia_cotizado", "subtotal_tarifa_cotizado", "cobertura_pericial_cotizada", "total_cotizado", "modalidad_pago_inicial", "metodo_abono_inicial", "monto_abono_reportado", "referencia_abono_inicial", "contacto_nombre", "contacto_tipo_documento", "contacto_numero_documento", "contacto_categoria_licencia", "contacto_telefono", "contacto_correo", "ley_1581_aceptada", "autorizado_sin_documentos_por_id", "nota_autorizacion_documentos", "motivo_cancelacion", "cancelado_por_id", "cancelado_en", "motivo_rechazo", "creado_por_id", "confirmado_por_id", "creado_en", "actualizado_en" FROM `reservas`;--> statement-breakpoint
DROP TABLE `reservas`;--> statement-breakpoint
ALTER TABLE `__new_reservas` RENAME TO `reservas`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `reservas_codigo_unique` ON `reservas` (`codigo`);--> statement-breakpoint
CREATE INDEX `reservas_vehiculo_fechas_idx` ON `reservas` (`vehiculo_id`,`estado`,`fecha_inicio`,`fecha_fin`);--> statement-breakpoint
CREATE INDEX `reservas_local_estado_idx` ON `reservas` (`local_id`,`estado`,`creado_en`);--> statement-breakpoint
CREATE INDEX `reservas_cliente_idx` ON `reservas` (`cliente_id`,`creado_en`);--> statement-breakpoint
CREATE TABLE `__new_contratos_alquiler` (
	`id` text PRIMARY KEY NOT NULL,
	`numero_contrato` text NOT NULL,
	`reserva_id` text NOT NULL,
	`local_id` text NOT NULL,
	`vehiculo_id` text NOT NULL,
	`cliente_id` text,
	`arrendatario_nombre` text NOT NULL,
	`arrendatario_tipo_documento` text,
	`arrendatario_numero_documento` text,
	`arrendatario_ciudad_expedicion` text,
	`arrendatario_licencia_numero` text,
	`arrendatario_licencia_categoria` text,
	`arrendatario_domicilio` text,
	`arrendatario_telefono` text NOT NULL,
	`arrendatario_correo` text,
	`autorizado_sin_documentos_por_id` text,
	`ley_1581_aceptada` integer DEFAULT true NOT NULL,
	`traslado_fotomultas_aceptado` integer DEFAULT true NOT NULL,
	`pagare_blanco_firmado` integer DEFAULT false NOT NULL,
	`fecha_hora_entrega_real` integer,
	`fecha_hora_devolucion_pactada` integer NOT NULL,
	`fecha_hora_devolucion_real` integer,
	`medidor_uso_entrega` integer NOT NULL,
	`medidor_uso_retorno` integer,
	`nivel_energia_entrega_pct` integer DEFAULT 100 NOT NULL,
	`nivel_energia_retorno_pct` integer,
	`canon_diario_pactado` integer NOT NULL,
	`subtotal_canon` integer NOT NULL,
	`cobertura_pericial` integer DEFAULT 0 NOT NULL,
	`cargos_mora` integer DEFAULT 0 NOT NULL,
	`cargos_novedades_danos` integer DEFAULT 0 NOT NULL,
	`cargos_combustible_lavado` integer DEFAULT 0 NOT NULL,
	`cargos_otros_local` integer DEFAULT 0 NOT NULL,
	`detalle_otros_cargos` text,
	`ajuste_descuento_local` integer DEFAULT 0 NOT NULL,
	`clausula_encargado` text,
	`total_liquidado` integer NOT NULL,
	`total_pagado` integer DEFAULT 0 NOT NULL,
	`saldo_pendiente` integer NOT NULL,
	`estado_pago` text DEFAULT 'PARCIAL' NOT NULL,
	`estado_contrato` text DEFAULT 'VIGENTE' NOT NULL,
	`motivo_anulacion` text,
	`anulado_por_id` text,
	`anulado_en` integer,
	`firma_arrendador_r2_key` text,
	`firma_arrendatario_r2_key` text,
	`contrato_pdf_r2_key` text,
	`creado_en` integer NOT NULL,
	`actualizado_en` integer NOT NULL,
	FOREIGN KEY (`reserva_id`) REFERENCES `reservas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`autorizado_sin_documentos_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`anulado_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_contratos_alquiler`("id", "numero_contrato", "reserva_id", "local_id", "vehiculo_id", "cliente_id", "arrendatario_nombre", "arrendatario_tipo_documento", "arrendatario_numero_documento", "arrendatario_ciudad_expedicion", "arrendatario_licencia_numero", "arrendatario_licencia_categoria", "arrendatario_domicilio", "arrendatario_telefono", "arrendatario_correo", "autorizado_sin_documentos_por_id", "ley_1581_aceptada", "traslado_fotomultas_aceptado", "pagare_blanco_firmado", "fecha_hora_entrega_real", "fecha_hora_devolucion_pactada", "fecha_hora_devolucion_real", "medidor_uso_entrega", "medidor_uso_retorno", "nivel_energia_entrega_pct", "nivel_energia_retorno_pct", "canon_diario_pactado", "subtotal_canon", "cobertura_pericial", "cargos_mora", "cargos_novedades_danos", "cargos_combustible_lavado", "cargos_otros_local", "detalle_otros_cargos", "ajuste_descuento_local", "clausula_encargado", "total_liquidado", "total_pagado", "saldo_pendiente", "estado_pago", "estado_contrato", "motivo_anulacion", "anulado_por_id", "anulado_en", "firma_arrendador_r2_key", "firma_arrendatario_r2_key", "contrato_pdf_r2_key", "creado_en", "actualizado_en") SELECT "id", "numero_contrato", "reserva_id", "local_id", "vehiculo_id", "cliente_id", "arrendatario_nombre", "arrendatario_tipo_documento", "arrendatario_numero_documento", "arrendatario_ciudad_expedicion", "arrendatario_licencia_numero", "arrendatario_licencia_categoria", "arrendatario_domicilio", "arrendatario_telefono", "arrendatario_correo", "autorizado_sin_documentos_por_id", "ley_1581_aceptada", "traslado_fotomultas_aceptado", "pagare_blanco_firmado", "fecha_hora_entrega_real", "fecha_hora_devolucion_pactada", "fecha_hora_devolucion_real", "medidor_uso_entrega", "medidor_uso_retorno", "nivel_energia_entrega_pct", "nivel_energia_retorno_pct", "canon_diario_pactado", "subtotal_canon", "cobertura_pericial", "cargos_mora", "cargos_novedades_danos", "cargos_combustible_lavado", "cargos_otros_local", "detalle_otros_cargos", "ajuste_descuento_local", "clausula_encargado", "total_liquidado", "total_pagado", "saldo_pendiente", "estado_pago", "estado_contrato", "motivo_anulacion", "anulado_por_id", "anulado_en", "firma_arrendador_r2_key", "firma_arrendatario_r2_key", "contrato_pdf_r2_key", "creado_en", "actualizado_en" FROM `contratos_alquiler`;--> statement-breakpoint
DROP TABLE `contratos_alquiler`;--> statement-breakpoint
ALTER TABLE `__new_contratos_alquiler` RENAME TO `contratos_alquiler`;--> statement-breakpoint
CREATE UNIQUE INDEX `contratos_alquiler_numero_contrato_unique` ON `contratos_alquiler` (`numero_contrato`);--> statement-breakpoint
CREATE UNIQUE INDEX `contratos_alquiler_reserva_id_unique` ON `contratos_alquiler` (`reserva_id`);--> statement-breakpoint
CREATE INDEX `contratos_local_estado_idx` ON `contratos_alquiler` (`local_id`,`estado_contrato`,`estado_pago`);--> statement-breakpoint
CREATE INDEX `contratos_vehiculo_idx` ON `contratos_alquiler` (`vehiculo_id`,`creado_en`);