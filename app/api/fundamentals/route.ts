import { env } from "cloudflare:workers";
import { TEST_TICKERS, collectTicker } from "@/lib/fmp";
import { percentChange } from "@/lib/fundamental-math";

export const dynamic = "force-dynamic";
type RuntimeEnv = { DB?: D1Database; FMP_API_KEY?: string };
const runtime = env as unknown as RuntimeEnv;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function dbNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET() {
  if (!runtime.DB) return json({ configured: Boolean(runtime.FMP_API_KEY), status: "database_unavailable", snapshots: [], history: [] }, 503);
  try {
    const placeholders = TEST_TICKERS.map(() => "?").join(",");
    const latest = await runtime.DB.prepare(`
      SELECT s.* FROM fundamental_snapshots s
      INNER JOIN (
        SELECT ticker, MAX(snapshot_date) snapshot_date FROM fundamental_snapshots
        WHERE ticker IN (${placeholders}) GROUP BY ticker
      ) x ON x.ticker=s.ticker AND x.snapshot_date=s.snapshot_date ORDER BY s.ticker
    `).bind(...TEST_TICKERS).all();
    const history = await runtime.DB.prepare(`
      SELECT * FROM fundamental_snapshots WHERE ticker IN (${placeholders})
      ORDER BY ticker, snapshot_date DESC LIMIT 36
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
      lastSuccessfulUpdate: latestSuccessful?.collected_at ?? null, snapshots: rows, history: history.results,
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
      const collected = await collectTicker(ticker, runtime.FMP_API_KEY, snapshotDate);
      for (const raw of collected.raw) {
        await runtime.DB.prepare(`INSERT INTO api_payloads
          (ticker,snapshot_date,endpoint,http_status,response_json,error_message,fetched_at) VALUES (?,?,?,?,?,?,?)`
        ).bind(ticker, snapshotDate, raw.endpoint, raw.status, JSON.stringify(raw.data), raw.error, collectedAt).run();
      }
      const oneMonth = await runtime.DB.prepare(`SELECT annual_fwd_eps_estimate FROM fundamental_snapshots
        WHERE ticker=? AND snapshot_date>=date(?,'start of month','-1 month')
          AND snapshot_date<date(?,'start of month') AND annual_fwd_eps_estimate IS NOT NULL
          AND estimate_fiscal_date=?
        ORDER BY snapshot_date DESC LIMIT 1`
      ).bind(ticker, snapshotDate, snapshotDate, collected.normalized.fy1FiscalDate).first<Record<string, unknown>>();
      const threeMonths = await runtime.DB.prepare(`SELECT annual_fwd_eps_estimate FROM fundamental_snapshots
        WHERE ticker=? AND snapshot_date>=date(?,'start of month','-3 months')
          AND snapshot_date<date(?,'start of month','-2 months') AND annual_fwd_eps_estimate IS NOT NULL
          AND estimate_fiscal_date=?
        ORDER BY snapshot_date DESC LIMIT 1`
      ).bind(ticker, snapshotDate, snapshotDate, collected.normalized.fy1FiscalDate).first<Record<string, unknown>>();
      const value = collected.normalized;
      const fy1EpsChange1mPct = percentChange(value.fy1Eps, dbNumber(oneMonth?.annual_fwd_eps_estimate));
      const fy1EpsChange3mPct = percentChange(value.fy1Eps, dbNumber(threeMonths?.annual_fwd_eps_estimate));

      await runtime.DB.prepare(`INSERT INTO fundamental_snapshots (
        ticker,snapshot_date,estimate_fiscal_date,eps_definition,annual_fwd_eps_estimate,estimated_annual_revenue,
        actual_trailing_revenue,operating_income,operating_margin,free_cash_flow,fcf_margin,
        fwd_eps_change_pct,estimated_revenue_change_pct,operating_margin_change_pp,fcf_margin_change_pp,
        missing_fields,collection_status,collected_at,latest_fiscal_year,latest_fiscal_period,latest_period_end,
        latest_quarter_eps,prior_year_quarter_eps,eps_yoy_pct,eps_yoy_status,eps_change_amount,
        latest_quarter_revenue,prior_year_quarter_revenue,revenue_yoy_pct,ntm_eps,ntm_components,
        ntm_eps_change_1m_pct,ntm_eps_change_3m_pct,fy1_eps_change_3m_pct
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(ticker,snapshot_date) DO UPDATE SET
        eps_definition=excluded.eps_definition,actual_trailing_revenue=excluded.actual_trailing_revenue,
        operating_income=excluded.operating_income,operating_margin=excluded.operating_margin,free_cash_flow=excluded.free_cash_flow,
        fcf_margin=excluded.fcf_margin,missing_fields=excluded.missing_fields,collection_status=excluded.collection_status,
        collected_at=excluded.collected_at,latest_fiscal_year=excluded.latest_fiscal_year,latest_fiscal_period=excluded.latest_fiscal_period,
        latest_period_end=excluded.latest_period_end,latest_quarter_eps=excluded.latest_quarter_eps,
        prior_year_quarter_eps=excluded.prior_year_quarter_eps,eps_yoy_pct=excluded.eps_yoy_pct,
        eps_yoy_status=excluded.eps_yoy_status,eps_change_amount=excluded.eps_change_amount,
        latest_quarter_revenue=excluded.latest_quarter_revenue,prior_year_quarter_revenue=excluded.prior_year_quarter_revenue,
        revenue_yoy_pct=excluded.revenue_yoy_pct,estimate_fiscal_date=excluded.estimate_fiscal_date,
        annual_fwd_eps_estimate=excluded.annual_fwd_eps_estimate,fwd_eps_change_pct=excluded.fwd_eps_change_pct,
        fy1_eps_change_3m_pct=excluded.fy1_eps_change_3m_pct,ntm_eps=NULL,ntm_components=NULL,
        ntm_eps_change_1m_pct=NULL,ntm_eps_change_3m_pct=NULL`
      ).bind(
        ticker,snapshotDate,value.fy1FiscalDate,value.epsDefinition,value.fy1Eps,null,value.actualTrailingRevenue,value.operatingIncome,value.operatingMargin,
        value.freeCashFlow,value.fcfMargin,fy1EpsChange1mPct,null,null,null,JSON.stringify(value.missingFields),value.collectionStatus,collectedAt,
        value.latestFiscalYear,value.latestFiscalPeriod,value.latestPeriodEnd,value.latestQuarterEps,value.priorYearQuarterEps,
        value.epsYoyPct,value.epsYoyStatus,value.epsChangeAmount,value.latestQuarterRevenue,value.priorYearQuarterRevenue,
        value.revenueYoyPct,null,null,null,null,fy1EpsChange3mPct
      ).run();
      results.push({ ...value, fy1EpsChange1mPct, fy1EpsChange3mPct, snapshotDate });
    } catch (error) {
      results.push({ ticker, snapshotDate, collectionStatus: "failed", error: error instanceof Error ? error.message : "Collection failed" });
    }
  }
  const status = results.some((item) => item.collectionStatus === "failed") ? "error"
    : results.some((item) => item.collectionStatus === "partial") ? "partial" : "connected";
  return json({ status, lastUpdated: collectedAt, results });
}
