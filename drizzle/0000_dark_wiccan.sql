CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticker` text NOT NULL,
	`company_name` text NOT NULL,
	`theme_tags` text NOT NULL,
	`current_fwd_eps` real NOT NULL,
	`previous_fwd_eps` real NOT NULL,
	`eps_change_pct` real NOT NULL,
	`status` text NOT NULL,
	`snapshot_month` text NOT NULL,
	`revenue_growth` real,
	`rule_of_40` real,
	`fcf_margin` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_companies_ticker_month` ON `companies` (`ticker`,`snapshot_month`);--> statement-breakpoint
CREATE INDEX `idx_companies_status_change` ON `companies` (`status`,`eps_change_pct`);