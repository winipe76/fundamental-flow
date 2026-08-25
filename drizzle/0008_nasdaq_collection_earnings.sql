CREATE TABLE `collection_run_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`ticker` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`snapshot_date` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_collection_run_items_run_ticker` ON `collection_run_items` (`run_id`,`ticker`);--> statement-breakpoint
CREATE INDEX `idx_collection_run_items_status` ON `collection_run_items` (`run_id`,`status`);--> statement-breakpoint
CREATE TABLE `collection_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`status` text NOT NULL,
	`total_count` integer NOT NULL,
	`success_count` integer DEFAULT 0 NOT NULL,
	`partial_count` integer DEFAULT 0 NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_collection_runs_started` ON `collection_runs` (`started_at`);--> statement-breakpoint
ALTER TABLE `api_payloads` ADD `request_attempts` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `collection_runs` ADD `api_request_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `collection_runs` ADD `api_retry_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE TABLE `earnings_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`earnings_date` text NOT NULL,
	`actual_revenue` real,
	`revenue_consensus` real,
	`revenue_surprise` real,
	`revenue_surprise_pct` real,
	`actual_eps` real,
	`eps_consensus` real,
	`eps_surprise` real,
	`eps_surprise_pct` real,
	`management_revenue_guidance` text,
	`eps_guidance` text,
	`margin_guidance` text,
	`guidance_period` text,
	`guidance_announcement_date` text,
	`source_endpoint` text NOT NULL,
	`source_last_updated` text,
	`collected_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_earnings_events_ticker_date` ON `earnings_events` (`ticker`,`earnings_date`);--> statement-breakpoint
CREATE INDEX `idx_earnings_events_date` ON `earnings_events` (`earnings_date`);
