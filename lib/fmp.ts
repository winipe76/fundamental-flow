import { compareQuarterEps, percentChange, sumFour } from "@/lib/fundamental-math";

export const TEST_TICKERS = ["PLTR", "NVDA", "MSFT"] as const;
const BASE_URL = "https://financialmodelingprep.com/stable";

type JsonRow = Record<string, unknown>;

export interface RawResult {
  endpoint: string;
  status: number | null;
  data: unknown;
  error: string | null;
}

export interface NtmComponent { date: string; fiscalYear: string | null; period: string | null; eps: number }

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
  ntmEps: number | null;
  ntmComponents: NtmComponent[];
  actualTrailingRevenue: number | null;
  operatingIncome: number | null;
  operatingMargin: number | null;
  freeCashFlow: number | null;
  fcfMargin: number | null;
  epsDefinition: string;
  missingFields: string[];
  collectionStatus: "complete" | "partial" | "failed";
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function request(endpoint: string, apiKey: string): Promise<RawResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      headers: { apikey: apiKey, accept: "application/json" }, cache: "no-store", signal: controller.signal,
    });
    const body = await response.text();
    let data: unknown = null;
    try { data = body ? JSON.parse(body) : null; } catch { data = body; }
    return { endpoint, status: response.status, data, error: response.ok ? null : `FMP HTTP ${response.status}` };
  } catch (error) {
    return { endpoint, status: null, data: null, error: error instanceof Error ? error.message : "Unknown FMP error" };
  } finally { clearTimeout(timeout); }
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
  const [quarterlyEstimates, quarterlyIncome, quarterlyCashflow] = await Promise.all([
    request(`analyst-estimates?symbol=${encodeURIComponent(ticker)}&period=quarter&page=0&limit=16`, apiKey),
    request(`income-statement?symbol=${encodeURIComponent(ticker)}&period=quarter&limit=8`, apiKey),
    request(`cash-flow-statement?symbol=${encodeURIComponent(ticker)}&period=quarter&limit=4`, apiKey),
  ]);

  const incomeQuarters = sortedByDate(rows(quarterlyIncome));
  const cashflowQuarters = sortedByDate(rows(quarterlyCashflow));
  const latest = incomeQuarters[0] ?? null;
  const latestFiscalYear = latest?.fiscalYear == null ? null : String(latest.fiscalYear);
  const latestFiscalPeriod = typeof latest?.period === "string" ? latest.period : null;
  const prior = latestFiscalYear && latestFiscalPeriod
    ? incomeQuarters.find((row) => String(row.fiscalYear) === String(Number(latestFiscalYear) - 1) && row.period === latestFiscalPeriod) ?? null
    : null;

  const latestQuarterEps = numberOrNull(latest?.epsDiluted ?? latest?.epsdiluted);
  const priorYearQuarterEps = numberOrNull(prior?.epsDiluted ?? prior?.epsdiluted);
  const epsComparison = compareQuarterEps(latestQuarterEps, priorYearQuarterEps);
  const latestQuarterRevenue = numberOrNull(latest?.revenue);
  const priorYearQuarterRevenue = numberOrNull(prior?.revenue);
  const revenueYoyPct = percentChange(latestQuarterRevenue, priorYearQuarterRevenue);

  const estimateRows = sortedByDate(rows(quarterlyEstimates))
    .filter((row) => typeof row.date === "string" && row.date > snapshotDate)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 4);
  const ntmComponents: NtmComponent[] = estimateRows.flatMap((row) => {
    const eps = numberOrNull(row.epsAvg ?? row.estimatedEpsAvg);
    return eps === null ? [] : [{ date: String(row.date), fiscalYear: row.fiscalYear == null ? null : String(row.fiscalYear), period: typeof row.period === "string" ? row.period : null, eps }];
  });
  const ntmEps = sumFour(ntmComponents.map((item) => item.eps));

  const actualTrailingRevenue = sumField(incomeQuarters, "revenue");
  const operatingIncome = sumField(incomeQuarters, "operatingIncome");
  const freeCashFlow = sumField(cashflowQuarters, "freeCashFlow");
  const operatingMargin = actualTrailingRevenue && operatingIncome !== null ? operatingIncome / actualTrailingRevenue : null;
  const fcfMargin = actualTrailingRevenue && freeCashFlow !== null ? freeCashFlow / actualTrailingRevenue : null;

  const required = { latestQuarterEps, priorYearQuarterEps, latestQuarterRevenue, priorYearQuarterRevenue, revenueYoyPct, ntmEps, actualTrailingRevenue, operatingIncome, operatingMargin, freeCashFlow, fcfMargin };
  const missingFields = Object.entries(required).filter(([, value]) => value === null).map(([key]) => key);
  const actualCoreAvailable = [latestQuarterEps, priorYearQuarterEps, latestQuarterRevenue, priorYearQuarterRevenue, actualTrailingRevenue, operatingMargin, fcfMargin].every((value) => value !== null);
  const allFailed = [quarterlyEstimates, quarterlyIncome, quarterlyCashflow].every((result) => result.error);

  const normalized: NormalizedSnapshot = {
    ticker, latestFiscalYear, latestFiscalPeriod, latestPeriodEnd: typeof latest?.date === "string" ? latest.date : null,
    latestQuarterEps, priorYearQuarterEps, epsYoyPct: epsComparison.yoyPct, epsYoyStatus: epsComparison.status,
    epsChangeAmount: epsComparison.changeAmount, latestQuarterRevenue, priorYearQuarterRevenue, revenueYoyPct,
    ntmEps, ntmComponents, actualTrailingRevenue, operatingIncome, operatingMargin, freeCashFlow, fcfMargin,
    epsDefinition: "FMP standardized GAAP diluted EPS (epsDiluted); exact same fiscal quarter YoY; NTM uses four future quarterly analyst consensus epsAvg values",
    missingFields,
    collectionStatus: allFailed ? "failed" : actualCoreAvailable && ntmEps !== null ? "complete" : "partial",
  };
  return { raw: [quarterlyEstimates, quarterlyIncome, quarterlyCashflow], normalized };
}
