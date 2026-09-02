ALTER TABLE `fundamental_snapshots` ADD `latest_fiscal_year` text;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `latest_fiscal_period` text;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `latest_period_end` text;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `latest_quarter_eps` real;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `prior_year_quarter_eps` real;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `eps_yoy_pct` real;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `eps_yoy_status` text;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `eps_change_amount` real;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `latest_quarter_revenue` real;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `prior_year_quarter_revenue` real;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `revenue_yoy_pct` real;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `ntm_eps` real;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `ntm_components` text;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `ntm_eps_change_1m_pct` real;--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `ntm_eps_change_3m_pct` real;
