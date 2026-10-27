import { describe, expect, it } from "vitest";
import { canaryPlan, loadPolicy, tierOfChange, tierOfFile } from "../lib/policy";
import { globToRegExp } from "../lib/glob";
import { decide, verdictsFromNotes, type GateInput } from "./decide";

const policy = loadPolicy();
const okJobs = ["build:lint", "build:typecheck", "build:next", "test:unit", "test:e2e", "test:coverage-tier2", "secret_detection", "semgrep-sast", ...["kamla", "harbans", "rano", "mohan", "bittu"].map((p) => `persona:${p}`)].map((name) => ({ name, status: "success" }));
const base: GateInput = {
  author: "ai-builder",
  changedFiles: ["components/DoseCard.tsx"],
  labels: [],
  jobs: okJobs,
  verdicts: { "elder-care": "APPROVE" },
  findings: {},
  carbonMode: "full",
  trust: 50,
  extraReviewer: null,
};

describe("glob", () => {
  it("handles ** and *", () => {
    expect(globToRegExp("lib/schedule/**").test("lib/schedule/index.ts")).toBe(true);
    expect(globToRegExp("**/*.md").test("README.md")).toBe(true);
    expect(globToRegExp("**/*.md").test("docs/a/b.md")).toBe(true);
    expect(globToRegExp("persona:*").test("persona:kamla")).toBe(true);
    expect(globToRegExp("ci/**").test("cix/a")).toBe(false);
  });
});

describe("tiers", () => {
  it("classifies files", () => {
    expect(tierOfFile(policy, "lib/schedule/index.ts")).toBe(2);
    expect(tierOfFile(policy, "AGENTS.md")).toBe(2);
    expect(tierOfFile(policy, "docs/x.md")).toBe(0);
    expect(tierOfFile(policy, "messages/pa.json")).toBe(0);
    expect(tierOfFile(policy, "components/DoseCard.tsx")).toBe(1);
    expect(tierOfChange(policy, ["docs/a.md", "lib/doses/index.ts"])).toBe(2);
    expect(tierOfChange(policy, [])).toBe(0);
  });
  it("trust never shortens a tier 2 canary below its floor", () => {
    expect(canaryPlan(policy, 2, 100).minutes).toBe(15);
    expect(canaryPlan(policy, 1, 100).minutes).toBe(3);
    expect(canaryPlan(policy, 1, 10)).toMatchObject({ minutes: 10, extraReviewer: "elder-care-second" });
    expect(canaryPlan(policy, 0, null).minutes).toBe(5);
  });
});

describe("decide", () => {
  it("merges a clean tier 1 agent MR", () => {
    expect(decide(policy, base).decision).toBe("merge");
  });
  it("blocks on a failed persona", () => {
    const jobs = okJobs.map((j) => (j.name === "persona:kamla" ? { ...j, status: "failed" } : j));
    expect(decide(policy, { ...base, jobs }).decision).toBe("blocked");
  });
  it("blocks when the reviewer asked for changes", () => {
    expect(decide(policy, { ...base, verdicts: { "elder-care": "CHANGES" } }).decision).toBe("blocked");
  });
  it("tier 2 needs two independent reviewers", () => {
    const t2 = { ...base, changedFiles: ["lib/doses/index.ts"] };
    expect(decide(policy, t2).decision).toBe("blocked");
    expect(decide(policy, { ...t2, verdicts: { "elder-care": "APPROVE", "elder-care-second": "APPROVE" } }).decision).toBe("merge");
  });
  it("a label cannot lower the tier", () => {
    expect(decide(policy, { ...base, changedFiles: ["lib/doses/index.ts"], labels: ["tier::0"] }).tier).toBe(2);
  });
  it("agent touching policy or CI needs a human, human author does not", () => {
    expect(decide(policy, { ...base, changedFiles: [".autopilot/policy.yml"] }).decision).toBe("needs-human");
    expect(decide(policy, { ...base, changedFiles: ["ci/test.yml"] }).decision).toBe("needs-human");
    expect(decide(policy, { ...base, author: "yash", changedFiles: ["LICENSE"], verdicts: {} }).rows.find((r) => r.check === "Forbidden paths")!.ok).toBe(true);
  });
  it("docs-only tier 0 needs only secret detection, but any job that ran must pass", () => {
    const docs = { ...base, changedFiles: ["docs/agents.md"], verdicts: {}, jobs: [{ name: "secret_detection", status: "success" }] };
    expect(decide(policy, docs).decision).toBe("merge");
    expect(decide(policy, { ...docs, jobs: [...docs.jobs, { name: "build:lint", status: "failed" }] }).decision).toBe("blocked");
    expect(decide(policy, { ...docs, jobs: [] }).decision).toBe("blocked");
  });
  it("blocks on high or critical findings", () => {
    expect(decide(policy, { ...base, findings: { high: 1 } }).decision).toBe("blocked");
    expect(decide(policy, { ...base, findings: { medium: 3 } }).decision).toBe("merge");
  });
  it("low trust adds the second reviewer", () => {
    expect(decide(policy, { ...base, extraReviewer: "elder-care-second" }).decision).toBe("blocked");
  });
});

describe("verdictsFromNotes", () => {
  it("takes the newest agent verdict and ignores humans", () => {
    const notes = [
      { body: "<!-- autopilot:review reviewer=elder-care verdict=APPROVE -->", author: { username: "ai-reviewer" } },
      { body: "<!-- autopilot:review reviewer=elder-care verdict=CHANGES -->", author: { username: "ai-reviewer" } },
      { body: "<!-- autopilot:review reviewer=elder-care-second verdict=APPROVE -->", author: { username: "someone" } },
    ];
    expect(verdictsFromNotes(policy, notes)).toEqual({ "elder-care": "APPROVE" });
  });

  it("reads the visible bracket marker that Duo flows post", () => {
    const notes = [{ body: "[autopilot:review reviewer=elder-care-second verdict=CHANGES]\nTarget too small.", author: { username: "ai-elder-care-reviewer-x" } }];
    expect(verdictsFromNotes(policy, notes)).toEqual({ "elder-care-second": "CHANGES" });
  });
});
