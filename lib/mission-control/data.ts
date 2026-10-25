import "server-only";
import { gl, gitlabConfigured, repoFile, repoJson } from "../gitlab/client";
import { parseLessons, stageStates, type JobLike, type Stage, type StageState } from "./stages";

export const DATA_BRANCH = process.env.AUTOPILOT_DATA_BRANCH ?? "autopilot-data";
export const PERSONAS = ["kamla", "harbans", "rano", "mohan", "bittu"] as const;

interface Issue { iid: number; title: string; web_url: string; state: string; labels: string[]; updated_at: string }
interface MR { iid: number; web_url: string; state: string; merge_commit_sha: string | null; sha: string; source_branch: string }
interface Pipeline { id: number; status: string; sha: string; ref: string; web_url: string; created_at: string }
interface Job extends JobLike { id: number; finished_at: string | null }
interface Event { id: number; action_name: string; target_type: string | null; target_title: string | null; created_at: string; author_username: string }
interface TestSummary { test_suites: { name: string; total_count: number; failed_count: number; error_count: number }[] }

export interface SciReport { perDeployG: number; baselinePerDeployG: number | null; monthToDateG: number; monthlyBudgetG: number; perMrG?: number }
export interface TrustLedger { agents: Record<string, Record<string, number>> }
export interface ChaosBoard { rounds: number; detected: number; mttdMinutes: number | null; mttrMinutes: number | null; last?: { attack: string; outcome: string } }
export interface Diary { entries: { date: string; text: string }[] }

export interface MissionData {
  connected: boolean;
  fetchedAt: string;
  story: { title: string; url: string; iid: number; mrUrl: string | null } | null;
  stages: Record<Stage, StageState>;
  timeline: { id: number; who: string; what: string; when: string }[];
  personas: Record<(typeof PERSONAS)[number], "pass" | "fail" | "unknown">;
  sci: SciReport | null;
  trust: TrustLedger | null;
  chaos: ChaosBoard | null;
  lessons: string[];
  diary: Diary | null;
}

async function jobsOf(pipelineId: number): Promise<Job[]> {
  return (await gl<Job[]>(`/pipelines/${pipelineId}/jobs?per_page=100&include_retried=false`)) ?? [];
}

export async function loadMissionData(): Promise<MissionData> {
  const empty: MissionData = {
    connected: false,
    fetchedAt: new Date().toISOString(),
    story: null,
    stages: stageStates([]),
    timeline: [],
    personas: { kamla: "unknown", harbans: "unknown", rano: "unknown", mohan: "unknown", bittu: "unknown" },
    sci: null,
    trust: null,
    chaos: null,
    lessons: [],
    diary: null,
  };
  if (!gitlabConfigured()) return empty;

  const [issues, events, agentsMd, sci, trust, chaos, diary] = await Promise.all([
    gl<Issue[]>("/issues?labels=autopilot&order_by=updated_at&per_page=1"),
    gl<Event[]>("/events?per_page=15"),
    repoFile("AGENTS.md", "main"),
    gl<SciReport>(`/jobs/artifacts/main/raw/reports/sci-report.json?job=${encodeURIComponent("sci:report")}`, 30_000),
    repoJson<TrustLedger>("trust.json", DATA_BRANCH),
    repoJson<ChaosBoard>("chaos.json", DATA_BRANCH),
    repoJson<Diary>("diary.json", DATA_BRANCH),
  ]);

  const issue = issues?.[0] ?? null;
  let mr: MR | null = null;
  let jobs: Job[] = [];
  let personaPipeline: number | null = null;
  const extra: Partial<Record<Stage, StageState>> = {};

  if (issue) {
    extra.plan = issue.labels.some((l) => l.startsWith("tier::")) ? "success" : "running";
    const mrs = (await gl<MR[]>(`/issues/${issue.iid}/related_merge_requests`)) ?? [];
    mr = mrs[0] ?? null;
    if (mr) {
      extra.create = "success";
      const mrPipes = (await gl<Pipeline[]>(`/merge_requests/${mr.iid}/pipelines?per_page=1`)) ?? [];
      if (mrPipes[0]) {
        jobs = jobs.concat(await jobsOf(mrPipes[0].id));
        personaPipeline = mrPipes[0].id;
      }
      if (mr.merge_commit_sha) {
        const mainPipes = (await gl<Pipeline[]>(`/pipelines?sha=${mr.merge_commit_sha}&ref=main&per_page=1`)) ?? [];
        if (mainPipes[0]) jobs = jobs.concat(await jobsOf(mainPipes[0].id));
      }
    } else {
      extra.create = issue.labels.includes("autopilot::building") ? "running" : "idle";
    }
  }

  const personas = { ...empty.personas };
  if (personaPipeline) {
    const summary = await gl<TestSummary>(`/pipelines/${personaPipeline}/test_report_summary`);
    for (const suite of summary?.test_suites ?? []) {
      const p = PERSONAS.find((x) => suite.name === `persona:${x}` || suite.name.endsWith(x));
      if (p && suite.total_count > 0) personas[p] = suite.failed_count + suite.error_count > 0 ? "fail" : "pass";
    }
  }

  return {
    connected: true,
    fetchedAt: new Date().toISOString(),
    story: issue ? { title: issue.title, url: issue.web_url, iid: issue.iid, mrUrl: mr?.web_url ?? null } : null,
    stages: stageStates(jobs, extra),
    timeline: (events ?? []).map((e) => ({
      id: e.id,
      who: e.author_username,
      what: [e.action_name, e.target_type, e.target_title].filter(Boolean).join(" ").slice(0, 120),
      when: e.created_at,
    })),
    personas,
    sci: sci && typeof sci === "object" ? sci : null,
    trust,
    chaos,
    lessons: agentsMd ? parseLessons(agentsMd) : [],
    diary,
  };
}
