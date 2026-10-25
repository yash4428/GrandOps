// diary (scheduled daily). Deterministic, template-based summary of the last 24h. No AI.
import { api, apiAll, dryRun, readLedger, writeLedger } from "../lib/gitlab";

interface Issue { iid: number; labels: string[]; closed_at: string | null; created_at: string }
interface MR { iid: number; merged_at: string | null; author: { username: string } }

async function main() {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const [closed, created, merged, sci] = await Promise.all([
    apiAll<Issue>(`/issues?state=closed&updated_after=${since}`),
    apiAll<Issue>(`/issues?created_after=${since}`),
    apiAll<MR>(`/merge_requests?state=merged&updated_after=${since}`),
    readLedger<{ entries: { at: string; totalG: number; kind: string }[] }>("sci.json", { entries: [] }),
  ]);
  const closedToday = closed.filter((i) => i.closed_at && i.closed_at >= since);
  const mergedToday = merged.filter((m) => m.merged_at && m.merged_at >= since);
  const grams = sci.entries.filter((e) => e.at >= since).reduce((n, e) => n + e.totalG, 0);
  const deploys = sci.entries.filter((e) => e.at >= since && e.kind === "deploy").length;
  const date = new Date().toISOString().slice(0, 10);
  const stats = {
    issuesClosed: closedToday.length,
    mrsMerged: mergedToday.length,
    byAgents: mergedToday.filter((m) => m.author.username.startsWith("ai-")).length,
    rollbacks: created.filter((i) => i.labels.includes("rollback")).length,
    incidents: created.filter((i) => i.labels.includes("incident")).length,
    chaosRounds: created.filter((i) => i.labels.includes("chaos::round")).length,
    userReports: created.filter((i) => i.labels.includes("source::user-report")).length,
    deploys,
    grams: Math.round(grams * 10) / 10,
  };
  const text = `${stats.issuesClosed} issues closed, ${stats.mrsMerged} MRs merged (${stats.byAgents} by agents), ${stats.deploys} deploys, ${stats.rollbacks} rollbacks, ${stats.incidents} incidents, ${stats.chaosRounds} chaos rounds, ${stats.userReports} user reports, ${stats.grams} g CO₂e.`;
  const note = [`### 🌙 Overnight diary, ${date}`, "", "| | |", "|---|---|", ...Object.entries(stats).map(([k, v]) => `| ${k} | ${v} |`), "", text].join("\n");
  console.log(note);
  if (dryRun()) return;

  let diaryIssue = (await api<{ iid: number }[]>("GET", "/issues?labels=autopilot::diary&state=opened"))[0];
  diaryIssue ??= await api<{ iid: number }>("POST", "/issues", { title: "Autopilot Diary", labels: "autopilot::diary", description: "One entry per day, written by the scheduled `diary` job." });
  await api("POST", `/issues/${diaryIssue.iid}/notes`, { body: note });
  const ledger = await readLedger<{ entries: { date: string; text: string }[] }>("diary.json", { entries: [] });
  await writeLedger({ "diary.json": JSON.stringify({ entries: [...ledger.entries.filter((e) => e.date !== date), { date, text }].slice(-60) }, null, 2) }, `diary: ${date}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
