import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const fmp=fs.readFileSync("lib/fmp.ts","utf8");
const store=fs.readFileSync("lib/snapshot-store.ts","utf8");
const math=fs.readFileSync("lib/fundamental-math.ts","utf8");
const rankings=fs.readFileSync("app/api/rankings/route.ts","utf8");

test("limits FMP Phase 1 collection in the requested order",()=>{
  assert.match(fmp,/TEST_TICKERS\s*=\s*\["PLTR",\s*"NVDA",\s*"MU"\]/);
  assert.match(rankings,/const tickers = \[\.\.\.TEST_TICKERS\]/);
});

test("maps all six raw fields and documents FY1 Forward EPS",()=>{
  for(const field of ["actualTrailingRevenue","revenueYoyPct","fy1Eps","operatingMargin","operatingCashFlow","capitalExpenditure"]) assert.match(fmp,new RegExp(field));
  assert.match(fmp,/next_fiscal_year_annual_consensus/);
});

test("uses the existing math module for all derived calculations",()=>{
  for(const field of ["freeCashFlow","freeCashFlowMargin","cfoMargin","capexIntensity","classicRule40","operatingRule40","cashRule40"]) assert.match(math,new RegExp(field));
  assert.match(store,/calculateDerived/);
});
