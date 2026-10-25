// Pure mapping from GitLab activity to the 9 DevSecOps stages.
export const STAGES = ["plan", "create", "verify", "package", "secure", "release", "configure", "monitor", "govern"] as const;
export type Stage = (typeof STAGES)[number];
export type StageState = "idle" | "running" | "success" | "failed";

export interface JobLike {
  name: string;
  stage: string;
  status: string;
}

export function stageOfJob(job: JobLike): Stage | null {
  const n = job.name;
  if (n.startsWith("terraform")) return "configure";
  if (n.startsWith("monitor") || n.includes("canary-watch") || n.startsWith("chaos")) return "monitor";
  if (n.includes("merge-gate") || n.startsWith("sci") || n.startsWith("carbon") || n.startsWith("policy") || n.startsWith("pii")) return "govern";
  switch (job.stage) {
    case "build":
    case "test":
    case "personas":
    case "verify-live":
      return "verify";
    case "secure":
      return "secure";
    case "package":
      return "package";
    case "review":
    case "deploy":
    case "release":
      return "release";
    case "govern":
    case ".pre":
    case ".post":
      return "govern";
    case "monitor":
      return "monitor";
    default:
      return null;
  }
}

export function jobState(status: string): StageState {
  if (status === "failed") return "failed";
  if (status === "success") return "success";
  if (["running", "pending", "created", "preparing", "waiting_for_resource"].includes(status)) return "running";
  return "idle"; // skipped, manual, canceled
}

/** Combines states: failed beats running beats success beats idle. */
export function combine(states: StageState[]): StageState {
  if (states.includes("failed")) return "failed";
  if (states.includes("running")) return "running";
  if (states.includes("success")) return "success";
  return "idle";
}

export function stageStates(jobs: JobLike[], extra: Partial<Record<Stage, StageState>> = {}): Record<Stage, StageState> {
  const buckets = Object.fromEntries(STAGES.map((s) => [s, [] as StageState[]])) as Record<Stage, StageState[]>;
  for (const job of jobs) {
    const s = stageOfJob(job);
    if (s) buckets[s].push(jobState(job.status));
  }
  for (const [s, st] of Object.entries(extra) as [Stage, StageState][]) buckets[s].push(st);
  return Object.fromEntries(STAGES.map((s) => [s, combine(buckets[s])])) as Record<Stage, StageState>;
}

/** Bullet lines under "## Lessons learned" in AGENTS.md. */
export function parseLessons(agentsMd: string): string[] {
  const section = /^## Lessons learned\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(agentsMd)?.[1] ?? "";
  return section
    .split("\n")
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
    .filter((l) => l && !l.startsWith("_"));
}
