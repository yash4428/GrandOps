import "server-only";

let cached: { token: string; exp: number } | null = null;

/** Access token for the Cloud Run service account via the metadata server (no keys). */
export async function gcpAccessToken(): Promise<string | null> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  try {
    const res = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
      headers: { "Metadata-Flavor": "Google" },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { access_token: string; expires_in: number };
    cached = { token: body.access_token, exp: Date.now() + body.expires_in * 1000 };
    return cached.token;
  } catch {
    return null;
  }
}
