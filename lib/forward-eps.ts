import { percentChange } from "./fundamental-math.ts";
import { numberOrNull } from "./fmp-validation.ts";

export type AnnualEstimateRow = Record<string, unknown>;
export type RevisionSnapshot = { targetFiscalYear: string | null; fiscalDate: string | null; eps: number | null } | null;

const MAX_FISCAL_DATE_DRIFT_DAYS = 31;

export function nextFiscalYear(currentFiscalYear: string | null) {
  const year = currentFiscalYear === null ? NaN : Number(currentFiscalYear);
  return Number.isInteger(year) ? String(year + 1) : null;
}

function fiscalDateDriftDays(current: string | null, previous: string | null) {
  if (current === null || previous === null) return null;
  const currentTime = Date.parse(`${current}T00:00:00Z`);
  const previousTime = Date.parse(`${previous}T00:00:00Z`);
  return Number.isFinite(currentTime) && Number.isFinite(previousTime)
    ? Math.abs(currentTime - previousTime) / 86_400_000
    : null;
}

/** Observation only: FY1 is the existing Current FY, FY2 is Next FY. */
export function calculateForwardGrowth(items: AnnualEstimateRow[], currentFiscalYear: string | null) {
  const selected = selectAnnualEstimatesByFiscalYear(items, currentFiscalYear);
  // Reject ambiguous or malformed periods here without changing legacy EPS/revision selection.
  const valid = (row: AnnualEstimateRow | null) => {
    if (!row || typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return false;
    const date = row.date;
    const parsed = new Date(`${date}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date &&
      items.filter(item => typeof item.date === "string" && item.date.slice(0, 4) === date.slice(0, 4)).length === 1;
  };
  const value = (row: AnnualEstimateRow | null, field: string) => valid(row) &&
    (typeof row?.[field] === "number" || typeof row?.[field] === "string") ? numberOrNull(row?.[field]) : null;
  const currentFyRevenue = value(selected.current, "revenueAvg");
  const nextFyRevenue = value(selected.next, "revenueAvg");
  const comparable = !(selected.current?.reportedCurrency && selected.next?.reportedCurrency &&
    selected.current.reportedCurrency !== selected.next.reportedCurrency);
  const growth = (current: number | null, next: number | null) => {
    const result = comparable ? percentChange(next, current) : null;
    return result !== null && Number.isFinite(result) ? result : null;
  };
  return {
    currentFyRevenue, nextFyRevenue,
    forwardRevenueGrowthPct: growth(currentFyRevenue, nextFyRevenue),
    forwardEpsGrowthPct: growth(value(selected.current, "epsAvg"), value(selected.next, "epsAvg")),
  };
}

export function selectAnnualEstimatesByFiscalYear(items: AnnualEstimateRow[], currentFiscalYear: string | null) {
  const fiscalYear = currentFiscalYear === null ? null : Number(currentFiscalYear);
  if (fiscalYear === null || !Number.isInteger(fiscalYear)) return { current: null, next: null };
  const byFiscalYear = (year: number) => items.find((row) =>
    typeof row.date === "string" && Number(row.date.slice(0, 4)) === year
  ) ?? null;
  return { current: byFiscalYear(fiscalYear), next: byFiscalYear(fiscalYear + 1) };
}

export function calculateNextFyRevisions(currentEps: number | null, currentFiscalDate: string | null, currentTargetFiscalYear: string | null, oneMonth: RevisionSnapshot, threeMonths: RevisionSnapshot) {
  const comparable = (previous: RevisionSnapshot) => {
    const dateDrift = fiscalDateDriftDays(currentFiscalDate, previous?.fiscalDate ?? null);
    return currentTargetFiscalYear !== null && previous?.targetFiscalYear === currentTargetFiscalYear
      && dateDrift !== null && dateDrift <= MAX_FISCAL_DATE_DRIFT_DAYS
      ? percentChange(currentEps, previous.eps) : null;
  };
  return { oneMonth: comparable(oneMonth), threeMonths: comparable(threeMonths) };
}

