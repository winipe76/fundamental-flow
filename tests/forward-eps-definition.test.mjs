import assert from "node:assert/strict";
import test from "node:test";
import { calculateNextFyRevisions, selectAnnualEstimatesByFiscalYear } from "../lib/forward-eps.ts";

const estimates = (currentDate, currentEps, nextDate, nextEps) => [
  { date: nextDate, epsAvg: nextEps },
  { date: currentDate, epsAvg: currentEps },
  { date: `${Number(currentDate.slice(0,4))-1}${currentDate.slice(4)}`, epsAvg: 0.5 },
];

test("identifies Current FY and Next FY without relying on response position", () => {
  const selected = selectAnnualEstimatesByFiscalYear(estimates("2026-12-31",1.59974,"2027-12-31",2.28177),"2026");
  assert.equal(selected.current?.date,"2026-12-31");
  assert.equal(selected.next?.date,"2027-12-31");
});

test("selects PLTR Next FY2027", () => assert.equal(selectAnnualEstimatesByFiscalYear(estimates("2026-12-31",1.59974,"2027-12-31",2.28177),"2026").next?.epsAvg,2.28177));
test("selects NVDA Next FY2028 when fiscal and calendar operating years differ", () => assert.equal(selectAnnualEstimatesByFiscalYear(estimates("2027-01-25",9.01477,"2028-01-25",12.78792),"2027").next?.epsAvg,12.78792));
test("selects MU Next FY2027", () => assert.equal(selectAnnualEstimatesByFiscalYear(estimates("2026-08-28",73.2,"2027-08-28",154.64267),"2026").next?.epsAvg,154.64267));

test("does not fall back when the exact Next FY row is missing", () => assert.equal(selectAnnualEstimatesByFiscalYear([{date:"2030-12-31",epsAvg:9}],"2026").next,null));
test("preserves a null epsAvg for validation instead of substituting another field", () => assert.equal(selectAnnualEstimatesByFiscalYear([{date:"2027-12-31",epsAvg:null}],"2026").next?.epsAvg,null));

test("calculates 1M and 3M Next FY revisions", () => {
  const result=calculateNextFyRevisions(2.2,"2027-12-31",{fiscalDate:"2027-12-31",eps:2},{fiscalDate:"2027-12-31",eps:1.6});
  assert.ok(Math.abs((result.oneMonth??0)-10)<1e-9);
  assert.ok(Math.abs((result.threeMonths??0)-37.5)<1e-9);
});

test("requires the same estimate fiscal date", () => assert.deepEqual(calculateNextFyRevisions(2.2,"2028-12-31",{fiscalDate:"2027-12-31",eps:2},{fiscalDate:"2027-12-31",eps:1.6}),{oneMonth:null,threeMonths:null}));
test("starts a new null series on fiscal rollover", () => assert.deepEqual(calculateNextFyRevisions(3,"2028-12-31",{fiscalDate:"2027-12-31",eps:2.2},null),{oneMonth:null,threeMonths:null}));
test("returns null when previous snapshots are missing", () => assert.deepEqual(calculateNextFyRevisions(2.2,"2027-12-31",null,null),{oneMonth:null,threeMonths:null}));
test("returns null when current or previous EPS is null", () => assert.deepEqual(calculateNextFyRevisions(null,"2027-12-31",{fiscalDate:"2027-12-31",eps:2},null),{oneMonth:null,threeMonths:null}));
