export const TEST_TICKERS = ["PLTR", "NVDA", "MSFT"] as const;
const BASE_URL = "https://financialmodelingprep.com/stable";

type JsonRow = Record<string, unknown>;

export interface RawResult {
  endpoint: string;
  status: number | null;
  data: unknown;
  error: string | null;
}

export interface NormalizedSnapshot {
  ticker: string;
  estimateFiscalDate: string | null;
  epsDefinition: string;
  annualFwdEpsEstimate: number | null;
  estimatedAnnualRevenue: number | null;
  actualTrailingRevenue: number | null;
  operatingIncome: number | null;
  operatingMargin: number | null;
  freeCashFlow: number | null;
  fcfMargin: number | null;
  missingFields: string[];
  collectionStatus: "complete" | "partial" | "failed";
}

function numberOrNull(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

async function request(endpoint: string, apiKey: string): Promise<RawResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      headers: { apikey: apiKey, accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await response.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return {
      endpoint,
      status: response.status,
      data,
      error: response.ok ? null : `FMP HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      endpoint,
      status: null,
      data: null,
      error: error instanceof Error ? error.message : "Unknown FMP error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function rows(result: RawResult): JsonRow[] {
  return Array.isArray(result.data)
    ? result.data.filter((item): item is JsonRow => Boolean(item) && typeof item === "object")
    : [];
}

function sumField(items: JsonRow[], field: string): number | null {
  if (items.length < 4) return null;
  const values = items.slice(0, 4).map((item) => numberOrNull(item[field]));
  return values.every((value): value is number => value !== null)
    ? values.reduce((sum, value) => sum + value, 0)
    : null;
}

export async function collectTicker(ticker: string, apiKey: string, snapshotDate: string) {
  const [estimates, quarterlyIncome, quarterlyCashflow] = await Promise.all([
    request(`analyst-estimates?symbol=${encodeURIComponent(ticker)}&period=annual&page=0&limit=10`, apiKey),
    request(`income-statement?symbol=${encodeURIComponent(ticker)}&period=quarter&limit=4`, apiKey),
    request(`cash-flow-statement?symbol=${encodeURIComponent(ticker)}&period=quarter&limit=4`, apiKey),
  ]);

  const annualRows = rows(estimates)
    .filter((item) => typeof item.date === "string" && item.date >= snapshotDate)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const annual = annualRows[0] ?? null;
  const incomeQuarters = rows(quarterlyIncome);
  const cashflowQuarters = rows(quarterlyCashflow);

  const annualFwdEpsEstimate = numberOrNull(annual?.epsAvg ?? annual?.estimatedEpsAvg);
  const estimatedAnnualRevenue = numberOrNull(annual?.revenueAvg ?? annual?.estimatedRevenueAvg);
  const actualTrailingRevenue = sumField(incomeQuarters, "revenue");
  const operatingIncome = sumField(incomeQuarters, "operatingIncome");
  const freeCashFlow = sumField(cashflowQuarters, "freeCashFlow");
  const operatingMargin = actualTrailingRevenue && operatingIncome !== null
    ? operatingIncome / actualTrailingRevenue : null;
  const fcfMargin = actualTrailingRevenue && freeCashFlow !== null
    ? freeCashFlow / actualTrailingRevenue : null;

  const required: Record<string, unknown> = {
    annualFwdEpsEstimate, estimatedAnnualRevenue, actualTrailingRevenue,
    operatingIncome, operatingMargin, freeCashFlow, fcfMargin,
  };
  const missingFields = Object.entries(required).filter(([, value]) => value === null).map(([key]) => key);
  const allFailed = [estimates, quarterlyIncome, quarterlyCashflow].every((result) => result.error);

  const normalized: NormalizedSnapshot = {
    ticker,
    estimateFiscalDate: typeof annual?.date === "string" ? annual.date : null,
    epsDefinition: "FMP annual analyst consensus epsAvg; standardized diluted EPS basis; not mixed with quarterly or adjusted earnings endpoints",
    annualFwdEpsEstimate,
    estimatedAnnualRevenue,
    actualTrailingRevenue,
    operatingIncome,
    operatingMargin,
    freeCashFlow,
    fcfMargin,
    missingFields,
    collectionStatus: allFailed ? "failed" : missingFields.length ? "partial" : "complete",
  };

  return { raw: [estimates, quarterlyIncome, quarterlyCashflow], normalized };
}
