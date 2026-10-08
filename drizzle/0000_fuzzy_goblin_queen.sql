CREATE TABLE `cloud_charges` (
	`id` text PRIMARY KEY NOT NULL,
	`month` text NOT NULL,
	`user_id` text NOT NULL,
	`charged_micro` integer NOT NULL,
	`status` text NOT NULL,
	`created_ms` integer NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cloud_charges_month` ON `cloud_charges` (`month`);--> statement-breakpoint
CREATE INDEX `cloud_charges_status` ON `cloud_charges` (`status`);--> statement-breakpoint
CREATE INDEX `cloud_charges_created` ON `cloud_charges` (`created_ms`);