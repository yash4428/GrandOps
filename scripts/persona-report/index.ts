// persona:report. Merges per-persona Playwright JSON into personas-report.json and posts the MR card.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dryRun, mrNote } from "../lib/gitlab";
import { cards, renderComment, type PwReport } from "./render";

const files = existsSync("reports") ? readdirSync("reports").filter((f) => /^playwright.*\.json$/.test(f)) : [];
const merged: PwReport = { suites: files.flatMap((f) => (JSON.parse(readFileSync(`reports/${f}`, "utf8")) as PwReport).suites ?? []) };
const cs = cards(merged);
writeFileSync("reports/personas-report.json", JSON.stringify({ generatedAt: new Date().toISOString(), cards: cs }, null, 2));
const md = renderComment(cs, process.env.CI_PIPELINE_URL);
console.log(md);
if (process.env.CI_MERGE_REQUEST_IID && !dryRun()) {
  mrNote(process.env.CI_MERGE_REQUEST_IID, md, "<!-- autopilot:personas -->").catch((err) => {
    console.error(err instanceof Error ? err.message : err);
  });
}
if (cs.some((c) => c.failed > 0)) process.exitCode = process.env.PERSONA_REPORT_FAIL === "true" ? 1 : 0;
