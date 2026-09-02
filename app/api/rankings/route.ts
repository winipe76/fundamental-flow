import { env } from "cloudflare:workers";
import { NASDAQ_100, NASDAQ_100_TICKERS, NASDAQ_100_BY_TICKER } from "@/lib/nasdaq100";
import { rankSnapshots } from "@/lib/ranking";
import { runNasdaq100Collection } from "@/lib/collection-run";

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
    const classifications = await runtime.DB.prepare(`
      SELECT ticker, stage FROM fundamental_classifications
      WHERE ticker IN (${placeholders})
    `).bind(...NASDAQ_100_TICKERS).all<{ ticker:string; stage:string }>();
    const stageByTicker = new Map(classifications.results.map(row => [row.ticker, row.stage]));
    const selectedStages = new Set(["newly_selected", "continuing_improvement"]);
    const eligible = latest.results
      .filter(row => selectedStages.has(stageByTicker.get(String(row.ticker)) ?? ""))
      .map(row => ({ ...row, ...NASDAQ_100_BY_TICKER.get(String(row.ticker)), classification: stageByTicker.get(String(row.ticker)) }));
    const ranked = rankSnapshots(eligible).slice(0, 10);
    const lastUpdated = latest.results.reduce<string | null>((latestDate, row) => {
      const value = typeof row.collected_at === "string" ? row.collected_at : null;
      return value && (!latestDate || value > latestDate) ? value : latestDate;
    }, null);
    const stage = ranked[0] && "next_fy_revision_1m" in ranked[0]
      ? (ranked.every((row) => typeof row.next_fy_revision_3m === "number") ? "three_month"
        : ranked.every((row) => typeof row.next_fy_revision_1m === "number") ? "one_month" : "actual_only")
      : "actual_only";
    return json({
      status: runtime.FMP_API_KEY ? "connected" : "key_missing",
      universeSize: NASDAQ_100.length,
      coverage: latest.results.length,
      eligibleCount: eligible.length,
      stage,
      lastUpdated,
      rankings: ranked,
    });
  } catch (error) {
    return json({ status: "database_error", rankings: [], coverage: 0, error: error instanceof Error ? error.message : "Database error" }, 500);
  }
}

export async function POST() {
  if (!runtime.FMP_API_KEY) return json({ status: "key_missing" }, 503);
  if (!runtime.DB) return json({ status: "database_unavailable" }, 503);
  const result = await runNasdaq100Collection(runtime.DB, runtime.FMP_API_KEY);
  return json({ status: result.status === "completed" ? "connected" : result.status, universeSize: NASDAQ_100.length, run: result });
}

