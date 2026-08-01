"use client";

import { useEffect, useMemo, useState } from "react";
import { companies, monthlySnapshots } from "@/data/mockUniverse";
import { calculateDerived, screenCompany } from "@/lib/calculations";
import { buildMockAIAnalysis } from "@/services/aiAnalysis";
import { preferences } from "@/services/preferences";
import { METRIC_LABELS } from "@/config/screening";
import type { CompanyAnalysis, MonthlySnapshot, ScreeningStatus } from "@/types/investment";

type View = "Overview" | "Screened Companies" | "My Portfolio" | "Watchlist" | "All Nasdaq 100" | "Company Detail";
const navigation: View[] = ["Overview", "Screened Companies", "My Portfolio", "Watchlist", "All Nasdaq 100"];
const screenedStatuses: ScreeningStatus[] = ["Newly Selected", "Continuing Improvement", "Watch"];
const statusKo: Record<ScreeningStatus, string> = { "Newly Selected": "신규 선정", "Continuing Improvement": "지속 개선", Watch: "관찰", Caution: "주의", Excluded: "제외" };
const trendKo = { Improving: "개선", Stable: "안정", Mixed: "혼재", Deteriorating: "악화" } as const;

function buildAnalyses(): CompanyAnalysis[] {
  return companies.map((company) => {
    const snapshots = monthlySnapshots.filter((item) => item.ticker === company.ticker).sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
    const current = snapshots.at(-1)!;
    const previous = snapshots.at(-2) ?? null;
    const derived = calculateDerived(current, previous);
    const priorDerived = previous ? calculateDerived(previous, snapshots.at(-3) ?? null) : null;
    const screening = screenCompany(derived, priorDerived);
    return { company, snapshots, current, previous, derived, screening, ai: buildMockAIAnalysis(derived, screening) };
  });
}

const fmt = (value: number | null, suffix = "") => value === null ? "—" : `${value.toFixed(1)}${suffix}`;
const sign = (value: number | null) => value === null ? "neutral" : value > 0 ? "positive" : value < 0 ? "negative" : "neutral";

export default function Home() {
  const analyses = useMemo(() => buildAnalyses(), []);
  const [view, setView] = useState<View>("Overview");
  const [selectedTicker, setSelectedTicker] = useState("PLTR");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("All sectors");
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => { queueMicrotask(() => { setPortfolio(preferences.portfolio()); setWatchlist(preferences.watchlist()); }); }, []);
  const selected = analyses.find((item) => item.company.ticker === selectedTicker) ?? analyses[0];
  const openCompany = (ticker: string) => { setSelectedTicker(ticker); setView("Company Detail"); setQuery(""); };
  const togglePortfolio = (ticker: string) => setPortfolio((items) => { const next = items.includes(ticker) ? items.filter((item) => item !== ticker) : [...items, ticker]; preferences.savePortfolio(next); return next; });
  const toggleWatchlist = (ticker: string) => setWatchlist((items) => { const next = items.includes(ticker) ? items.filter((item) => item !== ticker) : [...items, ticker]; preferences.saveWatchlist(next); return next; });

  const visible = analyses.filter((item) => {
    const matchesQuery = !query || `${item.company.ticker} ${item.company.companyName}`.toLowerCase().includes(query.toLowerCase());
    const matchesSector = sector === "All sectors" || item.company.sector === sector;
    if (view === "Screened Companies") return matchesQuery && screenedStatuses.includes(item.screening.status);
    if (view === "My Portfolio") return matchesQuery && portfolio.includes(item.company.ticker);
    if (view === "Watchlist") return matchesQuery && watchlist.includes(item.company.ticker);
    return matchesQuery && matchesSector;
  });
  const counts = Object.fromEntries(["Newly Selected", "Continuing Improvement", "Caution"].map((status) => [status, analyses.filter((item) => item.screening.status === status).length]));
  const allChanges = analyses.flatMap((item) => Object.entries(item.derived.comparisons).filter(([, comparison]) => comparison.change !== null).map(([metric, comparison]) => ({ ticker: item.company.ticker, metric, change: comparison.change! })));
  const best = [...allChanges].sort((a, b) => b.change - a.change)[0];
  const worst = [...allChanges].sort((a, b) => a.change - b.change)[0];

  return <main className="philosophy-app">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">F</span><div><strong>Fundamental Flow</strong><small>Conviction Engine · v1.1</small></div></div>
      <nav>{navigation.map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}><span>{navIcon(item)}</span>{item}<b>{item === "My Portfolio" ? portfolio.length : item === "Watchlist" ? watchlist.length : ""}</b></button>)}</nav>
      <div className="sidebar-note"><span>PHILOSOPHY</span><p>우리는 주가를 추종하지 않는다.<br/><strong>기업의 변화를 추적한다.</strong></p></div>
      <div className="mock-status"><i/> Mock data · 2026.07</div>
    </aside>

    <section className="workspace">
      <header className="workspace-header">
        <div className="global-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nasdaq 100 티커 또는 회사명 검색"/><small>{query ? `${visible.length} results` : "10 mock companies"}</small>
          {query && <div className="search-results">{visible.slice(0, 6).map((item) => <button key={item.company.ticker} onClick={() => openCompany(item.company.ticker)}><b>{item.company.ticker}</b><span>{item.company.companyName}</span><small>{statusKo[item.screening.status]}</small></button>)}</div>}
        </div>
        <div className="header-date"><span>LAST UPDATED</span><strong>2026. 07. 31</strong></div>
      </header>

      {view === "Company Detail" ? <CompanyDetail analysis={selected} portfolio={portfolio} watchlist={watchlist} onPortfolio={togglePortfolio} onWatchlist={toggleWatchlist} onBack={() => setView("All Nasdaq 100")}/>
        : view === "Overview" ? <Overview analyses={analyses} counts={counts} best={best} worst={worst} onOpen={openCompany}/>
        : <CompanyList view={view} rows={visible} query={query} sector={sector} setSector={setSector} portfolio={portfolio} watchlist={watchlist} onOpen={openCompany} onPortfolio={togglePortfolio} onWatchlist={toggleWatchlist}/>} 
    </section>
  </main>;
}

function Overview({ analyses, counts, best, worst, onOpen }: { analyses: CompanyAnalysis[]; counts: Record<string, number>; best: { ticker: string; metric: string; change: number }; worst: { ticker: string; metric: string; change: number }; onOpen: (ticker: string) => void }) {
  const leaders = analyses.filter((item) => screenedStatuses.includes(item.screening.status)).sort((a, b) => b.screening.score - a.screening.score).slice(0, 5);
  return <div className="page-content">
    <section className="page-hero"><div><span>INVESTMENT CONVICTION ENGINE</span><h1>기업의 변화가<br/>투자 논리를 만듭니다.</h1><p>Nasdaq 100의 이익 전망과 현금창출력이 시간에 따라 어떻게 변하는지 추적합니다.</p></div><div className="hero-orbit"><div><b>10</b><small>NASDAQ 100<br/>MOCK UNIVERSE</small></div><span className="orbit one"/><span className="orbit two"/></div></section>
    <div className="overview-grid">
      <MetricCard label="Newly Selected" value={counts["Newly Selected"]} caption="이번 달 새롭게 포착" tone="blue"/>
      <MetricCard label="Continuing Improvement" value={counts["Continuing Improvement"]} caption="투자 논리 강화 중" tone="green"/>
      <MetricCard label="Caution" value={counts.Caution} caption="추가 확인 필요" tone="red"/>
      <article className="signal-card"><span>BIGGEST MOVE</span><div><section><small>가장 큰 개선</small><strong className="positive">↗ {best.ticker}</strong><p>{label(best.metric)} +{best.change.toFixed(1)}</p></section><section><small>가장 큰 악화</small><strong className="negative">↘ {worst.ticker}</strong><p>{label(worst.metric)} {worst.change.toFixed(1)}</p></section></div></article>
    </div>
    <section className="panel conviction-panel"><header><div><span>SCREENING SIGNALS</span><h2>이번 달 Conviction Leaders</h2></div><button onClick={() => onOpen(leaders[0].company.ticker)}>상위 기업 분석 →</button></header>
      <div className="leader-list">{leaders.map((item, index) => <button key={item.company.ticker} onClick={() => onOpen(item.company.ticker)}><span className="rank">0{index + 1}</span><CompanyIdentity item={item}/><StatusBadge status={item.screening.status}/><div className="score"><span>Score</span><b>{item.screening.score.toFixed(1)}</b></div><div className={`trend ${item.derived.trend.toLowerCase()}`}>↗ {trendKo[item.derived.trend]}</div><span>›</span></button>)}</div>
    </section>
    <section className="principle-strip"><span>NO PRICE MOMENTUM</span><p>주가 수익률은 스크리닝 점수에 반영하지 않습니다.</p><i/><span>CAPEX CONTEXT</span><p>FCF 감소는 CFO와 성장투자를 함께 해석합니다.</p><i/><span>CHANGE FIRST</span><p>절대값보다 전월 대비 방향을 우선합니다.</p></section>
  </div>;
}

function CompanyList({ view, rows, sector, setSector, portfolio, watchlist, onOpen, onPortfolio, onWatchlist }: { view: View; rows: CompanyAnalysis[]; query: string; sector: string; setSector: (value: string) => void; portfolio: string[]; watchlist: string[]; onOpen: (ticker: string) => void; onPortfolio: (ticker: string) => void; onWatchlist: (ticker: string) => void }) {
  const title = view === "All Nasdaq 100" ? "All Nasdaq 100" : view;
  return <div className="page-content list-page"><div className="section-heading"><div><span>FUNDAMENTAL UNIVERSE</span><h1>{title}</h1><p>{view === "Screened Companies" ? "자동 스크리닝 결과에 포함된 기업과 선정 근거입니다." : "스크리닝 포함 여부와 관계없이 모든 기업을 탐색할 수 있습니다."}</p></div>{view === "All Nasdaq 100" && <select value={sector} onChange={(e) => setSector(e.target.value)}><option>All sectors</option>{Array.from(new Set(companies.map((item) => item.sector))).map((item) => <option key={item}>{item}</option>)}</select>}</div>
    {rows.length ? <section className="panel universe-table"><table><thead><tr><th>기업</th><th>Sector · Themes</th><th>Screening</th><th>Trend</th><th>FWD EPS Δ</th><th>CFO Margin Δ</th><th>Rule of 40</th><th>선정 / 제외 이유</th><th/></tr></thead><tbody>{rows.map((item) => <tr key={item.company.ticker} onClick={() => onOpen(item.company.ticker)}><td><CompanyIdentity item={item}/></td><td><span className="sector-text">{item.company.sector}</span><div className="tags">{item.company.themes.slice(0,2).map((tag) => <span key={tag}>{tag}</span>)}</div></td><td><StatusBadge status={item.screening.status}/></td><td><span className={`trend ${item.derived.trend.toLowerCase()}`}>{trendKo[item.derived.trend]}</span></td><td className={sign(item.derived.comparisons.forwardEps.changeRate)}>{fmt(item.derived.comparisons.forwardEps.changeRate, "%")}</td><td className={sign(item.derived.comparisons.cfoMargin.change)}>{fmt(item.derived.comparisons.cfoMargin.change, "pp")}</td><td>{fmt(item.derived.classicRuleOf40)}</td><td className="reason-cell">{item.screening.reasons[0]}{item.screening.flags[0] && <small>{item.screening.flags[0]}</small>}</td><td><button className={portfolio.includes(item.company.ticker) ? "saved" : ""} onClick={(event) => { event.stopPropagation(); onPortfolio(item.company.ticker); }}>◆</button><button className={watchlist.includes(item.company.ticker) ? "saved" : ""} onClick={(event) => { event.stopPropagation(); onWatchlist(item.company.ticker); }}>★</button></td></tr>)}</tbody></table></section> : <EmptyCollection view={view}/>} 
  </div>;
}

function CompanyDetail({ analysis, portfolio, watchlist, onPortfolio, onWatchlist, onBack }: { analysis: CompanyAnalysis; portfolio: string[]; watchlist: string[]; onPortfolio: (ticker: string) => void; onWatchlist: (ticker: string) => void; onBack: () => void }) {
  const { company, current, previous, derived, screening, ai, snapshots } = analysis;
  const raw = current.raw;
  return <div className="page-content detail-page">
    <button className="back-button" onClick={onBack}>← All Nasdaq 100</button>
    <section className="company-hero"><div><div className="ticker-large">{company.ticker.slice(0,2)}</div><div><span>{company.sector} · {company.industry}</span><h1>{company.companyName}</h1><div className="tags">{company.themes.map((tag) => <span key={tag}>{tag}</span>)}</div></div></div><div className="company-actions"><StatusBadge status={screening.status}/><button className={portfolio.includes(company.ticker) ? "active" : ""} onClick={() => onPortfolio(company.ticker)}>◆ {portfolio.includes(company.ticker) ? "In Portfolio" : "Add Portfolio"}</button><button className={watchlist.includes(company.ticker) ? "active" : ""} onClick={() => onWatchlist(company.ticker)}>★ Watchlist</button></div></section>
    <section className={`thesis-banner ${ai.status.toLowerCase().replace(" ", "-")}`}><div><span>INVESTMENT THESIS STATUS</span><strong>{ai.status}</strong></div><p>{ai.summary}</p><b>{derived.trend === "Improving" ? "↗" : derived.trend === "Deteriorating" ? "↘" : "↔"}</b></section>
    <div className="detail-grid metrics-and-rules"><section className="panel"><PanelTitle eyebrow="CURRENT VS PREVIOUS" title="핵심 지표 변화"/><div className="comparison-grid"><Comparison label={METRIC_LABELS.forwardEps.short} sub={`${METRIC_LABELS.forwardEps.full} · ${METRIC_LABELS.forwardEps.ko}`} current={raw.forwardEps.value} previous={previous?.raw.forwardEps.value ?? null} suffix=""/><Comparison label="Revenue Growth" sub="매출 성장률" current={raw.revenueGrowth.value} previous={previous?.raw.revenueGrowth.value ?? null} suffix="%"/><Comparison label="Operating Margin" sub="영업이익률" current={raw.operatingMargin.value} previous={previous?.raw.operatingMargin.value ?? null} suffix="%"/><Comparison label={METRIC_LABELS.cfoMargin.short} sub={`${METRIC_LABELS.cfoMargin.full} · ${METRIC_LABELS.cfoMargin.ko}`} current={derived.cfoMargin} previous={derived.comparisons.cfoMargin.previous} suffix="%"/><Comparison label={METRIC_LABELS.fcfMargin.short} sub={`${METRIC_LABELS.fcfMargin.full} · ${METRIC_LABELS.fcfMargin.ko}`} current={derived.fcfMargin} previous={derived.comparisons.fcfMargin.previous} suffix="%"/><Comparison label="CapEx Intensity" sub="자본적지출 집약도" current={derived.capexIntensity} previous={derived.comparisons.capexIntensity.previous} suffix="%"/></div></section>
      <section className="panel"><PanelTitle eyebrow="QUALITY + GROWTH" title="Three Rules of 40"/><div className="rule-bars"><RuleBar label="Classic" sub="Revenue Growth + FCF Margin" value={derived.classicRuleOf40}/><RuleBar label="Operating" sub="Revenue Growth + Operating Margin" value={derived.operatingRuleOf40}/><RuleBar label="Cash" sub="Revenue Growth + CFO Margin" value={derived.cashRuleOf40}/></div><div className="threshold"><span/><b>40</b><p>성장성과 수익성의 균형 기준선</p></div></section></div>
    <div className="detail-grid chart-row"><section className="panel"><PanelTitle eyebrow="MONTHLY TREND" title="Forward EPS · Revenue Growth"/><TrendChart snapshots={snapshots}/></section><section className="panel"><PanelTitle eyebrow="CASH CONVERSION" title="CFO · FCF · CapEx Intensity"/><CashChart analysis={analysis}/></section></div>
    <div className="detail-grid ai-and-reasons"><section className="panel ai-panel"><PanelTitle eyebrow="RULE-BASED MOCK AI" title="Investment Conviction Note"/><p>{ai.summary}</p><div><section><span>개선</span>{ai.improved.map((item) => <b key={item}>↗ {item}</b>)}</section><section><span>악화</span>{ai.deteriorated.map((item) => <b key={item}>↘ {item}</b>)}</section><section><span>상충</span>{ai.conflicts.map((item) => <b key={item}>↔ {item}</b>)}</section></div><small>저장된 숫자와 계산 결과만 사용한 규칙 기반 의견이며 투자 조언이 아닙니다.</small></section><section className="panel reason-panel"><PanelTitle eyebrow="SCREENING EXPLAINABILITY" title="선정·제외 근거"/><strong className="screen-score">{screening.score.toFixed(1)}<small> / conviction score</small></strong>{screening.reasons.map((reason) => <p key={reason}>✓ {reason}</p>)}{screening.flags.map((flag) => <p className="flag" key={flag}>! {flag}</p>)}{derived.dataIssues.length > 0 && <div className="data-warning">데이터 확인: {derived.dataIssues.join(", ")}</div>}</section></div>
  </div>;
}

function MetricCard({ label, value, caption, tone }: { label: string; value: number; caption: string; tone: string }) { return <article className={`overview-card ${tone}`}><span>{label}</span><strong>{String(value).padStart(2,"0")}</strong><p>{caption}</p><i>↗</i></article>; }
function CompanyIdentity({ item }: { item: CompanyAnalysis }) { return <div className="company-identity"><span>{item.company.ticker.slice(0,2)}</span><div><b>{item.company.ticker}</b><small>{item.company.companyName}</small></div></div>; }
function StatusBadge({ status }: { status: ScreeningStatus }) { return <span className={`screening-badge ${status.toLowerCase().replaceAll(" ", "-")}`}>{statusKo[status]}</span>; }
function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) { return <header className="panel-title"><span>{eyebrow}</span><h2>{title}</h2></header>; }
function Comparison({ label: metricLabel, sub, current, previous, suffix }: { label: string; sub: string; current: number | null; previous: number | null; suffix: string }) { const change = current === null || previous === null ? null : current - previous; return <article className="comparison-card"><div><strong>{metricLabel}</strong><small>{sub}</small></div><section><span>Current<b>{fmt(current,suffix)}</b></span><span>Previous<b>{fmt(previous,suffix)}</b></span><span className={sign(change)}>Change<b>{change === null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(1)}${suffix === "%" ? "pp" : ""}`}</b></span></section></article>; }
function RuleBar({ label: barLabel, sub, value }: { label: string; sub: string; value: number | null }) { const width = Math.max(0, Math.min(100, value ?? 0)); return <div className="rule-bar"><div><strong>{barLabel}</strong><span>{sub}</span><b>{fmt(value)}</b></div><div><i style={{ width: `${width}%` }}/><em style={{ left: "50%" }}/></div></div>; }
function TrendChart({ snapshots }: { snapshots: MonthlySnapshot[] }) { const max = Math.max(...snapshots.map((item) => item.raw.forwardEps.value ?? 0)); return <div className="trend-chart"><div className="legend"><span><i className="eps-dot"/>FWD EPS</span><span><i className="growth-dot"/>Revenue Growth</span></div><div className="chart-bars">{snapshots.map((item) => <div key={item.snapshotDate}><section><i className="eps-bar" style={{height:`${((item.raw.forwardEps.value ?? 0)/max)*100}%`}}/><i className="growth-bar" style={{height:`${Math.min(100,(item.raw.revenueGrowth.value ?? 0)*1.5)}%`}}/></section><span>{item.snapshotDate.slice(5,7)}월</span></div>)}</div>{snapshots.length < 2 && <p className="insufficient">비교 데이터 부족</p>}</div>; }
function CashChart({ analysis }: { analysis: CompanyAnalysis }) { const points = analysis.snapshots.map((snapshot,index) => calculateDerived(snapshot,index ? analysis.snapshots[index-1] : null)); return <div className="cash-chart"><div className="cash-legend"><span>CFO Margin</span><span>FCF Margin</span><span>CapEx Intensity</span></div>{points.map((item) => <div key={item.snapshotDate}><b>{item.snapshotDate.slice(5,7)}월</b><section><i className="cfo" style={{width:`${Math.min(100,item.cfoMargin ?? 0)}%`}}/><span>{fmt(item.cfoMargin,"%")}</span></section><section><i className="fcf" style={{width:`${Math.min(100,item.fcfMargin ?? 0)}%`}}/><span>{fmt(item.fcfMargin,"%")}</span></section><section><i className="capex" style={{width:`${Math.min(100,item.capexIntensity ?? 0)}%`}}/><span>{fmt(item.capexIntensity,"%")}</span></section></div>)}</div>; }
function EmptyCollection({ view }: { view: View }) { return <div className="empty-collection"><span>◇</span><h2>{view}가 비어 있습니다.</h2><p>All Nasdaq 100에서 기업을 추가해 보세요.</p></div>; }
function label(key: string) { return key.replace(/([A-Z])/g," $1").replace(/^./,(value)=>value.toUpperCase()); }
function navIcon(view: View) { return view === "Overview" ? "⌂" : view === "Screened Companies" ? "◎" : view === "My Portfolio" ? "◆" : view === "Watchlist" ? "☆" : "▦"; }
