import type { Policy } from "../lib/policy";

export interface TrustLedger {
  agents: Record<string, Record<string, number>>;
  pending: { mrIid: number; agent: string; tier: string; mergedAt: string }[];
  history: { at: string; agent: string; tier: string; delta: number; reason: string }[];
}

export const EMPTY: TrustLedger = { agents: {}, pending: [], history: [] };

function clamp(p: Policy, n: number) {
  return Math.min(p.trust.cap, Math.max(p.trust.floor, n));
}

function bump(p: Policy, l: TrustLedger, agent: string, tier: string, delta: number, reason: string, at: string): TrustLedger {
  const cur = l.agents[agent]?.[tier] ?? p.trust.start;
  return {
    ...l,
    agents: { ...l.agents, [agent]: { ...l.agents[agent], [tier]: clamp(p, cur + delta) } },
    history: [...l.history, { at, agent, tier, delta, reason }].slice(-200),
  };
}

/** A merge was deployed. Credit comes only after it survives 24h. Pure. */
export function recordMerge(l: TrustLedger, mrIid: number, agent: string, tier: string, at: string): TrustLedger {
  if (l.pending.some((x) => x.mrIid === mrIid)) return l;
  return { ...l, pending: [...l.pending, { mrIid, agent, tier, mergedAt: at }] };
}

/** Credits merges older than 24h. Pure. */
export function settle(p: Policy, l: TrustLedger, nowIso: string): TrustLedger {
  const now = Date.parse(nowIso);
  let out: TrustLedger = { ...l, pending: [] };
  for (const x of l.pending) {
    if (now - Date.parse(x.mergedAt) >= 24 * 3600_000) out = bump(p, out, x.agent, x.tier, p.trust.merge_survived_24h, `!${x.mrIid} survived 24h`, nowIso);
    else out.pending.push(x);
  }
  return out;
}

/** A rollback is attributed to the agent of the rolled-back MR. Pure. */
export function recordRollback(p: Policy, l: TrustLedger, mrIid: number, agent: string, tier: string, at: string): TrustLedger {
  const out = bump(p, l, agent, tier, p.trust.rollback, `!${mrIid} rolled back`, at);
  return { ...out, pending: out.pending.filter((x) => x.mrIid !== mrIid) };
}
