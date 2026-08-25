import { compareQuarterEps, percentChange, sumFour } from "@/lib/fundamental-math";
import { calculateSnapshotQuality, type SnapshotQuality } from "@/lib/snapshot-quality";
import { collectionStatus, FMP_MAPPING_VERSION, missingRequiredFields, numberOrNull, validateSnapshotSources, type SnapshotValidation } from "@/lib/fmp-validation";
import { selectAnnualEstimatesByFiscalYear } from "@/lib/forward-eps";

export const TEST_TICKERS = ["PLTR", "NVDA", "MU"] as const;
const BASE_URL = "https://financialmodelingprep.com/stable";

type JsonRow = Record<string, unknown>;

export interface RawResult {
  endpoint: string;
  status: number | null;
  data: unknown;
  error: string | null;
  attempts: number;
}

export interface NormalizedEarningsEvent {
  ticker: string;
  earningsDate: string;
  actualRevenue: number | null;
  revenueConsensus: number | null;
  revenueSurprise: number | null;
  revenueSurprisePct: number | null;
  actualEps: number | null;
  epsConsensus: number | null;
  epsSurprise: number | null;
  epsSurprisePct: number | null;
  sourceLastUpdated: string | null;
}

export interface NormalizedSnapshot {
  ticker: string;
  latestFiscalYear: string | null;
  latestFiscalPeriod: string | null;
  latestPeriodEnd: string | null;
  latestQuarterEps: number | null;
  priorYearQuarterEps: number | null;
  epsYoyPct: number | null;
  epsYoyStatus: string;
  epsChangeAmount: number | null;
  latestQuarterRevenue: number | null;
  priorYearQuarterRevenue: number | null;
  revenueYoyPct: number | null;
  currentFyFiscalDate: string | null;
  currentFyEps: number | null;
  nextFyFiscalDate: string | null;
  nextFyEps: number | null;
  actualTrailingRevenue: number | null;
  operatingIncome: number | null;
  operatingMargin: number | null;
  freeCashFlow: number | null;
  fcfMargin: number | null;
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  forwardEpsBasis: "next_fiscal_year_annual_consensus";
  dataSource: string;
  epsDefinition: string;
  missingFields: string[];
  collectionStatus: "complete" | "partial" | "failed";
  snapshotQuality: SnapshotQuality;
  mappingVersion: string;
  validation: SnapshotValidation;
}
export { numberOrNull } from "@/lib/fmp-validation";

const MAX_FMP_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function request(endpoint: string, apiKey: string): Promise<RawResult> {
  for (let attempt = 1; attempt <= MAX_FMP_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(`${BASE_URL}/${endpoint}`, {
        headers: { apikey: apiKey, accept: "application/json" }, cache: "no-store", signal: controller.signal,
      });
      const body = await response.text();
      let data: unknown = null;
      try { data = body ? JSON.parse(body) : null; } catch { data = body; }
      if (response.ok || !RETRYABLE_STATUS.has(response.status) || attempt === MAX_FMP_ATTEMPTS) {
        return { endpoint, status: response.status, data, error: response.ok ? null : `FMP HTTP ${response.status}`, attempts: attempt };
      }
      const retryAfter = Number(response.headers.get("retry-after"));
      await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** (attempt - 1));
    } catch (error) {
      if (attempt === MAX_FMP_ATTEMPTS) {
        return { endpoint, status: null, data: null, error: error instanceof Error ? error.message : "Unknown FMP error", attempts: attempt };
      }
      await wait(500 * 2 ** (attempt - 1));
    } finally { clearTimeout(timeout); }
  }
  return { endpoint, status: null, data: null, error: "FMP retry exhausted", attempts: MAX_FMP_ATTEMPTS };
}

function rows(result: RawResult): JsonRow[] {
  return Array.isArray(result.data) ? result.data.filter((item): item is JsonRow => Boolean(item) && typeof item === "object") : [];
}

function sortedByDate(items: JsonRow[]) {
  return [...items].filter((item) => typeof item.date === "string").sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function sumField(items: JsonRow[], field: string): number | null {
  return sumFour(items.slice(0, 4).map((item) => numberOrNull(item[field])));
}

export async function collectTicker(ticker: string, apiKey: string, snapshotDate: string) {
  const [annualEstimates, quarterlyIncome, quarterlyCashflow, earnings] = await Promise.all([
    request(`analyst-estimates?symbol=${encodeURIComponent(ticker)}&period=annual&page=0&limit=10`, apiKey),
    request(`income-statement?symbol=${encodeURIComponent(ticker)}&period=quarter&limit=8`, apiKey),
    request(`cash-flow-statement?symbol=${encodeURIComponent(ticker)}&period=quarter&limit=4`, apiKey),
    request(`earnings?symbol=${encodeURIComponent(ticker)}&limit=12`, apiKey),
  ]);

  const incomeQuarters = sortedByDate(rows(quarterlyIncome));
  const cashflowQuarters = sortedByDate(rows(quarterlyCashflow));
  const latest = incomeQuarters[0] ?? null;
  const latestFiscalYear = latest?.fiscalYear == null ? null : String(latest.fiscalYear);
  const latestFiscalPeriod = typeof latest?.period === "string" ? latest.period : null;
  const prior = latestFiscalYear && latestFiscalPeriod
    ? incomeQuarters.find((row) => String(row.fiscalYear) === String(Number(latestFiscalYear) - 1) && row.period === latestFiscalPeriod) ?? null
    : null;

  const latestQuarterEps = numberOrNull(latest?.epsDiluted);
  const priorYearQuarterEps = numberOrNull(prior?.epsDiluted);
  const epsComparison = compareQuarterEps(latestQuarterEps, priorYearQuarterEps);
  const latestQuarterRevenue = numberOrNull(latest?.revenue);
  const priorYearQuarterRevenue = numberOrNull(prior?.revenue);
  const revenueYoyPct = percentChange(latestQuarterRevenue, priorYearQuarterRevenue);

  const fiscalYearEstimates = selectAnnualEstimatesByFiscalYear(rows(annualEstimates), latestFiscalYear);
  const currentFyFiscalDate = typeof fiscalYearEstimates.current?.date === "string" ? fiscalYearEstimates.current.date : null;
  const currentFyEps = numberOrNull(fiscalYearEstimates.current?.epsAvg);
  const nextFyFiscalDate = typeof fiscalYearEstimates.next?.date === "string" ? fiscalYearEstimates.next.date : null;
  const nextFyEps = numberOrNull(fiscalYearEstimates.next?.epsAvg);

  const actualTrailingRevenue = sumField(incomeQuarters, "revenue");
  const operatingIncome = sumField(incomeQuarters, "operatingIncome");
  const freeCashFlow = sumField(cashflowQuarters, "freeCashFlow");
  const operatingCashFlow = sumField(cashflowQuarters, "operatingCashFlow");
  const reportedCapex = sumField(cashflowQuarters, "capitalExpenditure");
  // FMP returns CAPEX as a negative cash outflow; calculations use a positive investment amount.
  const capitalExpenditure = reportedCapex === null ? null : Math.abs(reportedCapex);
  const operatingMargin = actualTrailingRevenue && operatingIncome !== null ? operatingIncome / actualTrailingRevenue : null;
  const fcfMargin = actualTrailingRevenue && freeCashFlow !== null ? freeCashFlow / actualTrailingRevenue : null;

  const required = { revenue: actualTrailingRevenue, revenueGrowth: revenueYoyPct, forwardEps: nextFyEps, operatingMargin, operatingCashFlow, capitalExpenditure };
  const missingFields = missingRequiredFields(required);
  const allFailed = [annualEstimates, quarterlyIncome, quarterlyCashflow].every((result) => result.error);
  const internalFcf = operatingCashFlow !== null && capitalExpenditure !== null ? operatingCashFlow - capitalExpenditure : null;
  const validation = validateSnapshotSources(incomeQuarters, cashflowQuarters, nextFyFiscalDate, snapshotDate, internalFcf, freeCashFlow);
  const snapshotQuality = calculateSnapshotQuality({
    revenue: actualTrailingRevenue, revenueGrowth: revenueYoyPct, forwardEps: nextFyEps, operatingMargin,
    operatingCashFlow, capitalExpenditure, fiscalYear: latestFiscalYear, fiscalPeriod: latestFiscalPeriod,
    fiscalPeriodEnd: typeof latest?.date === "string" ? latest.date : null,
  });
  const earningsEvents = rows(earnings).flatMap((row): NormalizedEarningsEvent[] => {
    if (typeof row.date !== "string") return [];
    const actualRevenue = numberOrNull(row.revenueActual);
    const revenueConsensus = numberOrNull(row.revenueEstimated);
    const actualEps = numberOrNull(row.epsActual);
    const epsConsensus = numberOrNull(row.epsEstimated);
    const revenueSurprise = actualRevenue !== null && revenueConsensus !== null ? actualRevenue - revenueConsensus : null;
    const epsSurprise = actualEps !== null && epsConsensus !== null ? actualEps - epsConsensus : null;
    return [{
      ticker, earningsDate: row.date, actualRevenue, revenueConsensus, revenueSurprise,
      revenueSurprisePct: percentChange(actualRevenue, revenueConsensus), actualEps, epsConsensus, epsSurprise,
      epsSurprisePct: percentChange(actualEps, epsConsensus),
      sourceLastUpdated: typeof row.lastUpdated === "string" ? row.lastUpdated : null,
    }];
  });

  const normalized: NormalizedSnapshot = {
    ticker, latestFiscalYear, latestFiscalPeriod, latestPeriodEnd: typeof latest?.date === "string" ? latest.date : null,
    latestQuarterEps, priorYearQuarterEps, epsYoyPct: epsComparison.yoyPct, epsYoyStatus: epsComparison.status,
    epsChangeAmount: epsComparison.changeAmount, latestQuarterRevenue, priorYearQuarterRevenue, revenueYoyPct,
    currentFyFiscalDate, currentFyEps, nextFyFiscalDate, nextFyEps,
    actualTrailingRevenue, operatingIncome, operatingMargin, freeCashFlow, fcfMargin, operatingCashFlow, capitalExpenditure,
    forwardEpsBasis: "next_fiscal_year_annual_consensus",
    dataSource: "FMP stable: analyst-estimates (annual), income-statement (quarter), cash-flow-statement (quarter)",
    epsDefinition: "Actual: FMP standardized GAAP diluted EPS (epsDiluted), exact same fiscal quarter YoY. Forward: next fiscal-year annual analyst consensus epsAvg",
    missingFields,
    collectionStatus: collectionStatus(required, allFailed),
    snapshotQuality,
    mappingVersion: FMP_MAPPING_VERSION,
    validation,
  };
  return { raw: [annualEstimates, quarterlyIncome, quarterlyCashflow, earnings], normalized, earningsEvents };
}
