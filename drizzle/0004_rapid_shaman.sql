ALTER TABLE `events` ADD `parent_id` text;--> statement-breakpoint
ALTER TABLE `events` ADD `original_date` text;--> statement-breakpoint
ALTER TABLE `events` ADD `cancelled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `recur_until` text;