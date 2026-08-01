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

export async function collectTicker(ticker: string, apiKey: string, snapshotDate: string) {
  const [estimates, incomeTtm, cashflowTtm] = await Promise.all([
    request(`analyst-estimates?symbol=${encodeURIComponent(ticker)}&period=annual&page=0&limit=10`, apiKey),
    request(`income-statement-ttm?symbol=${encodeURIComponent(ticker)}`, apiKey),
    request(`cash-flow-statement-ttm?symbol=${encodeURIComponent(ticker)}`, apiKey),
  ]);

  const annualRows = rows(estimates)
    .filter((item) => typeof item.date === "string" && item.date >= snapshotDate)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const annual = annualRows[0] ?? null;
  const income = rows(incomeTtm)[0] ?? null;
  const cashflow = rows(cashflowTtm)[0] ?? null;

  const annualFwdEpsEstimate = numberOrNull(annual?.estimatedEpsAvg);
  const estimatedAnnualRevenue = numberOrNull(annual?.estimatedRevenueAvg);
  const actualTrailingRevenue = numberOrNull(income?.revenue);
  const operatingIncome = numberOrNull(income?.operatingIncome);
  const freeCashFlow = numberOrNull(cashflow?.freeCashFlow);
  const operatingMargin = actualTrailingRevenue && operatingIncome !== null
    ? operatingIncome / actualTrailingRevenue : null;
  const fcfMargin = actualTrailingRevenue && freeCashFlow !== null
    ? freeCashFlow / actualTrailingRevenue : null;

  const required: Record<string, unknown> = {
    annualFwdEpsEstimate, estimatedAnnualRevenue, actualTrailingRevenue,
    operatingIncome, operatingMargin, freeCashFlow, fcfMargin,
  };
  const missingFields = Object.entries(required).filter(([, value]) => value === null).map(([key]) => key);
  const allFailed = [estimates, incomeTtm, cashflowTtm].every((result) => result.error);

  const normalized: NormalizedSnapshot = {
    ticker,
    estimateFiscalDate: typeof annual?.date === "string" ? annual.date : null,
    epsDefinition: "FMP annual analyst consensus estimatedEpsAvg; standardized diluted EPS basis; not mixed with quarterly or adjusted earnings endpoints",
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

  return { raw: [estimates, incomeTtm, cashflowTtm], normalized };
}
