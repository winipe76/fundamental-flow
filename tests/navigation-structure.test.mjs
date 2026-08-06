import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
test("includes all product screens",()=>{for(const label of ["Dashboard","Screener","Company Detail","Watchlist","Data Pilot"])assert.match(page,new RegExp(label))});
test("uses consistent actual growth and FY1 definitions",()=>{for(const label of ["최근 분기 EPS","최근 분기 Revenue","FY1 EPS","1개월 수정률","3개월 수정률"])assert.match(page,new RegExp(label))});
test("supports requested screener filters and sorting",()=>{for(const label of ["EPS YoY 높은 순","Revenue YoY 높은 순","흑자 전환 기업","FY1 EPS 상향 기업"])assert.match(page,new RegExp(label))});
test("does not render live sample financial values",()=>{assert.doesNotMatch(page,/demoSnapshots|Sample fallback/);assert.match(page,/LIVE 데이터가 로드된 후에만/)});
test("provides responsive growth layouts",()=>{assert.match(css,/\.growth-summary/);assert.match(css,/@media \(max-width:700px\)/)});
test("routes per-company snapshot history from Data Pilot",()=>{assert.match(page,/이력 보기/);assert.match(page,/useCompanyHistory/);assert.match(page,/SNAPSHOT HISTORY/);assert.match(page,/fundamentals\?ticker=/)});
