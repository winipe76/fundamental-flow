import { percentChange } from "./fundamental-math.ts";

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

