import { collectTicker } from "@/lib/fmp";
import { percentChange } from "@/lib/fundamental-math";

function dbNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function collectAndStoreTicker(db: D1Database, ticker: string, apiKey: string, snapshotDate: string, collectedAt: string) {
  const collected = await collectTicker(ticker, apiKey, snapshotDate);
  for (const raw of collected.raw) {
    await db.prepare(`INSERT INTO api_payloads
      (ticker,snapshot_date,endpoint,http_status,response_json,error_message,fetched_at) VALUES (?,?,?,?,?,?,?)`
    ).bind(ticker, snapshotDate, raw.endpoint, raw.status, JSON.stringify(raw.data), raw.error, collectedAt).run();
  }
  const oneMonth = await db.prepare(`SELECT annual_fwd_eps_estimate FROM fundamental_snapshots
    WHERE ticker=? AND snapshot_date>=date(?,'start of month','-1 month')
      AND snapshot_date<date(?,'start of month') AND annual_fwd_eps_estimate IS NOT NULL
      AND estimate_fiscal_date=?
    ORDER BY snapshot_date DESC LIMIT 1`
  ).bind(ticker, snapshotDate, snapshotDate, collected.normalized.fy1FiscalDate).first<Record<string, unknown>>();
  const threeMonths = await db.prepare(`SELECT annual_fwd_eps_estimate FROM fundamental_snapshots
    WHERE ticker=? AND snapshot_date>=date(?,'start of month','-3 months')
      AND snapshot_date<date(?,'start of month','-2 months') AND annual_fwd_eps_estimate IS NOT NULL
      AND estimate_fiscal_date=?
    ORDER BY snapshot_date DESC LIMIT 1`
  ).bind(ticker, snapshotDate, snapshotDate, collected.normalized.fy1FiscalDate).first<Record<string, unknown>>();
  const value = collected.normalized;
  const fy1EpsChange1mPct = percentChange(value.fy1Eps, dbNumber(oneMonth?.annual_fwd_eps_estimate));
  const fy1EpsChange3mPct = percentChange(value.fy1Eps, dbNumber(threeMonths?.annual_fwd_eps_estimate));

  await db.prepare(`INSERT INTO fundamental_snapshots (
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
  return { ...value, fy1EpsChange1mPct, fy1EpsChange3mPct, snapshotDate };
}
