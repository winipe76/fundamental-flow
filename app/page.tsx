"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

export default function Home() {
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [snapshots, setSnapshots] = useState<Snapshot[]>(demoSnapshots);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/fundamentals", { cache: "no-store" });
      const payload = await response.json();
      setStatus((payload.status as ApiStatus) || (response.ok ? "connected" : "error"));
      if (Array.isArray(payload.snapshots) && payload.snapshots.length) setSnapshots(payload.snapshots);
      setLastUpdated(payload.lastUpdated ?? null);
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/fundamentals", { method: "POST" });
      const payload = await response.json();
      setStatus((payload.status as ApiStatus) || (response.ok ? "connected" : "error"));
      if (Array.isArray(payload.results) && payload.results.length) setSnapshots(payload.results);
      setLastUpdated(payload.lastUpdated ?? null);
    } catch { setStatus("error"); }
    finally { setRefreshing(false); }
  };

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
          <article className="metric-card"><div className="metric-label">EPS 정의</div><div className="metric-value text-value">Consensus Avg</div><p>FMP annual estimatedEpsAvg</p></article>
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
            <p><i /> EPS: FMP 연간 애널리스트 컨센서스 평균 · Actuals: FMP 표준화 TTM 재무제표</p>
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
