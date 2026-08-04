export type EpsYoyStatus = "growth" | "profit_turnaround" | "loss_turnaround" | "loss_improving" | "loss_widening" | "unavailable";

export function percentChange(current: number | null, previous: number | null): number | null {
  return current !== null && previous !== null && previous !== 0
    ? ((current / previous) - 1) * 100
    : null;
}

export function compareQuarterEps(current: number | null, previous: number | null, nearZero = 0.01) {
  const changeAmount = current !== null && previous !== null ? current - previous : null;
  if (current === null || previous === null) return { status: "unavailable" as EpsYoyStatus, yoyPct: null, changeAmount };
  if (previous < 0 && current >= 0) return { status: "profit_turnaround" as EpsYoyStatus, yoyPct: null, changeAmount };
  if (previous > 0 && current < 0) return { status: "loss_turnaround" as EpsYoyStatus, yoyPct: null, changeAmount };
  if (previous < 0 && current < 0) return { status: (current > previous ? "loss_improving" : "loss_widening") as EpsYoyStatus, yoyPct: null, changeAmount };
  if (Math.abs(previous) < nearZero) return { status: "unavailable" as EpsYoyStatus, yoyPct: null, changeAmount };
  return { status: "growth" as EpsYoyStatus, yoyPct: percentChange(current, previous), changeAmount };
}

export function sumFour(values: Array<number | null>): number | null {
  return values.length === 4 && values.every((value): value is number => value !== null)
    ? values.reduce((sum, value) => sum + value, 0)
    : null;
}
