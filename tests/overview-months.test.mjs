import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { selectMonthlyPairs } from "../lib/overview-months.ts";

test("uses only the latest snapshot from current and previous month",()=>{
  const rows=[
    {ticker:"NVDA",date:"2026-09-01",value:1},
    {ticker:"NVDA",date:"2026-09-02",value:2},
    {ticker:"NVDA",date:"2026-08-30",value:3},
    {ticker:"NVDA",date:"2026-07-31",value:4},
    {ticker:"PLTR",date:"2026-09-02",value:5},
    {ticker:"MU",date:"2026-08-30",value:6},
  ];
  const pairs=selectMonthlyPairs(rows,"2026-09",row=>row.ticker,row=>row.date);
  assert.equal(pairs.length,2);
  assert.deepEqual(pairs[0].map(row=>row.date),["2026-09-02","2026-08-30"]);
  assert.deepEqual(pairs[1].map(row=>row.date),["2026-09-02"]);
});

test("overview query keeps one representative snapshot per ticker and month",()=>{
  const route=fs.readFileSync("app/api/fundamentals/route.ts","utf8");
  assert.match(route,/PARTITION BY ticker, substr\(snapshot_date,1,7\)/);
  assert.match(route,/snapshot_rank = 1/);
});
