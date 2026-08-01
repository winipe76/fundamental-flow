import { SCREENING_CONFIG } from "../config/screening.ts";
import type { DerivedSnapshot, MetricComparison, MonthlySnapshot, ScreeningResult, TrendDirection } from "../types/investment.ts";

const value = (snapshot: MonthlySnapshot | null, key: keyof MonthlySnapshot["raw"]): number | null => snapshot?.raw[key].value ?? null;
const safeDivide = (numerator: number | null, denominator: number | null): number | null =>
  numerator === null || denominator === null || denominator === 0 ? null : (numerator / denominator) * 100;
const delta = (current: number | null, previous: number | null): MetricComparison => ({
  current,
  previous,
  change: current === null || previous === null ? null : current - previous,
  changeRate: current === null || previous === null || previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100,
});

function derivedValues(snapshot: MonthlySnapshot) {
  const revenue = value(snapshot, "revenue");
  const cfo = value(snapshot, "operatingCashFlow");
  const capex = value(snapshot, "capitalExpenditure");
  const revenueGrowth = value(snapshot, "revenueGrowth");
  const operatingMargin = value(snapshot, "operatingMargin");
  const freeCashFlow = cfo === null || capex === null ? null : cfo - capex;
  const cfoMargin = safeDivide(cfo, revenue);
  const fcfMargin = safeDivide(freeCashFlow, revenue);
  const capexIntensity = safeDivide(capex, revenue);
  return {
    cfoMargin,
    freeCashFlow,
    fcfMargin,
    capexIntensity,
    classicRuleOf40: revenueGrowth === null || fcfMargin === null ? null : revenueGrowth + fcfMargin,
    operatingRuleOf40: revenueGrowth === null || operatingMargin === null ? null : revenueGrowth + operatingMargin,
    cashRuleOf40: revenueGrowth === null || cfoMargin === null ? null : revenueGrowth + cfoMargin,
  };
}

export function calculateDerived(current: MonthlySnapshot, previous: MonthlySnapshot | null): DerivedSnapshot {
  const now = derivedValues(current);
  const before = previous ? derivedValues(previous) : null;
  const dataIssues: string[] = [];
  if (previous && previous.fiscalPeriod !== current.fiscalPeriod) dataIssues.push("회계기간 불일치");
  Object.values(current.raw).filter((metric) => metric.isMissing).forEach((metric) => dataIssues.push(`${metric.metric} 누락`));
  if (value(current, "revenue") === 0) dataIssues.push("매출 0 — 마진 계산 제외");

  const comparisons = {
    forwardEps: delta(value(current, "forwardEps"), value(previous, "forwardEps")),
    revenueGrowth: delta(value(current, "revenueGrowth"), value(previous, "revenueGrowth")),
    operatingMargin: delta(value(current, "operatingMargin"), value(previous, "operatingMargin")),
    cfoMargin: delta(now.cfoMargin, before?.cfoMargin ?? null),
    fcfMargin: delta(now.fcfMargin, before?.fcfMargin ?? null),
    capexIntensity: delta(now.capexIntensity, before?.capexIntensity ?? null),
  };

  const signals = Object.entries(comparisons).filter(([key, item]) => key !== "capexIntensity" && item.change !== null).map(([, item]) => item.change as number);
  const positive = signals.filter((item) => item > SCREENING_CONFIG.stableTolerance).length;
  const negative = signals.filter((item) => item < -SCREENING_CONFIG.stableTolerance).length;
  let trend: TrendDirection = "Stable";
  if (positive >= 3 && negative <= 1) trend = "Improving";
  else if (negative >= 3 && positive <= 1) trend = "Deteriorating";
  else if (positive && negative) trend = "Mixed";

  const growthInvestmentSignal = (comparisons.cfoMargin.change ?? 0) >= -SCREENING_CONFIG.stableTolerance
    && (comparisons.capexIntensity.change ?? 0) > SCREENING_CONFIG.improvingChange
    && (comparisons.fcfMargin.change ?? 0) < -SCREENING_CONFIG.stableTolerance;

  return { ticker: current.ticker, snapshotDate: current.snapshotDate, fiscalPeriod: current.fiscalPeriod, ...now, comparisons, trend, dataIssues, growthInvestmentSignal };
}

const signScore = (change: number | null, weight: number) => change === null ? 0 : change > SCREENING_CONFIG.improvingChange ? weight : change < SCREENING_CONFIG.cautionChange ? -weight : 0;

export function screenCompany(derived: DerivedSnapshot, priorDerived: DerivedSnapshot | null): ScreeningResult {
  const c = derived.comparisons;
  let score = signScore(c.forwardEps.changeRate, SCREENING_CONFIG.weights.forwardEps)
    + signScore(c.revenueGrowth.change, SCREENING_CONFIG.weights.revenueGrowth)
    + signScore(c.operatingMargin.change, SCREENING_CONFIG.weights.operatingMargin)
    + signScore(c.cfoMargin.change, SCREENING_CONFIG.weights.cfoMargin)
    + signScore(c.fcfMargin.change, SCREENING_CONFIG.weights.fcfMargin);
  if ((derived.classicRuleOf40 ?? -Infinity) >= SCREENING_CONFIG.ruleOf40Strong) score += SCREENING_CONFIG.weights.ruleOf40;
  if (derived.growthInvestmentSignal) score += SCREENING_CONFIG.weights.capexIntensity;

  const qualifies = score >= SCREENING_CONFIG.selectedScore;
  const priorQualifies = priorDerived ? priorDerived.trend === "Improving" && (priorDerived.classicRuleOf40 ?? 0) >= SCREENING_CONFIG.ruleOf40Healthy : false;
  let status: ScreeningResult["status"] = "Excluded";
  if (qualifies) status = priorQualifies ? "Continuing Improvement" : "Newly Selected";
  else if (score >= SCREENING_CONFIG.watchScore) status = "Watch";
  else if (score <= SCREENING_CONFIG.cautionScore) status = "Caution";

  const reasons: string[] = [];
  if ((c.forwardEps.changeRate ?? 0) > 0) reasons.push(`FWD EPS ${c.forwardEps.changeRate!.toFixed(1)}% 개선`);
  if ((c.revenueGrowth.change ?? 0) > 0) reasons.push(`Revenue Growth ${c.revenueGrowth.change!.toFixed(1)}%p 개선`);
  if ((c.cfoMargin.change ?? 0) > 0) reasons.push(`CFO Margin ${c.cfoMargin.change!.toFixed(1)}%p 개선`);
  if ((derived.classicRuleOf40 ?? 0) >= SCREENING_CONFIG.ruleOf40Strong) reasons.push("Classic Rule of 40 충족");
  if (!reasons.length) reasons.push("핵심 펀더멘털 개선 신호 부족");
  const flags = derived.dataIssues.slice();
  if (derived.growthInvestmentSignal) flags.push("FCF 감소는 CFO 약화보다 성장 CAPEX 확대 가능성");
  if ((c.forwardEps.changeRate ?? 0) < 0) flags.push("FWD EPS 하향");
  if ((c.revenueGrowth.change ?? 0) < 0) flags.push("Revenue Growth 둔화");
  return { ticker: derived.ticker, status, score: Number(score.toFixed(1)), reasons, flags };
}
