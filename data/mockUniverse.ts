import type { Company, MetricKey, MonthlySnapshot, RawMetric } from "../types/investment.ts";

type Values = [revenue: number | null, revenueGrowth: number | null, forwardEps: number | null, operatingMargin: number | null, cfo: number | null, capex: number | null];
type Seed = Company & { months: Values[] };
const dates = ["2026-05-31", "2026-06-30", "2026-07-31"];
const keys: MetricKey[] = ["revenue", "revenueGrowth", "forwardEps", "operatingMargin", "operatingCashFlow", "capitalExpenditure"];
const units: Record<MetricKey, RawMetric["unit"]> = { revenue: "USD", revenueGrowth: "%", forwardEps: "USD/share", operatingMargin: "%", operatingCashFlow: "USD", capitalExpenditure: "USD" };

const seeds: Seed[] = [
  { ticker: "PLTR", companyName: "Palantir Technologies", sector: "Technology", industry: "Software—Infrastructure", themes: ["AI Software", "Government AI"], lastUpdated: dates[2], months: [[3.10e9, 32, .68, 13.0, 1.02e9, .25e9], [3.29e9, 36, .75, 15.2, 1.12e9, .29e9], [3.47e9, 41, .84, 17.4, 1.31e9, .34e9]] },
  { ticker: "NVDA", companyName: "NVIDIA Corporation", sector: "Technology", industry: "Semiconductors", themes: ["AI Infrastructure", "Semiconductor"], lastUpdated: dates[2], months: [[130e9, 78, 4.55, 58.4, 63e9, 8e9], [148e9, 66, 5.02, 60.2, 70e9, 10e9], [165e9, 58, 5.61, 61.9, 80e9, 12e9]] },
  { ticker: "MSFT", companyName: "Microsoft Corporation", sector: "Technology", industry: "Software—Infrastructure", themes: ["Cloud", "AI Infrastructure", "AI Software"], lastUpdated: dates[2], months: [[260e9, 15.5, 15.62, 45.1, 118e9, 42e9], [271e9, 16.1, 16.08, 45.5, 124e9, 48e9], [282e9, 16.4, 16.41, 45.8, 129e9, 56e9]] },
  { ticker: "AMZN", companyName: "Amazon.com, Inc.", sector: "Consumer Cyclical", industry: "Internet Retail", themes: ["Cloud", "Internet Platform", "Robotics"], lastUpdated: dates[2], months: [[650e9, 10.8, 6.52, 10.2, 112e9, 73e9], [666e9, 11.4, 6.84, 10.8, 119e9, 81e9], [682e9, 12.1, 7.12, 11.5, 125e9, 94e9]] },
  { ticker: "GOOGL", companyName: "Alphabet Inc.", sector: "Communication Services", industry: "Internet Content & Information", themes: ["Internet Platform", "AI Infrastructure", "Cloud"], lastUpdated: dates[2], months: [[365e9, 13.2, 9.72, 31.0, 132e9, 48e9], [374e9, 12.7, 9.64, 30.7, 134e9, 51e9], [382e9, 11.9, 9.41, 30.1, 135e9, 55e9]] },
  { ticker: "META", companyName: "Meta Platforms, Inc.", sector: "Communication Services", industry: "Internet Content & Information", themes: ["Internet Platform", "AI Infrastructure"], lastUpdated: dates[2], months: [[178e9, 18.0, 28.6, 41.2, 86e9, 39e9], [184e9, 17.3, 29.1, 41.8, 89e9, 45e9], [190e9, 16.5, 29.4, 42.0, 91e9, 55e9]] },
  { ticker: "TSLA", companyName: "Tesla, Inc.", sector: "Consumer Cyclical", industry: "Auto Manufacturers", themes: ["Autonomous Driving", "Robotics", "Energy Storage"], lastUpdated: dates[2], months: [[101e9, 8.5, 2.55, 8.7, 15e9, 11e9], [99e9, 5.4, 2.31, 7.4, 13e9, 11.5e9], [97e9, 2.1, 2.05, 6.2, 11e9, 11.8e9]] },
  { ticker: "AVGO", companyName: "Broadcom Inc.", sector: "Technology", industry: "Semiconductors", themes: ["AI Infrastructure", "Semiconductor", "Cyber Security"], lastUpdated: dates[2], months: [[58e9, 31.0, 7.32, 35.2, 24e9, 1.6e9], [61e9, 28.0, 7.81, 36.0, 26e9, 1.8e9], [64e9, 25.5, 8.28, 36.6, 28e9, 2.0e9]] },
  { ticker: "CRWD", companyName: "CrowdStrike Holdings", sector: "Technology", industry: "Software—Infrastructure", themes: ["Cyber Security", "Cloud", "AI Software"], lastUpdated: dates[2], months: [[4.4e9, 27.0, 4.62, 5.2, 1.35e9, .19e9], [4.6e9, 25.2, 4.79, 5.8, 1.41e9, .21e9], [4.8e9, 24.5, 4.91, 5.5, 1.48e9, .24e9]] },
  { ticker: "CEG", companyName: "Constellation Energy", sector: "Utilities", industry: "Renewable Utilities", themes: ["Nuclear", "Power Grid", "AI Infrastructure"], lastUpdated: dates[2], months: [[24e9, 7.8, 8.52, 20.1, 5.8e9, 3.4e9], [25e9, 9.2, 8.91, 20.8, 6.2e9, 3.8e9], [26e9, 10.5, 9.31, 21.3, null, 4.1e9]] },
];

export const companies: Company[] = seeds.map((seed) => ({ ticker: seed.ticker, companyName: seed.companyName, sector: seed.sector, industry: seed.industry, themes: seed.themes, lastUpdated: seed.lastUpdated }));

export const monthlySnapshots: MonthlySnapshot[] = seeds.flatMap((seed) => seed.months.map((values, index) => {
  const raw = Object.fromEntries(keys.map((metric, metricIndex) => {
    const metricValue = values[metricIndex];
    const item: RawMetric = { ticker: seed.ticker, snapshotDate: dates[index], fiscalPeriod: "TTM/FY1", metric, value: metricValue, unit: units[metric], sourceStatus: metricValue === null ? "unavailable" : "mock", isMissing: metricValue === null };
    return [metric, item];
  })) as MonthlySnapshot["raw"];
  return { ticker: seed.ticker, snapshotDate: dates[index], fiscalPeriod: "TTM/FY1", raw };
}));
