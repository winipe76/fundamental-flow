const PORTFOLIO_KEY = "fundamental-flow:portfolio";
const WATCHLIST_KEY = "fundamental-flow:watchlist";

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try { const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; }
  catch { return []; }
}
function write(key: string, tickers: string[]) { if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(tickers)); }
export const preferences = {
  portfolio: () => read(PORTFOLIO_KEY), watchlist: () => read(WATCHLIST_KEY),
  savePortfolio: (tickers: string[]) => write(PORTFOLIO_KEY, tickers),
  saveWatchlist: (tickers: string[]) => write(WATCHLIST_KEY, tickers),
};
