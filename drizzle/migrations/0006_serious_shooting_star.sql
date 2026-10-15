CREATE TABLE `verificaciones_identidad` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text NOT NULL,
	`tipo_documento` text NOT NULL,
	`numero_documento` text NOT NULL,
	`documento_frente_key` text,
	`documento_dorso_key` text,
	`licencia_numero` text,
	`licencia_categoria` text,
	`licencia_vencimiento` text,
	`licencia_frente_key` text,
	`licencia_dorso_key` text,
	`estado` text DEFAULT 'PENDIENTE' NOT NULL,
	`motivo_rechazo` text,
	`verificado_en` integer,
	`creado_en` integer NOT NULL,
	`actualizado_en` integer NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
