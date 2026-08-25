import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
test("includes all product screens without the removed Watchlist",()=>{for(const label of ["Fundamental Overview","Screener","Company Detail","Data Pilot"])assert.match(page,new RegExp(label));assert.doesNotMatch(page,/Watchlist/)});
test("uses consistent actual growth and Next FY definitions",()=>{for(const label of ["최근 분기 EPS","최근 분기 Revenue","Next FY EPS","1개월 수정률","3개월 수정률"])assert.match(page,new RegExp(label))});
test("keeps screening separate from Fundamental Overview",()=>{for(const label of ["NASDAQ 100 · FUNDAMENTAL SCREENING","SELECTED","Fundamental Score","Nasdaq 100 업데이트","현재 Screening 조건을 충족한 기업이 없습니다"])assert.match(page,new RegExp(label))});
test("does not render live sample financial values",()=>{assert.doesNotMatch(page,/demoSnapshots|Sample fallback/);assert.match(page,/LIVE 데이터가 로드된 후에만/)});
test("provides responsive growth layouts",()=>{assert.match(css,/\.growth-summary/);assert.match(css,/@media \(max-width:700px\)/)});
test("routes per-company snapshot history from Data Pilot",()=>{assert.match(page,/이력 보기/);assert.match(page,/useCompanyHistory/);assert.match(page,/SNAPSHOT HISTORY/);assert.match(page,/fundamentals\?ticker=/)});
test("shows verified earnings and nullable guidance in company detail",()=>{for(const label of ["Earnings / Guidance","Actual Revenue","Actual EPS","REVENUE GUIDANCE","EPS GUIDANCE","MARGIN GUIDANCE","제공되지 않음"])assert.match(page,new RegExp(label))});
test("does not infer management guidance when FMP has no structured field",()=>{assert.match(page,/FMP의 검증된 구조화 필드가 있을 때만 표시/);assert.match(page,/추정하지 않고 null로 유지/)});
test("identifies actual EPS as GAAP diluted with an accessible tooltip",()=>{assert.match(page,/GAAP diluted/);assert.match(page,/function EpsDefinition/);assert.match(page,/tabIndex=\{0\}/);assert.match(css,/\.metric-help:hover/)});
test("uses Nasdaq 100 metadata for overview and screener search",()=>{assert.match(page,/NASDAQ_100/);assert.match(page,/NASDAQ 100 UNIVERSE/);assert.match(page,/Valid Snapshots/);assert.match(page,/Nasdaq 100 전체 티커 또는 회사명 검색/)});
test("routes screener rows and universe search results to the existing detail screen",()=>{assert.match(page,/Screener open=\{open\}/);assert.match(page,/RankingCandidateRow[\s\S]*open=\{open\}/);assert.match(page,/role=\"link\"[\s\S]*onClick=\{navigate\}/);assert.match(page,/searchResults\.map[\s\S]*onClick=\{\(\)=>open\(company\.ticker\)\}/);assert.match(page,/setView\(\"Company Detail\"\)/)});
