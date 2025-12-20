-- Add flights_climbed column to daily_steps table
ALTER TABLE `daily_steps` ADD COLUMN `flights_climbed` integer DEFAULT 0;
--> statement-breakpoint

-- Create vo2max table
CREATE TABLE `vo2max` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`vo2max` real NOT NULL,
	`source` text DEFAULT 'apple_health',
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vo2max_date_unique` ON `vo2max` (`date`);
