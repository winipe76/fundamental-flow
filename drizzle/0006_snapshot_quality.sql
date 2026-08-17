ALTER TABLE `fundamental_snapshots` ADD `snapshot_quality_score` integer;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `snapshot_quality_checks` text;
--> statement-breakpoint
ALTER TABLE `fundamental_snapshots` ADD `snapshot_quality_caution` integer;
