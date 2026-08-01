CREATE TABLE `api_payloads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`endpoint` text NOT NULL,
	`http_status` integer,
	`response_json` text,
	`error_message` text,
	`fetched_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_api_payloads_ticker_date` ON `api_payloads` (`ticker`,`snapshot_date`);--> statement-breakpoint
CREATE TABLE `fundamental_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`estimate_fiscal_date` text,
	`eps_definition` text NOT NULL,
	`annual_fwd_eps_estimate` real,
	`estimated_annual_revenue` real,
	`actual_trailing_revenue` real,
	`operating_income` real,
	`operating_margin` real,
	`free_cash_flow` real,
	`fcf_margin` real,
	`fwd_eps_change_pct` real,
	`estimated_revenue_change_pct` real,
	`operating_margin_change_pp` real,
	`fcf_margin_change_pp` real,
	`missing_fields` text NOT NULL,
	`collection_status` text NOT NULL,
	`collected_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_fundamental_snapshots_ticker_date` ON `fundamental_snapshots` (`ticker`,`snapshot_date`);--> statement-breakpoint
CREATE INDEX `idx_fundamental_snapshots_date_status` ON `fundamental_snapshots` (`snapshot_date`,`collection_status`);