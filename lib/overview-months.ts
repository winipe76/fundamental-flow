export function selectMonthlyPairs<T>(rows:T[],currentMonth:string,getTicker:(row:T)=>string,getDate:(row:T)=>string|null){
  const current=new Date(`${currentMonth}-01T00:00:00Z`);
  current.setUTCMonth(current.getUTCMonth()-1);
  const previousMonth=current.toISOString().slice(0,7);
  const latest=new Map<string,T>();
  for(const row of rows){
    const date=getDate(row),ticker=getTicker(row);
    if(!date||![currentMonth,previousMonth].includes(date.slice(0,7)))continue;
    const key=`${ticker}:${date.slice(0,7)}`,saved=latest.get(key);
    if(!saved||(getDate(saved)??"")<date)latest.set(key,row);
  }
  return [...new Set(rows.map(getTicker))].flatMap(ticker=>{
    const currentRow=latest.get(`${ticker}:${currentMonth}`);
    return currentRow?[[currentRow,latest.get(`${ticker}:${previousMonth}`)].filter((row):row is T=>Boolean(row))]:[];
  });
}
