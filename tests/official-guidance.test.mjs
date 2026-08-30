import test from "node:test";
import assert from "node:assert/strict";
import { parseOfficialGuidance } from "../lib/official-guidance.ts";

test("accepts only verified official guidance markers", () => {
  assert.equal(parseOfficialGuidance("NVDA", "108.0 billion 74.0% third quarter of fiscal 2027")?.revenue, "$108.0B ±2%");
  assert.equal(parseOfficialGuidance("MRVL", "3.150 billion 52.9% 57.5% $1.10")?.eps, "GAAP $0.53 ±$0.05 · Non-GAAP $1.10 ±$0.05");
  assert.equal(parseOfficialGuidance("NVDA", "108.0 billion"), null);
  assert.equal(parseOfficialGuidance("PLTR", "anything"), null);
});
