CREATE TABLE `fundamental_classifications` (
	`ticker` text PRIMARY KEY NOT NULL,
	`stage` text NOT NULL,
	`reason` text,
	`version` text DEFAULT 'fundamental-stage-v1' NOT NULL,
	`classified_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_fundamental_classifications_stage_updated` ON `fundamental_classifications` (`stage`,`updated_at`);
--> statement-breakpoint
INSERT INTO `fundamental_classifications` (`ticker`,`stage`,`reason`,`version`,`classified_at`,`updated_at`) VALUES
('MU','watch','3개월 검증 대상 · 경기순환 및 기저효과','fundamental-stage-v1','2026-08-12T00:00:00Z','2026-08-12T00:00:00Z'),
('TER','watch','3개월 검증 대상 · 반도체 테스트 수요','fundamental-stage-v1','2026-08-12T00:00:00Z','2026-08-12T00:00:00Z'),
('ALNY','watch','3개월 검증 대상 · 흑자 전환','fundamental-stage-v1','2026-08-12T00:00:00Z','2026-08-12T00:00:00Z'),
('PLTR','watch','3개월 검증 대상 · 구조적 성장','fundamental-stage-v1','2026-08-12T00:00:00Z','2026-08-12T00:00:00Z'),
('NVDA','watch','3개월 검증 대상 · 대형 성장 및 GAAP 영향','fundamental-stage-v1','2026-08-12T00:00:00Z','2026-08-12T00:00:00Z');

