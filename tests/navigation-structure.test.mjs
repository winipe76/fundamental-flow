import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
test("includes all product screens",()=>{for(const label of ["Fundamental Overview","Screener","Company Detail","Watchlist","Data Pilot"])assert.match(page,new RegExp(label))});
test("uses consistent actual growth and FY1 definitions",()=>{for(const label of ["최근 분기 EPS","최근 분기 Revenue","FY1 EPS","1개월 수정률","3개월 수정률"])assert.match(page,new RegExp(label))});
test("keeps screening separate from Fundamental Overview",()=>{for(const label of ["NASDAQ 100 · FUNDAMENTAL SCREENING","SELECTED","Fundamental Score","Nasdaq 100 업데이트","현재 Screening 조건을 충족한 기업이 없습니다"])assert.match(page,new RegExp(label))});
test("does not render live sample financial values",()=>{assert.doesNotMatch(page,/demoSnapshots|Sample fallback/);assert.match(page,/LIVE 데이터가 로드된 후에만/)});
test("provides responsive growth layouts",()=>{assert.match(css,/\.growth-summary/);assert.match(css,/@media \(max-width:700px\)/)});
test("routes per-company snapshot history from Data Pilot",()=>{assert.match(page,/이력 보기/);assert.match(page,/useCompanyHistory/);assert.match(page,/SNAPSHOT HISTORY/);assert.match(page,/fundamentals\?ticker=/)});
test("reserves management guidance and earnings call AI sections",()=>{for(const label of ["Management Guidance","REVENUE GUIDANCE","EARNINGS OUTLOOK","CAPITAL ALLOCATION","EARNINGS CALL AI OPINION","COMING SOON"])assert.match(page,new RegExp(label))});
test("labels each management guidance comparison basis",()=>{for(const label of ["이전 경영진 가이던스 대비","시장 컨센서스 대비","이전 마진 전망 대비","시장 EPS 컨센서스 대비","이전 투자계획 대비","FCF 영향 판단"])assert.match(page,new RegExp(label))});
test("identifies actual EPS as GAAP diluted with an accessible tooltip",()=>{assert.match(page,/GAAP diluted/);assert.match(page,/function EpsDefinition/);assert.match(page,/tabIndex=\{0\}/);assert.match(css,/\.metric-help:hover/)});
test("uses Nasdaq 100 metadata for overview and screener search",()=>{assert.match(page,/NASDAQ_100/);assert.match(page,/NASDAQ 100 UNIVERSE/);assert.match(page,/Valid Snapshots/);assert.match(page,/Nasdaq 100 전체 티커 또는 회사명 검색/)});
test("routes screener rows and universe search results to the existing detail screen",()=>{assert.match(page,/Screener open=\{open\}/);assert.match(page,/RankingCandidateRow[\s\S]*open=\{open\}/);assert.match(page,/role=\"link\"[\s\S]*onClick=\{navigate\}/);assert.match(page,/searchResults\.map[\s\S]*onClick=\{\(\)=>open\(company\.ticker\)\}/);assert.match(page,/setView\(\"Company Detail\"\)/)});
