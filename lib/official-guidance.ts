export type OfficialGuidance = {
  earningsDate: string;
  revenue: string;
  eps: string | null;
  margin: string;
  period: string;
  announcementDate: string;
  source: string;
};

const SOURCES: Record<string, OfficialGuidance & { markers: string[] }> = {
  NVDA: {
    earningsDate: "2026-08-26",
    revenue: "$108.0B ±2%",
    eps: null,
    margin: "GAAP / Non-GAAP Gross Margin 74.0% ±0.5%p",
    period: "Q3 FY2027",
    announcementDate: "2026-08-26",
    source: "https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-second-quarter-fiscal-2027",
    markers: ["108.0 billion", "74.0%", "third quarter of fiscal 2027"],
  },
  MRVL: {
    earningsDate: "2026-08-27",
    revenue: "$3.150B ±5%",
    eps: "GAAP $0.53 ±$0.05 · Non-GAAP $1.10 ±$0.05",
    margin: "GAAP 52.9–53.9% · Non-GAAP 57.5–58.5%",
    period: "Q3 FY2027",
    announcementDate: "2026-08-27",
    source: "https://investor.marvell.com/sec-filings/all-sec-filings/content/0001835632-26-000022/q227_8kx812026ex-991.htm",
    markers: ["3.150 billion", "52.9%", "57.5%", "$1.10"],
  },
};

export function parseOfficialGuidance(ticker: string, html: string): OfficialGuidance | null {
  const source = SOURCES[ticker];
  if (!source || !source.markers.every((marker) => html.includes(marker))) return null;
  return {
    earningsDate: source.earningsDate, revenue: source.revenue, eps: source.eps,
    margin: source.margin, period: source.period, announcementDate: source.announcementDate,
    source: source.source,
  };
}

export async function collectOfficialGuidance(ticker: string): Promise<OfficialGuidance | null> {
  const source = SOURCES[ticker];
  if (!source) return null;
  try {
    const response = await fetch(source.source, { headers: { "User-Agent": "FundamentalFlow/1.0" } });
    return response.ok ? parseOfficialGuidance(ticker, await response.text()) : null;
  } catch {
    return null;
  }
}

