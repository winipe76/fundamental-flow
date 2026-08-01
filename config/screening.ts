export const SCREENING_CONFIG = {
  stableTolerance: 0.25,
  improvingChange: 0.5,
  cautionChange: -1,
  ruleOf40Strong: 40,
  ruleOf40Healthy: 30,
  selectedScore: 5,
  watchScore: 1,
  cautionScore: -2,
  weights: {
    forwardEps: 2,
    revenueGrowth: 1.5,
    operatingMargin: 1,
    cfoMargin: 1.5,
    fcfMargin: 1,
    capexIntensity: 0.5,
    ruleOf40: 1,
  },
} as const;

export const METRIC_LABELS = {
  forwardEps: { short: "FWD EPS", full: "Forward Earnings per Share", ko: "예상 주당순이익" },
  operatingCashFlow: { short: "CFO", full: "Operating Cash Flow", ko: "영업현금흐름" },
  freeCashFlow: { short: "FCF", full: "Free Cash Flow", ko: "잉여현금흐름" },
  capitalExpenditure: { short: "CAPEX", full: "Capital Expenditure", ko: "자본적지출" },
  cfoMargin: { short: "CFO Margin", full: "Operating Cash Flow Margin", ko: "영업현금흐름률" },
  fcfMargin: { short: "FCF Margin", full: "Free Cash Flow Margin", ko: "잉여현금흐름률" },
} as const;
