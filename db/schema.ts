import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull().unique(),
  companyName: text("company_name").notNull(),
  sector: text("sector").notNull(),
  industry: text("industry").notNull(),
  themes: text("themes", { mode: "json" }).$type<string[]>().notNull(),
  lastUpdated: text("last_updated").notNull(),
});

/** Provider-agnostic raw monthly observations. A future API adapter writes here. */
export const rawMetrics = sqliteTable("raw_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  snapshotDate: text("snapshot_date").notNull(),
  fiscalPeriod: text("fiscal_period").notNull(),
  metric: text("metric").notNull(),
  value: real("value"),
  unit: text("unit").notNull(),
  sourceStatus: text("source_status").notNull(),
  isMissing: integer("is_missing", { mode: "boolean" }).notNull(),
}, (table) => [
  uniqueIndex("idx_raw_metrics_ticker_date_metric").on(table.ticker, table.snapshotDate, table.metric),
  index("idx_raw_metrics_date").on(table.snapshotDate),
]);

/** Calculated values remain separate from provider observations. */
export const derivedSnapshots = sqliteTable("derived_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  snapshotDate: text("snapshot_date").notNull(),
  cfoMargin: real("cfo_margin"),
  freeCashFlow: real("free_cash_flow"),
  fcfMargin: real("fcf_margin"),
  capexIntensity: real("capex_intensity"),
  classicRuleOf40: real("classic_rule_of_40"),
  operatingRuleOf40: real("operating_rule_of_40"),
  cashRuleOf40: real("cash_rule_of_40"),
  trendDirection: text("trend_direction").notNull(),
  screeningStatus: text("screening_status").notNull(),
  screeningScore: real("screening_score").notNull(),
  reasons: text("reasons", { mode: "json" }).$type<string[]>().notNull(),
  flags: text("flags", { mode: "json" }).$type<string[]>().notNull(),
}, (table) => [
  uniqueIndex("idx_derived_snapshots_ticker_date").on(table.ticker, table.snapshotDate),
  index("idx_derived_snapshots_status_date").on(table.screeningStatus, table.snapshotDate),
]);
