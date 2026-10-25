// chaos-guard. Hard-fails if any chaos variable or flag would reach a non-staging environment.
// Usage: pnpm chaos-guard --env production [--env-file deploy.env]
import { existsSync, readFileSync } from "node:fs";
import { api } from "../lib/gitlab";
import { loadPolicy } from "../lib/policy";
import { chaosViolations } from "./check";

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

async function enabledFlagsFor(envName: string): Promise<string[]> {
  try {
    const flags = await api<{ name: string; active: boolean; strategies: { scopes: { environment_scope: string }[] }[] }[]>("GET", "/feature_flags?scope=enabled");
    return flags
      .filter((f) => f.active && f.strategies.some((s) => s.scopes.some((sc) => sc.environment_scope === "*" || sc.environment_scope === envName)))
      .map((f) => f.name);
  } catch {
    return [];
  }
}

async function main() {
  const target = arg("env") ?? process.env.CI_ENVIRONMENT_NAME ?? "production";
  const policy = loadPolicy();
  const env: Record<string, string | undefined> = { ...process.env };
  const file = arg("env-file");
  if (file && existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const [k, ...v] = line.split("=");
      if (k) env[k.trim()] = v.join("=").trim();
    }
  }
  const bad = chaosViolations(env, target, policy.chaos.allowed_environments, await enabledFlagsFor(target));
  if (bad.length) {
    console.error(`❌ chaos-guard: chaos must never reach "${target}". Found: ${bad.join(", ")}`);
    process.exit(1);
  }
  console.log(`✅ chaos-guard: no chaos settings for "${target}".`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
