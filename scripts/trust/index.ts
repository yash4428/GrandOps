// trust:update. Usage: pnpm trust --event merge|rollback|settle [--mr <iid>] [--dry-run]
import { api, dryRun, readLedger, writeLedger } from "../lib/gitlab";
import { isAgent, loadPolicy, tierOfChange } from "../lib/policy";
import { EMPTY, recordMerge, recordRollback, settle, type TrustLedger } from "./ledger";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

/** MR that produced the commit being deployed. */
export async function mrForCommit(sha: string): Promise<{ iid: number; author: string; files: string[] } | null> {
  const mrs = await api<{ iid: number; author: { username: string } }[]>("GET", `/repository/commits/${sha}/merge_requests`);
  const mr = mrs[0];
  if (!mr) return null;
  const ch = await api<{ changes: { new_path: string }[] }>("GET", `/merge_requests/${mr.iid}/changes`);
  return { iid: mr.iid, author: mr.author.username, files: ch.changes.map((c) => c.new_path) };
}

async function main() {
  const policy = loadPolicy();
  const event = arg("event") ?? "settle";
  let ledger = await readLedger<TrustLedger>("trust.json", EMPTY);
  const now = new Date().toISOString();
  if (event === "settle") ledger = settle(policy, ledger, now);
  else {
    const mr = arg("mr") ? { iid: Number(arg("mr")), ...(await (async () => {
      const m = await api<{ author: { username: string } }>("GET", `/merge_requests/${arg("mr")}`);
      const ch = await api<{ changes: { new_path: string }[] }>("GET", `/merge_requests/${arg("mr")}/changes`);
      return { author: m.author.username, files: ch.changes.map((c) => c.new_path) };
    })()) } : await mrForCommit(process.env.DEPLOYED_SHA ?? process.env.CI_COMMIT_SHA ?? "");
    if (!mr || !isAgent(policy, mr.author)) {
      console.log("Change not authored by an agent; trust unchanged.");
      return;
    }
    const agent = mr.author.replace(policy.agent_prefix, "");
    const tier = String(tierOfChange(policy, mr.files));
    ledger = event === "rollback" ? recordRollback(policy, ledger, mr.iid, agent, tier, now) : recordMerge(ledger, mr.iid, agent, tier, now);
  }
  console.log(JSON.stringify(ledger.agents, null, 2));
  if (!dryRun()) await writeLedger({ "trust.json": JSON.stringify(ledger, null, 2) }, `trust: ${event}`);
}

if (process.argv[1]?.includes("trust")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
