/** Pure SLO evaluation for canary probes. */
export interface Probe {
  ok: boolean;
  ms: number;
}

export function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)]!;
}

export function evaluate(probes: Probe[], maxErrorRate: number, maxP95Ms: number): { pass: boolean; errorRate: number; p95Ms: number; reason: string } {
  if (probes.length === 0) return { pass: false, errorRate: 1, p95Ms: 0, reason: "no probes" };
  const errorRate = probes.filter((p) => !p.ok).length / probes.length;
  const p95Ms = p95(probes.map((p) => p.ms));
  const reasons = [];
  if (errorRate > maxErrorRate) reasons.push(`error rate ${(errorRate * 100).toFixed(1)}% > ${maxErrorRate * 100}%`);
  if (p95Ms > maxP95Ms) reasons.push(`p95 ${p95Ms}ms > ${maxP95Ms}ms`);
  return { pass: reasons.length === 0, errorRate, p95Ms, reason: reasons.join("; ") || "within SLO" };
}
