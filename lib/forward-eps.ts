import { percentChange } from "./fundamental-math.ts";

export type AnnualEstimateRow = Record<string, unknown>;
export type RevisionSnapshot = { fiscalDate: string | null; eps: number | null } | null;

export function selectAnnualEstimatesByFiscalYear(items: AnnualEstimateRow[], currentFiscalYear: string | null) {
  const fiscalYear = currentFiscalYear === null ? null : Number(currentFiscalYear);
  if (fiscalYear === null || !Number.isInteger(fiscalYear)) return { current: null, next: null };
  const byFiscalYear = (year: number) => items.find((row) =>
    typeof row.date === "string" && Number(row.date.slice(0, 4)) === year
  ) ?? null;
  return { current: byFiscalYear(fiscalYear), next: byFiscalYear(fiscalYear + 1) };
}

export function calculateNextFyRevisions(currentEps: number | null, currentFiscalDate: string | null, oneMonth: RevisionSnapshot, threeMonths: RevisionSnapshot) {
  const comparable = (previous: RevisionSnapshot) => currentFiscalDate !== null && previous?.fiscalDate === currentFiscalDate
    ? percentChange(currentEps, previous.eps) : null;
  return { oneMonth: comparable(oneMonth), threeMonths: comparable(threeMonths) };
}
