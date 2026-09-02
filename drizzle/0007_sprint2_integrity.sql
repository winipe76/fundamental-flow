ALTER TABLE `fundamental_snapshots` ADD `mapping_version` text;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `reported_currency` text;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `validation_status` text;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `validation_warnings` text;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `fmp_reported_free_cash_flow` real;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `fcf_variance` real;
--> statement-breakpoint
ALTER TABLE `fundamental_classifications` ADD `source_snapshot_date` text;
--> statement-breakpoint
DELETE FROM `api_payloads` WHERE `id` NOT IN (
  SELECT MAX(`id`) FROM `api_payloads` GROUP BY `ticker`, `snapshot_date`, `endpoint`
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_api_payloads_ticker_date_endpoint` ON `api_payloads` (`ticker`,`snapshot_date`,`endpoint`);

