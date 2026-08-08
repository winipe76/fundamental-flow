import assert from "node:assert/strict";
import test from "node:test";
import { NASDAQ_100 } from "../lib/nasdaq100.ts";
import { rankSnapshots } from "../lib/ranking.ts";

test("contains exactly 100 unique Nasdaq companies",()=>{
  assert.equal(NASDAQ_100.length,100);
  assert.equal(new Set(NASDAQ_100.map((company)=>company.ticker)).size,100);
});

test("ranks initial snapshots using actual EPS and revenue growth",()=>{
  const ranked=rankSnapshots([
    {ticker:"A",eps_yoy_status:"growth",eps_yoy_pct:40,revenue_yoy_pct:30,fwd_eps_change_pct:null,fy1_eps_change_3m_pct:null},
    {ticker:"B",eps_yoy_status:"growth",eps_yoy_pct:20,revenue_yoy_pct:10,fwd_eps_change_pct:null,fy1_eps_change_3m_pct:null},
    {ticker:"C",eps_yoy_status:"growth",eps_yoy_pct:10,revenue_yoy_pct:5,fwd_eps_change_pct:null,fy1_eps_change_3m_pct:null},
  ]);
  assert.equal(ranked[0].ticker,"A");
  assert.equal(ranked[0].rank,1);
  assert.equal(ranked[2].ticker,"C");
});

test("scores profit turnaround as a positive EPS signal",()=>{
  const ranked=rankSnapshots([
    {ticker:"TURN",eps_yoy_status:"profit_turnaround",eps_yoy_pct:null,revenue_yoy_pct:20},
    {ticker:"GROW",eps_yoy_status:"growth",eps_yoy_pct:5,revenue_yoy_pct:10},
  ]);
  assert.equal(ranked[0].ticker,"TURN");
});
