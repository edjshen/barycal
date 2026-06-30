CREATE TABLE `admin_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`summary` text NOT NULL,
	`meta` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_created` ON `admin_audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_actor` ON `admin_audit_log` (`actor_id`);--> statement-breakpoint
CREATE TABLE `mfa_credentials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`secret_enc` text NOT NULL,
	`confirmed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `mfa_recovery_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`used_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `recovery_user` ON `mfa_recovery_codes` (`user_id`);--> statement-breakpoint
CREATE TABLE `platform_admins` (
	`user_id` text PRIMARY KEY NOT NULL,
	`granted_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `users` ADD `email` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);