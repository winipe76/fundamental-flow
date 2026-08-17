# FMP Phase 1 Data Mapping

Phase 1 collects only `PLTR`, `NVDA`, and `MU`, in that order. `FMP_API_KEY` is read from the runtime environment and is never stored in source code.

| Fundamental Flow field | FMP source | Mapping |
| --- | --- | --- |
| Revenue | Quarterly income statement | Sum of the latest four `revenue` values (TTM) |
| Revenue Growth | Quarterly income statement | Latest fiscal quarter revenue versus the exact prior-year fiscal quarter |
| Forward EPS | Annual analyst estimates | Nearest future fiscal-year `epsAvg` (FY1 annual consensus) |
| Operating Margin | Quarterly income statement | Latest four quarters operating income / TTM revenue |
| Operating Cash Flow | Quarterly cash-flow statement | Sum of the latest four `operatingCashFlow` values |
| CAPEX | Quarterly cash-flow statement | Absolute value of the latest four `capitalExpenditure` values |

Forward EPS is not NTM and is not a quarterly estimate. Its estimate fiscal date is stored with every snapshot so revisions are compared only on the same basis.

Derived fields are calculated by `lib/fundamental-math.ts`: FCF, FCF Margin, CFO Margin, CapEx Intensity, and Classic/Operating/Cash Rule of 40.
