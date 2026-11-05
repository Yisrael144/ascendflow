CREATE TABLE `audits` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`workspace` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audits_scope` ON `audits` (`owner`,`workspace`,`at`);--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`workspace` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`email_key` text,
	`enrollment_key` text,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `records_scope` ON `records` (`owner`,`workspace`,`kind`);--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_email_unique` ON `records` (`owner`,`workspace`,`email_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `runs_enrollment_unique` ON `records` (`owner`,`workspace`,`enrollment_key`);