# FMP Phase 1 Data Mapping

| Mapping | Version | Verified |
| --- | --- | --- |
| FMP Mapping | 1.0 | 2026-08-17 |

Verification scope: actual responses for `PLTR`, `NVDA`, and `MU` from the Income Statement, Cash Flow, and annual Analyst Estimates endpoints.

Version policy:

- Increment the major version when an FMP source field, endpoint, period basis, or production formula changes incompatibly.
- Increment the minor version when a backward-compatible field or validation rule is added.
- Update `Verified` only after inspecting actual FMP responses for all Phase 1 companies.
- Do not change production mapping from documentation assumptions alone.

## Scope

Phase 1 collects only `PLTR`, `NVDA`, and `MU`, in that order. The application reads `FMP_API_KEY` from the runtime environment. The key is never stored in source code, snapshots, or raw-response records.

This document describes the FMP fields observed in the actual responses for all three Phase 1 companies on 2026-08-17. `Nullable` describes whether the normalization layer accepts a missing value. A field marked `No` is required for the corresponding production calculation or validation check.

## Endpoints

| Source | Request |
| --- | --- |
| Income Statement | `GET /stable/income-statement?symbol={ticker}&period=quarter&limit=8` |
| Cash Flow | `GET /stable/cash-flow-statement?symbol={ticker}&period=quarter&limit=4` |
| Analyst Estimates | `GET /stable/analyst-estimates?symbol={ticker}&period=annual&page=0&limit=10` |

Base URL: `https://financialmodelingprep.com`

## Source Field Dictionary

| Field | Endpoint | Type | Nullable | Description |
| --- | --- | --- | --- | --- |
| `symbol` | All endpoints | string | No | Company ticker. Associates the response with its requested company. |
| `date` | Income Statement | date string | No | Fiscal quarter end date. Used to sort statements and populate `latestPeriodEnd`. |
| `fiscalYear` | Income Statement | string or number | No | Company fiscal year. Normalized to a string for exact prior-year comparison. |
| `period` | Income Statement | string | No | Fiscal quarter label such as `Q1`, `Q2`, `Q3`, or `Q4`. |
| `revenue` | Income Statement | number | No | Quarterly revenue. The latest four quarters produce TTM Revenue. |
| `operatingIncome` | Income Statement | number | Yes | Quarterly operating income. Used to calculate Operating Margin. |
| `epsDiluted` | Income Statement | number | Yes | GAAP diluted quarterly EPS. Used for exact same-quarter YoY EPS comparison; it is not Forward EPS. |
| `date` | Cash Flow | date string | No | Cash-flow fiscal quarter end date. Used to sort the latest four quarters. |
| `operatingCashFlow` | Cash Flow | number | No | Quarterly operating cash flow. The latest four quarters produce TTM CFO. |
| `capitalExpenditure` | Cash Flow | number | No | Quarterly CAPEX. FMP reports cash outflow as negative; the TTM sum is converted to a positive investment amount. |
| `freeCashFlow` | Cash Flow | number | Yes | FMP-reported quarterly FCF. Retained for source comparison; production FCF is recalculated by the Calculation Engine. |
| `date` | Analyst Estimates | date string | No | Estimate fiscal-year end date. Selects the nearest future annual estimate and populates `estimateFiscalDate`. |
| `epsAvg` | Analyst Estimates | number | No | Annual consensus EPS. Current FY is supporting data; exact Next FY is the Primary Forward EPS. |
| `numAnalystsEps` | Analyst Estimates | number | Yes | Number of analysts contributing to EPS estimates. Present but not currently stored or calculated. |

## Production Raw Data Mapping

| Fundamental Flow field | Source field(s) | Period basis | Transformation | Stored field | Required |
| --- | --- | --- | --- | --- | --- |
| Revenue | Income Statement `revenue` | Latest four fiscal quarters | `Q0 + Q-1 + Q-2 + Q-3` | `actual_trailing_revenue` | Yes |
| Revenue Growth | Income Statement `revenue`, `fiscalYear`, `period` | Latest quarter versus exact prior-year fiscal quarter | `(current / priorYear - 1) × 100` | `revenue_yoy_pct` | Yes |
| Forward EPS | Analyst Estimates `epsAvg`, `date` plus Income Statement `fiscalYear` | Exact annual row whose date year equals current fiscal year + 1 | Select exact Next Fiscal Year annual `epsAvg`; no positional fallback | `next_fy_eps` | Yes |
| Operating Margin | Income Statement `operatingIncome`, `revenue` | Latest four fiscal quarters | `TTM operatingIncome / TTM revenue` | `operating_margin` | Yes |
| Operating Cash Flow | Cash Flow `operatingCashFlow` | Latest four fiscal quarters | `Q0 + Q-1 + Q-2 + Q-3` | `operating_cash_flow` | Yes |
| CAPEX | Cash Flow `capitalExpenditure` | Latest four fiscal quarters | `abs(Q0 + Q-1 + Q-2 + Q-3)` | `capital_expenditure` | Yes |

## Forward EPS Definition

`Forward EPS` means the nearest future fiscal-year annual analyst consensus `epsAvg`.

- Basis: exact Next Fiscal Year annual consensus; Current FY is stored separately
- Not NTM EPS
- Not a quarterly estimate
- Estimate date: stored in `estimate_fiscal_date`
- Revision comparison: allowed only when `estimate_fiscal_date` is identical
- Source endpoint: annual Analyst Estimates

## Derived Calculation Mapping

The existing Calculation Engine in `lib/fundamental-math.ts` is the calculation authority. FMP-derived values do not replace its formulas.

| Derived field | Formula | Stored field |
| --- | --- | --- |
| Free Cash Flow | `TTM CFO - TTM CAPEX` | `free_cash_flow` |
| FCF Margin | `FCF / TTM Revenue × 100` | `fcf_margin` |
| CFO Margin | `TTM CFO / TTM Revenue × 100` | `cfo_margin` |
| CapEx Intensity | `TTM CAPEX / TTM Revenue × 100` | `capex_intensity` |
| Classic Rule of 40 | `Revenue Growth + FCF Margin` | `classic_rule_40` |
| Operating Rule of 40 | `Revenue Growth + Operating Margin` | `operating_rule_40` |
| Cash Rule of 40 | `Revenue Growth + CFO Margin` | `cash_rule_40` |

## Missing-Value Rules

- Numeric values are accepted only when they can be converted to a finite number.
- TTM values require four valid quarterly values. A missing quarter is not estimated.
- Revenue Growth requires the exact same fiscal quarter from the prior fiscal year.
- Missing any of the six production raw fields makes `calculationSuccess` false.
- `collectionStatus` is `complete` only when all six production raw fields are present; otherwise it is `partial` unless every FMP request failed.
- Missing monthly comparison data does not fail the raw snapshot. It leaves that monthly-change metric unavailable.

## Data Lineage

```text
FMP response
  → immutable raw payload record
  → normalized Monthly Snapshot raw fields
  → existing Calculation Engine
  → derived fields and validation report
```

## Snapshot Quality

Snapshot Quality is a 0–100 data-completeness score. It does not evaluate whether a company is attractive; it evaluates whether the snapshot is reliable enough to interpret.

| Check | Weight | Pass condition |
| --- | ---: | --- |
| Revenue | 15 | Finite TTM Revenue |
| Revenue Growth | 15 | Finite exact-quarter YoY growth |
| Forward EPS | 14 | Finite exact Next Fiscal Year annual `epsAvg` |
| Operating Margin | 14 | Finite TTM Operating Margin |
| CFO | 28 | Finite TTM Operating Cash Flow |
| CAPEX | 10 | Finite normalized TTM CAPEX |
| Fiscal | 4 | Fiscal year, fiscal period, and period-end date all present |
| Total | 100 | All checks pass |

CFO receives 28 points because the requested quality example requires a CFO-only omission to produce Quality 72. The weighting is a product policy, not an FMP field property.

- Quality 80–100: rule-based AI analysis may proceed normally.
- Quality below 80: AI output must display a caution and lower its confidence.
- Quality 100: all six raw fields and fiscal metadata are present.
