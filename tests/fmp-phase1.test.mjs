import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const fmp=fs.readFileSync("lib/fmp.ts","utf8");
const store=fs.readFileSync("lib/snapshot-store.ts","utf8");
const math=fs.readFileSync("lib/fundamental-math.ts","utf8");
const collection=fs.readFileSync("lib/collection-run.ts","utf8");

test("retains the verified Phase 1 tickers and expands collection to Nasdaq 100",()=>{
  assert.match(fmp,/TEST_TICKERS\s*=\s*\["PLTR",\s*"NVDA",\s*"MU"\]/);
  assert.match(collection,/NASDAQ_100_TICKERS/);
  assert.match(collection,/COLLECTION_CONCURRENCY = 3/);
});

test("maps all six raw fields and documents Next FY Forward EPS",()=>{
  for(const field of ["actualTrailingRevenue","revenueYoyPct","nextFyEps","operatingMargin","operatingCashFlow","capitalExpenditure"]) assert.match(fmp,new RegExp(field));
  assert.match(fmp,/next_fiscal_year_annual_consensus/);
  assert.doesNotMatch(fmp,/estimatedEpsAvg/);
  assert.match(fmp,/numberOrNull\(fiscalYearEstimates\.next\?\.epsAvg\)/);
  assert.doesNotMatch(fmp,/epsdiluted/);
});

test("uses the existing math module for all derived calculations",()=>{
  for(const field of ["freeCashFlow","freeCashFlowMargin","cfoMargin","capexIntensity","classicRule40","operatingRule40","cashRule40"]) assert.match(math,new RegExp(field));
  assert.match(store,/calculateDerived/);
});

test("requires all six production raw fields for complete collection status",()=>{
  assert.match(fmp,/collectionStatus\(required, allFailed\)/);
  assert.doesNotMatch(fmp,/actualCoreAvailable/);
});
