// chaos:record. Updates the round issue: detected?, detection time, recovery (staging restored).
// Branch name: chaos/round-<issue iid>-<attack>
import { readFileSync, existsSync } from "node:fs";
import { api } from "../lib/gitlab";

interface Job { name: string; status: string; finished_at: string | null }

async function main() {
  const iid = /^chaos\/round-(\d+)/.exec(process.env.CI_COMMIT_BRANCH ?? "")?.[1];
  if (!iid) throw new Error("branch must be chaos/round-<iid>-<attack>");
  const jobs = await api<Job[]>("GET", `/pipelines/${process.env.CI_PIPELINE_ID}/jobs?per_page=100`);
  const detect = jobs.find((j) => j.name === "chaos:detect");
  const heal = jobs.find((j) => j.name === "chaos:heal");
  const detected = detect?.status === "failed";
  const issue = await api<{ description: string | null }>("GET", `/issues/${iid}`);
  const attackAt = existsSync("attack_at.txt") ? readFileSync("attack_at.txt", "utf8").trim() : null;
  const lines = [
    issue.description ?? "",
    "",
    attackAt ? `attack_at: ${attackAt}` : "",
    detected && detect?.finished_at ? `detected_at: ${detect.finished_at}` : "detected_at: none",
    `pipeline: ${process.env.CI_PIPELINE_URL}`,
  ].filter(Boolean);
  await api("PUT", `/issues/${iid}`, {
    description: lines.join("\n"),
    add_labels: detected ? "chaos::detected" : "chaos::missed",
    state_event: detected && heal?.status === "success" ? "close" : undefined,
  });
  await api("POST", `/issues/${iid}/notes`, {
    body: detected
      ? `🛡️ **Detected** by the persona panel (\`chaos:detect\` failed as it should). Staging restored by \`chaos:heal\`: ${heal?.status ?? "n/a"}.\n\n@-mention the Healer on this issue for diagnosis and a lesson.`
      : "⚠️ **Not detected.** The attack passed every check. This is a gap in our safety net: open an issue to add a check.",
  });
  console.log(`round #${iid}: detected=${detected} heal=${heal?.status}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
