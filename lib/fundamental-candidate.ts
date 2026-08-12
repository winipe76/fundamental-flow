import { NASDAQ_100_BY_TICKER, NASDAQ_100_TICKERS } from "@/lib/nasdaq100";
import { rankSnapshots } from "@/lib/ranking";
import {
  normalizeTicker,
  parseFundamentalStage,
  selectFundamentalMetrics,
  type FundamentalCandidateSnapshot,
} from "@/lib/buy-candidate-contract";

export class CandidateSnapshotError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function buildCandidateSnapshot(db: D1Database, tickerValue: unknown): Promise<FundamentalCandidateSnapshot> {
  const ticker = normalizeTicker(tickerValue);
  const company = NASDAQ_100_BY_TICKER.get(ticker);
  if (!company) throw new CandidateSnapshotError("Nasdaq 100 company metadata is unavailable", 404);

  const [snapshot, classification] = await Promise.all([
    db.prepare("SELECT * FROM fundamental_snapshots WHERE ticker=? ORDER BY snapshot_date DESC LIMIT 1").bind(ticker).first<Record<string, unknown>>(),
    db.prepare("SELECT * FROM fundamental_classifications WHERE ticker=? LIMIT 1").bind(ticker).first<Record<string, unknown>>(),
  ]);
  if (!snapshot) throw new CandidateSnapshotError("Latest Fundamental snapshot is unavailable", 409);
  if (!classification) throw new CandidateSnapshotError("Five-stage Fundamental classification is unavailable", 409);

  const placeholders = NASDAQ_100_TICKERS.map(() => "?").join(",");
  const latest = await db.prepare(`
    SELECT s.* FROM fundamental_snapshots s
    INNER JOIN (
      SELECT ticker, MAX(snapshot_date) snapshot_date FROM fundamental_snapshots
      WHERE ticker IN (${placeholders}) GROUP BY ticker
    ) x ON x.ticker=s.ticker AND x.snapshot_date=s.snapshot_date
  `).bind(...NASDAQ_100_TICKERS).all<Record<string, unknown>>();
  const ranked = rankSnapshots(latest.results);
  const ranking = ranked.find((row) => row.ticker === ticker);
  const calculatedAt = typeof snapshot.collected_at === "string" ? snapshot.collected_at : String(snapshot.snapshot_date);
  const classificationUpdatedAt = String(classification.updated_at);
  const metrics = selectFundamentalMetrics(snapshot);
  metrics.ranking_component_scores = ranking?.component_scores ?? null;
  metrics.ranking_position = ranking?.rank ?? null;

  return {
    ticker,
    company_name: company.name,
    fundamental_stage: parseFundamentalStage(classification.stage),
    fundamental_score: typeof ranking?.score === "number" ? ranking.score : null,
    metrics,
    calculated_at: calculatedAt,
    updated_at: calculatedAt > classificationUpdatedAt ? calculatedAt : classificationUpdatedAt,
    source_snapshot_date: String(snapshot.snapshot_date),
    source_version: `${String(classification.version)}:candidate-snapshot-v1`,
  };
}
