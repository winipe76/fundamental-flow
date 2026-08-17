import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dictionary=fs.readFileSync("docs/FMP_DATA_DICTIONARY.md","utf8");

test("data dictionary identifies its verified version and companies",()=>{
  for(const value of ["Data Dictionary Version | 1.0","2026-08-17","PLTR, NVDA, MU","FMP Stable API"]) assert.match(dictionary,new RegExp(value.replaceAll(".","\\.")));
});

test("data dictionary covers every consumed FMP source field",()=>{
  for(const field of ["date","fiscalYear","period","epsDiluted","revenue","operatingIncome","epsAvg","operatingCashFlow","capitalExpenditure","freeCashFlow"]) assert.ok(dictionary.includes("`"+field+"`"),field);
});

test("data dictionary documents validation and all Rule of 40 formulas",()=>{
  for(const section of ["Missing and Null Values","Fiscal Period Mismatch","Currency Mismatch","API Failure","Invalid Numeric Values","Classic Rule of 40","Operating Rule of 40","Cash Rule of 40"]) assert.match(dictionary,new RegExp(section));
});
