export type MetricKey = "revenue" | "revenueGrowth" | "forwardEps" | "operatingMargin" | "operatingCashFlow" | "capitalExpenditure";
export type SourceStatus = "mock" | "verified" | "estimated" | "unavailable";
export type TrendDirection = "Improving" | "Stable" | "Mixed" | "Deteriorating";
export type ScreeningStatus = "Newly Selected" | "Continuing Improvement" | "Watch" | "Caution" | "Excluded";
export type ThesisStatus = "Improving" | "Thesis Intact" | "Caution" | "Thesis Review";

export interface Company {
  ticker: string;
  companyName: string;
  sector: string;
  industry: string;
  themes: string[];
  lastUpdated: string;
}

export interface RawMetric {
  ticker: string;
  snapshotDate: string;
  fiscalPeriod: string;
  metric: MetricKey;
  value: number | null;
  unit: "USD" | "USD/share" | "%";
  sourceStatus: SourceStatus;
  isMissing: boolean;
}

export interface MonthlySnapshot {
  ticker: string;
  snapshotDate: string;
  fiscalPeriod: string;
  raw: Record<MetricKey, RawMetric>;
}

export interface MetricComparison {
  current: number | null;
  previous: number | null;
  change: number | null;
  changeRate: number | null;
}

export interface DerivedSnapshot {
  ticker: string;
  snapshotDate: string;
  fiscalPeriod: string;
  cfoMargin: number | null;
  freeCashFlow: number | null;
  fcfMargin: number | null;
  capexIntensity: number | null;
  classicRuleOf40: number | null;
  operatingRuleOf40: number | null;
  cashRuleOf40: number | null;
  comparisons: Record<"forwardEps" | "revenueGrowth" | "operatingMargin" | "cfoMargin" | "fcfMargin" | "capexIntensity", MetricComparison>;
  trend: TrendDirection;
  dataIssues: string[];
  growthInvestmentSignal: boolean;
}

export interface ScreeningResult {
  ticker: string;
  status: ScreeningStatus;
  score: number;
  reasons: string[];
  flags: string[];
}

export interface AIAnalysis {
  status: ThesisStatus;
  summary: string;
  improved: string[];
  deteriorated: string[];
  conflicts: string[];
}

export interface CompanyAnalysis {
  company: Company;
  snapshots: MonthlySnapshot[];
  current: MonthlySnapshot;
  previous: MonthlySnapshot | null;
  derived: DerivedSnapshot;
  screening: ScreeningResult;
  ai: AIAnalysis;
}
