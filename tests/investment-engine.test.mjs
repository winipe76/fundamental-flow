import assert from "node:assert/strict";
import test from "node:test";
import { calculateDerived, screenCompany } from "../lib/calculations.ts";
import { monthlySnapshots } from "../data/mockUniverse.ts";

function snapshots(ticker) { return monthlySnapshots.filter((item) => item.ticker === ticker).sort((a,b) => a.snapshotDate.localeCompare(b.snapshotDate)); }

test("calculates CFO, FCF and three Rule of 40 variants from raw values", () => {
  const rows = snapshots("PLTR");
  const result = calculateDerived(rows[2], rows[1]);
  assert.equal(result.freeCashFlow, 970_000_000);
  assert.ok(result.cfoMargin > result.fcfMargin);
  assert.equal(result.classicRuleOf40, 41 + result.fcfMargin);
  assert.equal(result.operatingRuleOf40, 58.4);
  assert.equal(result.cashRuleOf40, 41 + result.cfoMargin);
});

test("treats CFO resilience plus rising CAPEX as growth investment, not automatic FCF penalty", () => {
  const rows = snapshots("AMZN");
  const derived = calculateDerived(rows[2], rows[1]);
  assert.equal(derived.growthInvestmentSignal, true);
  const screening = screenCompany(derived, calculateDerived(rows[1], rows[0]));
  assert.ok(screening.flags.some((flag) => flag.includes("성장 CAPEX")));
});

test("handles missing CFO without throwing and records a data issue", () => {
  const rows = snapshots("CEG");
  const derived = calculateDerived(rows[2], rows[1]);
  assert.equal(derived.cfoMargin, null);
  assert.equal(derived.freeCashFlow, null);
  assert.ok(derived.dataIssues.some((issue) => issue.includes("operatingCashFlow")));
});

test("classifies simultaneous EPS and revenue growth deterioration cautiously", () => {
  const rows = snapshots("TSLA");
  const derived = calculateDerived(rows[2], rows[1]);
  assert.equal(derived.trend, "Deteriorating");
  assert.equal(screenCompany(derived, calculateDerived(rows[1], rows[0])).status, "Caution");
});
