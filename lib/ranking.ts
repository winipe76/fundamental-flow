export type RankingSnapshot = {
  ticker: string;
  eps_yoy_pct?: number | null;
  eps_yoy_status?: string | null;
  revenue_yoy_pct?: number | null;
  next_fy_revision_1m?: number | null;
  next_fy_revision_3m?: number | null;
  [key: string]: unknown;
};

export type RankingStage = "actual_only" | "one_month" | "three_month";

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function percentile(values: number[], value: number) {
  if (values.length <= 1) return 50;
  const below = values.filter((candidate) => candidate < value).length;
  const equal = values.filter((candidate) => candidate === value).length;
  return ((below + Math.max(0, equal - 1) / 2) / (values.length - 1)) * 100;
}

function epsScore(row: RankingSnapshot, numericValues: number[]) {
  const status = row.eps_yoy_status;
  if (status === "profit_turnaround") return 100;
  if (status === "loss_improving") return 55;
  if (status === "loss_widening") return 10;
  if (status === "loss_turnaround") return 0;
  return finite(row.eps_yoy_pct) ? percentile(numericValues, row.eps_yoy_pct) : null;
}

export function rankSnapshots(rows: RankingSnapshot[]) {
  const eligible = rows.filter((row) => finite(row.revenue_yoy_pct) && row.eps_yoy_status !== "unavailable");
  const coverage = eligible.length || 1;
  const oneMonthCoverage = eligible.filter((row) => finite(row.next_fy_revision_1m)).length / coverage;
  const threeMonthCoverage = eligible.filter((row) => finite(row.next_fy_revision_3m)).length / coverage;
  const stage: RankingStage = threeMonthCoverage >= 0.6 ? "three_month" : oneMonthCoverage >= 0.6 ? "one_month" : "actual_only";
  const weights = stage === "three_month"
    ? { eps: 0.3, revenue: 0.3, oneMonth: 0.2, threeMonth: 0.2 }
    : stage === "one_month"
      ? { eps: 0.35, revenue: 0.35, oneMonth: 0.3, threeMonth: 0 }
      : { eps: 0.5, revenue: 0.5, oneMonth: 0, threeMonth: 0 };
  const epsValues = eligible.filter((row) => row.eps_yoy_status === "growth" && finite(row.eps_yoy_pct)).map((row) => row.eps_yoy_pct as number);
  const revenueValues = eligible.map((row) => row.revenue_yoy_pct as number);
  const oneMonthValues = eligible.filter((row) => finite(row.next_fy_revision_1m)).map((row) => row.next_fy_revision_1m as number);
  const threeMonthValues = eligible.filter((row) => finite(row.next_fy_revision_3m)).map((row) => row.next_fy_revision_3m as number);

  return eligible.map((row) => {
    const eps = epsScore(row, epsValues);
    const revenue = percentile(revenueValues, row.revenue_yoy_pct as number);
    const oneMonth = finite(row.next_fy_revision_1m) ? percentile(oneMonthValues, row.next_fy_revision_1m) : null;
    const threeMonth = finite(row.next_fy_revision_3m) ? percentile(threeMonthValues, row.next_fy_revision_3m) : null;
    const requiredForwardAvailable = stage === "actual_only" || (oneMonth !== null && (stage !== "three_month" || threeMonth !== null));
    const score = eps !== null && requiredForwardAvailable
      ? eps * weights.eps + revenue * weights.revenue + (oneMonth ?? 0) * weights.oneMonth + (threeMonth ?? 0) * weights.threeMonth
      : null;
    return { ...row, score, component_scores: { eps, revenue, next_fy_1m: oneMonth, next_fy_3m: threeMonth } };
  }).filter((row) => row.score !== null)
    .sort((a, b) => (b.score as number) - (a.score as number))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

