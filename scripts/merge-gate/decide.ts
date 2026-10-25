// Pure merge decision. No LLM, no network.
import { matches } from "../lib/glob";
import { forbiddenTouched, isAgent, tierOfChange, type Policy, type Tier } from "../lib/policy";

export interface GateInput {
  author: string;
  changedFiles: string[];
  labels: string[];
  jobs: { name: string; status: string }[];
  /** reviewer id -> verdict, from marker notes */
  verdicts: Record<string, "APPROVE" | "CHANGES">;
  /** unresolved findings by severity (lowercase) */
  findings: Record<string, number>;
  carbonMode: "full" | "lite" | "defer";
  trust: number | null;
  extraReviewer: string | null;
}

export interface GateRow {
  check: string;
  required: string;
  actual: string;
  ok: boolean;
}

export type Decision = "merge" | "blocked" | "needs-human";

export interface GateResult {
  decision: Decision;
  tier: Tier;
  rows: GateRow[];
}

export function decide(policy: Policy, input: GateInput): GateResult {
  const rows: GateRow[] = [];
  const declared = input.labels.find((l) => /^tier::[012]$/.test(l));
  const computed = tierOfChange(policy, input.changedFiles);
  // The label can raise the tier, never lower it below what the files say.
  const tier = Math.max(computed, declared ? Number(declared.slice(-1)) : 0) as Tier;
  const t = String(tier) as "0" | "1" | "2";
  rows.push({ check: "Risk tier", required: "-", actual: `tier ${tier} (files: ${computed}${declared ? `, label: ${declared}` : ""})`, ok: true });

  const agent = isAgent(policy, input.author);
  const forbidden = forbiddenTouched(policy, input.changedFiles);
  rows.push({
    check: "Forbidden paths",
    required: agent ? "none touched by an agent" : "human author: allowed",
    actual: forbidden.length ? forbidden.join(", ") : "none",
    ok: !agent || forbidden.length === 0,
  });

  for (const pattern of policy.required_jobs[t]) {
    const hits = input.jobs.filter((j) => matches(j.name, [pattern]));
    const ok = hits.length > 0 && hits.every((j) => j.status === "success");
    rows.push({
      check: `Job ${pattern}`,
      required: "success",
      actual: hits.length ? hits.map((j) => `${j.name}:${j.status}`).join(", ") : "missing",
      ok,
    });
  }

  const reviewers = [...policy.required_reviewers[t]];
  if (input.extraReviewer && !reviewers.includes(input.extraReviewer)) reviewers.push(input.extraReviewer);
  for (const r of reviewers) {
    const v = input.verdicts[r];
    rows.push({ check: `Reviewer ${r}`, required: "APPROVE", actual: v ?? "no verdict", ok: v === "APPROVE" });
  }

  const blocking = policy.security.block_severities.reduce((n, s) => n + (input.findings[s] ?? 0), 0);
  rows.push({ check: "Security findings", required: `0 ${policy.security.block_severities.join("/")}`, actual: String(blocking), ok: blocking === 0 });

  const critical = input.labels.some((l) => policy.carbon.never_skip_labels.includes(l)) || policy.carbon.never_skip_tiers.includes(t);
  rows.push({
    check: "Carbon mode",
    required: critical ? "full (tier 2 / medication-critical)" : "any",
    actual: input.carbonMode,
    ok: !critical || input.carbonMode === "full" || rows.filter((r) => r.check.startsWith("Job ")).every((r) => r.ok),
  });

  rows.push({ check: "Agent trust", required: "informational", actual: input.trust === null ? "n/a" : String(input.trust), ok: true });

  const failed = rows.filter((r) => !r.ok);
  const decision: Decision = agent && forbidden.length ? "needs-human" : failed.length ? "blocked" : "merge";
  return { decision, tier, rows };
}

export function renderTable(result: GateResult): string {
  const icon = { merge: "✅ Auto-merge", blocked: "⛔ Blocked", "needs-human": "🧑 Needs a human" }[result.decision];
  return [
    `### Merge gate: ${icon}`,
    "",
    "| Check | Required | Actual | |",
    "|---|---|---|---|",
    ...result.rows.map((r) => `| ${r.check} | ${r.required} | ${r.actual.replace(/\|/g, "\\|")} | ${r.ok ? "✅" : "❌"} |`),
    "",
    "_Deterministic policy gate (`scripts/merge-gate`). No AI decides merges._",
  ].join("\n");
}

const MARKER = /<!--\s*autopilot:review\s+reviewer=([\w-]+)\s+verdict=(APPROVE|CHANGES)\s*-->/;

/** Latest verdict per reviewer from MR notes written by agent accounts. Notes are newest-first. */
export function verdictsFromNotes(policy: Policy, notes: { body: string; author: { username: string } }[]): GateInput["verdicts"] {
  const out: GateInput["verdicts"] = {};
  for (const n of notes) {
    if (!isAgent(policy, n.author.username)) continue; // humans cannot forge an agent verdict
    const m = MARKER.exec(n.body);
    if (m && !out[m[1]!]) out[m[1]!] = m[2] as "APPROVE" | "CHANGES";
  }
  return out;
}
