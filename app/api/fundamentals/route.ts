import { env } from "cloudflare:workers";
import { TEST_TICKERS, collectTicker } from "@/lib/fmp";

export const dynamic = "force-dynamic";

type RuntimeEnv = { DB?: D1Database; FMP_API_KEY?: string };
const runtime = env as unknown as RuntimeEnv;

function pctChange(current: number | null, previous: number | null): number | null {
  return current !== null && previous !== null && previous !== 0
    ? ((current - previous) / Math.abs(previous)) * 100 : null;
}

function ppChange(current: number | null, previous: number | null): number | null {
  return current !== null && previous !== null ? (current - previous) * 100 : null;
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  if (!runtime.DB) return json({ configured: Boolean(runtime.FMP_API_KEY), status: "database_unavailable", snapshots: [] }, 503);
  try {
    const placeholders = TEST_TICKERS.map(() => "?").join(",");
    const result = await runtime.DB.prepare(`
      SELECT s.* FROM fundamental_snapshots s
      INNER JOIN (
        SELECT ticker, MAX(snapshot_date) snapshot_date
        FROM fundamental_snapshots WHERE ticker IN (${placeholders}) GROUP BY ticker
      ) latest ON latest.ticker = s.ticker AND latest.snapshot_date = s.snapshot_date
      ORDER BY s.ticker
    `).bind(...TEST_TICKERS).all();
    return json({
      configured: Boolean(runtime.FMP_API_KEY),
      status: runtime.FMP_API_KEY ? "connected" : "key_missing",
      tickers: TEST_TICKERS,
      lastUpdated: result.results[0]?.collected_at ?? null,
      snapshots: result.results,
    });
  } catch (error) {
    return json({ configured: Boolean(runtime.FMP_API_KEY), status: "database_error", snapshots: [], error: error instanceof Error ? error.message : "Database error" }, 500);
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
        await runtime.DB.prepare(`
          INSERT INTO api_payloads (ticker, snapshot_date, endpoint, http_status, response_json, error_message, fetched_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(ticker, snapshotDate, raw.endpoint, raw.status, JSON.stringify(raw.data), raw.error, collectedAt).run();
      }

      const previous = await runtime.DB.prepare(`
        SELECT * FROM fundamental_snapshots
        WHERE ticker = ? AND snapshot_date < ? ORDER BY snapshot_date DESC LIMIT 1
      `).bind(ticker, snapshotDate).first<Record<string, number | string | null>>();
      const value = collected.normalized;
      const changes = {
        fwdEpsChangePct: pctChange(value.annualFwdEpsEstimate, Number(previous?.annual_fwd_eps_estimate ?? NaN) || null),
        estimatedRevenueChangePct: pctChange(value.estimatedAnnualRevenue, Number(previous?.estimated_annual_revenue ?? NaN) || null),
        operatingMarginChangePp: ppChange(value.operatingMargin, Number(previous?.operating_margin ?? NaN) || null),
        fcfMarginChangePp: ppChange(value.fcfMargin, Number(previous?.fcf_margin ?? NaN) || null),
      };

      await runtime.DB.prepare(`
        INSERT INTO fundamental_snapshots (
          ticker, snapshot_date, estimate_fiscal_date, eps_definition, annual_fwd_eps_estimate,
          estimated_annual_revenue, actual_trailing_revenue, operating_income, operating_margin,
          free_cash_flow, fcf_margin, fwd_eps_change_pct, estimated_revenue_change_pct,
          operating_margin_change_pp, fcf_margin_change_pp, missing_fields, collection_status, collected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ticker, snapshot_date) DO UPDATE SET
          estimate_fiscal_date=excluded.estimate_fiscal_date, annual_fwd_eps_estimate=excluded.annual_fwd_eps_estimate,
          estimated_annual_revenue=excluded.estimated_annual_revenue, actual_trailing_revenue=excluded.actual_trailing_revenue,
          operating_income=excluded.operating_income, operating_margin=excluded.operating_margin,
          free_cash_flow=excluded.free_cash_flow, fcf_margin=excluded.fcf_margin,
          fwd_eps_change_pct=excluded.fwd_eps_change_pct, estimated_revenue_change_pct=excluded.estimated_revenue_change_pct,
          operating_margin_change_pp=excluded.operating_margin_change_pp, fcf_margin_change_pp=excluded.fcf_margin_change_pp,
          missing_fields=excluded.missing_fields, collection_status=excluded.collection_status, collected_at=excluded.collected_at
      `).bind(
        ticker, snapshotDate, value.estimateFiscalDate, value.epsDefinition, value.annualFwdEpsEstimate,
        value.estimatedAnnualRevenue, value.actualTrailingRevenue, value.operatingIncome, value.operatingMargin,
        value.freeCashFlow, value.fcfMargin, changes.fwdEpsChangePct, changes.estimatedRevenueChangePct,
        changes.operatingMarginChangePp, changes.fcfMarginChangePp, JSON.stringify(value.missingFields),
        value.collectionStatus, collectedAt,
      ).run();
      results.push({ ...value, ...changes, snapshotDate });
    } catch (error) {
      results.push({ ticker, snapshotDate, collectionStatus: "failed", error: error instanceof Error ? error.message : "Collection failed" });
    }
  }

  return json({ status: results.some((item) => item.collectionStatus === "failed") ? "partial" : "connected", lastUpdated: collectedAt, results });
}
