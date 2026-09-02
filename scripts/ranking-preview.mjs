import { readFile } from "node:fs/promises";
import { NASDAQ_100 } from "../lib/nasdaq100.ts";
import { compareQuarterEps, percentChange } from "../lib/fundamental-math.ts";
import { rankSnapshots } from "../lib/ranking.ts";

const envText=await readFile(new URL("../.env",import.meta.url),"utf8");
const apiKey=envText.match(/^FMP_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g,"");
if(!apiKey)throw new Error("FMP_API_KEY is missing");

async function actualGrowth(company){
  const url=new URL("https://financialmodelingprep.com/stable/income-statement");
  url.searchParams.set("symbol",company.ticker);url.searchParams.set("period","quarter");url.searchParams.set("limit","8");
  const response=await fetch(url,{headers:{apikey:apiKey,accept:"application/json"}});
  const data=response.ok?await response.json():[];
  const rows=Array.isArray(data)?data.filter((row)=>row&&typeof row==="object").sort((a,b)=>String(b.date).localeCompare(String(a.date))):[];
  const latest=rows[0];
  const prior=latest?rows.find((row)=>String(row.fiscalYear)===String(Number(latest.fiscalYear)-1)&&row.period===latest.period):null;
  const currentEps=Number.isFinite(Number(latest?.epsDiluted))?Number(latest.epsDiluted):null;
  const priorEps=Number.isFinite(Number(prior?.epsDiluted))?Number(prior.epsDiluted):null;
  const currentRevenue=Number.isFinite(Number(latest?.revenue))?Number(latest.revenue):null;
  const priorRevenue=Number.isFinite(Number(prior?.revenue))?Number(prior.revenue):null;
  const eps=compareQuarterEps(currentEps,priorEps);
  return {...company,eps_yoy_status:eps.status,eps_yoy_pct:eps.yoyPct,revenue_yoy_pct:percentChange(currentRevenue,priorRevenue)};
}

const snapshots=[];
for(let index=0;index<NASDAQ_100.length;index+=10){
  snapshots.push(...await Promise.all(NASDAQ_100.slice(index,index+10).map(actualGrowth)));
}
const top10=rankSnapshots(snapshots).slice(0,10).map((row)=>({
  rank:row.rank,ticker:row.ticker,name:row.name,score:Number(row.score.toFixed(1)),
  epsYoY:row.eps_yoy_status==="growth"?Number(row.eps_yoy_pct?.toFixed(1)):row.eps_yoy_status,
  revenueYoY:Number(row.revenue_yoy_pct?.toFixed(1)),
}));
console.table(top10);

