// autopilot:merge-gate. Last job of every MR pipeline. Decides, posts the table, sets auto-merge.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { api, dryRun, mrNote, readLedger } from "../lib/gitlab";
import { canaryPlan, loadPolicy, tierOfChange } from "../lib/policy";
import { decide, renderTable, verdictsFromNotes, type GateInput } from "./decide";

const policy = loadPolicy();
const iid = process.env.CI_MERGE_REQUEST_IID;
const pipelineId = process.env.CI_PIPELINE_ID;
const waitMin = Number(process.env.GATE_REVIEW_WAIT_MIN ?? 20);

interface MR { author: { username: string }; labels: string[]; sha: string }
interface Note { body: string; author: { username: string } }

function findingsFromArtifacts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of existsSync(".") ? readdirSync(".") : []) {
    if (!/^gl-.*-report\.json$/.test(f)) continue;
    try {
      const report = JSON.parse(readFileSync(f, "utf8")) as { vulnerabilities?: { severity?: string; id?: string }[] };
      for (const v of report.vulnerabilities ?? []) {
        const s = (v.severity ?? "unknown").toLowerCase();
        counts[s] = (counts[s] ?? 0) + 1;
      }
    } catch {
      /* unreadable report is ignored; the scan job itself would have failed */
    }
  }
  return counts;
}

/** Unresolved findings via GraphQL so Sentinel's dismissals count. Falls back to artifacts. */
async function findings(): Promise<Record<string, number>> {
  const path = process.env.CI_PROJECT_PATH;
  if (!path || !pipelineId) return findingsFromArtifacts();
  try {
    const q = `query($p:ID!,$id:ID!){project(fullPath:$p){pipeline(iid:$id){securityReportFindings(first:100){nodes{severity state}}}}}`;
    const res = await fetch(`${process.env.CI_SERVER_URL ?? "https://gitlab.com"}/api/graphql`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.AUTOPILOT_MERGE_TOKEN ?? ""}` },
      body: JSON.stringify({ query: q, variables: { p: path, id: process.env.CI_PIPELINE_IID } }),
    });
    const body = (await res.json()) as { data?: { project?: { pipeline?: { securityReportFindings?: { nodes: { severity: string; state: string }[] } } } } };
    const nodes = body.data?.project?.pipeline?.securityReportFindings?.nodes;
    if (!nodes) return findingsFromArtifacts();
    const counts: Record<string, number> = {};
    for (const n of nodes) {
      if (n.state === "DISMISSED" || n.state === "RESOLVED") continue;
      const s = n.severity.toLowerCase();
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  } catch {
    return findingsFromArtifacts();
  }
}

async function main() {
  if (!iid) {
    console.log("Not an MR pipeline; nothing to gate.");
    return;
  }
  const mr = await api<MR>("GET", `/merge_requests/${iid}`);
  const changes = await api<{ changes: { new_path: string; old_path: string }[] }>("GET", `/merge_requests/${iid}/changes?access_raw_diffs=false`);
  const changedFiles = [...new Set(changes.changes.flatMap((c) => [c.new_path, c.old_path]))];
  const jobs = (await api<{ name: string; status: string }[]>("GET", `/pipelines/${pipelineId}/jobs?per_page=100`)).filter((j) => j.name !== process.env.CI_JOB_NAME);
  const ledger = await readLedger<{ agents: Record<string, Record<string, number>> }>("trust.json", { agents: {} });
  const agentName = mr.author.username.replace(policy.agent_prefix, "");
  const tier = tierOfChange(policy, changedFiles);
  const trust = ledger.agents[agentName]?.[String(tier)] ?? (mr.author.username.startsWith(policy.agent_prefix) ? policy.trust.start : null);
  const plan = canaryPlan(policy, tier, trust);

  // Reviewer flows run in parallel with the pipeline; wait (deterministically) for their verdicts.
  let input: GateInput;
  const deadline = Date.now() + waitMin * 60_000;
  for (;;) {
    const notes = await api<Note[]>("GET", `/merge_requests/${iid}/notes?per_page=100&sort=desc`);
    input = {
      author: mr.author.username,
      changedFiles,
      labels: mr.labels,
      jobs,
      verdicts: verdictsFromNotes(policy, notes),
      findings: await findings(),
      carbonMode: (process.env.CARBON_MODE as GateInput["carbonMode"]) ?? "full",
      trust,
      extraReviewer: plan.extraReviewer,
    };
    const result = decide(policy, input);
    const waitingOnReview = result.rows.some((r) => r.check.startsWith("Reviewer") && r.actual === "no verdict");
    const othersOk = result.rows.filter((r) => !r.check.startsWith("Reviewer")).every((r) => r.ok);
    if (!waitingOnReview || !othersOk || Date.now() > deadline || dryRun()) break;
    console.log("Waiting for reviewer verdicts…");
    await new Promise((r) => setTimeout(r, 30_000));
  }

  const result = decide(policy, input);
  const table = renderTable(result);
  console.log(table);
  if (dryRun()) return;

  await mrNote(iid, table, "<!-- autopilot:merge-gate -->");
  const remove = ["autopilot::blocked", "needs-human"];
  if (result.decision === "merge") {
    await api("PUT", `/merge_requests/${iid}`, { remove_labels: remove.join(","), add_labels: `tier::${result.tier}` });
    // Auto-merge fires when this pipeline (which ends with this job) succeeds.
    await api("PUT", `/merge_requests/${iid}/merge`, { auto_merge: true, sha: mr.sha, should_remove_source_branch: true });
  } else {
    await api("PUT", `/merge_requests/${iid}`, { add_labels: result.decision === "needs-human" ? "needs-human" : "autopilot::blocked" });
    process.exitCode = result.decision === "blocked" ? 1 : 0;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
