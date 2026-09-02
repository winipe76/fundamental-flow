import { env } from "cloudflare:workers";
import { NASDAQ_100, NASDAQ_100_TICKERS } from "@/lib/nasdaq100";
import { runNasdaq100Collection } from "@/lib/collection-run";

export const dynamic = "force-dynamic";
type RuntimeEnv = { DB?: D1Database; FMP_API_KEY?: string };
const runtime = env as unknown as RuntimeEnv;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function validation(row:Record<string,unknown>){
  const value=(snake:string,camel:string)=>row[snake]??row[camel];
  const present=(snake:string,camel:string)=>typeof value(snake,camel)==="number"&&Number.isFinite(value(snake,camel));
  const checks=[["Revenue",present("actual_trailing_revenue","actualTrailingRevenue")],["Revenue Growth",present("revenue_yoy_pct","revenueYoyPct")],["Forward EPS",present("next_fy_eps","nextFyEps")],["Operating Margin",present("operating_margin","operatingMargin")],["Operating Cash Flow",present("operating_cash_flow","operatingCashFlow")],["CAPEX",present("capital_expenditure","capitalExpenditure")]] as const;
  const quality=value("snapshot_quality_score","snapshotQualityScore")??(row.snapshotQuality as {score?:number}|undefined)?.score??null;
  const qualityCaution=value("snapshot_quality_caution","snapshotQualityCaution")===1||value("snapshot_quality_caution","snapshotQualityCaution")===true||(row.snapshotQuality as {aiCaution?:boolean}|undefined)?.aiCaution===true;
  return {ticker:String(row.ticker),fields:{revenue:checks[0][1],revenueGrowth:checks[1][1],forwardEps:checks[2][1],operatingMargin:checks[3][1],operatingCashFlow:checks[4][1],capitalExpenditure:checks[5][1]},snapshotDate:value("snapshot_date","snapshotDate")??null,fiscalPeriod:[value("latest_fiscal_year","latestFiscalYear"),value("latest_fiscal_period","latestFiscalPeriod")].filter(Boolean).join(" ")||null,dataSource:value("data_source","dataSource")??null,forwardEps:{value:value("next_fy_eps","nextFyEps")??null,basis:value("forward_eps_basis","forwardEpsBasis")??"next_fiscal_year_annual_consensus",fiscalDate:value("next_fy_estimate_fiscal_date","nextFyEstimateFiscalDate")??null,endpoint:"FMP /stable/analyst-estimates?period=annual · epsAvg"},calculationSuccess:value("calculation_success","calculationSuccess")===1||value("calculation_success","calculationSuccess")===true,snapshotQuality:{score:quality,caution:qualityCaution,aiGuidance:qualityCaution?`Snapshot Quality ${quality}: 누락 데이터가 있어 AI 판단을 주의해야 합니다.`:`Snapshot Quality ${quality}: 규칙 기반 분석에 사용할 수 있는 품질입니다.`},missingFields:checks.filter(([,ok])=>!ok).map(([label])=>label)};
}

export async function GET(request: Request) {
  if (!runtime.DB) return json({ configured: Boolean(runtime.FMP_API_KEY), status: "database_unavailable", snapshots: [], history: [] }, 503);
  try {
    const searchParams = new URL(request.url).searchParams;
    const historyTicker = searchParams.get("ticker")?.toUpperCase() ?? null;
    if (searchParams.get("scope") === "overview") {
      const placeholders = NASDAQ_100_TICKERS.map(() => "?").join(",");
      const snapshots = await runtime.DB.prepare(`
        WITH ranked AS (
          SELECT s.*,
            ROW_NUMBER() OVER (PARTITION BY ticker ORDER BY snapshot_date DESC) AS snapshot_rank
          FROM fundamental_snapshots s
          WHERE ticker IN (${placeholders})
        )
        SELECT * FROM ranked WHERE snapshot_rank <= 2 ORDER BY ticker, snapshot_rank
      `).bind(...NASDAQ_100_TICKERS).all();
      return json({
        status: "connected",
        universeSize: NASDAQ_100.length,
        snapshots: snapshots.results,
      });
    }
    if (historyTicker) {
      if (!NASDAQ_100_TICKERS.includes(historyTicker)) return json({ status: "invalid_ticker", history: [] }, 400);
      const [history, earnings] = await Promise.all([
        runtime.DB.prepare(`SELECT * FROM fundamental_snapshots WHERE ticker=? ORDER BY snapshot_date DESC LIMIT 60`).bind(historyTicker).all(),
        runtime.DB.prepare(`SELECT * FROM earnings_events WHERE ticker=? ORDER BY earnings_date DESC LIMIT 12`).bind(historyTicker).all(),
      ]);
      return json({ status: "connected", ticker: historyTicker, history: history.results, earnings: earnings.results });
    }
    const placeholders = NASDAQ_100_TICKERS.map(() => "?").join(",");
    const latest = await runtime.DB.prepare(`
      SELECT s.* FROM fundamental_snapshots s
      INNER JOIN (
        SELECT ticker, MAX(snapshot_date) snapshot_date FROM fundamental_snapshots
        WHERE ticker IN (${placeholders}) GROUP BY ticker
      ) x ON x.ticker=s.ticker AND x.snapshot_date=s.snapshot_date ORDER BY s.ticker
    `).bind(...NASDAQ_100_TICKERS).all();
    const latestSuccessful = await runtime.DB.prepare(`
      SELECT MAX(collected_at) collected_at FROM fundamental_snapshots
      WHERE ticker IN (${placeholders})
        AND actual_trailing_revenue IS NOT NULL AND revenue_yoy_pct IS NOT NULL
        AND next_fy_eps IS NOT NULL AND operating_margin IS NOT NULL
        AND operating_cash_flow IS NOT NULL AND capital_expenditure IS NOT NULL
        AND calculation_success=1
    `).bind(...NASDAQ_100_TICKERS).first<{ collected_at: string | null }>();
    const classifications = await runtime.DB.prepare(`SELECT * FROM fundamental_classifications WHERE ticker IN (${placeholders}) ORDER BY ticker`)
      .bind(...NASDAQ_100_TICKERS).all();
    const rows = latest.results;
    const hasPartial = rows.some((row) => row.collection_status === "partial");
    return json({
      configured: Boolean(runtime.FMP_API_KEY), status: runtime.FMP_API_KEY ? (hasPartial ? "partial" : "connected") : "key_missing",
      tickers: NASDAQ_100_TICKERS, lastUpdated: rows[0]?.collected_at ?? null,
      lastSuccessfulUpdate: latestSuccessful?.collected_at ?? null, snapshots: rows, history: [], classifications: classifications.results,
      validations: rows.map(row=>validation(row)),
    });
  } catch (error) {
    return json({ configured: Boolean(runtime.FMP_API_KEY), status: "database_error", snapshots: [], history: [], error: error instanceof Error ? error.message : "Database error" }, 500);
  }
}

export async function POST() {
  if (!runtime.FMP_API_KEY) return json({ status: "key_missing", message: "FMP_API_KEY is not configured." }, 503);
  if (!runtime.DB) return json({ status: "database_unavailable" }, 503);
  const result = await runNasdaq100Collection(runtime.DB, runtime.FMP_API_KEY);
  return json({ status: result.status === "completed" ? "connected" : result.status, lastUpdated: result.completedAt, run: result });
}

