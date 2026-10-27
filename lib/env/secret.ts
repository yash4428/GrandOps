/**
 * Reads a secret from the environment. Secret Manager placeholders ("unset") and empty
 * values count as missing, so a feature without its secret switches itself off.
 */
export function secretEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v && v !== "unset" ? v : undefined;
}
