import "server-only";

/**
 * Current time. DEMO_NOW pins the clock for personas and e2e so dose states are
 * deterministic. It is ignored in production.
 */
export function nowMs(): number {
  const pinned = process.env.DEMO_NOW;
  if (pinned && process.env.APP_ENV !== "production") {
    const ms = Date.parse(pinned);
    if (!Number.isNaN(ms)) return ms;
  }
  return Date.now();
}
