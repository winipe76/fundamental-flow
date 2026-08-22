import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const route = fs.readFileSync("app/api/buy-engine/candidates/route.ts", "utf8");
const page = fs.readFileSync("app/page.tsx", "utf8");
const candidate = fs.readFileSync("lib/fundamental-candidate.ts", "utf8");

test("registers and removes candidates through the secure Buy Engine sync endpoint", () => {
  assert.match(route, /api\/candidates\/sync/);
  assert.match(route, /method: "POST"/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /method: "DELETE"/);
  assert.match(route, /Authorization.*Bearer/);
});

test("offers the existing Buy Engine toggle from company detail and screener", () => {
  assert.match(page, /function CandidateActions/);
  assert.match(page, /Add to Buy Engine/);
  assert.match(page, /Remove from Buy Engine/);
  assert.match(page, /detail-buy-action[\s\S]*CandidateActions ticker=\{c\.ticker\}/);
  assert.match(page, /RankingCandidateRow[\s\S]*CandidateActions ticker=\{row\.ticker\}/);
});

test("shows one toggle button from the actual Buy Engine candidate state", () => {
  assert.match(page, /fetch\(`\/api\/buy-engine\/candidates\?ticker=/);
  assert.match(page, /setCandidateState\(\{ticker,added:payload\.added===true\}\)/);
  assert.match(page, /Added · Remove from Buy Engine/);
  assert.match(page, /aria-pressed=\{added\}/);
  assert.doesNotMatch(page, /<button[^>]*>Remove from Buy Engine<\/button>/);
});

test("transfers stored Fundamental metrics without ranking or valuation", () => {
  assert.doesNotMatch(candidate, /rankSnapshots|fundamental_score|ranking_component_scores|ranking_position/);
  for (const field of ["ticker", "company_name", "fundamental_stage", "metrics", "source_snapshot_date"]) assert.ok(candidate.includes(field), field);
});
