"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type View = "Dashboard" | "Screener" | "Company Detail" | "Watchlist" | "Data Pilot";
type PilotCompany = { ticker: string; company: string; sector: string; status: "Newly Selected" | "Continuing Improvement" | "Watch"; change: string; reason: string };

const pilotCompanies: PilotCompany[] = [
  { ticker: "PLTR", company: "Palantir Technologies", sector: "Technology · Software", status: "Newly Selected", change: "FWD EPS +5.1%", reason: "Sample · EPS 및 예상 매출 개선" },
  { ticker: "NVDA", company: "NVIDIA Corporation", sector: "Technology · Semiconductors", status: "Continuing Improvement", change: "FWD EPS +15.2%", reason: "Sample · 컨센서스 상향 지속" },
  { ticker: "MSFT", company: "Microsoft Corporation", sector: "Technology · Software", status: "Watch", change: "FWD EPS +3.8%", reason: "Sample · 변화 추적 준비 중" },
];

const viewIcons: Record<View, string> = { Dashboard: "⌂", Screener: "◎", "Company Detail": "▤", Watchlist: "☆", "Data Pilot": "↻" };

export default function Home() {
  const [view, setView] = useState<View>("Dashboard");
  const [selectedTicker, setSelectedTicker] = useState("PLTR");
  const [mobileNav, setMobileNav] = useState(false);
  const pilot = usePilotFundamentals();
  const openCompany = (ticker: string) => { setSelectedTicker(ticker); setView("Company Detail"); setMobileNav(false); };
  return (
    <main className="structure-shell">
      <aside className={`main-nav ${mobileNav ? "open" : ""}`}>
        <div className="nav-brand"><span>F</span><div><strong>Fundamental Flow</strong><small>Investment Philosophy v1.1</small></div></div>
        <nav aria-label="주요 화면">
          {(Object.keys(viewIcons) as View[]).map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => { setView(item); setMobileNav(false); }}><i>{viewIcons[item]}</i><span>{item}</span>{item === "Data Pilot" && <b>LIVE</b>}</button>)}
        </nav>
        <div className="nav-philosophy"><span>OUR PHILOSOPHY</span><p>우리는 주가를 추종하지 않는다.<br/><strong>기업의 변화를 추적한다.</strong></p></div>
        <div className="pilot-indicator"><i/> Pilot Universe: 3 / Nasdaq 100</div>
      </aside>
      <section className="structure-workspace">
        <header className="structure-header"><button className="menu-button" onClick={() => setMobileNav((value) => !value)} aria-label="메뉴 열기">☰</button><div><span>{view}</span><small>{view === "Data Pilot" ? "FMP 연결 데이터" : "Sample / 구조 준비 단계"}</small></div><button className="header-search" onClick={() => setView("Screener")}>⌕ <span>기업 검색</span></button></header>
        {view === "Dashboard" && <Dashboard onOpen={openCompany} pilot={pilot}/>} 
        {view === "Screener" && <Screener onOpen={openCompany} pilot={pilot}/>} 
        {view === "Company Detail" && <CompanyDetail ticker={selectedTicker} pilot={pilot}/>} 
        {view === "Watchlist" && <Watchlist onOpen={openCompany}/>} 
        {view === "Data Pilot" && <DataPilot pilot={pilot}/>} 
      </section>
      {mobileNav && <button className="nav-overlay" aria-label="메뉴 닫기" onClick={() => setMobileNav(false)}/>}
    </main>
  );
}

function Dashboard({ onOpen, pilot }: { onOpen: (ticker: string) => void; pilot: PilotState }) {
  const cards = [{ label: "신규 선정", value: 1, tone: "blue" }, { label: "지속 개선", value: 1, tone: "green" }, { label: "관찰", value: 1, tone: "amber" }, { label: "주의", value: 0, tone: "red" }, { label: "제외", value: 0, tone: "gray" }];
  return <div className="structure-content"><section className="structure-hero"><div><span>NASDAQ 100 · FUNDAMENTAL CHANGE</span><h1>기업의 변화를 추적하는<br/>Investment Conviction Engine</h1><p>현재 단계에서는 기존 FMP 파일럿 3종목을 기반으로 전체 제품 구조를 미리 보여줍니다.</p></div><div className="universe-ring"><strong>3</strong><span>PILOT COMPANIES</span><small>of Nasdaq 100</small></div></section>
    <div className="scope-banner"><div><i className={pilot.status === "connected" || pilot.status === "partial" ? "connected" : ""}/> {pilot.status === "connected" ? "FMP 연결됨" : pilot.status === "partial" ? "일부 데이터 연결" : "Sample fallback"}</div><strong>Pilot Universe: 3 / Nasdaq 100</strong><span>{pilot.lastUpdated ? `Updated ${new Date(pilot.lastUpdated).toLocaleDateString("ko-KR")}` : "PLTR · NVDA · MSFT"}</span></div>
    <div className="status-card-grid">{cards.map((card) => <article className={`status-card ${card.tone}`} key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.value ? "Sample classification" : "분류 결과 없음"}</small></article>)}</div>
    <div className="dashboard-grid"><section className="structure-panel"><PanelHeader eyebrow="PILOT SIGNALS" title="기업 현황" badge="SAMPLE"/><div className="company-summary-list">{pilotCompanies.map((item) => <button key={item.ticker} onClick={() => onOpen(item.ticker)}><span className="ticker-avatar">{item.ticker.slice(0,2)}</span><div><strong>{item.ticker}</strong><small>{item.company}</small></div><StatusPill status={item.status}/><b>{item.change}</b><i>›</i></button>)}</div></section>
      <section className="structure-panel roadmap-panel"><PanelHeader eyebrow="DATA CONNECTION" title="분석 모듈" badge={pilot.snapshots.length ? "FMP CONNECTED" : "준비 중"}/><div>{["Raw Data", "Derived Metrics", "Monthly Trends", "Screening Engine", "AI Opinion"].map((item,index) => <section key={item}><span>0{index+1}</span><strong>{item}</strong><small>{index === 0 ? "3종목 FMP snapshot 연결" : index === 1 ? "기존 Pilot 계산값 일부 연결" : "다음 단계에서 연결 예정"}</small></section>)}</div></section></div>
  </div>;
}

function Screener({ onOpen, pilot }: { onOpen: (ticker: string) => void; pilot: PilotState }) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("All status");
  const visible = pilotCompanies.filter((item) => (!query || `${item.ticker} ${item.company}`.toLowerCase().includes(query.toLowerCase())) && (status === "All status" || item.status === status));
  return <div className="structure-content"><PageHeading eyebrow="SCREENING WORKSPACE" title="Screener" description="상태와 변화 중심으로 기업을 탐색합니다. 현재 분류와 사유는 화면 구조 검증용 Sample입니다." badge="SAMPLE LOGIC"/>
    <div className="filter-bar"><label><span>⌕</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="티커 또는 회사명 검색"/></label><select value={status} onChange={(e)=>setStatus(e.target.value)}><option>All status</option><option>Newly Selected</option><option>Continuing Improvement</option><option>Watch</option></select><span>{visible.length} companies</span></div>
    <section className="structure-panel screener-table"><table><thead><tr><th>상태</th><th>티커</th><th>회사명</th><th>섹터</th><th>주요 변화</th><th>선정·제외 이유</th><th>데이터</th><th/></tr></thead><tbody>{visible.map((item)=>{ const snapshot = findSnapshot(pilot.snapshots,item.ticker); const epsChange = snapshotNumber(snapshot,"fwd_eps_change_pct","fwdEpsChangePct"); return <tr key={item.ticker} onClick={()=>onOpen(item.ticker)}><td><StatusPill status={item.status}/></td><td><strong>{item.ticker}</strong></td><td>{item.company}</td><td>{item.sector}</td><td className={epsChange === null ? "" : epsChange >= 0 ? "positive" : "negative"}>{epsChange === null ? item.change : `FWD EPS ${percent(epsChange)}`}<small>{epsChange === null ? "Sample fallback" : "FMP snapshot"}</small></td><td>{item.reason}<small>Screening logic: Sample</small></td><td><DataBadge snapshot={snapshot}/></td><td>›</td></tr>})}</tbody></table></section>
  </div>;
}

function CompanyDetail({ ticker, pilot }: { ticker: string; pilot: PilotState }) {
  const company = pilotCompanies.find((item)=>item.ticker===ticker) ?? pilotCompanies[0];
  const snapshot = findSnapshot(pilot.snapshots, ticker);
  const eps = snapshotNumber(snapshot,"annual_fwd_eps_estimate","annualFwdEpsEstimate");
  const estimatedRevenue = snapshotNumber(snapshot,"estimated_annual_revenue","estimatedAnnualRevenue");
  const trailingRevenue = snapshotNumber(snapshot,"actual_trailing_revenue","actualTrailingRevenue");
  const operatingMargin = snapshotNumber(snapshot,"operating_margin","operatingMargin");
  const freeCashFlow = snapshotNumber(snapshot,"free_cash_flow","freeCashFlow");
  const fcfMargin = snapshotNumber(snapshot,"fcf_margin","fcfMargin");
  return <div className="structure-content"><section className="detail-heading"><div className="ticker-avatar large">{company.ticker.slice(0,2)}</div><div><span>{company.sector}</span><h1>{company.company}</h1><p>{company.ticker} · Nasdaq 100 Pilot</p></div><StatusPill status={company.status}/></section>
    <div className="detail-section-grid"><section className="structure-panel wide"><PanelHeader eyebrow="COMPANY PROFILE" title="기업 기본 정보" badge="SAMPLE"/><div className="profile-grid"><span>티커<strong>{company.ticker}</strong></span><span>회사명<strong>{company.company}</strong></span><span>섹터<strong>{company.sector}</strong></span><span>데이터 범위<strong>Pilot Universe</strong></span></div></section>
      <section className="structure-panel connected-section"><PanelHeader eyebrow="SOURCE VALUES" title="Raw Data" badge={snapshot ? "FMP SNAPSHOT" : "SAMPLE FALLBACK"}/><div className="connected-metrics"><MetricValue label="FWD EPS" value={eps === null ? "—" : `$${eps.toFixed(2)}`} helper="Forward Earnings per Share · 예상 주당순이익"/><MetricValue label="Estimated Revenue" value={compactMoney(estimatedRevenue)} helper="예상 연매출"/><MetricValue label="Trailing Revenue" value={compactMoney(trailingRevenue)} helper="TTM 실제 매출"/></div>{!snapshot && <p className="connection-message">API 데이터가 준비되면 자동으로 교체됩니다.</p>}</section>
      <section className="structure-panel connected-section"><PanelHeader eyebrow="EXISTING PILOT VALUES" title="Derived Metrics" badge={snapshot ? "CONNECTED" : "준비 중"}/><div className="connected-metrics"><MetricValue label="Operating Margin" value={operatingMargin === null ? "—" : percent(operatingMargin * 100)} helper="영업이익률"/><MetricValue label="FCF" value={compactMoney(freeCashFlow)} helper="Free Cash Flow · 잉여현금흐름"/><MetricValue label="FCF Margin" value={fcfMargin === null ? "—" : percent(fcfMargin * 100)} helper="잉여현금흐름률"/></div></section>
      <PlaceholderSection title="Monthly Trends" eyebrow="TIME SERIES" note={snapshot ? "현재 snapshot 연결 완료 · 직전 월 데이터 축적 후 추세 표시" : "다음 단계에서 월별 비교 시각화 연결 예정"}/><PlaceholderSection title="Screening Status" eyebrow="CLASSIFICATION" note="현재 상태는 Sample이며 다음 단계에서 규칙 연결 예정"/><PlaceholderSection title="AI Opinion" eyebrow="INVESTMENT CONVICTION" note="다음 단계에서 AI 분석 영역 연결 예정"/></div>
    <section className="abbreviation-guide"><span>약어 안내</span><Abbreviation short="FWD EPS" full="Forward Earnings per Share" ko="예상 주당순이익"/><Abbreviation short="FCF" full="Free Cash Flow" ko="잉여현금흐름"/><Abbreviation short="CFO" full="Operating Cash Flow" ko="영업현금흐름"/></section>
  </div>;
}

function Watchlist({ onOpen }: { onOpen: (ticker:string)=>void }) { return <div className="structure-content"><PageHeading eyebrow="PERSONAL MONITORING" title="Watchlist" description="관심기업을 모니터링할 화면입니다. 이번 단계에서는 저장되지 않는 Sample UI만 제공합니다." badge="SAMPLE UI"/><div className="watchlist-note"><i>!</i><div><strong>저장 기능은 아직 연결되지 않았습니다.</strong><span>다음 단계에서 단순 저장 방식으로 추가할 수 있도록 독립 화면으로 구성했습니다.</span></div></div><div className="watchlist-grid">{pilotCompanies.slice(0,2).map((item)=><button key={item.ticker} onClick={()=>onOpen(item.ticker)}><span className="ticker-avatar">{item.ticker.slice(0,2)}</span><div><strong>{item.ticker}</strong><p>{item.company}</p><StatusPill status={item.status}/></div><b>{item.change}</b><small>Sample watchlist</small></button>)}<article className="watchlist-add"><span>＋</span><strong>관심기업 추가</strong><small>다음 단계에서 연결 예정</small></article></div></div>; }

function PageHeading({eyebrow,title,description,badge}:{eyebrow:string;title:string;description:string;badge:string}) { return <div className="page-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><b>{badge}</b></div>; }
function PanelHeader({eyebrow,title,badge}:{eyebrow:string;title:string;badge:string}) { return <header className="structure-panel-header"><div><span>{eyebrow}</span><h2>{title}</h2></div><b>{badge}</b></header>; }
function StatusPill({status}:{status:PilotCompany["status"]}) { return <span className={`structure-status ${status.toLowerCase().replaceAll(" ","-")}`}>{status}</span>; }
function PlaceholderSection({title,eyebrow,note,ready=false}:{title:string;eyebrow:string;note:string;ready?:boolean}) { return <section className="structure-panel placeholder-section"><PanelHeader eyebrow={eyebrow} title={title} badge={ready?"PILOT DATA":"준비 중"}/><div><span>{ready?"↗":"◇"}</span><strong>{note}</strong><small>{ready?"Data Pilot 화면에서 현재 값을 확인할 수 있습니다.":"빈 영역 대신 향후 연결 지점을 명확히 표시합니다."}</small></div></section>; }
function Abbreviation({short,full,ko}:{short:string;full:string;ko:string}) { return <span className="abbreviation" title={`${full} · ${ko}`}><b>{short}</b><small>{full}<em>{ko}</em></small></span>; }
function MetricValue({label,value,helper}:{label:string;value:string;helper:string}) { return <article><span>{label}</span><strong>{value}</strong><small>{helper}</small></article>; }

type ApiStatus = "loading" | "connected" | "key_missing" | "database_error" | "database_unavailable" | "partial" | "error";
type Snapshot = {
  ticker: string;
  snapshot_date?: string;
  snapshotDate?: string;
  estimate_fiscal_date?: string | null;
  annual_fwd_eps_estimate?: number | null;
  annualFwdEpsEstimate?: number | null;
  estimated_annual_revenue?: number | null;
  estimatedAnnualRevenue?: number | null;
  actual_trailing_revenue?: number | null;
  actualTrailingRevenue?: number | null;
  operating_margin?: number | null;
  operatingMargin?: number | null;
  free_cash_flow?: number | null;
  freeCashFlow?: number | null;
  fcf_margin?: number | null;
  fcfMargin?: number | null;
  fwd_eps_change_pct?: number | null;
  fwdEpsChangePct?: number | null;
  estimated_revenue_change_pct?: number | null;
  estimatedRevenueChangePct?: number | null;
  operating_margin_change_pp?: number | null;
  operatingMarginChangePp?: number | null;
  fcf_margin_change_pp?: number | null;
  fcfMarginChangePp?: number | null;
  missing_fields?: string | string[];
  missingFields?: string[];
  collection_status?: "complete" | "partial" | "failed";
  collectionStatus?: "complete" | "partial" | "failed";
};
type PilotState = { status: ApiStatus; snapshots: Snapshot[]; lastUpdated: string | null; refreshing: boolean; refresh: () => Promise<void> };

const companyNames: Record<string, string> = {
  PLTR: "Palantir Technologies",
  NVDA: "NVIDIA Corporation",
  MSFT: "Microsoft Corporation",
};

const demoSnapshots: Snapshot[] = [
  { ticker: "PLTR", snapshotDate: "2026-08-01", annualFwdEpsEstimate: 0.82, estimatedAnnualRevenue: 4_520_000_000, actualTrailingRevenue: 3_470_000_000, operatingMargin: 0.168, freeCashFlow: 1_290_000_000, fcfMargin: 0.372, fwdEpsChangePct: 5.1, estimatedRevenueChangePct: 3.8, operatingMarginChangePp: 1.2, fcfMarginChangePp: 2.1, missingFields: [], collectionStatus: "complete" },
  { ticker: "NVDA", snapshotDate: "2026-08-01", annualFwdEpsEstimate: 5.62, estimatedAnnualRevenue: 208_400_000_000, actualTrailingRevenue: 165_200_000_000, operatingMargin: 0.621, freeCashFlow: 74_600_000_000, fcfMargin: 0.452, fwdEpsChangePct: 15.2, estimatedRevenueChangePct: 8.6, operatingMarginChangePp: 0.8, fcfMarginChangePp: 1.4, missingFields: [], collectionStatus: "complete" },
  { ticker: "MSFT", snapshotDate: "2026-08-01", annualFwdEpsEstimate: 16.93, estimatedAnnualRevenue: 330_600_000_000, actualTrailingRevenue: 281_700_000_000, operatingMargin: 0.457, freeCashFlow: 79_100_000_000, fcfMargin: 0.281, fwdEpsChangePct: 3.8, estimatedRevenueChangePct: 2.9, operatingMarginChangePp: 0.5, fcfMarginChangePp: -0.3, missingFields: [], collectionStatus: "complete" },
];

const read = (row: Snapshot, snake: keyof Snapshot, camel: keyof Snapshot) => row[snake] ?? row[camel] ?? null;
const number = (row: Snapshot, snake: keyof Snapshot, camel: keyof Snapshot) => {
  const value = read(row, snake, camel);
  return typeof value === "number" ? value : null;
};
const money = (value: number | null, compact = false) => {
  if (value === null) return "—";
  if (compact) return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
  return `$${value.toFixed(2)}`;
};
const percent = (value: number | null, ratio = false) => value === null ? "—" : `${value > 0 ? "+" : ""}${(ratio ? value * 100 : value).toFixed(1)}%`;
const statusLabel: Record<ApiStatus, string> = {
  loading: "연결 확인 중", connected: "API 연결됨", partial: "일부 데이터 누락",
  key_missing: "API 키 설정 필요", database_error: "DB 확인 필요", database_unavailable: "DB 연결 없음", error: "연결 오류",
};

function missingList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

function usePilotFundamentals(): PilotState {
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/fundamentals", { cache: "no-store" });
      const payload = await response.json();
      setStatus((payload.status as ApiStatus) || (response.ok ? "connected" : "error"));
      setSnapshots(Array.isArray(payload.snapshots) ? payload.snapshots : []);
      setLastUpdated(payload.lastUpdated ?? null);
    } catch { setStatus("error"); setSnapshots([]); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void loadStatus(); }); }, [loadStatus]);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/fundamentals", { method: "POST" });
      const payload = await response.json();
      setStatus((payload.status as ApiStatus) || (response.ok ? "connected" : "error"));
      if (Array.isArray(payload.results)) setSnapshots(payload.results);
      setLastUpdated(payload.lastUpdated ?? null);
    } catch { setStatus("error"); }
    finally { setRefreshing(false); }
  }, []);
  return { status, snapshots, lastUpdated, refreshing, refresh };
}

function findSnapshot(rows: Snapshot[], ticker: string) { return rows.find((row) => row.ticker === ticker) ?? null; }
function snapshotNumber(row: Snapshot | null, snake: keyof Snapshot, camel: keyof Snapshot) { return row ? number(row, snake, camel) : null; }
function compactMoney(value: number | null) { return value === null ? "—" : new Intl.NumberFormat("ko-KR", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value); }
function DataBadge({snapshot}:{snapshot:Snapshot|null}) { if (!snapshot) return <span className="data-origin sample">SAMPLE</span>; const missing = missingList(read(snapshot,"missing_fields","missingFields")); return <span className={`data-origin ${missing.length ? "partial" : "live"}`}>{missing.length ? `PARTIAL ${missing.length}` : "FMP LIVE"}</span>; }

function DataPilot({pilot}:{pilot:PilotState}) {
  const { status, lastUpdated, refreshing, refresh } = pilot;
  const snapshots = pilot.snapshots.length ? pilot.snapshots : demoSnapshots;

  const missingCount = useMemo(() => snapshots.filter((row) => {
    const raw = read(row, "missing_fields", "missingFields");
    return missingList(raw).length > 0;
  }).length, [snapshots]);

  const live = status === "connected" || status === "partial";
  const dateText = lastUpdated ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(lastUpdated)) : "아직 수집 기록 없음";

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">F</span><span>Fundamental Flow</span><span className="mvp-badge">FMP PILOT</span></div>
        <div className="topbar-actions">
          <span className={`api-pill ${status}`}><i />{statusLabel[status]}</span>
          <div className="avatar">WK</div>
        </div>
      </header>

      <section className="content">
        <div className="hero-row">
          <div>
            <p className="eyebrow">NASDAQ 100 · MONTHLY FUNDAMENTAL SNAPSHOT</p>
            <h1>재무 데이터 API 파일럿</h1>
            <p className="subtitle">PLTR · NVDA · MSFT의 연간 컨센서스와 TTM 실적을 동일한 기준으로 추적합니다.</p>
          </div>
          <button className="sync-button" onClick={refresh} disabled={refreshing || status === "key_missing"}>
            <span className={refreshing ? "spinning" : ""}>↻</span>{refreshing ? "수집 중…" : "지금 업데이트"}
          </button>
        </div>

        <section className="connection-panel">
          <div className="connection-main">
            <span className={`connection-icon ${live ? "live" : ""}`}>{live ? "✓" : "!"}</span>
            <div><strong>Financial Modeling Prep</strong><p>{statusLabel[status]} · 서버 측 보안 연결</p></div>
          </div>
          <div className="connection-stat"><span>테스트 유니버스</span><strong>3개 종목</strong></div>
          <div className="connection-stat"><span>마지막 업데이트</span><strong>{dateText}</strong></div>
          <div className="connection-stat"><span>데이터 누락</span><strong className={missingCount ? "warning-text" : "positive"}>{missingCount}개 기업</strong></div>
        </section>

        {status === "key_missing" && (
          <div className="notice-banner"><strong>FMP_API_KEY 설정이 필요합니다.</strong><span>키는 브라우저에 전달되지 않으며 서버 환경변수로만 읽습니다. 설정 전에는 아래에 안전한 미리보기 데이터가 표시됩니다.</span></div>
        )}

        <div className="metric-grid compact-metrics">
          <article className="metric-card accent"><div className="metric-label">데이터 기준</div><div className="metric-value text-value">Annual + TTM</div><p>분기 추정치 혼합 없음</p></article>
          <article className="metric-card"><div className="metric-label">EPS 정의</div><div className="metric-value text-value">Consensus Avg</div><p>FMP annual epsAvg</p></article>
          <article className="metric-card"><div className="metric-label">원본 보존</div><div className="metric-value text-value positive">3 Endpoints</div><p>응답 JSON과 계산값 분리 저장</p></article>
          <article className="metric-card"><div className="metric-label">확장 준비</div><div className="metric-value text-value">NASDAQ 100</div><p>티커 목록만 교체 가능한 수집기</p></article>
        </div>

        <section className="table-card">
          <div className="result-bar live-result">
            <div><strong>월간 재무 스냅샷</strong><span>{live ? "실제 API / D1 데이터" : "미리보기 데이터"}</span></div>
            <span>마진 변화는 %p 기준 · 금액은 USD</span>
          </div>
          <div className="table-scroll">
            <table className="fundamental-table">
              <thead><tr>
                <th>기업</th><th>스냅샷</th><th className="numeric">연간 FWD EPS</th><th className="numeric">FWD EPS 변화</th>
                <th className="numeric">예상 연매출</th><th className="numeric">예상 매출 변화</th><th className="numeric">TTM 실제 매출</th>
                <th className="numeric">영업이익률</th><th className="numeric">마진 변화</th><th className="numeric">Free Cash Flow</th>
                <th className="numeric">FCF Margin</th><th className="numeric">마진 변화</th><th>품질</th>
              </tr></thead>
              <tbody>{snapshots.map((row) => <SnapshotRow key={row.ticker} row={row} />)}</tbody>
            </table>
          </div>
          <footer className="table-footer definition-footer">
            <p><i /> EPS: FMP 연간 애널리스트 컨센서스 평균 · Actuals: 최근 4개 보고 분기 합산 TTM</p>
            <span>GAAP/Adjusted 교차 혼합 금지</span>
          </footer>
        </section>

        <section className="definition-card">
          <div><span>01</span><strong>Annual estimate</strong><p>현재 날짜 이후 가장 가까운 회계연도의 annual estimate만 선택합니다.</p></div>
          <div><span>02</span><strong>Operating margin</strong><p>TTM operating income ÷ TTM actual revenue로 일관되게 계산합니다.</p></div>
          <div><span>03</span><strong>FCF margin</strong><p>TTM free cash flow ÷ 동일 기간 TTM actual revenue로 계산합니다.</p></div>
          <div><span>04</span><strong>Monthly change</strong><p>같은 티커의 직전 저장 스냅샷과 비교하며 최초 월은 변화율을 표시하지 않습니다.</p></div>
        </section>
      </section>
    </main>
  );
}

function SnapshotRow({ row }: { row: Snapshot }) {
  const eps = number(row, "annual_fwd_eps_estimate", "annualFwdEpsEstimate");
  const epsChange = number(row, "fwd_eps_change_pct", "fwdEpsChangePct");
  const estRevenue = number(row, "estimated_annual_revenue", "estimatedAnnualRevenue");
  const revenueChange = number(row, "estimated_revenue_change_pct", "estimatedRevenueChangePct");
  const actualRevenue = number(row, "actual_trailing_revenue", "actualTrailingRevenue");
  const opMargin = number(row, "operating_margin", "operatingMargin");
  const opChange = number(row, "operating_margin_change_pp", "operatingMarginChangePp");
  const fcf = number(row, "free_cash_flow", "freeCashFlow");
  const fcfMargin = number(row, "fcf_margin", "fcfMargin");
  const fcfChange = number(row, "fcf_margin_change_pp", "fcfMarginChangePp");
  const rawMissing = read(row, "missing_fields", "missingFields");
  const missing = missingList(rawMissing);
  const quality = (read(row, "collection_status", "collectionStatus") || (missing.length ? "partial" : "complete")) as string;
  const snapshotDate = String(read(row, "snapshot_date", "snapshotDate") ?? "—");
  const tone = (value: number | null) => value === null ? "" : value >= 0 ? "up" : "down";
  return <tr>
    <td><div className="company-cell"><span className="ticker">{row.ticker}</span><strong>{companyNames[row.ticker] ?? row.ticker}</strong></div></td>
    <td className="date-cell">{snapshotDate}</td>
    <td className="numeric eps-current">{money(eps)}</td><td className={`numeric change ${tone(epsChange)}`}>{percent(epsChange)}</td>
    <td className="numeric">{money(estRevenue, true)}</td><td className={`numeric change ${tone(revenueChange)}`}>{percent(revenueChange)}</td>
    <td className="numeric">{money(actualRevenue, true)}</td><td className="numeric">{percent(opMargin, true)}</td>
    <td className={`numeric change ${tone(opChange)}`}>{opChange === null ? "—" : `${opChange > 0 ? "+" : ""}${opChange.toFixed(1)}pp`}</td>
    <td className="numeric">{money(fcf, true)}</td><td className="numeric">{percent(fcfMargin, true)}</td>
    <td className={`numeric change ${tone(fcfChange)}`}>{fcfChange === null ? "—" : `${fcfChange > 0 ? "+" : ""}${fcfChange.toFixed(1)}pp`}</td>
    <td><span className={`quality-badge ${quality}`}>{quality === "complete" ? "완전" : quality === "partial" ? `누락 ${missing.length}` : "실패"}</span></td>
  </tr>;
}
