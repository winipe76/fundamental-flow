export const FUNDAMENTAL_STAGES = [
  "newly_selected",
  "continuing_improvement",
  "watch",
  "caution",
  "excluded",
] as const;

export type FundamentalStage = typeof FUNDAMENTAL_STAGES[number];

export type FundamentalCandidateSnapshot = {
  ticker: string;
  company_name: string;
  fundamental_stage: FundamentalStage;
  metrics: Record<string, unknown>;
  source_snapshot_date: string;
};

export function normalizeTicker(value: unknown) {
  if (typeof value !== "string") throw new Error("ticker is required");
  const ticker = value.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)) throw new Error("ticker is invalid");
  return ticker;
}

export function parseFundamentalStage(value: unknown): FundamentalStage {
  if (typeof value !== "string" || !FUNDAMENTAL_STAGES.includes(value as FundamentalStage)) {
    throw new Error("fundamental stage is invalid");
  }
  return value as FundamentalStage;
}

export function selectFundamentalMetrics(row: Record<string, unknown>) {
  const fields = [
    "latest_quarter_eps", "eps_yoy_pct", "eps_yoy_status", "latest_quarter_revenue", "revenue_yoy_pct",
    "current_fy_eps", "current_fy_estimate_fiscal_date", "next_fy_eps", "next_fy_estimate_fiscal_date",
    "next_fy_revision_1m", "next_fy_revision_3m",
    "actual_trailing_revenue", "operating_income", "operating_margin", "free_cash_flow", "fcf_margin",
    "operating_cash_flow", "capital_expenditure", "cfo_margin", "capex_intensity",
    "classic_rule_40", "operating_rule_40", "cash_rule_40", "snapshot_quality_score",
  ];
  return Object.fromEntries(fields.map((field) => [field, row[field] ?? null]));
}
