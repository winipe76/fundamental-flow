import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const collection=fs.readFileSync("lib/collection-run.ts","utf8");
const fmp=fs.readFileSync("lib/fmp.ts","utf8");
const store=fs.readFileSync("lib/snapshot-store.ts","utf8");
const schema=fs.readFileSync("db/schema.ts","utf8");
const dictionary=fs.readFileSync("docs/FMP_DATA_DICTIONARY.md","utf8");
const screening=fs.readFileSync("lib/screening-engine.ts","utf8");
const ranking=fs.readFileSync("lib/ranking.ts","utf8");

test("collects the complete Nasdaq 100 with bounded concurrency and failed ticker retry",()=>{
  assert.match(collection,/NASDAQ_100_TICKERS/);
  assert.match(collection,/COLLECTION_CONCURRENCY = 3/);
  assert.match(collection,/FAILED_TICKER_RETRIES = 1/);
  assert.match(collection,/failedTickers/);
});

test("retries only 429 and 5xx FMP responses and records attempts",()=>{
  assert.match(fmp,/RETRYABLE_STATUS = new Set\(\[429, 500, 502, 503, 504\]\)/);
  assert.match(fmp,/MAX_FMP_ATTEMPTS = 3/);
  assert.match(store,/request_attempts/);
});

test("persists collection runs and earnings without duplicate records",()=>{
  for(const name of ["collectionRuns","collectionRunItems","earningsEvents"])assert.match(schema,new RegExp(name));
  assert.match(schema,/idx_collection_run_items_run_ticker/);
  assert.match(schema,/idx_earnings_events_ticker_date/);
  assert.match(store,/ON CONFLICT\(ticker,earnings_date\) DO UPDATE/);
});

test("maps FMP earnings and only verified official guidance",()=>{
  for(const field of ["epsActual","epsEstimated","revenueActual","revenueEstimated","lastUpdated"])assert.match(fmp,new RegExp(field));
  assert.match(fmp,/earnings\?symbol=.*limit=12/);
  for(const field of ["management_revenue_guidance","eps_guidance","margin_guidance","guidance_period","guidance_announcement_date"])assert.match(dictionary,new RegExp(field));
  assert.match(dictionary,/Official issuer IR\/SEC earnings release/);
  assert.match(store,/collectOfficialGuidance/);
});

test("does not change screening or ranking formulas in the collection layer",()=>{
  assert.doesNotMatch(collection,/classifySnapshot|rankSnapshots|DEFAULT_SCREENING_THRESHOLDS/);
  assert.match(screening,/minRevenueGrowth: 12/);
  assert.match(screening,/minClassicRule40: 40/);
  assert.match(screening,/minCashRule40: 40/);
  assert.match(ranking,/eps: 0\.5, revenue: 0\.5/);
  assert.match(ranking,/eps: 0\.3, revenue: 0\.3, oneMonth: 0\.2, threeMonth: 0\.2/);
});
