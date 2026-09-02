ALTER TABLE `fundamental_snapshots` ADD `operating_cash_flow` real;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `capital_expenditure` real;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `cfo_margin` real;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `capex_intensity` real;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `classic_rule_40` real;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `operating_rule_40` real;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `cash_rule_40` real;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `forward_eps_basis` text;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `data_source` text;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `calculation_success` integer;

