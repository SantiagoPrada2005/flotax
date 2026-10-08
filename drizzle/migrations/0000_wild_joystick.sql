CREATE TABLE `usuarios_admin` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`correo` text NOT NULL,
	`password_hash` text NOT NULL,
	`rol` text DEFAULT 'OPERATIVO' NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` integer NOT NULL,
	`actualizado_en` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_admin_correo_unique` ON `usuarios_admin` (`correo`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`telefono` text,
	`tipo_documento` text,
	`numero_documento` text,
	`es_super_admin` integer DEFAULT false NOT NULL,
	`local_origen_id` text,
	`activo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `locales_alquiler` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`slug` text NOT NULL,
	`ciudad` text,
	`direccion` text,
	`telefono` text,
	`dueno_id` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` integer NOT NULL,
	`actualizado_en` integer NOT NULL,
	FOREIGN KEY (`dueno_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locales_alquiler_slug_unique` ON `locales_alquiler` (`slug`);--> statement-breakpoint
CREATE TABLE `miembros_local` (
	`id` text PRIMARY KEY NOT NULL,
	`local_id` text NOT NULL,
	`usuario_id` text NOT NULL,
	`rol` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`usuario_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `clientes_local` (
	`id` text PRIMARY KEY NOT NULL,
	`usuario_id` text NOT NULL,
	`local_id` text NOT NULL,
	`es_local_origen` integer DEFAULT false NOT NULL,
	`es_preferido` integer DEFAULT false NOT NULL,
	`ultima_visita_en` integer,
	`creado_en` integer NOT NULL,
	FOREIGN KEY (`usuario_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invitaciones_local` (
	`id` text PRIMARY KEY NOT NULL,
	`local_id` text NOT NULL,
	`email` text NOT NULL,
	`rol` text NOT NULL,
	`token` text NOT NULL,
	`invitado_por_id` text NOT NULL,
	`estado` text DEFAULT 'PENDIENTE' NOT NULL,
	`expira_en` integer NOT NULL,
	`creado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invitado_por_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitaciones_local_token_unique` ON `invitaciones_local` (`token`);--> statement-breakpoint
CREATE TABLE `historial_transferencias_local` (
	`id` text PRIMARY KEY NOT NULL,
	`local_id` text NOT NULL,
	`dueno_anterior_id` text NOT NULL,
	`nuevo_dueno_id` text NOT NULL,
	`motivo` text,
	`creado_en` integer NOT NULL,
	FOREIGN KEY (`local_id`) REFERENCES `locales_alquiler`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`dueno_anterior_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`nuevo_dueno_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
