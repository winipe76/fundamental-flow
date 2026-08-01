import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  companyName: text("company_name").notNull(),
  themeTags: text("theme_tags", { mode: "json" }).$type<string[]>().notNull(),
  currentFwdEps: real("current_fwd_eps").notNull(),
  previousFwdEps: real("previous_fwd_eps").notNull(),
  epsChangePct: real("eps_change_pct").notNull(),
  status: text("status", { enum: ["selected", "improving", "caution"] }).notNull(),
  snapshotMonth: text("snapshot_month").notNull(),
  revenueGrowth: real("revenue_growth"),
  ruleOf40: real("rule_of_40"),
  fcfMargin: real("fcf_margin"),
}, (table) => [
  uniqueIndex("idx_companies_ticker_month").on(table.ticker, table.snapshotMonth),
  index("idx_companies_status_change").on(table.status, table.epsChangePct),
]);

/** Immutable source responses. Normalized/calculated fields never overwrite these payloads. */
export const apiPayloads = sqliteTable("api_payloads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  snapshotDate: text("snapshot_date").notNull(),
  endpoint: text("endpoint").notNull(),
  httpStatus: integer("http_status"),
  responseJson: text("response_json"),
  errorMessage: text("error_message"),
  fetchedAt: text("fetched_at").notNull(),
}, (table) => [index("idx_api_payloads_ticker_date").on(table.ticker, table.snapshotDate)]);

/** Monthly, normalized snapshot. Percent changes are calculated against the prior stored snapshot. */
export const fundamentalSnapshots = sqliteTable("fundamental_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  snapshotDate: text("snapshot_date").notNull(),
  estimateFiscalDate: text("estimate_fiscal_date"),
  epsDefinition: text("eps_definition").notNull(),
  annualFwdEpsEstimate: real("annual_fwd_eps_estimate"),
  estimatedAnnualRevenue: real("estimated_annual_revenue"),
  actualTrailingRevenue: real("actual_trailing_revenue"),
  operatingIncome: real("operating_income"),
  operatingMargin: real("operating_margin"),
  freeCashFlow: real("free_cash_flow"),
  fcfMargin: real("fcf_margin"),
  fwdEpsChangePct: real("fwd_eps_change_pct"),
  estimatedRevenueChangePct: real("estimated_revenue_change_pct"),
  operatingMarginChangePp: real("operating_margin_change_pp"),
  fcfMarginChangePp: real("fcf_margin_change_pp"),
  missingFields: text("missing_fields", { mode: "json" }).$type<string[]>().notNull(),
  collectionStatus: text("collection_status", { enum: ["complete", "partial", "failed"] }).notNull(),
  collectedAt: text("collected_at").notNull(),
}, (table) => [
  uniqueIndex("idx_fundamental_snapshots_ticker_date").on(table.ticker, table.snapshotDate),
  index("idx_fundamental_snapshots_date_status").on(table.snapshotDate, table.collectionStatus),
]);
