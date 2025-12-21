CREATE TABLE `food_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sprint_id` integer NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`item` text NOT NULL,
	`calories` real NOT NULL,
	`protein_g` real,
	`ai_estimated` integer DEFAULT false,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nutrition_sprints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`duration_days` integer NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text NOT NULL
);
