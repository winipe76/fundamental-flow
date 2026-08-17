import { NASDAQ_100_BY_TICKER } from "@/lib/nasdaq100";
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

  const metrics = selectFundamentalMetrics(snapshot);

  return {
    ticker,
    company_name: company.name,
    fundamental_stage: parseFundamentalStage(classification.stage),
    metrics,
    source_snapshot_date: String(snapshot.snapshot_date),
  };
}
