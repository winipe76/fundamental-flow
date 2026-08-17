export type ScreeningStage = "newly_selected" | "continuing_improvement" | "watch" | "caution" | "excluded";

export type ScreeningThresholds = {
  minRevenueGrowth: number;
  minClassicRule40: number;
  minCashRule40: number;
  cautionQualityBelow: number;
  cautionForwardEpsChangeBelow: number;
  excludedRevenueGrowthBelow: number;
  excludedClassicRule40Below: number;
};

export const DEFAULT_SCREENING_THRESHOLDS: ScreeningThresholds = {
  minRevenueGrowth: 12,
  minClassicRule40: 40,
  minCashRule40: 40,
  cautionQualityBelow: 80,
  cautionForwardEpsChangeBelow: -5,
  excludedRevenueGrowthBelow: 0,
  excludedClassicRule40Below: 10,
};

export type ScreeningInput = {
  snapshotDate: string;
  collectionStatus: string;
  calculationSuccess: boolean;
  validationStatus: string;
  snapshotQualityScore: number | null;
  revenueGrowth: number | null;
  classicRule40: number | null;
  cashRule40: number | null;
  forwardEpsChangePct: number | null;
};

export type PreviousClassification = { stage: ScreeningStage; sourceSnapshotDate: string | null } | null;

export function classifySnapshot(input: ScreeningInput, previous: PreviousClassification, thresholds = DEFAULT_SCREENING_THRESHOLDS) {
  if (previous?.sourceSnapshotDate === input.snapshotDate) {
    return { stage: previous.stage, reason: "동일 Snapshot 재수집: 기존 분류 유지" };
  }
  if (input.collectionStatus !== "complete" || !input.calculationSuccess) {
    return { stage: "caution" as const, reason: "필수 Raw Data 누락 또는 계산 실패" };
  }
  if (input.validationStatus === "warning" || input.snapshotQualityScore === null || input.snapshotQualityScore < thresholds.cautionQualityBelow) {
    return { stage: "caution" as const, reason: `검증 경고 또는 Snapshot Quality ${input.snapshotQualityScore ?? "N/A"}%` };
  }
  if ((input.revenueGrowth ?? Infinity) < thresholds.excludedRevenueGrowthBelow || (input.classicRule40 ?? Infinity) < thresholds.excludedClassicRule40Below) {
    return { stage: "excluded" as const, reason: `Revenue Growth ${input.revenueGrowth?.toFixed(1)}%, Classic Rule40 ${input.classicRule40?.toFixed(1)}%` };
  }
  if (input.forwardEpsChangePct !== null && input.forwardEpsChangePct < thresholds.cautionForwardEpsChangeBelow) {
    return { stage: "caution" as const, reason: `Forward EPS 월간 변화 ${input.forwardEpsChangePct.toFixed(1)}%` };
  }
  const selected = (input.revenueGrowth ?? -Infinity) >= thresholds.minRevenueGrowth
    && (input.classicRule40 ?? -Infinity) >= thresholds.minClassicRule40
    && (input.cashRule40 ?? -Infinity) >= thresholds.minCashRule40;
  if (!selected) return { stage: "watch" as const, reason: `선정 기준 미충족: Revenue Growth ${input.revenueGrowth?.toFixed(1)}%, Classic Rule40 ${input.classicRule40?.toFixed(1)}%, Cash Rule40 ${input.cashRule40?.toFixed(1)}%` };
  const continuing = previous?.stage === "newly_selected" || previous?.stage === "continuing_improvement";
  return { stage: continuing ? "continuing_improvement" as const : "newly_selected" as const, reason: `선정 기준 충족: Revenue Growth ${input.revenueGrowth!.toFixed(1)}%, Classic Rule40 ${input.classicRule40!.toFixed(1)}%, Cash Rule40 ${input.cashRule40!.toFixed(1)}%` };
}
