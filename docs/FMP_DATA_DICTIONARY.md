# Fundamental Flow — FMP Data Dictionary

## Document Control

| Item | Value |
| --- | --- |
| Data Dictionary Version | 1.3 |
| Mapping Version | FMP Mapping v1.1 |
| Verified Date | 2026-08-30 |
| Verified Companies | PLTR, NVDA, MU, MRVL |
| API Version | FMP Stable API (`/stable`) |
| Last Updated | 2026-08-30 |
| Status | Official project reference |

This document is the single source of truth for FMP fields currently consumed by Fundamental Flow. It covers source fields, normalized Monthly Snapshot fields, calculated fields, validation metadata, and Snapshot Quality. A field is not approved for production mapping merely because it appears in an FMP response.

Verification used actual responses from all three Phase 1 companies for these requests:

- `GET https://financialmodelingprep.com/stable/income-statement?symbol={ticker}&period=quarter&limit=8`
- `GET https://financialmodelingprep.com/stable/cash-flow-statement?symbol={ticker}&period=quarter&limit=4`
- `GET https://financialmodelingprep.com/stable/analyst-estimates?symbol={ticker}&period=annual&page=0&limit=10`
- `GET https://financialmodelingprep.com/stable/earnings?symbol={ticker}&limit=12`

All PLTR examples below come from the actual response observed on the Verified Date. Monetary values are stored as raw USD, not pre-scaled to millions or billions.

The Earnings response was separately verified for PLTR, NVDA, MU, and MRVL. It contains actual and consensus values but no structured Management Revenue Guidance, EPS Guidance, Margin Guidance, guidance target period, or guidance announcement date. Guidance therefore uses a separately verified official issuer IR/SEC release when available and is never inferred from analyst estimates. The current verified sources are NVIDIA's 2026-08-26 Q2 FY2027 release and Marvell's 2026-08-27 Exhibit 99.1.

## Earnings and Guidance Mapping

| API Endpoint | Raw Field | Internal Field | Data Type | Nullable | Required | Formula / Transformation | Unit | Snapshot Source | Validation Rule | PLTR Example |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Earnings Report | `symbol` | `ticker` | string | No | Yes | Uppercase symbol | Ticker | FMP Earnings | Must match the requested Nasdaq 100 ticker | `PLTR` |
| Earnings Report | `date` | `earnings_date` | date | No | Yes | Direct mapping | ISO date | FMP Earnings | Non-empty date required; ticker + date is unique | `2026-08-03` |
| Earnings Report | `revenueActual` | `actual_revenue` | number | Yes | No | Safe numeric mapping | USD | FMP Earnings | Null, empty, invalid, or non-finite values remain null | `1,935,464,000` |
| Earnings Report | `revenueEstimated` | `revenue_consensus` | number | Yes | No | Safe numeric mapping | USD | FMP Earnings | Null, empty, invalid, or non-finite values remain null | `1,812,280,000` |
| Internal Calculation | `revenueActual`, `revenueEstimated` | `revenue_surprise` | number | Yes | No | Actual Revenue − Revenue Consensus | USD | Earnings calculation | Both inputs must be finite | `123,184,000` |
| Internal Calculation | `revenueActual`, `revenueEstimated` | `revenue_surprise_pct` | number | Yes | No | `(Actual / Consensus − 1) × 100` | % | Earnings calculation | Consensus must be finite and non-zero | `6.797%` |
| Earnings Report | `epsActual` | `actual_eps` | number | Yes | No | Safe numeric mapping | USD/share | FMP Earnings | Null, empty, invalid, or non-finite values remain null | `0.41` |
| Earnings Report | `epsEstimated` | `eps_consensus` | number | Yes | No | Safe numeric mapping | USD/share | FMP Earnings | Null, empty, invalid, or non-finite values remain null | `0.3446` |
| Internal Calculation | `epsActual`, `epsEstimated` | `eps_surprise` | number | Yes | No | Actual EPS − EPS Consensus | USD/share | Earnings calculation | Both inputs must be finite | `0.0654` |
| Internal Calculation | `epsActual`, `epsEstimated` | `eps_surprise_pct` | number | Yes | No | `(Actual / Consensus − 1) × 100` | % | Earnings calculation | Consensus must be finite and non-zero | `18.9797%` |
| Earnings Report | `lastUpdated` | `source_last_updated` | date | Yes | No | Direct mapping | ISO date | FMP Earnings | Must be a string when present | `2026-08-25` |
| Official issuer IR/SEC earnings release | Outlook revenue text | `management_revenue_guidance` | string | Yes | No | Preserve verified range and unit | Text | Official Guidance | Required markers and earnings date must match the approved release | NVDA `$108.0B ±2%` |
| Official issuer IR/SEC earnings release | Outlook EPS text | `eps_guidance` | string | Yes | No | Preserve GAAP/non-GAAP labels and range | Text | Official Guidance | Store null when the company does not issue EPS guidance | NVDA `null` |
| Official issuer IR/SEC earnings release | Outlook gross-margin text | `margin_guidance` | string | Yes | No | Preserve GAAP/non-GAAP labels and range | Text | Official Guidance | Required markers and earnings date must match the approved release | NVDA `GAAP / Non-GAAP Gross Margin 74.0% ±0.5%p` |
| Official issuer IR/SEC earnings release | Outlook heading | `guidance_period` | string | Yes | No | Normalize stated target fiscal period | Fiscal period | Official Guidance | Period must be explicitly stated in the release | NVDA `Q3 FY2027` |
| Official issuer IR/SEC earnings release | Release date | `guidance_announcement_date` | date | Yes | No | Direct verified date | ISO date | Official Guidance | Must equal the linked earnings event date | NVDA `2026-08-26` |

Earnings and Guidance fields are stored in `earnings_events`, not `fundamental_snapshots`. They are excluded from Calculation Engine, Screening, Ranking, and Score inputs during the observation period.

## Definitions of the Six Required Raw Metrics

### Revenue

Revenue is TTM revenue, calculated as the sum of the latest four valid quarterly Income Statement `revenue` values.

```text
Revenue = Q0 revenue + Q-1 revenue + Q-2 revenue + Q-3 revenue
```

PLTR example: `$6,155,941,000`.

### Revenue Growth

Revenue Growth is the latest reported fiscal quarter compared with the exact same fiscal quarter in the prior fiscal year. It is not TTM growth and it is not sequential quarter-over-quarter growth.

```text
Revenue Growth = (Latest Quarter Revenue / Prior-Year Same-Quarter Revenue - 1) × 100
```

PLTR example: Q2 2026 `$1,935,464,000` versus Q2 2025 `$1,003,697,000` = `92.8335%`.

### Forward EPS

Forward EPS means the **Next Fiscal Year** annual analyst consensus `epsAvg`. The latest quarterly Income Statement `fiscalYear` identifies the Current Fiscal Year. Fundamental Flow then selects the annual Analyst Estimate whose `date` year equals `Current Fiscal Year + 1`. It does not select rows by array position or by nearest future date.

| Candidate meaning | Used? | Reason |
| --- | --- | --- |
| FY+1 Estimate / Next Fiscal Year | Yes | Annual estimate whose fiscal year is exactly Current FY + 1 |
| NTM | No | The project does not combine four quarterly EPS estimates |
| Quarterly Estimate | No | The endpoint request uses `period=annual` |

Current FY EPS is stored separately as supporting information. Next FY EPS is the required Primary Forward Indicator used by the Calculation Engine, Screening, and Fundamental Overview. The internal basis identifier is `next_fiscal_year_annual_consensus`.

Verified selection examples on 2026-08-22:

| Company | Current FY EPS | Current FY Date | Next FY EPS | Next FY Date |
| --- | ---: | --- | ---: | --- |
| PLTR | 1.59974 | 2026-12-31 | 2.28177 | 2027-12-31 |
| NVDA | 9.01477 | 2027-01-25 | 12.78792 | 2028-01-25 |
| MU | approximately 73.2 | 2026-08-28 | approximately 154.6 | 2027-08-28 |

FMP consensus values can change. The fiscal-year row selection is authoritative; example values are time-stamped observations. No fallback field or positional fallback is permitted.

### Operating Margin

Operating Margin is internally calculated from the latest four Income Statement quarters.

```text
Operating Margin = TTM Operating Income / TTM Revenue
```

PLTR example: `$2,634,652,000 / $6,155,941,000 = 0.4279852585`, equivalent to `42.7985%`.

### Operating Cash Flow

Operating Cash Flow comes from quarterly Cash Flow field `operatingCashFlow`. The project sums exactly four valid quarters.

```text
TTM CFO = Q0 CFO + Q-1 CFO + Q-2 CFO + Q-3 CFO
```

PLTR example: `$3,401,291,000`.

### Capital Expenditure

CAPEX comes from quarterly Cash Flow field `capitalExpenditure`. FMP returned negative cash-outflow values for all verified companies. Fundamental Flow stores a positive investment amount.

```text
TTM CAPEX = abs(Q0 CAPEX + Q-1 CAPEX + Q-2 CAPEX + Q-3 CAPEX)
```

PLTR latest-quarter raw example: `-$14,554,000`. PLTR normalized TTM example: `$42,019,000`.

## Free Cash Flow

FMP returns quarterly `freeCashFlow`, and Fundamental Flow reads it for source-level comparison. The production value stored after calculation is authoritative and is recalculated internally:

```text
Free Cash Flow = TTM CFO - TTM CAPEX
```

PLTR FMP-reported four-quarter sum and internal calculation both equal `$3,359,272,000`. If FMP-reported FCF differs from the internal formula, the internal Calculation Engine value is stored; the difference should be investigated as a validation issue.

## Rule of 40 Definitions

All Rule of 40 values use percentage points.

| Version | Formula | PLTR example |
| --- | --- | ---: |
| Classic Rule of 40 | Revenue Growth % + FCF Margin % | 147.4 |
| Operating Rule of 40 | Revenue Growth % + Operating Margin % | 135.6 |
| Cash Rule of 40 | Revenue Growth % + CFO Margin % | 148.1 |

Supporting formulas:

```text
FCF Margin = FCF / Revenue × 100
CFO Margin = CFO / Revenue × 100
CapEx Intensity = CAPEX / Revenue × 100
```

## Complete Field Dictionary

### FMP Source and Normalized Fields

| API Endpoint | Raw Field | Internal Field | Data Type | Nullable | Required | Formula / Transformation | Unit | Snapshot Source | Validation Rule | PLTR Example |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Income Statement, quarterly | `date` | `latestPeriodEnd` / `latest_period_end` | date | Yes | Yes for Fiscal quality | Latest valid quarter after descending date sort | ISO date | Income Statement | Must be a non-empty ISO-style date string | `2026-06-30` |
| Income Statement, quarterly | `fiscalYear` | `latestFiscalYear` / `latest_fiscal_year` | string | Yes | Yes for Fiscal quality | Convert returned value to string | Fiscal year | Income Statement | Must exist; used with `period` for exact prior-year lookup | `2026` |
| Income Statement, quarterly | `period` | `latestFiscalPeriod` / `latest_fiscal_period` | string | Yes | Yes for Fiscal quality | Direct mapping | Fiscal quarter | Income Statement | Must be a string; prior comparison must use the same period | `Q2` |
| Income Statement, quarterly | `epsDiluted` | `latestQuarterEps` / `latest_quarter_eps` | number | Yes | No | Latest valid fiscal quarter | USD/share | Income Statement | Must convert to a finite number | `0.41` |
| Income Statement, quarterly | `epsDiluted` | `priorYearQuarterEps` / `prior_year_quarter_eps` | number | Yes | No | Same `period`, fiscal year minus one | USD/share | Income Statement | Must convert to finite number and match exact prior fiscal period | `0.13` |
| Income Statement, quarterly | `epsDiluted` | `epsYoyPct` / `eps_yoy_pct` | number | Yes | No | `(current / previous - 1) × 100` only when sign rules permit | % | Income Statement | Prior value cannot be near zero; sign transitions use status instead | `215.3846%` |
| Income Statement, quarterly | `epsDiluted` | `epsYoyStatus` / `eps_yoy_status` | string | No | No | `growth`, `profit_turnaround`, `loss_turnaround`, `loss_improving`, `loss_widening`, or `unavailable` | Enum | Income Statement | Determined by current/prior signs and near-zero rule | `growth` |
| Income Statement, quarterly | `epsDiluted` | `epsChangeAmount` / `eps_change_amount` | number | Yes | No | Current diluted EPS minus prior-year diluted EPS | USD/share | Income Statement | Both values must be finite | `0.28` |
| Income Statement, quarterly | `revenue` | `latestQuarterRevenue` / `latest_quarter_revenue` | number | Yes | No | Latest valid fiscal quarter | USD | Income Statement | Must convert to a finite number | `1,935,464,000` |
| Income Statement, quarterly | `revenue` | `priorYearQuarterRevenue` / `prior_year_quarter_revenue` | number | Yes | Required for Revenue Growth | Same `period`, fiscal year minus one | USD | Income Statement | Exact fiscal-period match and finite number required | `1,003,697,000` |
| Income Statement, quarterly | `revenue` | `revenueYoyPct` / `revenue_yoy_pct` | number | Yes | Yes | `(latest / prior-year same-quarter - 1) × 100` | % | Income Statement | Prior revenue must be finite and non-zero | `92.8335%` |
| Income Statement, quarterly | `revenue` | `actualTrailingRevenue` / `actual_trailing_revenue` | number | Yes | Yes | Sum exactly four latest quarterly values | USD | Income Statement | Exactly four finite values required; no missing-quarter estimate | `6,155,941,000` |
| Income Statement, quarterly | `operatingIncome` | `operatingIncome` / `operating_income` | number | Yes | Indirectly | Sum exactly four latest quarterly values | USD | Income Statement | Exactly four finite values required | `2,634,652,000` |
| Income Statement, quarterly | `operatingIncome`, `revenue` | `operatingMargin` / `operating_margin` | number | Yes | Yes | TTM Operating Income / TTM Revenue | Decimal ratio | Income Statement | Revenue must be finite and non-zero; operating income must be finite | `0.4279852585` |
| Analyst Estimates, annual | `date` | `currentFyFiscalDate` / `current_fy_estimate_fiscal_date` | date | Yes | Supporting | Date year must equal latest Income Statement `fiscalYear` | ISO date | Analyst Estimate | No positional fallback; null when exact Current FY row is absent | `2026-12-31` |
| Analyst Estimates, annual | `epsAvg` | `currentFyEps` / `current_fy_eps` | number | Yes | Supporting | Direct value from exact Current FY row | USD/share | Analyst Estimate | Must be finite; no fallback field | `1.59974` |
| Analyst Estimates, annual | `date` | `nextFyFiscalDate` / `next_fy_estimate_fiscal_date` | date | Yes | Yes | Date year must equal latest Income Statement `fiscalYear + 1` | ISO date | Analyst Estimate | No positional fallback; null when exact Next FY row is absent | `2027-12-31` |
| Analyst Estimates, annual | `epsAvg` | `nextFyEps` / `next_fy_eps` | number | Yes | Yes | Direct value from exact Next FY row | USD/share | Analyst Estimate | Must be finite; no fallback field | `2.28177` |
| Analyst Estimates, annual | `date`, `epsAvg` | Legacy mirrors `estimate_fiscal_date`, `annual_fwd_eps_estimate` | date / number | Yes | No | New snapshots mirror the authoritative Next FY fields for compatibility | ISO date / USD/share | Analyst Estimate | Never used to compare with historical pre-v1.1 rows | `2027-12-31`, `2.28177` |
| Cash Flow, quarterly | `date` | Cash-flow row ordering | date | Yes | No separate stored field | Descending sort; latest four rows used | ISO date | Cash Flow | Must be a string or the row is excluded from sorted inputs | `2026-06-30` |
| Cash Flow, quarterly | `operatingCashFlow` | `operatingCashFlow` / `operating_cash_flow` | number | Yes | Yes | Sum exactly four latest quarterly values | USD | Cash Flow | Exactly four finite values required | `3,401,291,000` |
| Cash Flow, quarterly | `capitalExpenditure` | `capitalExpenditure` / `capital_expenditure` | number | Yes | Yes | Absolute value of four-quarter sum | USD, positive investment | Cash Flow | Exactly four finite values required | `42,019,000` |
| Cash Flow, quarterly | `freeCashFlow` | Source FCF / transient normalized `freeCashFlow` | number | Yes | No | Sum exactly four latest quarterly values; comparison only | USD | Cash Flow | Exactly four finite values required for source comparison | `3,359,272,000` |

### Internally Calculated and Control Fields

| API Endpoint | Raw Field | Internal Field | Data Type | Nullable | Required | Formula / Transformation | Unit | Snapshot Source | Validation Rule | PLTR Example |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Internal Calculation | `nextFyEps`, prior stored snapshot | `nextFyRevision1m` / `next_fy_revision_1m` | number | Yes | No | `(Current Next FY EPS / prior-month same-date Next FY EPS - 1) × 100` | % | Monthly Snapshot | `next_fy_estimate_fiscal_date` must match; exact prior calendar month required | `null` on first comparable month |
| Internal Calculation | `nextFyEps`, prior stored snapshot | `nextFyRevision3m` / `next_fy_revision_3m` | number | Yes | No | `(Current Next FY EPS / three-month-prior same-date Next FY EPS - 1) × 100` | % | Monthly Snapshot | `next_fy_estimate_fiscal_date` must match; exact comparison month required | `null` on first comparable month |
| Internal Calculation | CFO, CAPEX | `freeCashFlow` / `free_cash_flow` | number | Yes | Calculation output | CFO minus CAPEX | USD | Calculation Engine | All six required raw metrics must be finite | `3,359,272,000` |
| Internal Calculation | FCF, Revenue | `freeCashFlowMargin` / `fcf_margin` | number | Yes | Calculation output | FCF / Revenue | Decimal ratio in DB | Calculation Engine | Revenue must be finite and non-zero | `0.546` after one-decimal-percent rounding |
| Internal Calculation | CFO, Revenue | `cfoMargin` / `cfo_margin` | number | Yes | Calculation output | CFO / Revenue | Decimal ratio in DB | Calculation Engine | Revenue must be finite and non-zero | `0.553` after one-decimal-percent rounding |
| Internal Calculation | CAPEX, Revenue | `capexIntensity` / `capex_intensity` | number | Yes | Calculation output | CAPEX / Revenue × 100 | % | Calculation Engine | Revenue must be finite and non-zero | `0.7%` |
| Internal Calculation | Revenue Growth, FCF Margin | `classicRule40` / `classic_rule_40` | number | Yes | Calculation output | Revenue Growth % + FCF Margin % | Percentage points | Calculation Engine | Required raw fields and derived FCF Margin must be valid | `147.4` |
| Internal Calculation | Revenue Growth, Operating Margin | `operatingRule40` / `operating_rule_40` | number | Yes | Calculation output | Revenue Growth % + Operating Margin % | Percentage points | Calculation Engine | Required raw fields must be valid | `135.6` |
| Internal Calculation | Revenue Growth, CFO Margin | `cashRule40` / `cash_rule_40` | number | Yes | Calculation output | Revenue Growth % + CFO Margin % | Percentage points | Calculation Engine | Required raw fields and derived CFO Margin must be valid | `148.1` |
| Internal Constant | Selected annual estimate | `forwardEpsBasis` / `forward_eps_basis` | string | No | Yes | Constant `next_fiscal_year_annual_consensus` | Identifier | Analyst Estimate | Must equal approved Mapping 1.1 basis | `next_fiscal_year_annual_consensus` |
| Internal Constant | Three FMP requests | `dataSource` / `data_source` | string | No | Yes | Fixed endpoint description | Text | All three sources | Must name annual estimates and quarterly income/cash flow | `FMP stable: analyst-estimates (annual), ...` |
| Internal Constant | EPS mappings | `epsDefinition` / `eps_definition` | string | No | Yes | Fixed description of actual and forward EPS bases | Text | Income Statement / Analyst Estimate | Must distinguish GAAP diluted actual EPS from Next FY consensus | `Actual: FMP standardized GAAP diluted EPS ...` |
| Internal Validation | Six required raw metrics | `missingFields` / `missing_fields` | string array | No | Yes | Names required metrics whose normalized values are null | JSON | Monthly Snapshot | Must contain only required-field identifiers | `[]` |
| Internal Validation | FMP request results, six fields | `collectionStatus` / `collection_status` | string | No | Yes | All calls fail → `failed`; all six present → `complete`; otherwise `partial` | Enum | Monthly Snapshot | Allowed values only | `complete` |
| Internal Validation | Six required raw metrics | `calculationSuccess` / `calculation_success` | boolean | Yes | Yes | True only when all six values are finite | Boolean | Calculation Engine | Must not be true when `collectionStatus` is partial/failed | `true` |
| Internal Quality | Seven quality checks | `snapshotQualityScore` / `snapshot_quality_score` | number | Yes | Yes for new snapshots | Sum weights of passed checks | 0–100 points | Monthly Snapshot | Integer between 0 and 100 | `100` |
| Internal Quality | Seven quality checks | `snapshotQualityChecks` / `snapshot_quality_checks` | boolean map | Yes | Yes for new snapshots | Per-check finite/presence result | JSON | Monthly Snapshot | Keys: revenue, revenueGrowth, forwardEps, operatingMargin, operatingCashFlow, capitalExpenditure, fiscal | All `true` |
| Internal Quality | Quality score | `snapshotQualityCaution` / `snapshot_quality_caution` | boolean | Yes | Yes for new snapshots | Score below 80 | Boolean | Monthly Snapshot | Must equal `snapshotQualityScore < 80` | `false` |
| Internal Quality | Failed quality checks | `snapshotQuality.missingChecks` | string array | No | No | Quality keys whose checks are false | JSON | Monthly Snapshot | Must be the exact complement of passed checks | `[]` |
| Internal Quality | Quality score and caution | `snapshotQuality.aiGuidance` | string | No | No | Rule-based message selected by score below 80 | Text | Monthly Snapshot | Must not present itself as investment advice | `Snapshot Quality 100: ...` |
| Internal Metadata | Request parameter | `ticker` / `ticker` | string | No | Yes | Normalized requested ticker | Ticker | Request | Must be one of PLTR, NVDA, MU in Phase 1 | `PLTR` |
| Internal Metadata | Collection clock | `snapshotDate` / `snapshot_date` | date | No | Yes | UTC collection date | ISO date | Monthly Snapshot | Non-empty `YYYY-MM-DD` | `2026-08-17` |
| Internal Metadata | Collection clock | `collectedAt` / `collected_at` | date | No | Yes | UTC collection timestamp | ISO timestamp | Monthly Snapshot | Must parse as a timestamp | `2026-08-17T08:33:15.160Z` |

### Immutable API Payload Metadata

These fields preserve source provenance and failure details. They do not represent financial metrics.

| API Endpoint | Raw Field | Internal Field | Data Type | Nullable | Required | Formula / Transformation | Unit | Snapshot Source | Validation Rule | PLTR Example |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| All three requests | Request path | `endpoint` / `endpoint` | string | No | Yes | Exact relative FMP request path | URL path | API transport | Must identify one approved Mapping 1.0 endpoint | `income-statement?symbol=PLTR&period=quarter&limit=8` |
| HTTP response | HTTP status | `status` / `http_status` | number | Yes | No | Direct response status; null on network failure | HTTP code | API transport | Integer HTTP status when a response exists | `200` |
| HTTP response | Response body | `data` / `response_json` | string | Yes | No | JSON serialization of the unmodified parsed response | JSON | API transport | Must not contain the API key | Array of PLTR statement rows |
| HTTP/network response | Error | `error` / `error_message` | string | Yes | No | HTTP or network error description | Text | API transport | Null for successful response | `null` |
| Collection clock | Fetch time | `fetchedAt` / `fetched_at` | date | No | Yes | UTC collection timestamp | ISO timestamp | API transport | Must parse as a timestamp | `2026-08-17T08:33:15.160Z` |

## Complete Mapping Table

This compact table contains every FMP raw field consumed by production mapping. Fields merely present in a response but not consumed are excluded.

| Endpoint | Raw Field | Internal Field | Formula | Required |
| --- | --- | --- | --- | --- |
| Income Statement | `date` | `latestPeriodEnd` | Latest valid quarter | Fiscal quality |
| Income Statement | `fiscalYear` | `latestFiscalYear` | String normalization | Fiscal quality |
| Income Statement | `period` | `latestFiscalPeriod` | Direct mapping | Fiscal quality |
| Income Statement | `epsDiluted` | `latestQuarterEps` | Latest valid quarter | No |
| Income Statement | `epsDiluted` | `priorYearQuarterEps` | Exact prior fiscal year and same period | No |
| Income Statement | `epsDiluted` | `epsYoyPct` | `(current / prior - 1) × 100`, subject to sign rules | No |
| Income Statement | `epsDiluted` | `epsYoyStatus` | Sign-transition classification | No |
| Income Statement | `epsDiluted` | `epsChangeAmount` | `current - prior` | No |
| Income Statement | `revenue` | `latestQuarterRevenue` | Latest valid quarter | No |
| Income Statement | `revenue` | `priorYearQuarterRevenue` | Exact prior fiscal year and same period | Yes for growth |
| Income Statement | `revenue` | `revenueYoyPct` | `(latest / prior - 1) × 100` | Yes |
| Income Statement | `revenue` | `actualTrailingRevenue` | Sum latest four quarters | Yes |
| Income Statement | `operatingIncome` | `operatingIncome` | Sum latest four quarters | Yes for margin |
| Income Statement | `operatingIncome`, `revenue` | `operatingMargin` | `TTM operatingIncome / TTM revenue` | Yes |
| Analyst Estimates | `date` | `currentFyFiscalDate` | Date year equals latest reported `fiscalYear` | Supporting |
| Analyst Estimates | `epsAvg` | `currentFyEps` | Exact Current FY annual consensus | Supporting |
| Analyst Estimates | `date` | `nextFyFiscalDate` | Date year equals latest reported `fiscalYear + 1` | Yes |
| Analyst Estimates | `epsAvg` | `nextFyEps` | Exact Next FY annual consensus | Yes |
| Cash Flow | `date` | Cash-flow ordering | Latest four dated rows | Yes for TTM cash fields |
| Cash Flow | `operatingCashFlow` | `operatingCashFlow` | Sum latest four quarters | Yes |
| Cash Flow | `capitalExpenditure` | `capitalExpenditure` | Absolute value of four-quarter sum | Yes |
| Cash Flow | `freeCashFlow` | Source FCF comparison | Sum latest four quarters | No |
| Earnings Report | `symbol` | `ticker` | Requested ticker match | Yes |
| Earnings Report | `date` | `earnings_date` | Direct mapping | Yes |
| Earnings Report | `revenueActual` | `actual_revenue` | Safe numeric mapping | No |
| Earnings Report | `revenueEstimated` | `revenue_consensus` | Safe numeric mapping | No |
| Earnings Report | `epsActual` | `actual_eps` | Safe numeric mapping | No |
| Earnings Report | `epsEstimated` | `eps_consensus` | Safe numeric mapping | No |
| Earnings Report | `lastUpdated` | `source_last_updated` | Direct mapping | No |

## Validation Rules

### Sprint 2 Snapshot Traceability Fields

| Endpoint | Raw Field | Internal Field | Formula | Required |
| --- | --- | --- | --- | --- |
| Internal Mapping | n/a | `mapping_version` | Constant `FMP Mapping v1.1` | Yes |
| Income + Cash Flow | `reportedCurrency` | `reported_currency` | Store only one matching currency across both statements | Yes |
| Internal Validation | source checks | `validation_status` | `warning` when any validation warning exists; otherwise `valid` | Yes |
| Internal Validation | source checks | `validation_warnings` | JSON list of warning codes | Yes |
| Cash Flow | `freeCashFlow` | `fmp_reported_free_cash_flow` | Sum latest four fiscal quarters | No |
| Internal Validation | calculated and reported FCF | `fcf_variance` | Internal FCF − FMP reported FCF | No |

### Missing and Null Values

- A source value that is absent, null, non-numeric, `NaN`, or infinite normalizes to null for numeric mapping.
- TTM fields require exactly four finite quarterly values. The project does not interpolate or estimate a missing quarter.
- Any missing required metric is listed in `missing_fields`.
- All six required metrics must be present for `collection_status = complete` and `calculation_success = true`.
- Optional actual-EPS comparison fields may be null without making the six-field snapshot partial.

### Fiscal Period Mismatch

- Revenue and diluted-EPS YoY comparisons require identical `period` values and a fiscal year exactly one less than the latest fiscal year.
- If no exact match exists, the prior value and YoY result are null. Revenue Growth then fails the required-field check.
- Current FY is the latest quarterly Income Statement `fiscalYear`. Next FY is that fiscal year plus one; this handles companies such as NVDA whose fiscal-year label differs from the calendar year of most operating months.
- Next FY revision comparisons require an identical `next_fy_estimate_fiscal_date`. A fiscal-year rollover starts a new comparison series; prior Current/Next FY series are never joined.
- At rollover, 1M and 3M remain null until exact-month snapshots for the new Next FY date exist.
- The four Income Statement and Cash Flow rows must match by `fiscalYear`, `period`, and `date`; otherwise `validation_status = warning` with `fiscal_period_mismatch`.
- Analyst Estimate is an annual series. The selected Primary row must be the exact Next FY identified from the latest reported fiscal year; an absent row makes Forward EPS null.

### Currency Mismatch

- `reportedCurrency` is read from the four Income Statement and four Cash Flow rows.
- A single matching currency is stored as `reported_currency`.
- Missing, internally inconsistent, or mismatched statement currencies set `validation_status = warning` and add a specific validation warning.

### API Failure

- Each request has a 12-second timeout.
- HTTP 429 and 5xx responses are retried up to three total attempts with bounded exponential backoff. A valid `Retry-After` response header takes precedence.
- HTTP non-success responses store the HTTP status, raw body when available, and an error message in the immutable API payload table.
- Network and timeout failures store a null HTTP status and an error message.
- If all three endpoint requests fail, `collection_status = failed`.
- If at least one endpoint responds but one or more required fields cannot be produced, `collection_status = partial`.
- The previous successful Monthly Snapshot is not overwritten by invented values.

### Invalid Numeric Values

- Values pass through finite-number normalization.
- Revenue Growth requires a non-zero prior-year revenue.
- Ratio calculations require non-zero Revenue.
- EPS near-zero and sign-transition cases do not produce misleading percentage growth; they produce a categorical `eps_yoy_status`.
- CAPEX is normalized to an absolute positive amount only after four finite quarterly values are summed.

### FCF Cross-Check

- FMP-reported `freeCashFlow` is not the production authority.
- Production FCF is always `CFO - CAPEX` when calculation succeeds.
- FMP TTM `freeCashFlow` is stored separately as `fmp_reported_free_cash_flow`.
- `fcf_variance = Internal FCF - FMP FCF`.
- A difference greater than `max(USD 1, |FMP FCF| × 0.000001)` records `free_cash_flow_mismatch` and marks the snapshot as a warning.

## Snapshot Quality Reference

| Check | Weight | Pass rule |
| --- | ---: | --- |
| Revenue | 15 | Finite TTM Revenue |
| Revenue Growth | 15 | Finite exact-quarter YoY growth |
| Forward EPS | 14 | Finite exact Next Fiscal Year annual `epsAvg` |
| Operating Margin | 14 | Finite TTM margin |
| CFO | 28 | Finite TTM CFO |
| CAPEX | 10 | Finite normalized TTM CAPEX |
| Fiscal | 4 | Fiscal year, period, and period-end date present |

Quality below 80 triggers the AI caution flag. Quality is data completeness, not investment attractiveness.

## Fields Explicitly Outside Mapping 1.0

- `estimatedEpsAvg`: not present in verified responses and not permitted as a fallback.
- `epsdiluted`: not observed in verified responses and not accepted as a fallback. The approved source field is only `epsDiluted`.
- NTM EPS and quarterly EPS estimates: not used for Forward EPS.
- `reportedCurrency`: consumed for cross-statement currency validation and stored as `reported_currency` only when consistent.
- `numAnalystsEps`: observed in the Analyst Estimates response but not consumed or stored.
- Legacy pre-v1.1 Forward EPS columns are retained to preserve existing snapshots. New revision calculations use only `next_fy_*` fields and never mix old Current FY values into the Next FY series.

## Maintenance Procedure

1. Inspect actual responses for PLTR, NVDA, and MU, including the Earnings endpoint before adding any Earnings or Guidance mapping.
2. Compare raw keys, types, nullability, fiscal dates, periods, and currency with this dictionary.
3. Update this document before changing production mapping.
4. Add or update mapping and validation tests.
5. Increment the dictionary or mapping version according to compatibility impact.
6. Update Verified Date only after all three Phase 1 companies pass inspection.
