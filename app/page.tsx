"use client";

import { useMemo, useState } from "react";
import { stocks, type Stock, type StockStatus } from "@/data/stocks";

type Tab = StockStatus | "all";

const tabs: { id: Tab; label: string; description: string }[] = [
  { id: "selected", label: "선정 기업", description: "+5% 이상" },
  { id: "improving", label: "개선 기업", description: "0% ~ +5%" },
  { id: "caution", label: "주의 기업", description: "0% 미만" },
  { id: "all", label: "전체 기업", description: "샘플 DB" },
];

const statusMeta: Record<StockStatus, { label: string; className: string }> = {
  selected: { label: "선정", className: "status-selected" },
  improving: { label: "개선", className: "status-improving" },
  caution: { label: "주의", className: "status-caution" },
};

function fmtEps(value: number) {
  return `$${value.toFixed(2)}`;
}

function fmtChange(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("selected");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState("전체 테마");
  const [minChange, setMinChange] = useState("");
  const [sortAsc, setSortAsc] = useState(false);

  const themes = useMemo(
    () => ["전체 테마", ...Array.from(new Set(stocks.flatMap((stock) => stock.tags))).sort()],
    [],
  );

  const counts = useMemo(
    () => ({
      selected: stocks.filter((stock) => stock.status === "selected").length,
      improving: stocks.filter((stock) => stock.status === "improving").length,
      caution: stocks.filter((stock) => stock.status === "caution").length,
      all: stocks.length,
    }),
    [],
  );

  const visibleStocks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const threshold = minChange === "" ? -Infinity : Number(minChange);
    return stocks
      .filter((stock) => activeTab === "all" || stock.status === activeTab)
      .filter(
        (stock) =>
          !normalized ||
          stock.ticker.toLowerCase().includes(normalized) ||
          stock.company.toLowerCase().includes(normalized) ||
          stock.tags.some((tag) => tag.toLowerCase().includes(normalized)),
      )
      .filter((stock) => theme === "전체 테마" || stock.tags.includes(theme))
      .filter((stock) => stock.epsChange >= threshold)
      .sort((a, b) => (sortAsc ? a.epsChange - b.epsChange : b.epsChange - a.epsChange));
  }, [activeTab, minChange, query, sortAsc, theme]);

  const selectedAverage = stocks
    .filter((stock) => stock.status === "selected")
    .reduce((sum, stock) => sum + stock.epsChange, 0) / counts.selected;

  const resetFilters = () => {
    setQuery("");
    setTheme("전체 테마");
    setMinChange("");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span>Fundamental Flow</span>
          <span className="mvp-badge">MVP</span>
        </div>
        <div className="topbar-actions">
          <span className="data-status"><i /> 샘플 데이터</span>
          <button className="icon-button" aria-label="알림">↗</button>
          <div className="avatar" aria-label="사용자 프로필">WK</div>
        </div>
      </header>

      <section className="content">
        <div className="hero-row">
          <div>
            <p className="eyebrow">NASDAQ 100 · MONTHLY SIGNAL</p>
            <h1>월간 펀더멘털 변화</h1>
            <p className="subtitle">애널리스트 컨센서스의 변화를 추적해 실적 모멘텀이 달라지는 기업을 발견하세요.</p>
          </div>
          <div className="as-of">
            <span>기준 월</span>
            <strong>2026년 7월</strong>
            <small>마지막 업데이트 7월 31일</small>
          </div>
        </div>

        <div className="metric-grid">
          <article className="metric-card accent">
            <div className="metric-label"><span className="metric-icon">↗</span> 선정 기업</div>
            <div className="metric-value">{counts.selected}<small>개</small></div>
            <p>FWD EPS가 전월 대비 5% 이상 상향</p>
          </article>
          <article className="metric-card">
            <div className="metric-label"><span className="metric-icon pale">◎</span> 평균 상향률</div>
            <div className="metric-value positive">+{selectedAverage.toFixed(1)}<small>%</small></div>
            <p>선정 기업 기준</p>
          </article>
          <article className="metric-card">
            <div className="metric-label"><span className="metric-icon pale">◫</span> 커버리지</div>
            <div className="metric-value">{counts.all}<small>개</small></div>
            <p>NASDAQ 100 샘플 유니버스</p>
          </article>
          <article className="metric-card upcoming">
            <span className="soon">COMING SOON</span>
            <div className="metric-label">확장 지표</div>
            <div className="future-metrics"><span>Revenue Growth</span><span>Rule of 40</span><span>FCF Margin</span></div>
          </article>
        </div>

        <section className="table-card">
          <div className="tabs" role="tablist" aria-label="기업 상태">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span><b>{counts[tab.id]}</b><small>{tab.description}</small>
              </button>
            ))}
          </div>

          <div className="filters">
            <label className="search-field">
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="티커, 회사명, 테마 검색" aria-label="기업 검색" />
              <kbd>⌘ K</kbd>
            </label>
            <label className="select-wrap">
              <select value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="테마 필터">
                {themes.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="change-filter">
              <span>변화율</span>
              <input type="number" step="0.5" value={minChange} onChange={(e) => setMinChange(e.target.value)} placeholder="최소" aria-label="최소 변화율" />
              <b>% 이상</b>
            </label>
            <button className="reset-button" onClick={resetFilters}>초기화</button>
          </div>

          <div className="result-bar">
            <p><strong>{visibleStocks.length}개 기업</strong>이 조건을 만족합니다.</p>
            <span>FWD EPS 컨센서스 · 향후 12개월 기준</span>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>티커</th>
                  <th>회사명</th>
                  <th>테마 태그</th>
                  <th className="numeric">현재 FWD EPS</th>
                  <th className="numeric">이전 월 FWD EPS</th>
                  <th className="numeric sortable" onClick={() => setSortAsc((value) => !value)}>
                    전월 대비 변화율 <span>{sortAsc ? "↑" : "↓"}</span>
                  </th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {visibleStocks.map((stock) => <StockRow key={stock.ticker} stock={stock} />)}
              </tbody>
            </table>
            {visibleStocks.length === 0 && (
              <div className="empty-state"><span>⌕</span><strong>조건에 맞는 기업이 없습니다.</strong><p>검색어나 필터를 조정해 보세요.</p></div>
            )}
          </div>

          <footer className="table-footer">
            <p><i /> 샘플 데이터로 실행 중입니다. 실제 API 연결 시 월별 스냅샷이 자동 갱신됩니다.</p>
            <span>1–{visibleStocks.length} / {visibleStocks.length}</span>
          </footer>
        </section>
      </section>
    </main>
  );
}

function StockRow({ stock }: { stock: Stock }) {
  const status = statusMeta[stock.status];
  return (
    <tr>
      <td><span className="ticker">{stock.ticker}</span></td>
      <td><strong className="company">{stock.company}</strong></td>
      <td><div className="tag-list">{stock.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></td>
      <td className="numeric eps-current">{fmtEps(stock.currentEps)}</td>
      <td className="numeric eps-previous">{fmtEps(stock.previousEps)}</td>
      <td className={`numeric change ${stock.epsChange >= 0 ? "up" : "down"}`}>
        <span>{stock.epsChange >= 0 ? "↗" : "↘"}</span> {fmtChange(stock.epsChange)}
      </td>
      <td><span className={`status ${status.className}`}><i />{status.label}</span></td>
    </tr>
  );
}
