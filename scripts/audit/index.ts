// audit:record (govern). Writes audit/releases/<version>.md for a production release.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { api, dryRun, writeLedger } from "../lib/gitlab";

interface MR { iid: number; title: string; web_url: string; author: { username: string }; description: string }
interface Note { body: string; author: { username: string }; created_at: string }
interface Job { name: string; status: string; web_url: string }

async function main() {
  const version = process.env.RELEASE_VERSION ?? process.env.CI_COMMIT_TAG ?? `v0.0.0-${process.env.CI_COMMIT_SHORT_SHA}`;
  const sha = process.env.CI_COMMIT_SHA ?? "";
  const [mr] = await api<MR[]>("GET", `/repository/commits/${sha}/merge_requests`).catch(() => [] as MR[]);
  const notes = mr ? await api<Note[]>("GET", `/merge_requests/${mr.iid}/notes?per_page=100&sort=asc`) : [];
  const mrPipelines = mr ? await api<{ id: number }[]>("GET", `/merge_requests/${mr.iid}/pipelines?per_page=1`) : [];
  const mrJobs = mrPipelines[0] ? await api<Job[]>("GET", `/pipelines/${mrPipelines[0].id}/jobs?per_page=100`) : [];
  const mainJobs = await api<Job[]>("GET", `/pipelines/${process.env.CI_PIPELINE_ID}/jobs?per_page=100`);
  const issue = /Closes #(\d+)/i.exec(mr?.description ?? "")?.[1];
  const gate = notes.filter((n) => n.body.includes("autopilot:merge-gate")).at(-1)?.body ?? "_no gate note found_";
  const sci = existsSync("reports/sci-report.json") ? readFileSync("reports/sci-report.json", "utf8") : "{}";
  const agentActions = notes.filter((n) => n.author.username.startsWith("ai-")).map((n) => `- ${n.created_at} **${n.author.username}**: ${n.body.replace(/<!--.*?-->/g, "").split("\n").find((l) => l.trim())?.slice(0, 140) ?? ""}`);

  const md = [
    `# Release audit record: ${version}`,
    "",
    `| | |`,
    `|---|---|`,
    `| Commit | \`${sha}\` |`,
    `| Triggering issue | ${issue ? `#${issue}` : "-"} |`,
    `| Merge request | ${mr ? `!${mr.iid} ${mr.title}` : "-"} |`,
    `| Author | ${mr?.author.username ?? "-"} |`,
    `| Approved by | ${notes.some((n) => n.body.includes("needs-human")) ? "human (needs-human)" : "policy merge gate"} |`,
    `| Main pipeline | ${process.env.CI_PIPELINE_URL ?? "-"} |`,
    "",
    "## Agent actions",
    "",
    ...(agentActions.length ? agentActions : ["_none_"]),
    "",
    "## Checks (MR pipeline)",
    "",
    ...mrJobs.map((j) => `- ${j.status === "success" ? "✅" : j.status === "skipped" ? "⏭" : "❌"} \`${j.name}\` ${j.status}`),
    "",
    "## Checks (main pipeline)",
    "",
    ...mainJobs.map((j) => `- ${j.status === "success" ? "✅" : j.status === "skipped" || j.status === "manual" ? "⏭" : "⏳"} \`${j.name}\` ${j.status}`),
    "",
    "## Policy decision",
    "",
    gate.replace("<!-- autopilot:merge-gate -->", "").trim(),
    "",
    "## Carbon (SCI)",
    "",
    "```json",
    sci,
    "```",
    "",
  ].join("\n");
  mkdirSync("audit/releases", { recursive: true });
  writeFileSync(`audit/releases/${version}.md`, md);
  console.log(md);
  if (!dryRun()) await writeLedger({ [`audit/releases/${version}.md`]: md }, `audit: ${version}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
