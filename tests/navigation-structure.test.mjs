import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("includes every phase-one navigation destination", () => {
  for (const label of ["Dashboard", "Screener", "Company Detail", "Watchlist", "Data Pilot"]) assert.match(page, new RegExp(label));
});

test("keeps the FMP pilot component and update action", () => {
  assert.match(page, /function DataPilot/);
  assert.match(page, /\/api\/fundamentals/);
  assert.match(page, /지금 업데이트/);
});

test("connects shared pilot snapshots to primary analysis screens", () => {
  assert.match(page, /usePilotFundamentals/);
  assert.match(page, /<Dashboard onOpen=\{openCompany\} pilot=\{pilot\}/);
  assert.match(page, /<Screener onOpen=\{openCompany\} pilot=\{pilot\}/);
  assert.match(page, /<CompanyDetail ticker=\{selectedTicker\} pilot=\{pilot\}/);
  assert.match(page, /FMP SNAPSHOT/);
});

test("labels pilot scope and future sections explicitly", () => {
  assert.match(page, /Pilot Universe: 3 \/ Nasdaq 100/);
  assert.match(page, /다음 단계에서 연결 예정/);
  assert.match(page, /Sample/);
});

test("provides responsive navigation styles", () => {
  assert.match(css, /\.main-nav\.open/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /\.nav-overlay/);
});
