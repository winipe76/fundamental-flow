export type StockStatus = "selected" | "improving" | "caution";

export interface Stock {
  ticker: string;
  company: string;
  tags: string[];
  currentEps: number;
  previousEps: number;
  epsChange: number;
  status: StockStatus;
  revenueGrowth?: number;
  ruleOf40?: number;
  fcfMargin?: number;
}

const row = (ticker: string, company: string, tags: string[], currentEps: number, previousEps: number): Stock => {
  const epsChange = Number((((currentEps - previousEps) / Math.abs(previousEps)) * 100).toFixed(1));
  return {
    ticker, company, tags, currentEps, previousEps, epsChange,
    status: epsChange >= 5 ? "selected" : epsChange >= 0 ? "improving" : "caution",
  };
};

export const stocks: Stock[] = [
  row("NVDA", "NVIDIA Corporation", ["AI", "반도체"], 5.62, 4.88),
  row("AVGO", "Broadcom Inc.", ["AI", "반도체"], 8.91, 7.86),
  row("CRWD", "CrowdStrike Holdings", ["사이버보안", "클라우드"], 5.48, 4.93),
  row("AMD", "Advanced Micro Devices", ["AI", "반도체"], 4.76, 4.30),
  row("META", "Meta Platforms", ["디지털광고", "AI"], 32.45, 29.60),
  row("PANW", "Palo Alto Networks", ["사이버보안"], 7.62, 7.01),
  row("NFLX", "Netflix, Inc.", ["스트리밍", "소비재"], 29.18, 27.10),
  row("AMZN", "Amazon.com, Inc.", ["클라우드", "이커머스"], 7.45, 6.94),
  row("MU", "Micron Technology", ["메모리", "반도체"], 12.82, 12.10),
  row("CEG", "Constellation Energy", ["원자력", "AI 인프라"], 9.64, 9.12),
  row("PLTR", "Palantir Technologies", ["AI", "소프트웨어"], 0.82, 0.78),
  row("MSFT", "Microsoft Corporation", ["클라우드", "AI"], 16.93, 16.31),
  row("GOOGL", "Alphabet Inc.", ["디지털광고", "AI"], 10.52, 10.17),
  row("AAPL", "Apple Inc.", ["하드웨어", "서비스"], 8.15, 7.92),
  row("COST", "Costco Wholesale", ["리테일", "소비재"], 20.44, 19.95),
  row("ADBE", "Adobe Inc.", ["소프트웨어", "AI"], 22.67, 22.19),
  row("INTU", "Intuit Inc.", ["핀테크", "소프트웨어"], 22.12, 21.76),
  row("BKNG", "Booking Holdings", ["여행", "플랫폼"], 211.50, 210.20),
  row("CSCO", "Cisco Systems", ["네트워크", "AI 인프라"], 4.28, 4.28),
  row("PEP", "PepsiCo, Inc.", ["필수소비재"], 8.67, 8.69),
  row("QCOM", "QUALCOMM Inc.", ["반도체", "모바일"], 12.36, 12.51),
  row("SBUX", "Starbucks Corporation", ["소비재", "리테일"], 3.88, 4.02),
  row("GILD", "Gilead Sciences", ["바이오", "헬스케어"], 8.09, 8.45),
  row("TSLA", "Tesla, Inc.", ["전기차", "AI"], 2.14, 2.34),
];

