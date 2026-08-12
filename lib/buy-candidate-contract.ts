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
  fundamental_score: number | null;
  metrics: Record<string, unknown>;
  calculated_at: string;
  updated_at: string;
  source_snapshot_date: string;
  source_version: string;
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
    "latest_quarter_eps", "prior_year_quarter_eps", "eps_yoy_pct", "eps_yoy_status", "eps_change_amount",
    "latest_quarter_revenue", "prior_year_quarter_revenue", "revenue_yoy_pct",
    "annual_fwd_eps_estimate", "fwd_eps_change_pct", "fy1_eps_change_3m_pct",
    "actual_trailing_revenue", "operating_income", "operating_margin", "free_cash_flow", "fcf_margin",
    "collection_status", "missing_fields", "latest_fiscal_year", "latest_fiscal_period", "latest_period_end",
  ];
  return Object.fromEntries(fields.map((field) => [field, row[field] ?? null]));
}
