import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { numberOrNull, collectionStatus } from "../lib/fmp-validation.ts";
import { classifySnapshot } from "../lib/screening-engine.ts";

test("numberOrNull never converts missing values to zero", () => {
  for (const value of [null, undefined, "", "   ", "not-a-number", NaN, Infinity]) assert.equal(numberOrNull(value), null);
  assert.equal(numberOrNull(0), 0);
  assert.equal(numberOrNull("12.5"), 12.5);
});

test("collection is complete only when all six raw fields exist", () => {
  const complete = { revenue: 1, revenueGrowth: 2, forwardEps: 3, operatingMargin: 4, operatingCashFlow: 5, capitalExpenditure: 6 };
  assert.equal(collectionStatus(complete, false), "complete");
  assert.equal(collectionStatus({ ...complete, operatingCashFlow: null }, false), "partial");
  assert.equal(collectionStatus({ ...complete, capitalExpenditure: null }, false), "partial");
  assert.equal(collectionStatus(complete, true), "failed");
});

const base = { snapshotDate: "2026-08-17", collectionStatus: "complete", calculationSuccess: true, validationStatus: "valid", snapshotQualityScore: 100, revenueGrowth: 25, classicRule40: 50, cashRule40: 55, forwardEpsChangePct: 2 };
test("screening engine produces all stages from Fundamental Flow only", () => {
  assert.equal(classifySnapshot(base, null).stage, "newly_selected");
  assert.equal(classifySnapshot({ ...base, snapshotDate: "2026-09-17" }, { stage: "newly_selected", sourceSnapshotDate: "2026-08-17" }).stage, "continuing_improvement");
  assert.equal(classifySnapshot({ ...base, classicRule40: 25 }, null).stage, "watch");
  assert.equal(classifySnapshot({ ...base, validationStatus: "warning" }, null).stage, "caution");
  assert.equal(classifySnapshot({ ...base, revenueGrowth: -1 }, null).stage, "excluded");
});

test("ranking refresh performs one update request", () => {
  const page = fs.readFileSync("app/page.tsx", "utf8");
  assert.doesNotMatch(page, /totalBatches=20/);
  assert.doesNotMatch(page, /for\(let batch=/);
});

test("latest successful update requires six fields and calculation success", () => {
  const route = fs.readFileSync("app/api/fundamentals/route.ts", "utf8");
  for (const field of ["actual_trailing_revenue", "revenue_yoy_pct", "next_fy_eps", "operating_margin", "operating_cash_flow", "capital_expenditure", "calculation_success=1"]) assert.ok(route.includes(field), field);
});

