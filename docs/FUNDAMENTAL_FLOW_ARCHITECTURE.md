# Fundamental Flow 전체 구조 명세

> 문서 버전: 1.0  
> 기준일: 2026-08-22  
> 기능 기준 배포 버전: Sites Version 31
> 투자 철학: Investment Philosophy v1.1  
> FMP Mapping: `FMP Mapping v1.1`

이 문서는 현재 배포된 Fundamental Flow의 제품 철학, 화면, 데이터 수집, 저장, 계산, 검증, Screening, Ranking, Buy Engine 연결 및 운영상 제한을 한곳에 정리한 구조 기준서다.

필드별 FMP 원본 매핑은 [FMP_DATA_DICTIONARY.md](./FMP_DATA_DICTIONARY.md)를 공식 기준으로 사용한다.

---

## 1. 프로젝트 정의

Fundamental Flow는 주가 순위 또는 매수 추천을 제공하는 일반적인 주식 스크리너가 아니다.

핵심 질문은 다음과 같다.

> **기업의 펀더멘털이 시간에 따라 어떻게 변하고 있는가?**

프로젝트 문구는 다음과 같다.

> 우리는 주가를 추종하지 않는다. 기업의 변화를 추적한다.  
> We do not follow stock prices. We follow changes in business fundamentals.

### 역할 분리

| 시스템 | 책임 | 하지 않는 일 |
|---|---|---|
| Fundamental Flow | 기업의 성장, 이익 전망, 수익성, 현금흐름 변화 수집·검증·분류 | 밸류에이션, 적정가, 매수·매도 추천 |
| Buy Engine | Fundamental Flow가 전달한 후보의 밸류에이션 분석 | Fundamental 지표 재계산 |

최종 사용자 흐름은 다음과 같다.

```text
Fundamental Overview
        ↓
Screener
        ↓
Company Detail
        ↓
Add to Buy Engine
        ↓
Buy Engine / Valuation Dashboard
```

Watchlist 메뉴와 관련 샘플 UI는 Version 28에서 제거됐다.

---

## 2. 현재 구현 범위

| 영역 | 현재 상태 | 설명 |
|---|---|---|
| Nasdaq 100 메타데이터 | 구현됨 | 100개 기업의 ticker, name, sector 보유 |
| Nasdaq 100 전체 검색 | 구현됨 | Screener 검색에서 조건 충족 여부와 무관하게 조회 가능 |
| FMP 실제 수집 | 구현됨 | Nasdaq 100 전체를 concurrency 3으로 수집 |
| Monthly Snapshot | 구현됨 | ticker + snapshot date 기준 저장 |
| 원본 API 응답 보존 | 구현됨 | endpoint별 payload를 별도 저장 |
| 계산 엔진 | 구현됨 | UI와 분리된 순수 계산 함수 사용 |
| Validation Layer | 구현됨 | 누락, 통화, 기간, FCF 차이 검증 |
| Screening Engine | 구현됨 | 5개 분류와 configurable threshold 제공 |
| Nasdaq 100 전체 자동 수집 | 구현됨 | run 및 ticker별 상태, 429/5xx retry, 실패 ticker 재수집 기록 |
| 규칙 기반 AI 설명 | 구현됨 | 매수·매도 추천 없이 설명 생성 |
| Buy Engine 연동 | 구조 구현됨 | 별도 Buy Engine URL과 동기화 토큰이 필요 |
| Portfolio persistence | 미구현 | 향후 구조만 고려된 상태 |
| Earnings / Guidance | 부분 구현 | 구조화 Earnings 저장·표시 완료, FMP에 검증된 Guidance 필드가 없어 null 유지 |

---

## 3. 기술 구조

```text
Browser / React UI
  ├─ Fundamental Overview
  ├─ Screener
  ├─ Company Detail
  └─ Data Pilot
          │
          ▼
Next-compatible API Routes
  ├─ /api/fundamentals
  ├─ /api/rankings
  ├─ /api/fundamental-classifications
  └─ /api/buy-engine/candidates
          │
          ├──────────────► FMP Stable REST API
          │
          ▼
Collection / Normalization / Validation
  ├─ FMP mapper
  ├─ safe null handling
  ├─ snapshot quality
  └─ source validation
          │
          ▼
Calculation Engine
          │
          ▼
Screening Engine
          │
          ▼
Cloudflare D1
  ├─ api_payloads
  ├─ fundamental_snapshots
  └─ fundamental_classifications
          │
          └──────────────► Buy Engine API
```

### 실행 환경

| 항목 | 현재 구성 |
|---|---|
| UI | React 19, Next-compatible App Router |
| 빌드 | Vinext + Vite |
| 런타임 | Cloudflare Worker |
| 데이터베이스 | Cloudflare D1 / SQLite |
| ORM·Migration | Drizzle ORM / Drizzle Kit |
| 외부 재무 데이터 | Financial Modeling Prep Stable API |
| 배포 | OpenAI Sites |
| Node 요구 버전 | 22.13.0 이상 |

---

## 4. 디렉터리별 책임

| 경로 | 책임 |
|---|---|
| `app/page.tsx` | 네 개 화면, UI 상태, API 호출 hook, 규칙 기반 설명 |
| `app/globals.css` | 현재 대시보드 디자인과 반응형 스타일 |
| `app/api/fundamentals/route.ts` | Snapshot·Overview·기업 이력·Earnings 조회 및 전체 수집 |
| `app/api/rankings/route.ts` | 최신 Snapshot Ranking 조회 및 Nasdaq 100 갱신 |
| `app/api/fundamental-classifications/route.ts` | 5단계 Fundamental 분류 조회 |
| `app/api/buy-engine/candidates/route.ts` | Buy Engine 후보 상태 확인·등록·제거 프록시 |
| `lib/fmp.ts` | FMP 호출, 원본 필드 선택, 정규화 |
| `lib/fmp-validation.ts` | 안전한 숫자 변환, 필수 필드, collectionStatus, source validation |
| `lib/fundamental-math.ts` | Fundamental 파생 계산 공식 |
| `lib/forward-eps.ts` | Current FY·Next FY 선택 및 1M·3M 수정률 |
| `lib/snapshot-quality.ts` | Snapshot Quality 점수와 AI caution |
| `lib/snapshot-store.ts` | 원본·Snapshot 저장, 계산, 분류의 전체 orchestration |
| `lib/screening-engine.ts` | 5단계 자동 분류와 사유 생성 |
| `lib/ranking.ts` | Snapshot 축적 단계별 백분위 Ranking |
| `lib/nasdaq100.ts` | Nasdaq 100 Universe 메타데이터 |
| `lib/fundamental-candidate.ts` | Buy Engine으로 보낼 최신 후보 Snapshot 구성 |
| `lib/buy-candidate-contract.ts` | 전달 계약, 허용 분류와 허용 지표 목록 |
| `db/schema.ts` | D1 테이블의 TypeScript 스키마 |
| `drizzle/` | D1 Migration 이력 |
| `docs/` | Mapping, Validation, Data Dictionary, 구조 문서 |
| `tests/` | 계산·수집·검증·UI 구조·연동 회귀 테스트 |

---

## 5. 화면 구조

### 5.1 Fundamental Overview

목적은 Nasdaq 100 전체의 Fundamental 방향을 집계해 보여주는 것이다. 개별 기업 목록이나 Rule of 40 값을 중심에 두지 않는다.

Primary Indicator는 다음 네 개다.

1. Forward EPS Trend
2. Revenue Growth Trend
3. Operating Margin Trend
4. Operating Cash Flow Trend

각 지표는 `Improving / Stable / Weakening` 기업 수를 표시한다.

- `Valid Snapshots`: 최신 Snapshot에 필수 6개 Raw Data가 있고 계산에 성공한 기업 수다.
- Revenue Growth, Operating Margin, CFO: 기업별 최신 Snapshot과 직전 Snapshot의 차이를 사용한다.
- Forward EPS: 저장된 Next FY 1M 또는 3M 수정률을 사용한다.
- 비교 가능한 Snapshot이 없으면 `Snapshot 축적 중`으로 표시한다.
- 데이터가 없는 기업은 방향 집계에서 제외한다.

### 5.2 Screener

기본 목록에는 Screening Engine이 `newly_selected` 또는 `continuing_improvement`로 분류한 기업만 Ranking 후 표시한다.

화면에서 제공하는 기능은 다음과 같다.

- 최신 수집 범위와 Ranking 단계 표시
- Nasdaq 100 전체 데이터 갱신
- 조건 충족 기업의 Ranking 표시
- 행 전체 클릭 또는 키보드 Enter/Space로 Company Detail 이동
- Nasdaq 100 전체 ticker 또는 회사명 검색
- 검색 결과에서 Screening 조건과 무관하게 Company Detail 이동
- Buy Engine 등록 상태 확인 및 단일 toggle action

Valuation 데이터와 주가 Momentum은 사용하지 않는다.

### 5.3 Company Detail

Nasdaq 100 메타데이터와 해당 ticker의 최신·과거 Snapshot을 결합해 표시한다.

Core Indicators:

- Next FY EPS와 1M·3M 수정률
- Revenue Growth
- Operating Margin
- Operating Cash Flow

Supporting Indicators:

- CAPEX
- 내부 계산 FCF
- Rule of 40 PASS / WARNING
- Snapshot Quality 및 개별 품질 check

추가 영역:

- 최근 Snapshot의 규칙 기반 설명
- Snapshot 저장 이력
- Buy Engine 등록 또는 제거
- 구조화 Earnings와 nullable Management Guidance

### 5.4 Data Pilot

실제 FMP 연결 상태를 확인하고 Nasdaq 100 전체 기업을 갱신하는 운영 화면이다.

- API 연결 상태
- 최신·최근 성공 업데이트 시각
- 기업별 실제 EPS, Revenue, Next FY EPS, 수정률, Quality
- 누락 필드
- 기업별 Snapshot 이력 이동

---

## 6. FMP 수집 구조

### 수집 대상

수집 대상은 `NASDAQ_100_TICKERS`의 100개 전체다. 동시에 최대 3개 ticker를 처리하며, HTTP 429·5xx는 endpoint별 최대 3회 시도한다. 첫 실행에서 최종 실패한 ticker는 run 안에서 1회 재수집한다.

### 호출 Endpoint

| 목적 | Endpoint | 주요 원본 필드 |
|---|---|---|
| 연간 Analyst Estimate | `/stable/analyst-estimates?symbol={ticker}&period=annual&page=0&limit=10` | `date`, `epsAvg` |
| 분기 Income Statement | `/stable/income-statement?symbol={ticker}&period=quarter&limit=8` | `date`, `fiscalYear`, `period`, `reportedCurrency`, `revenue`, `operatingIncome`, `epsDiluted` |
| 분기 Cash Flow | `/stable/cash-flow-statement?symbol={ticker}&period=quarter&limit=4` | `date`, `fiscalYear`, `period`, `reportedCurrency`, `operatingCashFlow`, `capitalExpenditure`, `freeCashFlow` |

세 Endpoint는 기업별로 병렬 호출된다. 각 요청에는 12초 timeout과 `no-store`가 적용된다.

### null 처리

`numberOrNull(value)`가 숫자 변환의 단일 안전 장치다.

| 입력 | 결과 |
|---|---|
| `null` | `null` |
| `undefined` | `null` |
| 빈 문자열 | `null` |
| 유효하지 않은 숫자 | `null` |
| 유한한 숫자 또는 숫자 문자열 | `number` |

누락값을 0으로 바꾸지 않는다.

### 원본 보존

각 API 응답은 정규화된 Snapshot과 분리해 `api_payloads`에 저장한다.

고유 기준은 다음과 같다.

```text
ticker + snapshot_date + endpoint
```

동일 날짜에 재수집하면 중복 row를 만들지 않고 기존 endpoint payload를 갱신한다.

---

## 7. Monthly Snapshot 모델

핵심 저장 단위는 다음과 같다.

```text
Company + Snapshot Date
```

`fundamental_snapshots`의 고유 기준은 `ticker + snapshot_date`다.

### 필드 그룹

| 그룹 | 대표 필드 |
|---|---|
| 식별 | ticker, snapshot_date, collected_at |
| Fiscal | latest_fiscal_year, latest_fiscal_period, latest_period_end |
| Actual EPS | latest_quarter_eps, prior_year_quarter_eps, eps_yoy_pct, eps_yoy_status, eps_change_amount |
| Revenue | latest_quarter_revenue, prior_year_quarter_revenue, revenue_yoy_pct, actual_trailing_revenue |
| Forward EPS | current_fy_eps, current_fy_estimate_fiscal_date, next_fy_eps, next_fy_estimate_fiscal_date, next_fy_revision_1m, next_fy_revision_3m |
| Profitability | operating_income, operating_margin |
| Cash Flow | operating_cash_flow, capital_expenditure, free_cash_flow, fcf_margin, cfo_margin, capex_intensity |
| Rule of 40 | classic_rule_40, operating_rule_40, cash_rule_40 |
| Collection | missing_fields, collection_status, calculation_success |
| Quality | snapshot_quality_score, snapshot_quality_checks, snapshot_quality_caution |
| Traceability | mapping_version, forward_eps_basis, data_source, eps_definition |
| Validation | reported_currency, validation_status, validation_warnings, fmp_reported_free_cash_flow, fcf_variance |

스키마에는 과거 실험의 `ntm_*`, `annual_fwd_eps_estimate`, `estimated_*`, `fy1_*` 호환 필드도 남아 있다. 현재 생산 흐름은 Next FY 필드를 기준으로 사용하며 NTM 값은 저장 시 `NULL`로 정리한다.

---

## 8. Raw Data 정의

Snapshot이 `complete`가 되려면 다음 여섯 값이 모두 유한한 숫자여야 한다.

| Raw Data | 현재 정의 |
|---|---|
| Revenue | 최근 4개 분기 `revenue` 합계, 즉 TTM Revenue |
| Revenue Growth | 최신 분기 Revenue와 동일 Fiscal Year 전년 분기의 YoY 변화율 |
| Forward EPS | 현재 Fiscal Year의 정확히 다음 연도 Annual Analyst Consensus `epsAvg` |
| Operating Margin | 최근 4개 분기 Operating Income 합계 / 최근 4개 분기 Revenue 합계 |
| CFO | 최근 4개 분기 `operatingCashFlow` 합계 |
| CAPEX | 최근 4개 분기 `capitalExpenditure` 합계의 절댓값 |

### collectionStatus

| 상태 | 조건 |
|---|---|
| `complete` | 필수 Raw Data 6개가 모두 존재 |
| `partial` | API 전체 실패는 아니지만 하나 이상 누락 |
| `failed` | 세 FMP 요청이 모두 실패 |

### latestSuccessfulUpdate

다음 조건을 모두 충족한 Snapshot의 가장 최근 `collected_at`이다.

- 필수 Raw Data 6개 존재
- `calculation_success = true`

---

## 9. Forward EPS 정의와 비교

현재 Forward EPS는 **가장 가까운 미래 Estimate** 또는 NTM이 아니다.

정확한 정의는 다음과 같다.

> 최신 Income Statement의 `fiscalYear + 1`에 해당하는 연간 Analyst Estimate의 `epsAvg`

예를 들어 최신 실제 분기의 fiscal year가 2026이면:

- Current FY EPS: estimate date의 연도가 2026인 `epsAvg`
- Next FY EPS: estimate date의 연도가 2027인 `epsAvg`

정확한 다음 회계연도 row가 없으면 다른 estimate로 fallback하지 않고 `null`로 처리한다.

### 1M·3M 수정률

```text
Next FY Revision (%)
= (Current Next FY EPS / Previous Next FY EPS - 1) × 100
```

- 1M은 전월 월 구간의 가장 최근 Snapshot을 사용한다.
- 3M은 3개월 전 월 구간의 가장 최근 Snapshot을 사용한다.
- 현재와 과거의 `next_fy_estimate_fiscal_date`가 완전히 같아야 비교한다.
- Fiscal Year rollover로 대상 연도가 바뀌면 수정률을 `null`로 시작한다.
- 현재값, 과거값 또는 비교 Snapshot이 없으면 `null`이다.

---

## 10. Calculation Engine

계산은 `lib/fundamental-math.ts`에 분리돼 있으며 UI에서 재계산하지 않는다.

입력 단위:

- Revenue, CFO, CAPEX, FCF: 원본 통화 금액
- Revenue Growth, Operating Margin: `%`
- Forward EPS: 주당 통화 단위

공식:

```text
FCF = CFO - CAPEX

FCF Margin (%) = FCF / Revenue × 100
CFO Margin (%) = CFO / Revenue × 100
CapEx Intensity (%) = CAPEX / Revenue × 100

Classic Rule of 40 = Revenue Growth + FCF Margin
Operating Rule of 40 = Revenue Growth + Operating Margin
Cash Rule of 40 = Revenue Growth + CFO Margin
```

계산 결과는 소수점 첫째 자리로 반올림한다. 파생 계산은 필수 Raw Data 6개가 모두 유효할 때만 수행한다.

Rule of 40은 Overview의 핵심 KPI가 아니라 Company Detail의 validation 지표다. Classic Rule of 40이 40 이상이면 UI에서 `PASS`, 아니면 `WARNING`으로 표시한다.

---

## 11. Validation Layer

### Source validation

| 검증 | 현재 규칙 | 경고 코드 |
|---|---|---|
| Income 통화 | 최근 4분기가 단일 통화여야 함 | `income_statement_currency_missing_or_inconsistent` |
| Cash Flow 통화 | 최근 4분기가 단일 통화여야 함 | `cash_flow_currency_missing_or_inconsistent` |
| 통화 일치 | Income과 Cash Flow 통화가 같아야 함 | `currency_mismatch` |
| Fiscal Period | 최근 4분기의 year, period, date가 순서대로 일치해야 함 | `fiscal_period_mismatch` |
| Analyst Estimate date | 선택된 Next FY date가 Snapshot date보다 과거가 아니어야 함 | `analyst_estimate_fiscal_date_invalid` |
| FMP FCF 존재 | 내부 FCF 계산 가능 시 FMP FCF도 있어야 함 | `fmp_free_cash_flow_missing` |
| FCF 차이 | 내부 FCF와 FMP FCF 차이가 tolerance 이하여야 함 | `free_cash_flow_mismatch` |

FCF tolerance는 다음 중 큰 값이다.

```text
max(1, abs(FMP FCF) × 0.000001)
```

경고가 하나라도 있으면 `validation_status = warning`, 없으면 `valid`다.

### Snapshot Quality

| Check | 배점 |
|---|---:|
| Revenue | 15 |
| Revenue Growth | 15 |
| Forward EPS | 14 |
| Operating Margin | 14 |
| CFO | 28 |
| CAPEX | 10 |
| Fiscal 정보 | 4 |
| 합계 | 100 |

- 유효한 항목의 배점을 합산한다.
- 80점 미만이면 `snapshot_quality_caution = true`다.
- 규칙 기반 설명은 80점 미만에서 판단의 확신을 낮추라는 문구를 표시한다.

---

## 12. Screening Engine

분류 단계는 다섯 개다.

1. `newly_selected`
2. `continuing_improvement`
3. `watch`
4. `caution`
5. `excluded`

### 기본 Threshold

| 설정 | 값 |
|---|---:|
| 최소 Revenue Growth | 12% |
| 최소 Classic Rule of 40 | 40 |
| 최소 Cash Rule of 40 | 40 |
| Quality caution 기준 | 80 미만 |
| Forward EPS 월간 caution 기준 | -5% 미만 |
| Excluded Revenue Growth 기준 | 0% 미만 |
| Excluded Classic Rule of 40 기준 | 10 미만 |

Threshold는 함수 인자로 교체할 수 있다. 현재 운영 UI에서 값을 변경하는 기능은 없다.

### 판정 우선순위

```text
동일 Snapshot 재수집
  → 기존 분류 유지

필수 데이터 누락 또는 계산 실패
  → Caution

Validation warning 또는 Quality < 80
  → Caution

Revenue Growth < 0 또는 Classic Rule40 < 10
  → Excluded

Next FY 1M < -5
  → Caution

Revenue Growth ≥ 12
AND Classic Rule40 ≥ 40
AND Cash Rule40 ≥ 40
  → Newly Selected 또는 Continuing Improvement

그 외
  → Watch
```

각 결과에는 사용된 수치 또는 실패 원인을 포함한 `reason`이 저장된다.

---

## 13. Ranking Engine

Screening 분류와 Ranking은 별도 단계다.

1. 먼저 `newly_selected`와 `continuing_improvement`만 후보로 선택한다.
2. 후보의 지표를 Universe 내부 백분위로 변환한다.
3. Snapshot 축적 수준에 따라 가중치를 자동 변경한다.
4. 점수 상위 10개를 Screener에 표시한다.

| Ranking 단계 | 조건 | 가중치 |
|---|---|---|
| Actual only | Forward revision coverage 부족 | EPS YoY 50% + Revenue YoY 50% |
| One month | 후보 중 Next FY 1M coverage 60% 이상 | EPS 35% + Revenue 35% + Next FY 1M 30% |
| Three month | 후보 중 Next FY 3M coverage 60% 이상 | EPS 30% + Revenue 30% + 1M 20% + 3M 20% |

EPS가 음수 또는 흑자 전환인 경우 단순 변화율 대신 상태 기반 점수를 사용한다.

| EPS 상태 | 처리 |
|---|---|
| 흑자 전환 | 100점 |
| 적자 개선 | 55점 |
| 적자 확대 | 10점 |
| 적자 전환 | 0점 |
| 일반 성장 | EPS YoY 백분위 |

Ranking은 Valuation이나 주가 Momentum을 사용하지 않는다.

---

## 14. 규칙 기반 AI Analysis

현재 AI Analysis는 외부 LLM을 호출하지 않는다. `app/page.tsx`의 deterministic rule로 설명 문장을 만든다.

판단 대상:

- Next FY EPS revision 방향
- Revenue Growth 부호
- Operating Margin 부호
- CFO 부호
- 음수 FCF와 CAPEX 관계
- Snapshot Quality 80점 기준

현재 설명은 매수·매도·목표가를 제시하지 않는다. 데이터가 없으면 확인 필요 또는 Snapshot 축적 필요를 명시한다.

---

## 15. Buy Engine 연동

### 환경 설정

| 환경 변수 | 역할 |
|---|---|
| `BUY_ENGINE_API_URL` | 별도 Buy Engine의 base URL |
| `BUY_ENGINE_SYNC_TOKEN` | 서버 간 Bearer 인증 token |

### UI 동작

- 미등록 기업: `Add to Buy Engine`
- 등록 기업: `Added · Remove from Buy Engine`
- 두 개의 버튼이 아니라 상태에 따라 하나의 action만 표시한다.
- Company Detail과 Screener 후보 행에서 동일한 component를 사용한다.

### 전달 데이터

| 항목 | 전달 여부 |
|---|---|
| Ticker | 전달 |
| Company Name | 전달 |
| 최신 Fundamental Category | 전달 |
| 최신 Snapshot Date | 전달 |
| 최신 Fundamental Metrics | allowlist에 한해 전달 |
| Valuation | 전달하지 않음 |
| Fundamental 재계산 결과 | Buy Engine에서 재계산하지 않음 |

허용된 metrics에는 실제 EPS·Revenue, Current FY·Next FY EPS, revision, margin, CFO, CAPEX, FCF, Rule of 40, Quality가 포함된다.

Fundamental Flow의 API route가 최신 Snapshot과 최신 분류를 D1에서 읽어 Buy Engine의 `/api/candidates/sync`에 전달한다. 상태 조회는 GET, 등록은 POST, 제거는 DELETE다. 외부 요청 timeout은 12초다.

---

## 16. API Route 계약

### `/api/fundamentals`

| Method / Query | 역할 |
|---|---|
| `GET` | PLTR, NVDA, MU 최신 Snapshot과 validation 조회 |
| `GET?scope=overview` | Nasdaq 100에 속한 기업별 최신 2개 Snapshot 조회 |
| `GET?ticker=PLTR` | 해당 Nasdaq 100 기업의 최근 60개 Snapshot 조회 |
| `POST` | PLTR, NVDA, MU를 각 1회 수집·저장·계산·분류 |

### `/api/rankings`

| Method | 역할 |
|---|---|
| `GET` | 전체 저장 Snapshot 중 최신값을 읽고 선정 분류만 Ranking |
| `POST` | 현재는 PLTR, NVDA, MU만 각 1회 갱신 |

### `/api/fundamental-classifications`

| Method / Query | 역할 |
|---|---|
| `GET` | 모든 저장 분류 조회 |
| `GET?ticker=PLTR` | 단일 ticker 분류 조회 |

### `/api/buy-engine/candidates`

| Method | 역할 |
|---|---|
| `GET?ticker=PLTR` | Buy Engine 등록 여부 확인 |
| `POST` | 서버가 최신 Fundamental 후보 payload를 구성해 등록 |
| `DELETE` | ticker를 Buy Engine 후보에서 제거 |

모든 주요 API 응답은 `Cache-Control: no-store`를 사용한다.

---

## 17. 데이터베이스 구조

### `api_payloads`

FMP의 변경되지 않은 원본 응답과 HTTP 상태·오류를 endpoint별로 보존한다.

### `fundamental_snapshots`

정규화 Raw Data, 계산 결과, 변화율, validation, quality, mapping version을 날짜별로 저장하는 핵심 테이블이다.

### `fundamental_classifications`

ticker별 최신 5단계 분류, 사유, 분류 버전, 기준 Snapshot date를 저장한다.

### `companies`

초기 프로젝트의 정적 score 중심 모델이다. 현재 FMP Snapshot 수집·Overview·Screener의 핵심 경로에서는 사용되지 않는 legacy table이다.

---

## 18. 오류 처리

| 상황 | 현재 처리 |
|---|---|
| FMP timeout | 12초 후 요청 실패 결과 저장 |
| FMP non-2xx | HTTP status와 오류 메시지 저장 |
| JSON parsing 실패 | 응답 text를 원본으로 보존 |
| 부분 데이터 | null 유지, `partial`, missing fields 기록 |
| 전체 FMP 실패 | `failed` |
| D1 미연결 | API 503 `database_unavailable` |
| FMP key 없음 | API 503 `key_missing` |
| Buy Engine 미설정 | API 503 `integration_not_configured` |
| Buy Engine timeout·network 실패 | API 502 계열 상태 반환 |
| 잘못된 Nasdaq ticker | history API 400 |

기업 하나의 수집 실패가 나머지 기업 수집을 중단시키지 않도록 ticker별 예외를 분리한다. `collection_runs`와 `collection_run_items`에 run 및 ticker별 상태를 기록한다.

---

## 19. 테스트 구조

현재 자동 테스트는 다음 영역을 검증한다.

- Buy Engine 전달 계약과 단일 toggle 상태
- FMP Data Dictionary 필드·버전
- Phase 1 검증 기업과 6개 필수 Raw Data
- Nasdaq 100 concurrency, retry, run 상태 및 중복 방지
- 구조화 Earnings와 nullable Guidance
- Current FY / exact Next FY 선택
- Fiscal rollover와 동일 estimate fiscal date 비교
- 1M·3M revision의 null 처리
- EPS YoY 특수 상태와 Revenue 변화율
- Calculation Engine 공식
- Snapshot Quality 점수
- collectionStatus와 latest successful update
- Screening 5단계
- Ranking 갱신의 중복 호출 방지
- Overview·Screener·Company Detail 역할과 navigation
- Rule of 40의 UI 위치
- 규칙 기반 설명의 비추천 원칙
- Watchlist 제거 상태

Version 30 기준 자동 테스트 수는 60개다.

---

## 20. 현재 알려진 제한과 구조상 주의점

다음은 현재 코드에서 확인된 사실이다.

1. **전체 수집은 한 번에 최대 400개의 기본 FMP 요청을 사용한다.** 회사별 Fundamental 3개와 Earnings 1개이며 retry 시 증가한다.
2. **Management Guidance 구조화 필드는 확인되지 않았다.** FMP Earnings 응답에 없는 값을 추정하지 않고 null로 저장한다.
3. **Sidebar coverage는 최신 Snapshot 보유 기업 수다.** 완전한 Snapshot Quality나 비교 가능 기업 수와는 다르다.
4. **일부 Company Detail 상태와 사유는 샘플 배열에서 가져온다.** DB의 최신 `fundamental_classifications`를 Detail header에 직접 연결하지 않는다.
5. **Overview 방향 집계에는 지표별 비교 가능한 Snapshot이 2개 필요하다.** 전체 수집 성공 기업 수와 Trend Valid Companies는 다를 수 있다.
6. **Screening과 Ranking은 별도다.** 분류 기준을 통과해야 Ranking 대상이 되며, Ranking score 자체가 Screening category를 결정하지 않는다.
7. **AI는 현재 규칙 기반 UI 함수다.** 별도 service module이나 LLM 연동은 아직 없다.
8. **Buy Engine 통합은 외부 서비스 설정에 의존한다.** 두 환경 변수가 없으면 등록 상태 확인과 변경이 작동하지 않는다.
9. **Legacy 코드와 필드가 남아 있다.** `data/stocks.ts`, `companies` table, NTM·과거 FY1 호환 필드는 현재 핵심 흐름의 기준이 아니다.
10. **Nasdaq 100 Universe는 코드에 고정된 목록이다.** 자동 constituent 갱신 기능은 없다.

---

## 21. 확장 전 권장 순서

1. Nasdaq 100 월별 Snapshot을 최소 3개월 축적한다.
2. fiscal rollover, 통화, FCF variance 경고를 반복 검증한다.
3. 장기 실행이 발생하면 batch checkpoint 방식으로 확장한다.
4. 화면의 남은 샘플 회사 배열을 제거하고 분류를 D1 기준으로 통일한다.
6. 전체 Universe 수집 전에 FMP quota와 기업별 endpoint 예외를 측정한다.
7. 수집 실패 기업만 재처리할 수 있는 운영 경로를 마련한다.
8. Universe constituent의 기준일과 업데이트 절차를 문서화한다.
9. Buy Engine 실제 endpoint와 전달 계약을 통합 테스트한다.
10. legacy model과 호환 필드의 제거 여부를 별도 migration으로 결정한다.

---

## 22. 현재 구조에 대한 판정

현재 구조는 **Nasdaq 100 전체의 반복 수집을 시작할 수 있는 production-oriented collection architecture**다. Concurrency, retry, 실패 ticker 기록·재수집, run 상태, 중복 방지가 적용됐다. 다만 3개월 Snapshot 축적과 운영 중 API quota·장기 실행 관찰은 아직 남아 있다.

