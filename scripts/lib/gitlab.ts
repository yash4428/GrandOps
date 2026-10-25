// GitLab REST helper for CI scripts. Reads CI_* variables; never logs tokens.
export const API = process.env.CI_API_V4_URL ?? "https://gitlab.com/api/v4";
export const PROJECT = process.env.CI_PROJECT_ID ?? process.env.GITLAB_PROJECT_ID ?? "";

export function botToken(): string | null {
  return process.env.AUTOPILOT_BOT_TOKEN ?? process.env.AUTOPILOT_MERGE_TOKEN ?? null;
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

export async function api<T>(method: Method, path: string, body?: unknown, token = botToken() ?? process.env.GITLAB_READ_TOKEN ?? null): Promise<T> {
  const url = path.startsWith("http") ? path : `${API}/projects/${encodeURIComponent(PROJECT)}${path}`;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers["PRIVATE-TOKEN"] = token;
  else if (process.env.CI_JOB_TOKEN) headers["JOB-TOKEN"] = process.env.CI_JOB_TOKEN;
  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) throw new Error(`${method} ${path.replace(/private_token=[^&]+/, "")} -> ${res.status} ${(await res.text()).slice(0, 300)}`);
  const ct = res.headers.get("content-type") ?? "";
  return (ct.includes("json") ? await res.json() : await res.text()) as T;
}

/** All pages of a list endpoint. */
export async function apiAll<T>(path: string, max = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; out.length < max; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const batch = await api<T[]>("GET", `${path}${sep}per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

export const DATA_BRANCH = process.env.AUTOPILOT_DATA_BRANCH ?? "autopilot-data";

/** Reads a JSON ledger from the data branch, or `fallback` if missing. */
export async function readLedger<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await api<string | T>("GET", `/repository/files/${encodeURIComponent(file)}/raw?ref=${DATA_BRANCH}`);
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
  } catch {
    return fallback;
  }
}

/** Writes files to the data branch in one commit (creates the branch from main if needed). */
export async function writeLedger(files: Record<string, string>, message: string): Promise<void> {
  try {
    await api("GET", `/repository/branches/${DATA_BRANCH}`);
  } catch {
    await api("POST", `/repository/branches?branch=${DATA_BRANCH}&ref=${process.env.CI_DEFAULT_BRANCH ?? "main"}`);
  }
  const actions = await Promise.all(
    Object.entries(files).map(async ([file_path, content]) => {
      let exists = true;
      try {
        await api("GET", `/repository/files/${encodeURIComponent(file_path)}?ref=${DATA_BRANCH}`);
      } catch {
        exists = false;
      }
      return { action: exists ? "update" : "create", file_path, content };
    }),
  );
  await api("POST", "/repository/commits", { branch: DATA_BRANCH, commit_message: `${message} [skip ci]`, actions });
}

export async function mrNote(iid: number | string, body: string, marker?: string): Promise<void> {
  // Update our previous note (same marker) instead of spamming the MR.
  if (marker) {
    const notes = await api<{ id: number; body: string }[]>("GET", `/merge_requests/${iid}/notes?per_page=100&sort=desc`);
    const prev = notes.find((n) => n.body.includes(marker));
    if (prev) {
      await api("PUT", `/merge_requests/${iid}/notes/${prev.id}`, { body: `${marker}\n${body}` });
      return;
    }
  }
  await api("POST", `/merge_requests/${iid}/notes`, { body: marker ? `${marker}\n${body}` : body });
}

export function dryRun(): boolean {
  return process.argv.includes("--dry-run") || process.env.AUTOPILOT_DRY_RUN === "true";
}
