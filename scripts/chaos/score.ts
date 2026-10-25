// chaos:score. Recomputes the chaos scoreboard from issues labelled chaos::round -> chaos.json on the data branch.
// A round issue is opened by the Chaos flow. Detection = the linked incident/failed persona note time
// (label chaos::detected set by the detector job); recovery = issue closed.
import { apiAll, dryRun, writeLedger } from "../lib/gitlab";
import { scoreboard, type Round } from "./scoreboard";

interface Issue { iid: number; title: string; created_at: string; closed_at: string | null; labels: string[]; description: string | null }

async function main() {
  const issues = await apiAll<Issue>("/issues?labels=chaos::round&state=all");
  const rounds: Round[] = issues.map((i) => {
    const detectedAt = /detected_at:\s*(\S+)/.exec(i.description ?? "")?.[1] ?? null;
    return { iid: i.iid, attack: /attack:\s*(\S+)/.exec(i.description ?? "")?.[1] ?? i.title, startedAt: i.created_at, detectedAt, recoveredAt: i.closed_at, detected: i.labels.includes("chaos::detected") };
  });
  const board = scoreboard(rounds);
  console.log(JSON.stringify(board, null, 2));
  if (!dryRun()) await writeLedger({ "chaos.json": JSON.stringify(board, null, 2) }, "chaos: scoreboard");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
