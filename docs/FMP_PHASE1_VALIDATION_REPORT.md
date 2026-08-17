# FMP Phase 1 Validation Report

The API returns a per-company validation object through `GET /api/fundamentals` and after `POST /api/fundamentals`.

Each PLTR, NVDA, and MU report contains:

- Revenue
- Revenue Growth
- Forward EPS
- Operating Margin
- Operating Cash Flow
- CAPEX
- Snapshot Date and Fiscal Period
- Data Source
- Calculation Success
- Missing Fields
- Snapshot Quality score, seven checks, and AI caution status

`Calculation Success = true` requires all six raw fields. The first FMP monthly snapshot has no comparable prior FMP month, so monthly change fields remain unavailable until the next monthly collection.

Known API considerations:

- FMP reports CAPEX as a negative cash outflow; the integration normalizes it to a positive investment amount.
- FY1 can roll to another fiscal year. Forward EPS revisions must be compared only when the estimate fiscal date matches.
- Endpoint availability, request usage, missing-field frequency, and fiscal-date rollover should be reviewed before expanding to the full Nasdaq 100.
