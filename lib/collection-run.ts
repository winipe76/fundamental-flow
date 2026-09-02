import { NASDAQ_100_TICKERS } from "@/lib/nasdaq100";
import { collectAndStoreTicker } from "@/lib/snapshot-store";

export const COLLECTION_CONCURRENCY = 3;
export const FAILED_TICKER_RETRIES = 1;

type CollectionResult = {
  ticker: string;
  collectionStatus: "complete" | "partial" | "failed";
  error?: string;
  retryAttempts: number;
  apiRequestCount: number;
  apiRetryCount: number;
};

async function concurrentMap<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function runNasdaq100Collection(db: D1Database, apiKey: string, now = new Date()) {
  const runId = crypto.randomUUID();
  const snapshotDate = now.toISOString().slice(0, 10);
  const startedAt = now.toISOString();
  await db.prepare(`INSERT INTO collection_runs
    (id,started_at,status,total_count,success_count,partial_count,failed_count,retry_count)
    VALUES (?,?,?,100,0,0,0,0)`
  ).bind(runId, startedAt, "running").run();
  await db.batch(NASDAQ_100_TICKERS.map((ticker) => db.prepare(`INSERT INTO collection_run_items
    (run_id,ticker,status,attempts,snapshot_date,updated_at) VALUES (?,?,?,?,?,?)`
  ).bind(runId, ticker, "pending", 0, snapshotDate, startedAt)));

  const collect = async (ticker: string, retryAttempts: number): Promise<CollectionResult> => {
    const collectedAt = new Date().toISOString();
    try {
      const result = await collectAndStoreTicker(db, ticker, apiKey, snapshotDate, collectedAt);
      const status = result.collectionStatus === "complete" ? "success" : result.collectionStatus;
      await db.prepare(`UPDATE collection_run_items SET status=?,attempts=?,error_message=NULL,updated_at=? WHERE run_id=? AND ticker=?`)
        .bind(status, retryAttempts + 1, collectedAt, runId, ticker).run();
      return { ticker, collectionStatus: result.collectionStatus, retryAttempts,
        apiRequestCount: result.apiRequestCount, apiRetryCount: result.apiRetryCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Collection failed";
      await db.prepare(`UPDATE collection_run_items SET status='failed',attempts=?,error_message=?,updated_at=? WHERE run_id=? AND ticker=?`)
        .bind(retryAttempts + 1, message, collectedAt, runId, ticker).run();
      return { ticker, collectionStatus: "failed", error: message, retryAttempts, apiRequestCount: 0, apiRetryCount: 0 };
    }
  };

  let results = await concurrentMap([...NASDAQ_100_TICKERS], COLLECTION_CONCURRENCY, (ticker) => collect(ticker, 0));
  for (let retry = 1; retry <= FAILED_TICKER_RETRIES; retry += 1) {
    const failedTickers = results.filter((row) => row.collectionStatus === "failed").map((row) => row.ticker);
    if (!failedTickers.length) break;
    const retried = await concurrentMap(failedTickers, COLLECTION_CONCURRENCY, (ticker) => collect(ticker, retry));
    const replacements = new Map(retried.map((row) => [row.ticker, row]));
    results = results.map((row) => replacements.get(row.ticker) ?? row);
  }

  const successCount = results.filter((row) => row.collectionStatus === "complete").length;
  const partialCount = results.filter((row) => row.collectionStatus === "partial").length;
  const failed = results.filter((row) => row.collectionStatus === "failed");
  const retryCount = results.reduce((total, row) => total + row.retryAttempts, 0);
  const apiRequestCount = results.reduce((total, row) => total + row.apiRequestCount, 0);
  const apiRetryCount = results.reduce((total, row) => total + row.apiRetryCount, 0);
  const status = failed.length ? (successCount || partialCount ? "partial" : "failed") : partialCount ? "partial" : "completed";
  const completedAt = new Date().toISOString();
  await db.prepare(`UPDATE collection_runs SET completed_at=?,status=?,success_count=?,partial_count=?,failed_count=?,retry_count=?,api_request_count=?,api_retry_count=? WHERE id=?`)
    .bind(completedAt, status, successCount, partialCount, failed.length, retryCount, apiRequestCount, apiRetryCount, runId).run();
  return { runId, snapshotDate, startedAt, completedAt, status, totalCount: NASDAQ_100_TICKERS.length,
    successCount, partialCount, failedCount: failed.length, retryCount, apiRequestCount, apiRetryCount, failed };
}

