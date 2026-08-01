DROP TABLE IF EXISTS `api_payloads`;
--> statement-breakpoint
DROP TABLE IF EXISTS `fundamental_snapshots`;
--> statement-breakpoint
DROP TABLE IF EXISTS `companies`;
--> statement-breakpoint
CREATE TABLE `companies` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ticker` text NOT NULL,
  `company_name` text NOT NULL,
  `sector` text NOT NULL,
  `industry` text NOT NULL,
  `themes` text NOT NULL,
  `last_updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_ticker_unique` ON `companies` (`ticker`);
--> statement-breakpoint
CREATE TABLE `raw_metrics` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ticker` text NOT NULL,
  `snapshot_date` text NOT NULL,
  `fiscal_period` text NOT NULL,
  `metric` text NOT NULL,
  `value` real,
  `unit` text NOT NULL,
  `source_status` text NOT NULL,
  `is_missing` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_raw_metrics_ticker_date_metric` ON `raw_metrics` (`ticker`,`snapshot_date`,`metric`);
--> statement-breakpoint
CREATE INDEX `idx_raw_metrics_date` ON `raw_metrics` (`snapshot_date`);
--> statement-breakpoint
CREATE TABLE `derived_snapshots` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `ticker` text NOT NULL,
  `snapshot_date` text NOT NULL,
  `cfo_margin` real,
  `free_cash_flow` real,
  `fcf_margin` real,
  `capex_intensity` real,
  `classic_rule_of_40` real,
  `operating_rule_of_40` real,
  `cash_rule_of_40` real,
  `trend_direction` text NOT NULL,
  `screening_status` text NOT NULL,
  `screening_score` real NOT NULL,
  `reasons` text NOT NULL,
  `flags` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_derived_snapshots_ticker_date` ON `derived_snapshots` (`ticker`,`snapshot_date`);
--> statement-breakpoint
CREATE INDEX `idx_derived_snapshots_status_date` ON `derived_snapshots` (`screening_status`,`snapshot_date`);
