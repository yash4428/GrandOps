/** Pure: names of chaos settings present for an environment where chaos is forbidden. */
export function chaosViolations(env: Record<string, string | undefined>, targetEnv: string, allowed: string[], enabledFlags: string[] = []): string[] {
  if (allowed.includes(targetEnv)) return [];
  const vars = Object.entries(env)
    .filter(([k, v]) => /^CHAOS_/.test(k) && v !== undefined && v !== "" && v !== "0")
    .map(([k]) => k);
  return [...vars, ...enabledFlags.filter((f) => f.startsWith("chaos_")).map((f) => `feature flag ${f}`)];
}
