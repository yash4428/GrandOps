import "server-only";

/**
 * Runtime flags. Chaos flags come from env vars on the staging revision or from
 * GitLab Feature Flags (Unleash protocol). They are ignored outright in production,
 * and scripts/chaos-guard fails the pipeline if one is ever set there.
 */

export const CHAOS_FLAGS = ["chaos_tiny_buttons", "chaos_drop_pa_key", "chaos_latency", "chaos_healthz_500"] as const;
export type ChaosFlag = (typeof CHAOS_FLAGS)[number];

const ENV_FOR: Record<ChaosFlag, string> = {
  chaos_tiny_buttons: "CHAOS_TINY_BUTTONS",
  chaos_drop_pa_key: "CHAOS_DROP_PA_KEY",
  chaos_latency: "CHAOS_LATENCY_MS",
  chaos_healthz_500: "CHAOS_HEALTHZ_500",
};

export function isProduction(): boolean {
  return process.env.APP_ENV === "production";
}

interface UnleashFeature {
  name: string;
  enabled: boolean;
}

let cache: { at: number; enabled: Set<string> } | null = null;

async function unleashEnabled(): Promise<Set<string>> {
  const url = process.env.UNLEASH_URL;
  const instanceId = process.env.UNLEASH_INSTANCE_ID;
  if (!url || !instanceId) return new Set();
  if (cache && Date.now() - cache.at < 15_000) return cache.enabled;
  try {
    const res = await fetch(`${url}/client/features`, {
      headers: { "UNLEASH-INSTANCEID": instanceId, "UNLEASH-APPNAME": process.env.APP_ENV ?? "local" },
      signal: AbortSignal.timeout(1500),
    });
    const body = (await res.json()) as { features?: UnleashFeature[] };
    cache = { at: Date.now(), enabled: new Set((body.features ?? []).filter((f) => f.enabled).map((f) => f.name)) };
  } catch {
    cache = { at: Date.now(), enabled: cache?.enabled ?? new Set() };
  }
  return cache.enabled;
}

async function flagValue(flag: ChaosFlag): Promise<string | null> {
  if (isProduction()) return null;
  const env = process.env[ENV_FOR[flag]];
  if (env) return env;
  return (await unleashEnabled()).has(flag) ? "1" : null;
}

export async function chaosTinyButtons(): Promise<boolean> {
  return (await flagValue("chaos_tiny_buttons")) !== null;
}

/** Message key removed from hi/pa catalogs, e.g. "today.doseTaken". */
export async function chaosDroppedKey(): Promise<string | null> {
  const v = await flagValue("chaos_drop_pa_key");
  return v === null ? null : v === "1" ? "today.doseTaken" : v;
}

export async function chaosLatencyMs(): Promise<number> {
  const v = Number(await flagValue("chaos_latency"));
  return Number.isFinite(v) && v > 0 ? Math.min(v === 1 ? 4000 : v, 10_000) : 0;
}

export async function chaosHealthz500(): Promise<boolean> {
  return (await flagValue("chaos_healthz_500")) !== null;
}
