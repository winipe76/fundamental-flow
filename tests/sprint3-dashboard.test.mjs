import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("app/page.tsx", "utf8");

test("renames Dashboard to Fundamental Overview and states the philosophy", () => {
  assert.match(page, /Fundamental Overview/);
  assert.match(page, /우리는 주가를 추종하지 않는다/);
  assert.match(page, /기업의 변화를 추적한다/);
});

test("puts four Fundamental Change indicators before secondary screening", () => {
  for (const label of ["Forward EPS Trend", "Revenue Growth Trend", "Operating Margin Trend", "Operating Cash Flow Trend"]) assert.ok(page.includes(label), label);
  assert.ok(page.indexOf("PRIMARY VIEW") < page.indexOf("SECONDARY VIEW"));
});

test("explains company changes and treats Rule of 40 as validation", () => {
  assert.match(page, /기업 변화와 분류 이유/);
  assert.match(page, /Rule of 40 · \{rule40State\(s\)\}/);
  assert.doesNotMatch(page, /Rule of 40.*toFixed/);
});

test("company detail separates core and supporting indicators", () => {
  for (const label of ["Core Indicators", "Supporting Indicators", "Forward EPS", "Revenue Growth", "Operating Margin", "Operating Cash Flow", "CAPEX", "Free Cash Flow", "Snapshot Quality"]) assert.ok(page.includes(label), label);
});

test("rule-based analysis explains and does not recommend trades", () => {
  assert.match(page, /AI Analysis/);
  assert.match(page, /투자 추천이 아닙니다/);
  assert.doesNotMatch(page, /매수 추천|매도 추천/);
});
