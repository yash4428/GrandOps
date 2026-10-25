import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { matches } from "./glob";

export type Tier = 0 | 1 | 2;

export interface Policy {
  version: number;
  tiers: Record<"0" | "1" | "2", string[]>;
  default_tier: Tier;
  forbidden_paths: string[];
  agent_prefix: string;
  required_jobs: Record<"0" | "1" | "2", string[]>;
  required_reviewers: Record<"0" | "1" | "2", string[]>;
  security: { block_severities: string[] };
  canary: Record<"0" | "1" | "2", { minutes: number; percent: number }> & {
    slo: { max_error_rate: number; max_p95_ms: number };
    high_trust: { score: number; minutes_delta: number };
    low_trust: { score: number; minutes_delta: number; extra_reviewer: string };
  };
  trust: { start: number; merge_survived_24h: number; rollback: number; floor: number; cap: number };
  carbon: { monthly_budget_g: number; lite_at: number; defer_at: number; never_skip_labels: string[]; never_skip_tiers: string[] };
  chaos: { allowed_environments: string[] };
}

export function loadPolicy(path = ".autopilot/policy.yml"): Policy {
  return parse(readFileSync(path, "utf8")) as Policy;
}

/** Tier of one file: tier 2 lists are checked first, then 0, then 1. */
export function tierOfFile(policy: Policy, file: string): Tier {
  for (const t of ["2", "0", "1"] as const) if (matches(file, policy.tiers[t])) return Number(t) as Tier;
  return policy.default_tier;
}

/** Risk tier of a change: the highest tier of any file. Empty change = tier 0. */
export function tierOfChange(policy: Policy, files: string[]): Tier {
  return files.reduce<Tier>((max, f) => Math.max(max, tierOfFile(policy, f)) as Tier, 0);
}

export function forbiddenTouched(policy: Policy, files: string[]): string[] {
  return files.filter((f) => matches(f, policy.forbidden_paths));
}

export function isAgent(policy: Policy, username: string): boolean {
  return username.startsWith(policy.agent_prefix);
}

export interface CanaryPlan {
  minutes: number;
  percent: number;
  extraReviewer: string | null;
  reason: string;
}

/** Trust changes how much verification runs. Tier 2 minimums are a floor that never drops. */
export function canaryPlan(policy: Policy, tier: Tier, trust: number | null): CanaryPlan {
  const base = policy.canary[String(tier) as "0" | "1" | "2"];
  let minutes = base.minutes;
  let extraReviewer: string | null = null;
  let reason = `tier ${tier} base`;
  if (trust !== null && trust >= policy.canary.high_trust.score) {
    minutes += policy.canary.high_trust.minutes_delta;
    reason = `high trust (${trust})`;
  } else if (trust !== null && trust <= policy.canary.low_trust.score) {
    minutes += policy.canary.low_trust.minutes_delta;
    extraReviewer = policy.canary.low_trust.extra_reviewer;
    reason = `low trust (${trust})`;
  }
  const floor = tier === 2 ? base.minutes : 1;
  return { minutes: Math.max(minutes, floor), percent: base.percent, extraReviewer, reason };
}
