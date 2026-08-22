ALTER TABLE `fundamental_snapshots` ADD `current_fy_estimate_fiscal_date` text;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `current_fy_eps` real;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `next_fy_estimate_fiscal_date` text;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `next_fy_eps` real;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `next_fy_revision_1m` real;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `next_fy_revision_3m` real;
