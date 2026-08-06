import assert from "node:assert/strict";
import test from "node:test";
import { compareQuarterEps, percentChange, sumFour } from "../lib/fundamental-math.ts";

test("calculates normal YoY growth",()=>assert.equal(compareQuarterEps(1.06,.96).yoyPct.toFixed(1),"10.4"));
test("classifies EPS sign exceptions",()=>{
  assert.equal(compareQuarterEps(.2,-.1).status,"profit_turnaround");
  assert.equal(compareQuarterEps(-.2,.1).status,"loss_turnaround");
  assert.equal(compareQuarterEps(-.1,-.2).status,"loss_improving");
  assert.equal(compareQuarterEps(-.3,-.2).status,"loss_widening");
  assert.equal(compareQuarterEps(.1,.001).status,"unavailable");
});
test("requires exactly four quarters for TTM margin inputs",()=>{assert.equal(sumFour([1,1,1,1]),4);assert.equal(sumFour([1,1,1]),null);assert.equal(sumFour([1,1,null,1]),null)});
test("calculates revenue and revision rates",()=>assert.equal(percentChange(112,100),12.00000000000001));
