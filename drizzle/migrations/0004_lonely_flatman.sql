CREATE TABLE `notificaciones` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text NOT NULL,
	`local_id` text,
	`tipo` text NOT NULL,
	`alcance` text NOT NULL,
	`prioridad` text DEFAULT 'NORMAL' NOT NULL,
	`titulo` text NOT NULL,
	`detalle` text,
	`href` text,
	`dedupe_key` text,
	`leida_en` integer,
	`creada_en` integer NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notificaciones_bandeja_idx` ON `notificaciones` (`usuario_id`,`leida_en`,`creada_en`);--> statement-breakpoint
CREATE UNIQUE INDEX `notificaciones_dedupe_idx` ON `notificaciones` (`usuario_id`,`dedupe_key`);--> statement-breakpoint
CREATE TABLE `suscripciones_push` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`agente` text,
	`creada_en` integer NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suscripciones_push_endpoint_unique` ON `suscripciones_push` (`endpoint`);--> statement-breakpoint
CREATE INDEX `suscripciones_push_usuario_idx` ON `suscripciones_push` (`usuario_id`);