export const FMP_MAPPING_VERSION = "FMP Mapping v1.0";

export const REQUIRED_RAW_FIELDS = [
  "revenue", "revenueGrowth", "forwardEps", "operatingMargin", "operatingCashFlow", "capitalExpenditure",
] as const;

export type RequiredRawData = Record<(typeof REQUIRED_RAW_FIELDS)[number], number | null>;
export type CollectionStatus = "complete" | "partial" | "failed";

export function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function missingRequiredFields(values: RequiredRawData) {
  return REQUIRED_RAW_FIELDS.filter((field) => values[field] === null);
}

export function collectionStatus(values: RequiredRawData, allRequestsFailed: boolean): CollectionStatus {
  if (allRequestsFailed) return "failed";
  return missingRequiredFields(values).length === 0 ? "complete" : "partial";
}

type PeriodRow = Record<string, unknown>;
const periodKey = (row: PeriodRow) => `${String(row.fiscalYear ?? "")}|${String(row.period ?? "")}|${String(row.date ?? "")}`;

export type SnapshotValidation = {
  status: "valid" | "warning";
  warnings: string[];
  reportedCurrency: string | null;
  fmpReportedFreeCashFlow: number | null;
  fcfVariance: number | null;
};

export function validateSnapshotSources(income: PeriodRow[], cashFlow: PeriodRow[], analystFiscalDate: string | null, snapshotDate: string, internalFcf: number | null, reportedFcf: number | null): SnapshotValidation {
  const warnings: string[] = [];
  const currencies = (rows: PeriodRow[]) => [...new Set(rows.slice(0, 4).map((row) => row.reportedCurrency).filter((value): value is string => typeof value === "string" && value.length > 0))];
  const incomeCurrencies = currencies(income);
  const cashCurrencies = currencies(cashFlow);
  if (incomeCurrencies.length !== 1) warnings.push("income_statement_currency_missing_or_inconsistent");
  if (cashCurrencies.length !== 1) warnings.push("cash_flow_currency_missing_or_inconsistent");
  if (incomeCurrencies.length === 1 && cashCurrencies.length === 1 && incomeCurrencies[0] !== cashCurrencies[0]) warnings.push("currency_mismatch");

  const incomePeriods = income.slice(0, 4).map(periodKey);
  const cashPeriods = cashFlow.slice(0, 4).map(periodKey);
  if (incomePeriods.length !== 4 || cashPeriods.length !== 4 || incomePeriods.some((key, index) => key !== cashPeriods[index])) warnings.push("fiscal_period_mismatch");
  // Analyst estimates are annual FY+1 values, so they cannot equal a quarterly period.
  // We validate that the selected estimate is a future fiscal year instead.
  if (analystFiscalDate === null || analystFiscalDate < snapshotDate) warnings.push("analyst_estimate_fiscal_date_invalid");

  const fcfVariance = internalFcf !== null && reportedFcf !== null ? internalFcf - reportedFcf : null;
  if (internalFcf !== null && reportedFcf === null) warnings.push("fmp_free_cash_flow_missing");
  if (fcfVariance !== null) {
    const tolerance = Math.max(1, Math.abs(reportedFcf!) * 0.000001);
    if (Math.abs(fcfVariance) > tolerance) warnings.push("free_cash_flow_mismatch");
  }
  return {
    status: warnings.length ? "warning" : "valid",
    warnings,
    reportedCurrency: incomeCurrencies.length === 1 && incomeCurrencies[0] === cashCurrencies[0] ? incomeCurrencies[0] : null,
    fmpReportedFreeCashFlow: reportedFcf,
    fcfVariance,
  };
}
