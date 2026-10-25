import "server-only";

/**
 * Minimal Sentry-protocol client for GitLab Error Tracking (integrated mode).
 * Only error type, message and route are sent. Never user data.
 */
export async function reportError(err: unknown, route: string): Promise<void> {
  const dsn = process.env.ERROR_TRACKING_DSN;
  log("error", "unhandled_error", { route, error: err instanceof Error ? err.name : "unknown" });
  if (!dsn) return;
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\/+/, "").split("/").pop();
    const endpoint = `${u.protocol}//${u.host}${u.pathname.replace(/\/[^/]*$/, "")}/api/${projectId}/store/`;
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${u.username}, sentry_client=autopilot/1.0`,
      },
      body: JSON.stringify({
        event_id: crypto.randomUUID().replaceAll("-", ""),
        timestamp: new Date().toISOString(),
        platform: "javascript",
        level: "error",
        environment: process.env.APP_ENV ?? "local",
        release: process.env.APP_VERSION ?? "dev",
        transaction: route,
        exception: {
          values: [{ type: err instanceof Error ? err.name : "Error", value: err instanceof Error ? err.message.slice(0, 200) : "unknown" }],
        },
      }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Error reporting must never break the app.
  }
}

/** Structured JSON log line. Callers must not pass PII. */
export function log(level: "info" | "warn" | "error", event: string, fields: Record<string, string | number | boolean> = {}): void {
  const line = JSON.stringify({ severity: level.toUpperCase(), event, ...fields, time: new Date().toISOString() });
  if (level === "info") process.stdout.write(`${line}\n`);
  else process.stderr.write(`${line}\n`);
}
