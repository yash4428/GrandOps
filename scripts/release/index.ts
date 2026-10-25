// release:create. Tags the promoted commit and creates a GitLab Release with EN/HI/PA notes.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { api, dryRun } from "../lib/gitlab";
import { bumpFor, caregiverNotes, nextVersion, releaseDescription } from "./notes";

async function main() {
  const sha = process.env.CI_COMMIT_SHA ?? "";
  const tags = await api<{ name: string }[]>("GET", "/repository/tags?order_by=version&per_page=1").catch(() => []);
  const [mr] = await api<{ iid: number; title: string; description: string; labels: string[] }[]>("GET", `/repository/commits/${sha}/merge_requests`).catch(() => []);
  const version = nextVersion(tags[0]?.name ?? null, bumpFor(mr?.labels ?? []));
  const sci = existsSync("reports/sci-report.json") ? (JSON.parse(readFileSync("reports/sci-report.json", "utf8")) as { thisPipelineG: number }).thisPipelineG : null;
  const description = releaseDescription(version, mr ?? null, caregiverNotes(mr?.description ?? ""), sci);
  writeFileSync("release.env", `RELEASE_VERSION=${version}\n`);
  console.log(description);
  if (dryRun()) return;
  await api("POST", "/releases", { tag_name: version, ref: sha, name: version, description });
  console.log(`Released ${version}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
