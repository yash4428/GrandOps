// sci:report. Computes SCI for the current pipeline from the GitLab API and appends to the ledger.
// Usage: pnpm sci [--pipeline <id>] [--profile smart|baseline] [--dry-run]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { api, dryRun, mrNote, readLedger, writeLedger } from "../lib/gitlab";
import { loadPolicy } from "../lib/policy";
import { add, cloudRunFootprint, jobsFootprint, llmRangeG, percentLess, ZERO, type Coefficients, type JobUsage } from "./model";

interface Job { name: string; duration: number | null; status: string; tag_list: string[]; runner?: { description?: string } | null }
interface LedgerEntry { pipelineId: number; ref: string; profile: string; kind: "mr" | "deploy" | "other"; totalG: number; energyKwh: number; at: string; mrIid?: number }
interface Ledger { entries: LedgerEntry[] }

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const c = JSON.parse(readFileSync("scripts/sci/coefficients.json", "utf8")) as Coefficients;

function runnerType(j: Job): string {
  return j.tag_list.find((t) => t.startsWith("saas-linux")) ?? "saas-linux-small-amd64";
}

async function main() {
  const pipelineId = Number(arg("pipeline") ?? process.env.CI_PIPELINE_ID);
  const profile = arg("profile") ?? process.env.CI_PROFILE ?? "smart";
  const jobs = await api<Job[]>("GET", `/pipelines/${pipelineId}/jobs?per_page=100`);
  const usage: JobUsage[] = jobs
    .filter((j) => j.duration && j.name !== process.env.CI_JOB_NAME)
    .map((j) => ({ name: j.name, durationS: j.duration ?? 0, runnerType: runnerType(j) }));
  const ci = jobsFootprint(c, usage);
  const deployed = jobs.some((j) => j.name === "deploy:promote" && j.status === "success");
  // Cloud Run during the canary watch window: canary + stable revision.
  const canaryJob = jobs.find((j) => j.name === "deploy:canary-watch");
  const run = deployed && canaryJob?.duration ? cloudRunFootprint(c, canaryJob.duration * 2) : ZERO;
  const total = add(ci, run);
  const sessions = Number(process.env.FLOW_SESSIONS ?? 0);
  const llm = llmRangeG(c, sessions, c.runner_region.value);

  const policy = loadPolicy();
  const ledger = await readLedger<Ledger>("sci.json", { entries: [] });
  const month = new Date().toISOString().slice(0, 7);
  const kind: LedgerEntry["kind"] = process.env.CI_MERGE_REQUEST_IID ? "mr" : deployed ? "deploy" : "other";
  const entry: LedgerEntry = {
    pipelineId,
    ref: process.env.CI_COMMIT_REF_NAME ?? "",
    profile,
    kind,
    totalG: round(total.totalG),
    energyKwh: round(total.energyKwh, 6),
    at: new Date().toISOString(),
    mrIid: process.env.CI_MERGE_REQUEST_IID ? Number(process.env.CI_MERGE_REQUEST_IID) : undefined,
  };
  const entries = [...ledger.entries.filter((e) => e.pipelineId !== pipelineId), entry];
  const avg = (k: LedgerEntry["kind"], p: string) => {
    const xs = entries.filter((e) => e.kind === k && e.profile === p).map((e) => e.totalG);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };
  // Per deployment = deploy pipeline + the average MR pipeline that fed it.
  const perDeploy = (p: string) => {
    const d = avg("deploy", p);
    return d === null ? null : d + (avg("mr", p) ?? 0);
  };
  const smartDeploy = perDeploy("smart");
  const baselineDeploy = perDeploy("baseline");
  const monthToDateG = entries.filter((e) => e.at.startsWith(month)).reduce((n, e) => n + e.totalG, 0);

  const report = {
    pipelineId,
    profile,
    kind,
    thisPipelineG: round(total.totalG),
    breakdown: { ci: round(ci.totalG), cloudRun: round(run.totalG), embodied: round(total.embodiedG), energyKwh: round(total.energyKwh, 6) },
    llmUncertainG: { low: round(llm.lowG), high: round(llm.highG), sessions },
    perDeployG: round(smartDeploy ?? total.totalG),
    baselinePerDeployG: baselineDeploy === null ? null : round(baselineDeploy),
    perMrG: avg("mr", "smart") === null ? null : round(avg("mr", "smart")!),
    baselinePerMrG: avg("mr", "baseline") === null ? null : round(avg("mr", "baseline")!),
    monthToDateG: round(monthToDateG),
    monthlyBudgetG: policy.carbon.monthly_budget_g,
    jobs: usage.length,
    coefficients: "scripts/sci/coefficients.json",
  };
  mkdirSync("reports", { recursive: true });
  writeFileSync("reports/sci-report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (dryRun()) return;

  await writeLedger({ "sci.json": JSON.stringify({ entries: entries.slice(-500) }, null, 2) }, `sci: pipeline ${pipelineId} ${report.thisPipelineG} g`);
  if (process.env.CI_MERGE_REQUEST_IID) {
    const vs = percentLess(report.thisPipelineG, report.baselinePerMrG ?? 0);
    await mrNote(
      process.env.CI_MERGE_REQUEST_IID,
      [
        `### 🌱 Carbon: ${report.thisPipelineG} g CO₂e for this pipeline${vs !== null ? ` (${vs}% less than the naive baseline MR)` : ""}`,
        "",
        `| | g CO₂e |`,
        `|---|---|`,
        `| CI jobs (${usage.length}) | ${report.breakdown.ci} |`,
        `| of which embodied | ${report.breakdown.embodied} |`,
        `| AI agent sessions (uncertain, not in total) | ${report.llmUncertainG.low}–${report.llmUncertainG.high} |`,
        `| Month to date / budget | ${report.monthToDateG} / ${report.monthlyBudgetG} |`,
        "",
        "_SCI per GSF spec (ISO/IEC 21031:2024), CCF coefficients. Method: docs/sustainability.md._",
      ].join("\n"),
      "<!-- autopilot:sci -->",
    );
  }
}

function round(n: number, dp = 2): number {
  return Math.round(n * 10 ** dp) / 10 ** dp;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
