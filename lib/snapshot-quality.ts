export type SnapshotQualityCheck = "revenue" | "revenueGrowth" | "forwardEps" | "operatingMargin" | "operatingCashFlow" | "capitalExpenditure" | "fiscal";

export const SNAPSHOT_QUALITY_WEIGHTS: Record<SnapshotQualityCheck, number> = {
  revenue: 15,
  revenueGrowth: 15,
  forwardEps: 14,
  operatingMargin: 14,
  operatingCashFlow: 28,
  capitalExpenditure: 10,
  fiscal: 4,
};

export type SnapshotQuality = {
  score: number;
  checks: Record<SnapshotQualityCheck, boolean>;
  missingChecks: SnapshotQualityCheck[];
  aiCaution: boolean;
  aiGuidance: string;
};

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function calculateSnapshotQuality(input: {
  revenue: number | null;
  revenueGrowth: number | null;
  forwardEps: number | null;
  operatingMargin: number | null;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  fiscalYear: string | null;
  fiscalPeriod: string | null;
  fiscalPeriodEnd: string | null;
}): SnapshotQuality {
  const checks = {
    revenue: isFiniteNumber(input.revenue),
    revenueGrowth: isFiniteNumber(input.revenueGrowth),
    forwardEps: isFiniteNumber(input.forwardEps),
    operatingMargin: isFiniteNumber(input.operatingMargin),
    operatingCashFlow: isFiniteNumber(input.operatingCashFlow),
    capitalExpenditure: isFiniteNumber(input.capitalExpenditure),
    fiscal: Boolean(input.fiscalYear && input.fiscalPeriod && input.fiscalPeriodEnd),
  } satisfies Record<SnapshotQualityCheck, boolean>;
  const missingChecks = (Object.keys(checks) as SnapshotQualityCheck[]).filter((key) => !checks[key]);
  const score = (Object.keys(checks) as SnapshotQualityCheck[]).reduce((total, key) => total + (checks[key] ? SNAPSHOT_QUALITY_WEIGHTS[key] : 0), 0);
  const aiCaution = score < 80;
  return {
    score,
    checks,
    missingChecks,
    aiCaution,
    aiGuidance: aiCaution
      ? `Snapshot Quality ${score}: 누락 데이터가 있어 AI 해석의 확신 수준을 낮춰야 합니다.`
      : `Snapshot Quality ${score}: 규칙 기반 분석에 사용할 수 있는 품질입니다.`,
  };
}

