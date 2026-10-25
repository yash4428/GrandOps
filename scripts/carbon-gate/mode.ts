import type { Policy } from "../lib/policy";

export type CarbonMode = "full" | "lite" | "defer";

/** Pure. Medication-critical work and tier 2 always run in full. */
export function carbonMode(policy: Policy, usedG: number, labels: string[], tier: string | null): { mode: CarbonMode; reason: string } {
  if (labels.some((l) => policy.carbon.never_skip_labels.includes(l))) return { mode: "full", reason: "medication-critical" };
  if (tier !== null && policy.carbon.never_skip_tiers.includes(tier)) return { mode: "full", reason: `tier ${tier}` };
  const frac = usedG / policy.carbon.monthly_budget_g;
  if (frac >= policy.carbon.defer_at) return { mode: "defer", reason: `${Math.round(frac * 100)}% of budget` };
  if (frac >= policy.carbon.lite_at) return { mode: "lite", reason: `${Math.round(frac * 100)}% of budget` };
  return { mode: "full", reason: "within budget" };
}
