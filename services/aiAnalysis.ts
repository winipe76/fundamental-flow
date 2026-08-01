import type { AIAnalysis, DerivedSnapshot, ScreeningResult } from "../types/investment.ts";

const names: Record<string, string> = { forwardEps: "Forward EPS", revenueGrowth: "Revenue Growth", operatingMargin: "Operating Margin", cfoMargin: "CFO Margin", fcfMargin: "FCF Margin", capexIntensity: "CapEx Intensity" };

export function buildMockAIAnalysis(derived: DerivedSnapshot, screening: ScreeningResult): AIAnalysis {
  const improved: string[] = [];
  const deteriorated: string[] = [];
  Object.entries(derived.comparisons).forEach(([key, comparison]) => {
    if (comparison.change === null) return;
    if (comparison.change > 0.25) improved.push(names[key]);
    if (comparison.change < -0.25) deteriorated.push(names[key]);
  });
  const conflicts: string[] = [];
  if (derived.growthInvestmentSignal) conflicts.push("FCF Margin 하락과 CFO 유지·CapEx Intensity 상승이 동시에 나타남");
  if (improved.length && deteriorated.length) conflicts.push("개선 지표와 악화 지표가 혼재");
  const status: AIAnalysis["status"] = screening.status === "Caution" ? "Thesis Review"
    : derived.trend === "Improving" ? "Improving"
    : derived.trend === "Deteriorating" ? "Caution" : "Thesis Intact";
  const fcfSentence = derived.growthInvestmentSignal
    ? "FCF Margin은 하락했지만 CFO가 유지되고 CAPEX가 증가해 현금창출력 악화보다 성장투자 확대의 영향일 가능성이 높습니다."
    : (derived.comparisons.fcfMargin.change ?? 0) < 0
      ? "FCF Margin 하락과 함께 CFO 흐름도 약해져 현금창출력의 추가 확인이 필요합니다."
      : "FCF와 CFO의 방향은 현재 투자 논리와 충돌하지 않습니다.";
  const summary = `${improved.length ? improved.join(", ") + "는 전월 대비 개선되었습니다." : "뚜렷하게 개선된 핵심 지표는 없습니다."} ${deteriorated.length ? deteriorated.join(", ") + "는 악화되었습니다." : "중대한 악화 지표는 제한적입니다."} ${fcfSentence} ${screening.reasons[0]}을 근거로 현재 투자 논리는 ${status === "Improving" ? "강화" : status === "Thesis Intact" ? "유지" : status === "Caution" ? "주의" : "재검토"} 상태입니다.`;
  return { status, summary, improved, deteriorated, conflicts };
}
