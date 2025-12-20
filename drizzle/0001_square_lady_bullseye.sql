CREATE TABLE `heart_rate_variability` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`hrv_sdnn_ms` real NOT NULL,
	`source` text DEFAULT 'apple_health',
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `heart_rate_variability_date_unique` ON `heart_rate_variability` (`date`);