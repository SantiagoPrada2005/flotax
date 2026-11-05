CREATE TABLE `politicas_local` (
	`id` text PRIMARY KEY NOT NULL,
	`local_id` text NOT NULL,
	`abono_minimo_pct` integer DEFAULT 30 NOT NULL,
	`cobertura_pericial_pct` integer DEFAULT 8 NOT NULL,
	`recargo_mora_diaria_pct` integer DEFAULT 200 NOT NULL,
	`recargo_admin_fotomulta_pct` integer DEFAULT 30 NOT NULL,
	`cargo_lavado_estandar` integer DEFAULT 45000 NOT NULL,
	`limite_km_diario` integer,
	`cargo_km_adicional` integer DEFAULT 0 NOT NULL,
	`nit_arrendador` text,
	`representante_legal` text,
	`municipio_contractual` text DEFAULT 'Medellín, Antioquia' NOT NULL,
	`creado_en` integer NOT NULL,
	`actualizado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `politicas_local_local_id_unique` ON `politicas_local` (`local_id`);--> statement-breakpoint
CREATE TABLE `permisos_miembro_local` (
	`id` text PRIMARY KEY NOT NULL,
	`miembro_id` text NOT NULL,
	`local_id` text NOT NULL,
	`usuario_id` text NOT NULL,
	`permiso` text NOT NULL,
	`efecto` text DEFAULT 'CONCEDER' NOT NULL,
	`motivo` text,
	`asignado_por_id` text NOT NULL,
	`creado_en` integer NOT NULL,
	FOREIGN KEY (`miembro_id`) REFERENCES `miembros_local`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`usuario_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asignado_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permisos_miembro_unico_idx` ON `permisos_miembro_local` (`miembro_id`,`permiso`);--> statement-breakpoint
CREATE INDEX `permisos_miembro_usuario_local_idx` ON `permisos_miembro_local` (`local_id`,`usuario_id`);--> statement-breakpoint
CREATE TABLE `documentos_vehiculo` (
	`id` text PRIMARY KEY NOT NULL,
	`local_id` text NOT NULL,
	`vehiculo_id` text NOT NULL,
	`tipo_documento` text NOT NULL,
	`numero_referencia` text,
	`entidad_emisora` text,
	`fecha_expedicion` text,
	`fecha_vencimiento` text,
	`vigente` integer DEFAULT true NOT NULL,
	`archivo_r2_key` text,
	`observaciones` text,
	`verificado_por_id` text,
	`creado_en` integer NOT NULL,
	`actualizado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`verificado_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `documentos_vehiculo_vigencia_idx` ON `documentos_vehiculo` (`vehiculo_id`,`tipo_documento`,`vigente`,`fecha_vencimiento`);--> statement-breakpoint
CREATE TABLE `multimedia_vehiculo` (
	`id` text PRIMARY KEY NOT NULL,
	`local_id` text NOT NULL,
	`vehiculo_id` text NOT NULL,
	`reserva_id` text,
	`contrato_id` text,
	`inspeccion_id` text,
	`mantenimiento_id` text,
	`tipo_medio` text DEFAULT 'IMAGEN' NOT NULL,
	`etapa_operativa` text NOT NULL,
	`zona_evidencia` text NOT NULL,
	`angulo_estudio` text,
	`es_portada_catalogo` integer DEFAULT false NOT NULL,
	`orden_visual` integer DEFAULT 0 NOT NULL,
	`r2_key` text NOT NULL,
	`poster_r2_key` text,
	`mime_type` text NOT NULL,
	`tamano_bytes` integer DEFAULT 0 NOT NULL,
	`ancho_px` integer,
	`alto_px` integer,
	`duracion_segundos` real,
	`sha256_hash` text,
	`medidor_uso_momento` integer,
	`observacion` text,
	`subido_por_id` text,
	`capturado_en` integer NOT NULL,
	`creado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reserva_id`) REFERENCES `reservas`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`contrato_id`) REFERENCES `contratos_alquiler`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`mantenimiento_id`) REFERENCES `mantenimientos_vehiculo`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`subido_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `multimedia_vehiculo_r2_key_unique` ON `multimedia_vehiculo` (`r2_key`);--> statement-breakpoint
CREATE INDEX `multimedia_vehiculo_historial_idx` ON `multimedia_vehiculo` (`vehiculo_id`,`capturado_en`);--> statement-breakpoint
CREATE INDEX `multimedia_vehiculo_reserva_etapa_idx` ON `multimedia_vehiculo` (`reserva_id`,`etapa_operativa`,`zona_evidencia`);--> statement-breakpoint
CREATE INDEX `multimedia_vehiculo_catalogo_idx` ON `multimedia_vehiculo` (`vehiculo_id`,`etapa_operativa`,`orden_visual`);--> statement-breakpoint
CREATE TABLE `mantenimientos_vehiculo` (
	`id` text PRIMARY KEY NOT NULL,
	`local_id` text NOT NULL,
	`vehiculo_id` text NOT NULL,
	`reserva_origen_id` text,
	`tipo` text DEFAULT 'PREVENTIVO' NOT NULL,
	`estado` text DEFAULT 'PROGRAMADO' NOT NULL,
	`etiqueta` text NOT NULL,
	`descripcion` text,
	`taller_proveedor` text,
	`fecha_inicio` text NOT NULL,
	`fecha_fin` text NOT NULL,
	`kilometraje_registro` integer,
	`costo_total` integer DEFAULT 0 NOT NULL,
	`movimiento_caja_id` text,
	`creado_por_id` text NOT NULL,
	`creado_en` integer NOT NULL,
	`actualizado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reserva_origen_id`) REFERENCES `reservas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`movimiento_caja_id`) REFERENCES `movimientos_caja`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`creado_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mantenimientos_vehiculo_fechas_idx` ON `mantenimientos_vehiculo` (`vehiculo_id`,`estado`,`fecha_inicio`,`fecha_fin`);--> statement-breakpoint
CREATE INDEX `mantenimientos_local_estado_idx` ON `mantenimientos_vehiculo` (`local_id`,`estado`);--> statement-breakpoint
CREATE TABLE `reservas` (
	`id` text PRIMARY KEY NOT NULL,
	`codigo` text NOT NULL,
	`local_id` text NOT NULL,
	`vehiculo_id` text NOT NULL,
	`cliente_id` text,
	`fecha_inicio` text NOT NULL,
	`fecha_fin` text NOT NULL,
	`dias_alquiler` integer NOT NULL,
	`estado` text DEFAULT 'PENDIENTE' NOT NULL,
	`modalidad_entrega` text DEFAULT 'PATIO_PRINCIPAL' NOT NULL,
	`direccion_entrega` text,
	`sede_nombre` text NOT NULL,
	`precio_dia_cotizado` integer NOT NULL,
	`subtotal_tarifa_cotizado` integer NOT NULL,
	`cobertura_pericial_cotizada` integer NOT NULL,
	`total_cotizado` integer NOT NULL,
	`modalidad_pago_inicial` text DEFAULT 'ABONO_30' NOT NULL,
	`metodo_abono_inicial` text DEFAULT 'TRANSFERENCIA_PSE' NOT NULL,
	`monto_abono_reportado` integer DEFAULT 0 NOT NULL,
	`referencia_abono_inicial` text,
	`contacto_nombre` text NOT NULL,
	`contacto_tipo_documento` text NOT NULL,
	`contacto_numero_documento` text NOT NULL,
	`contacto_categoria_licencia` text NOT NULL,
	`contacto_telefono` text NOT NULL,
	`contacto_correo` text NOT NULL,
	`ley_1581_aceptada` integer DEFAULT true NOT NULL,
	`motivo_rechazo` text,
	`creado_por_id` text,
	`confirmado_por_id` text,
	`creado_en` integer NOT NULL,
	`actualizado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`creado_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`confirmado_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservas_codigo_unique` ON `reservas` (`codigo`);--> statement-breakpoint
CREATE INDEX `reservas_vehiculo_fechas_idx` ON `reservas` (`vehiculo_id`,`estado`,`fecha_inicio`,`fecha_fin`);--> statement-breakpoint
CREATE INDEX `reservas_local_estado_idx` ON `reservas` (`local_id`,`estado`,`creado_en`);--> statement-breakpoint
CREATE INDEX `reservas_cliente_idx` ON `reservas` (`cliente_id`,`creado_en`);--> statement-breakpoint
CREATE TABLE `contratos_alquiler` (
	`id` text PRIMARY KEY NOT NULL,
	`numero_contrato` text NOT NULL,
	`reserva_id` text NOT NULL,
	`local_id` text NOT NULL,
	`vehiculo_id` text NOT NULL,
	`cliente_id` text,
	`arrendatario_nombre` text NOT NULL,
	`arrendatario_tipo_documento` text NOT NULL,
	`arrendatario_numero_documento` text NOT NULL,
	`arrendatario_ciudad_expedicion` text,
	`arrendatario_licencia_numero` text NOT NULL,
	`arrendatario_licencia_categoria` text NOT NULL,
	`arrendatario_domicilio` text,
	`arrendatario_telefono` text NOT NULL,
	`arrendatario_correo` text NOT NULL,
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
	`total_liquidado` integer NOT NULL,
	`total_pagado` integer DEFAULT 0 NOT NULL,
	`saldo_pendiente` integer NOT NULL,
	`estado_pago` text DEFAULT 'PARCIAL' NOT NULL,
	`estado_contrato` text DEFAULT 'VIGENTE' NOT NULL,
	`firma_arrendador_r2_key` text,
	`firma_arrendatario_r2_key` text,
	`contrato_pdf_r2_key` text,
	`creado_en` integer NOT NULL,
	`actualizado_en` integer NOT NULL,
	FOREIGN KEY (`reserva_id`) REFERENCES `reservas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contratos_alquiler_numero_contrato_unique` ON `contratos_alquiler` (`numero_contrato`);--> statement-breakpoint
CREATE UNIQUE INDEX `contratos_alquiler_reserva_id_unique` ON `contratos_alquiler` (`reserva_id`);--> statement-breakpoint
CREATE INDEX `contratos_local_estado_idx` ON `contratos_alquiler` (`local_id`,`estado_contrato`,`estado_pago`);--> statement-breakpoint
CREATE INDEX `contratos_vehiculo_idx` ON `contratos_alquiler` (`vehiculo_id`,`creado_en`);--> statement-breakpoint
CREATE TABLE `evaluaciones_entrega_cliente` (
	`id` text PRIMARY KEY NOT NULL,
	`reserva_id` text NOT NULL,
	`local_id` text NOT NULL,
	`vehiculo_id` text NOT NULL,
	`cliente_id` text,
	`calificacion_general` text NOT NULL,
	`puntaje_numerico` integer NOT NULL,
	`aspectos_destacados` text NOT NULL,
	`desempeno_vehiculo` text NOT NULL,
	`comentario_opcional` text,
	`cabina_sin_objetos` integer DEFAULT true NOT NULL,
	`telemetria_verificada` integer DEFAULT true NOT NULL,
	`llaves_entregadas` integer DEFAULT true NOT NULL,
	`combustible_nivel` text DEFAULT 'MISMO_NIVEL' NOT NULL,
	`completada_en` integer NOT NULL,
	FOREIGN KEY (`reserva_id`) REFERENCES `reservas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evaluaciones_entrega_cliente_reserva_id_unique` ON `evaluaciones_entrega_cliente` (`reserva_id`);--> statement-breakpoint
CREATE TABLE `inspecciones_periciales` (
	`id` text PRIMARY KEY NOT NULL,
	`local_id` text NOT NULL,
	`reserva_id` text NOT NULL,
	`contrato_id` text,
	`vehiculo_id` text NOT NULL,
	`plantilla_id` text,
	`plantilla_version` integer DEFAULT 1 NOT NULL,
	`tipo_acto` text NOT NULL,
	`inspector_id` text NOT NULL,
	`medidor_uso` integer NOT NULL,
	`nivel_energia_pct` integer NOT NULL,
	`estado_general` text DEFAULT 'IMPECABLE' NOT NULL,
	`respuestas_checklist` text NOT NULL,
	`observaciones` text,
	`firma_cliente_r2_key` text,
	`firma_responsable_r2_key` text,
	`acta_pdf_r2_key` text,
	`iniciada_en` integer NOT NULL,
	`finalizada_en` integer,
	`creado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reserva_id`) REFERENCES `reservas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contrato_id`) REFERENCES `contratos_alquiler`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`plantilla_id`) REFERENCES `plantillas_inspeccion`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`inspector_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `inspecciones_reserva_tipo_idx` ON `inspecciones_periciales` (`reserva_id`,`tipo_acto`);--> statement-breakpoint
CREATE INDEX `inspecciones_vehiculo_idx` ON `inspecciones_periciales` (`vehiculo_id`,`creado_en`);--> statement-breakpoint
CREATE TABLE `plantillas_inspeccion` (
	`id` text PRIMARY KEY NOT NULL,
	`local_id` text,
	`categoria_vehiculo` text NOT NULL,
	`nombre` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`unidad_medida_uso` text DEFAULT 'KM' NOT NULL,
	`items_definicion` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plantillas_inspeccion_cat_idx` ON `plantillas_inspeccion` (`categoria_vehiculo`,`activo`,`version`);--> statement-breakpoint
CREATE TABLE `puntos_inspeccion_r2` (
	`id` text PRIMARY KEY NOT NULL,
	`local_id` text NOT NULL,
	`reserva_id` text NOT NULL,
	`inspeccion_id` text,
	`vehiculo_id` text NOT NULL,
	`zona` text NOT NULL,
	`etiqueta` text NOT NULL,
	`dictamen` text NOT NULL,
	`estado` text DEFAULT 'VERIFICADO' NOT NULL,
	`gravedad` text,
	`coord_x` text DEFAULT '50%' NOT NULL,
	`coord_y` text DEFAULT '50%' NOT NULL,
	`multimedia_entrega_id` text,
	`multimedia_retorno_id` text,
	`costo_estimado` integer DEFAULT 0 NOT NULL,
	`genera_cargo_cliente` integer DEFAULT false NOT NULL,
	`reparado` integer DEFAULT false NOT NULL,
	`creado_en` integer NOT NULL,
	`actualizado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reserva_id`) REFERENCES `reservas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inspeccion_id`) REFERENCES `inspecciones_periciales`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`multimedia_entrega_id`) REFERENCES `multimedia_vehiculo`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`multimedia_retorno_id`) REFERENCES `multimedia_vehiculo`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `puntos_r2_reserva_idx` ON `puntos_inspeccion_r2` (`reserva_id`,`estado`);--> statement-breakpoint
CREATE INDEX `puntos_r2_vehiculo_novedades_idx` ON `puntos_inspeccion_r2` (`vehiculo_id`,`estado`,`reparado`);--> statement-breakpoint
ALTER TABLE `vehiculos` ADD `color` text;--> statement-breakpoint
ALTER TABLE `vehiculos` ADD `numero_motor` text;--> statement-breakpoint
ALTER TABLE `vehiculos` ADD `numero_chasis` text;--> statement-breakpoint
ALTER TABLE `vehiculos` ADD `valor_comercial` integer;--> statement-breakpoint
ALTER TABLE `vehiculos` ADD `unidad_medida_uso` text DEFAULT 'KM' NOT NULL;--> statement-breakpoint
ALTER TABLE `vehiculos` ADD `specs_bento` text;