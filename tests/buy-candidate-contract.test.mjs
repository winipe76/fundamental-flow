import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTicker, parseFundamentalStage, selectFundamentalMetrics } from "../lib/buy-candidate-contract.ts";

test("normalizes a candidate ticker", () => {
  assert.equal(normalizeTicker(" nvda "), "NVDA");
  assert.throws(() => normalizeTicker("bad ticker"));
});

test("accepts exactly the five Fundamental stages", () => {
  for (const stage of ["newly_selected", "continuing_improvement", "watch", "caution", "excluded"]) {
    assert.equal(parseFundamentalStage(stage), stage);
  }
  assert.throws(() => parseFundamentalStage("PASS"));
});

test("exports only the approved Fundamental metric summary", () => {
  const metrics = selectFundamentalMetrics({ revenue_yoy_pct: 42, secret: "not exported" });
  assert.equal(metrics.revenue_yoy_pct, 42);
  assert.equal("secret" in metrics, false);
});
