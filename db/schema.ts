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
