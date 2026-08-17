import test from "node:test";
import assert from "node:assert/strict";
import { calculateSnapshotQuality } from "../lib/snapshot-quality.ts";

const complete={revenue:100,revenueGrowth:20,forwardEps:4,operatingMargin:30,operatingCashFlow:40,capitalExpenditure:10,fiscalYear:"2026",fiscalPeriod:"Q2",fiscalPeriodEnd:"2026-06-30"};

test("scores a fully populated snapshot at 100",()=>{
  const quality=calculateSnapshotQuality(complete);
  assert.equal(quality.score,100);
  assert.equal(quality.aiCaution,false);
  assert.deepEqual(quality.missingChecks,[]);
});

test("scores a CFO-only omission at 72 and cautions AI",()=>{
  const quality=calculateSnapshotQuality({...complete,operatingCashFlow:null});
  assert.equal(quality.score,72);
  assert.equal(quality.aiCaution,true);
  assert.deepEqual(quality.missingChecks,["operatingCashFlow"]);
});
