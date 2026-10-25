// carbon-gate (.pre). Writes CARBON_MODE=full|lite|defer to carbon.env (dotenv artifact).
import { writeFileSync } from "node:fs";
import { readLedger } from "../lib/gitlab";
import { loadPolicy } from "../lib/policy";
import { carbonMode } from "./mode";

async function main() {
  const policy = loadPolicy();
  const ledger = await readLedger<{ entries: { at: string; totalG: number }[] }>("sci.json", { entries: [] });
  const month = new Date().toISOString().slice(0, 7);
  const used = ledger.entries.filter((e) => e.at.startsWith(month)).reduce((n, e) => n + e.totalG, 0);
  const labels = (process.env.CI_MERGE_REQUEST_LABELS ?? "").split(",").filter(Boolean);
  const { mode, reason } = carbonMode(policy, used, labels, process.env.RISK_TIER ?? null);
  writeFileSync("carbon.env", `CARBON_MODE=${mode}\nCARBON_USED_G=${Math.round(used)}\n`);
  console.log(`CARBON_MODE=${mode} (${reason}; ${Math.round(used)} / ${policy.carbon.monthly_budget_g} g this month)`);
}

main().catch((err) => {
  // Fail open to full verification: carbon accounting must never reduce safety.
  console.error(err instanceof Error ? err.message : err);
  writeFileSync("carbon.env", "CARBON_MODE=full\n");
});
