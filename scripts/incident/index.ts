// deploy:rollback follow-up. Opens a GitLab Incident with the canary result and job links.
import { existsSync, readFileSync } from "node:fs";
import { api, dryRun } from "../lib/gitlab";

async function main() {
  const canary = existsSync("canary-result.json") ? readFileSync("canary-result.json", "utf8") : "{}";
  const title = process.env.INCIDENT_TITLE ?? `Canary rolled back: ${process.env.CI_COMMIT_SHORT_SHA ?? "unknown"} on production`;
  const description = [
    `**Automatic rollback.** Production traffic was returned to the previous revision by \`deploy:rollback\`.`,
    "",
    `| | |`,
    `|---|---|`,
    `| Commit | ${process.env.CI_COMMIT_SHA ?? "-"} |`,
    `| Pipeline | ${process.env.CI_PIPELINE_URL ?? "-"} |`,
    `| Rolled back at | ${new Date().toISOString()} |`,
    `| Previous revision | ${process.env.PREVIOUS_REVISION ?? "-"} |`,
    "",
    "### Canary result",
    "```json",
    canary,
    "```",
    "",
    "_Next: Healer diagnoses and opens a fix MR. Scribe writes the postmortem._",
  ].join("\n");
  if (dryRun()) {
    console.log(title, description);
    return;
  }
  const issue = await api<{ iid: number; web_url: string }>("POST", "/issues", {
    title,
    description,
    issue_type: "incident",
    labels: "incident,autopilot,rollback,needs-healer,severity::2",
  });
  console.log(`Incident #${issue.iid}: ${issue.web_url}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
