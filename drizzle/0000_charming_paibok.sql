CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`duration` integer NOT NULL,
	`type` text NOT NULL,
	`sets` integer,
	`reps` text,
	`weight` text,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`days_per_week` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
