import "server-only";

const cache = new Map<string, { at: number; value: unknown }>();

export function gitlabConfigured(): boolean {
  return Boolean(process.env.GITLAB_PROJECT_ID);
}

/** Read-only GitLab API GET with a short server-side cache. Token never leaves the server. */
export async function gl<T>(path: string, ttlMs = 5000): Promise<T | null> {
  const project = process.env.GITLAB_PROJECT_ID;
  if (!project) return null;
  const api = process.env.GITLAB_API_URL ?? "https://gitlab.com/api/v4";
  const url = `${api}/projects/${encodeURIComponent(project)}${path}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  try {
    const token = process.env.GITLAB_READ_TOKEN;
    const res = await fetch(url, { headers: token ? { "PRIVATE-TOKEN": token } : {}, signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok) return (hit?.value as T) ?? null;
    const ct = res.headers.get("content-type") ?? "";
    const value = (ct.includes("json") ? await res.json() : await res.text()) as T;
    cache.set(url, { at: Date.now(), value });
    return value;
  } catch {
    return (hit?.value as T) ?? null;
  }
}

/** Raw file from the repo (e.g. AGENTS.md on main, ledgers on the data branch). */
export async function repoFile(path: string, ref: string, ttlMs = 15_000): Promise<string | null> {
  return gl<string>(`/repository/files/${encodeURIComponent(path)}/raw?ref=${encodeURIComponent(ref)}`, ttlMs);
}

export async function repoJson<T>(path: string, ref: string): Promise<T | null> {
  const raw = await repoFile(path, ref);
  if (raw === null) return null;
  try {
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
  } catch {
    return null;
  }
}
