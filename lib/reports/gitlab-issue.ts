import "server-only";
import type { UserReport } from "../data/types";

/** Builds the issue body. Contains no names, phone numbers or medicine lists. Pure. */
export function issueBody(r: UserReport): string {
  return [
    `**User report** \`${r.id}\` (anonymised)`,
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| Reason | \`${r.reason}\` |`,
    `| Language | \`${r.locale}\` |`,
    `| Screen | \`${r.route}\` |`,
    `| Input | ${r.source} |`,
    `| App version | \`${r.appVersion}\` |`,
    `| Device | ${r.device} |`,
    "",
    "### Original text",
    "",
    r.text ? `> ${r.text.replace(/\n/g, "\n> ")}` : "_No text, reason chip only._",
    "",
    "_Triage: translate to English, keep the original, write steps to reproduce._",
  ].join("\n");
}

/** Files a GitLab issue with a project bot token. Returns the issue IID or null. */
export async function fileIssue(r: UserReport): Promise<number | null> {
  const token = process.env.REPORTS_ISSUE_TOKEN;
  const project = process.env.GITLAB_PROJECT_ID;
  const api = process.env.GITLAB_API_URL ?? "https://gitlab.com/api/v4";
  if (!token || !project) return null;
  const res = await fetch(`${api}/projects/${encodeURIComponent(project)}/issues`, {
    method: "POST",
    headers: { "PRIVATE-TOKEN": token, "content-type": "application/json" },
    body: JSON.stringify({
      title: `User report: ${r.reason} on ${r.route} (${r.locale})`,
      description: issueBody(r),
      labels: "source::user-report,needs-triage",
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  return ((await res.json()) as { iid: number }).iid;
}
