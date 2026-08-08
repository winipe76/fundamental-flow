import { env } from "cloudflare:workers";
import { NASDAQ_100, NASDAQ_100_TICKERS, NASDAQ_100_BY_TICKER } from "@/lib/nasdaq100";
import { rankSnapshots } from "@/lib/ranking";
import { collectAndStoreTicker } from "@/lib/snapshot-store";

export const dynamic = "force-dynamic";
type RuntimeEnv = { DB?: D1Database; FMP_API_KEY?: string };
const runtime = env as unknown as RuntimeEnv;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  if (!runtime.DB) return json({ status: "database_unavailable", rankings: [], coverage: 0 }, 503);
  try {
    const placeholders = NASDAQ_100_TICKERS.map(() => "?").join(",");
    const latest = await runtime.DB.prepare(`
      SELECT s.* FROM fundamental_snapshots s
      INNER JOIN (
        SELECT ticker, MAX(snapshot_date) snapshot_date FROM fundamental_snapshots
        WHERE ticker IN (${placeholders}) GROUP BY ticker
      ) x ON x.ticker=s.ticker AND x.snapshot_date=s.snapshot_date
    `).bind(...NASDAQ_100_TICKERS).all();
    const enriched = latest.results.map((row) => ({ ...row, ...NASDAQ_100_BY_TICKER.get(String(row.ticker)) }));
    const ranked = rankSnapshots(enriched).slice(0, 10);
    const lastUpdated = latest.results.reduce<string | null>((latestDate, row) => {
      const value = typeof row.collected_at === "string" ? row.collected_at : null;
      return value && (!latestDate || value > latestDate) ? value : latestDate;
    }, null);
    const stage = ranked[0] && "fwd_eps_change_pct" in ranked[0]
      ? (ranked.every((row) => typeof row.fy1_eps_change_3m_pct === "number") ? "three_month"
        : ranked.every((row) => typeof row.fwd_eps_change_pct === "number") ? "one_month" : "actual_only")
      : "actual_only";
    return json({
      status: runtime.FMP_API_KEY ? "connected" : "key_missing",
      universeSize: NASDAQ_100.length,
      coverage: latest.results.length,
      stage,
      lastUpdated,
      rankings: ranked,
    });
  } catch (error) {
    return json({ status: "database_error", rankings: [], coverage: 0, error: error instanceof Error ? error.message : "Database error" }, 500);
  }
}

export async function POST(request: Request) {
  if (!runtime.FMP_API_KEY) return json({ status: "key_missing" }, 503);
  if (!runtime.DB) return json({ status: "database_unavailable" }, 503);
  let body: { batch?: number; batchSize?: number } = {};
  try { body = await request.json(); } catch { /* defaults */ }
  const batchSize = Math.min(5, Math.max(1, Math.trunc(body.batchSize ?? 5)));
  const totalBatches = Math.ceil(NASDAQ_100.length / batchSize);
  const batch = Math.min(totalBatches - 1, Math.max(0, Math.trunc(body.batch ?? 0)));
  const tickers = NASDAQ_100_TICKERS.slice(batch * batchSize, (batch + 1) * batchSize);
  const snapshotDate = new Date().toISOString().slice(0, 10);
  const collectedAt = new Date().toISOString();
  const results = [];
  for (const ticker of tickers) {
    try {
      results.push(await collectAndStoreTicker(runtime.DB, ticker, runtime.FMP_API_KEY, snapshotDate, collectedAt));
    } catch (error) {
      results.push({ ticker, snapshotDate, collectionStatus: "failed", error: error instanceof Error ? error.message : "Collection failed" });
    }
  }
  return json({
    status: results.some((row) => row.collectionStatus === "failed") ? "partial" : "connected",
    batch,
    batchSize,
    totalBatches,
    processed: Math.min((batch + 1) * batchSize, NASDAQ_100.length),
    universeSize: NASDAQ_100.length,
    results,
  });
}
