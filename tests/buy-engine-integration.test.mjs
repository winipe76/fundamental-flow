import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const route = fs.readFileSync("app/api/buy-engine/candidates/route.ts", "utf8");
const page = fs.readFileSync("app/page.tsx", "utf8");
const candidate = fs.readFileSync("lib/fundamental-candidate.ts", "utf8");

test("registers and removes candidates through the authenticated browser transfer endpoint", () => {
  assert.match(route, /api\/candidates\/import\?token=/);
  assert.match(route, /createCandidateTransferToken/);
  assert.match(route, /transfer\(request, "add"\)/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /transfer\(request, "remove"\)/);
  assert.match(route, /BUY_ENGINE_SYNC_TOKEN/);
});

test("offers the existing Buy Engine toggle from company detail and screener", () => {
  assert.match(page, /function CandidateActions/);
  assert.match(page, /Add to Buy Engine/);
  assert.match(page, /Remove from Buy Engine/);
  assert.match(page, /detail-buy-action[\s\S]*CandidateActions ticker=\{c\.ticker\}/);
  assert.match(page, /RankingCandidateRow[\s\S]*CandidateActions ticker=\{row\.ticker\}/);
});

test("shows one toggle button from the confirmed Buy Engine callback state", () => {
  assert.match(page, /buy_engine_added/);
  assert.match(page, /localStorage\.setItem\(`buy-engine:/);
  assert.match(page, /window\.location\.assign\(payload\.redirectUrl\)/);
  assert.match(page, /Added · Remove from Buy Engine/);
  assert.match(page, /aria-pressed=\{added\}/);
  assert.doesNotMatch(page, /<button[^>]*>Remove from Buy Engine<\/button>/);
});

test("transfers stored Fundamental metrics without ranking or valuation", () => {
  assert.doesNotMatch(candidate, /rankSnapshots|fundamental_score|ranking_component_scores|ranking_position/);
  for (const field of ["ticker", "company_name", "fundamental_stage", "metrics", "source_snapshot_date"]) assert.ok(candidate.includes(field), field);
});
