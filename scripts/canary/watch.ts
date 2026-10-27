// deploy:canary-watch. Probes the canary revision URL for CANARY_MINUTES and fails on SLO breach.
// Failing this job triggers the deterministic deploy:rollback job. No AI involved.
import { writeFileSync } from "node:fs";
import { loadPolicy } from "../lib/policy";
import { evaluate, type Probe } from "./slo";

const url = process.env.CANARY_URL;
const minutes = Number(process.env.CANARY_MINUTES ?? 5);
const paths = ["/health", "/", "/caregiver"];

async function probe(u: string): Promise<Probe> {
  const t0 = performance.now();
  try {
    const res = await fetch(u, { signal: AbortSignal.timeout(10_000), headers: { "user-agent": "autopilot-canary-watch" } });
    await res.arrayBuffer();
    return { ok: res.status < 500, ms: Math.round(performance.now() - t0) };
  } catch {
    return { ok: false, ms: Math.round(performance.now() - t0) };
  }
}

async function main() {
  if (!url) throw new Error("CANARY_URL is required");
  const { slo } = loadPolicy().canary;
  const probes: Probe[] = [];
  const end = Date.now() + minutes * 60_000;
  let i = 0;
  while (Date.now() < end) {
    probes.push(await probe(`${url}${paths[i++ % paths.length]}`));
    const early = evaluate(probes, slo.max_error_rate, slo.max_p95_ms);
    // Fail fast on a hard outage instead of hurting users for the whole window.
    if (probes.length >= 10 && early.errorRate >= 0.5) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  const result = evaluate(probes, slo.max_error_rate, slo.max_p95_ms);
  writeFileSync("canary-result.json", JSON.stringify({ url, minutes, probes: probes.length, ...result }, null, 2));
  console.log(`${result.pass ? "✅" : "❌"} canary: ${result.reason} (${probes.length} probes, error rate ${(result.errorRate * 100).toFixed(1)}%, p95 ${result.p95Ms}ms)`);
  if (!result.pass) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
