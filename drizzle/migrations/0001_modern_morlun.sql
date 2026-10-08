CREATE TABLE `incidentes_sistema` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`nivel` text NOT NULL,
	`mensaje` text NOT NULL,
	`modulo` text,
	`ocurrencias` integer DEFAULT 1 NOT NULL,
	`primera_vez` integer NOT NULL,
	`ultima_vez` integer NOT NULL,
	`ultimo_correo_en` integer,
	`estado` text DEFAULT 'ABIERTO' NOT NULL,
	`metadata` text,
	`creado_en` integer NOT NULL,
	`actualizado_en` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `incidentes_sistema_fingerprint_unique` ON `incidentes_sistema` (`fingerprint`);