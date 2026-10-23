CREATE TABLE `ai_request_limits` (
	`bucket` text PRIMARY KEY NOT NULL,
	`requests` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_request_limits_expiry` ON `ai_request_limits` (`expires_at`);