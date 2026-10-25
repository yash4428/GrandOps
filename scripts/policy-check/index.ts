// policy-check (.pre). Computes the risk tier and canary plan for this pipeline -> policy.env
import { writeFileSync } from "node:fs";
import { api, readLedger } from "../lib/gitlab";
import { canaryPlan, isAgent, loadPolicy, tierOfChange, type Tier } from "../lib/policy";

async function changedFiles(): Promise<{ files: string[]; author: string | null }> {
  const iid = process.env.CI_MERGE_REQUEST_IID;
  if (iid) {
    const ch = await api<{ changes: { new_path: string; old_path: string }[]; author: { username: string } }>("GET", `/merge_requests/${iid}/changes`);
    return { files: ch.changes.flatMap((c) => [c.new_path, c.old_path]), author: ch.author.username };
  }
  const sha = process.env.CI_COMMIT_SHA ?? "";
  const mrs = await api<{ iid: number; author: { username: string } }[]>("GET", `/repository/commits/${sha}/merge_requests`).catch(() => []);
  if (mrs[0]) {
    const ch = await api<{ changes: { new_path: string }[] }>("GET", `/merge_requests/${mrs[0].iid}/changes`);
    return { files: ch.changes.map((c) => c.new_path), author: mrs[0].author.username };
  }
  const diff = await api<{ new_path: string }[]>("GET", `/repository/commits/${sha}/diff`).catch(() => []);
  return { files: diff.map((d) => d.new_path), author: null };
}

async function main() {
  const policy = loadPolicy();
  let tier: Tier = 2;
  let trust: number | null = null;
  try {
    const { files, author } = await changedFiles();
    tier = tierOfChange(policy, files);
    if (author && isAgent(policy, author)) {
      const ledger = await readLedger<{ agents: Record<string, Record<string, number>> }>("trust.json", { agents: {} });
      trust = ledger.agents[author.replace(policy.agent_prefix, "")]?.[String(tier)] ?? policy.trust.start;
    }
  } catch (err) {
    // Unknown change = assume the strictest tier.
    console.error(`policy-check: ${err instanceof Error ? err.message : err}; defaulting to tier 2`);
  }
  const plan = canaryPlan(policy, tier, trust);
  writeFileSync("policy.env", `RISK_TIER=${tier}\nCANARY_MINUTES=${plan.minutes}\nCANARY_PERCENT=${plan.percent}\nAGENT_TRUST=${trust ?? ""}\n`);
  console.log(`RISK_TIER=${tier} CANARY=${plan.minutes}min@${plan.percent}% (${plan.reason})`);
}

main();
