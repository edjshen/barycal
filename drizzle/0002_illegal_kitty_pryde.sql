CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`k` text NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rate_limits_scope_k` ON `rate_limits` (`scope`,`k`);