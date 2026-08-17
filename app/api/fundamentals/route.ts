import { env } from "cloudflare:workers";
import { TEST_TICKERS } from "@/lib/fmp";
import { collectAndStoreTicker } from "@/lib/snapshot-store";

export const dynamic = "force-dynamic";
type RuntimeEnv = { DB?: D1Database; FMP_API_KEY?: string };
const runtime = env as unknown as RuntimeEnv;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function validation(row:Record<string,unknown>){
  const value=(snake:string,camel:string)=>row[snake]??row[camel];
  const present=(snake:string,camel:string)=>typeof value(snake,camel)==="number"&&Number.isFinite(value(snake,camel));
  const checks=[["Revenue",present("actual_trailing_revenue","actualTrailingRevenue")],["Revenue Growth",present("revenue_yoy_pct","revenueYoyPct")],["Forward EPS",present("annual_fwd_eps_estimate","annualFwdEpsEstimate")],["Operating Margin",present("operating_margin","operatingMargin")],["Operating Cash Flow",present("operating_cash_flow","operatingCashFlow")],["CAPEX",present("capital_expenditure","capitalExpenditure")]] as const;
  return {ticker:String(row.ticker),fields:{revenue:checks[0][1],revenueGrowth:checks[1][1],forwardEps:checks[2][1],operatingMargin:checks[3][1],operatingCashFlow:checks[4][1],capitalExpenditure:checks[5][1]},snapshotDate:value("snapshot_date","snapshotDate")??null,fiscalPeriod:[value("latest_fiscal_year","latestFiscalYear"),value("latest_fiscal_period","latestFiscalPeriod")].filter(Boolean).join(" ")||null,dataSource:value("data_source","dataSource")??null,forwardEps:{value:value("annual_fwd_eps_estimate","fy1Eps")??null,basis:value("forward_eps_basis","forwardEpsBasis")??"next_fiscal_year_annual_consensus",fiscalDate:value("estimate_fiscal_date","fy1FiscalDate")??null,endpoint:"FMP /stable/analyst-estimates?period=annual · epsAvg"},calculationSuccess:value("calculation_success","calculationSuccess")===1||value("calculation_success","calculationSuccess")===true,missingFields:checks.filter(([,ok])=>!ok).map(([label])=>label)};
}

export async function GET(request: Request) {
  if (!runtime.DB) return json({ configured: Boolean(runtime.FMP_API_KEY), status: "database_unavailable", snapshots: [], history: [] }, 503);
  try {
    const historyTicker = new URL(request.url).searchParams.get("ticker")?.toUpperCase() ?? null;
    if (historyTicker) {
      if (!(TEST_TICKERS as readonly string[]).includes(historyTicker)) return json({ status: "invalid_ticker", history: [] }, 400);
      const history = await runtime.DB.prepare(`
        SELECT * FROM fundamental_snapshots WHERE ticker=? ORDER BY snapshot_date DESC LIMIT 60
      `).bind(historyTicker).all();
      return json({ status: "connected", ticker: historyTicker, history: history.results });
    }
    const placeholders = TEST_TICKERS.map(() => "?").join(",");
    const latest = await runtime.DB.prepare(`
      SELECT s.* FROM fundamental_snapshots s
      INNER JOIN (
        SELECT ticker, MAX(snapshot_date) snapshot_date FROM fundamental_snapshots
        WHERE ticker IN (${placeholders}) GROUP BY ticker
      ) x ON x.ticker=s.ticker AND x.snapshot_date=s.snapshot_date ORDER BY s.ticker
    `).bind(...TEST_TICKERS).all();
    const latestSuccessful = await runtime.DB.prepare(`
      SELECT MAX(collected_at) collected_at FROM fundamental_snapshots
      WHERE ticker IN (${placeholders}) AND latest_quarter_eps IS NOT NULL AND latest_quarter_revenue IS NOT NULL
    `).bind(...TEST_TICKERS).first<{ collected_at: string | null }>();
    const rows = latest.results;
    const hasPartial = rows.some((row) => row.collection_status === "partial");
    return json({
      configured: Boolean(runtime.FMP_API_KEY), status: runtime.FMP_API_KEY ? (hasPartial ? "partial" : "connected") : "key_missing",
      tickers: TEST_TICKERS, lastUpdated: rows[0]?.collected_at ?? null,
      lastSuccessfulUpdate: latestSuccessful?.collected_at ?? null, snapshots: rows, history: [], validations: rows.map(row=>validation(row)),
    });
  } catch (error) {
    return json({ configured: Boolean(runtime.FMP_API_KEY), status: "database_error", snapshots: [], history: [], error: error instanceof Error ? error.message : "Database error" }, 500);
  }
}

export async function POST() {
  if (!runtime.FMP_API_KEY) return json({ status: "key_missing", message: "FMP_API_KEY is not configured." }, 503);
  if (!runtime.DB) return json({ status: "database_unavailable" }, 503);
  const snapshotDate = new Date().toISOString().slice(0, 10);
  const collectedAt = new Date().toISOString();
  const results = [];

  for (const ticker of TEST_TICKERS) {
    try {
      results.push(await collectAndStoreTicker(runtime.DB, ticker, runtime.FMP_API_KEY, snapshotDate, collectedAt));
    } catch (error) {
      results.push({ ticker, snapshotDate, collectionStatus: "failed", error: error instanceof Error ? error.message : "Collection failed" });
    }
  }
  const status = results.some((item) => item.collectionStatus === "failed") ? "error"
    : results.some((item) => item.collectionStatus === "partial") ? "partial" : "connected";
  return json({ status, lastUpdated: collectedAt, results, validations: results.map(item=>validation(item as unknown as Record<string,unknown>)) });
}
