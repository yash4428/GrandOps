# PRD — `<PROJECT_NAME>`: a self-healing, hands-off delivery loop for software that vulnerable people depend on

> **Name note:** `<PROJECT_NAME>` is a placeholder. The hackathon FAQ explicitly says *don't let AI name the project*. Yash picks the final name. The demo app's name is also a placeholder: `<APP_NAME>`.

---

## 0. TL;DR

We are building a **team of GitLab Duo agents** that takes over everything after code is written, for a small team shipping a **medicine-reminder app for elderly patients and their caregivers in India**.

A human (or a grandparent tapping "Something's wrong" in the app) creates an issue. Then, with **no human in the middle**, agents:

plan → write code → test it as five synthetic elderly personas → review → scan for security issues → package → deploy to staging → verify the live site → canary to production → watch production → roll back and open an incident if anything breaks → fix it → write a postmortem → teach every agent the lesson so it doesn't happen again.

Every run is **measured in grams of CO₂** using the Software Carbon Intensity (SCI) spec. Every agent action is **audited and bounded by a policy**. A **Mission Control** page shows all nine DevSecOps stages lighting up live.

---

## 1. Hackathon context (source of truth for constraints)

| Item | Detail |
|---|---|
| Hackathon | **Life After Code** — GitLab Transcend Hackathon (Devpost) |
| URL | https://gitlab-transcend.devpost.com/ |
| Deadline | **Oct 27, 2026, 1:00 PM UTC (6:30 PM IST)** — nothing can be changed after this |
| Judging | Oct 28 – Nov 14, 2026. Winners ~Nov 16, 2026 |
| Sponsors / judges | GitLab, Google Cloud, Anthropic |
| Required tech | **GitLab Duo Agent Platform** (agents, flows, triggers, MCP). Using it is a **pass/fail gate** in judging Stage One |
| Credits | 500 GitLab Credits / participant / month. Usage stops when they run out. Dashboard: https://gitlab.com/-/profile/gitlab_credits_dashboard |
| Role | "Developer + AI" role in the provisioned hackathon group |

### 1.1 Our entry strategy

| Decision | Choice | Why |
|---|---|---|
| Path | **Path A: Start Fresh** | Everything new (created on/after Oct 5, 2026). No deployment required, but we deploy anyway for the bonus |
| Autonomy level | **Hands-off** ($5,000) | Highest prize; "set intent and walk away" is exactly our story |
| Special prize (primary target) | **Most Stages Covered** ($5,000) | A real hands-off loop naturally touches all 9 stages |
| Special prize (eligible backup) | **Most Environmentally Impactful** ($5,000, opt-in) | We quantify SCI per pipeline/deploy with before/after numbers |
| Also | **Most Creative** ($4,000) | Comes from top Innovation score; the persona panel + self-healing + learning agents are the novelty |
| Bonus | **Google Cloud deployment** (+0.2, max score 5.2) | Cloud Run deployment, code in repo, public live URL |

**Rule:** one project can win **one Path prize + one Special prize**. Build to be strong for Stages *and* Environment; we can only win one of them.

### 1.2 Judging criteria (equal weight) → how we score

| Criterion | What judges ask | Our answer |
|---|---|---|
| Technological Implementation | Thorough, skillful, non-trivial GitLab automation of the post-code lifecycle | 10 custom flows + foundational flows + full CI/CD + IaC + policies, all visible in pipeline history |
| Design | Complete, coherent end-to-end workflow | One continuous loop from issue → prod → monitor → back to issue |
| Potential Impact | Credible, specific problem, real audience | Small health/NGO teams serving elderly users; a UI bug = a missed dose |
| Innovation / Idea | Creative, novel use of agentic automation | Synthetic-grandparent persona testing, chaos vs healer, earned autonomy, agents that learn from postmortems, carbon budget |
| Presentation | Video shows automation running end-to-end; who/why clear | Mission Control view + the "break prod, watch it heal" moment |

Tie-breaks use criteria in listed order, so **Technological Implementation matters most in ties**.

### 1.3 Hard submission requirements (do not miss any)

- [ ] **Public GitLab project** with all source code, assets, and run instructions
- [ ] **MIT `LICENSE` file at repo root**, detected and visible in the About section
- [ ] **Visible CI/CD pipeline history** showing the automation running (run it many times, keep history)
- [ ] Text description: what it does, problem solved, how GitLab automates the post-code lifecycle
- [ ] **Demo video under 3 minutes**, YouTube, Public or Unlisted, showing automation running. **No third-party trademarks, no copyrighted music**
- [ ] Google Cloud bonus: **deployment code in the repo** + **public live URL** on Google Cloud
- [ ] Environmental prize: opt in on the form; explain sustainability practices; **quantify with SCI**
- [ ] Keep the live deployment up until ~Nov 16, 2026
- [ ] All third-party code under OSI-approved licenses; our code MIT; agent YAML configs are covered by MIT + GitLab DCO
- [ ] **Freeze everything after the deadline** (repo, video, form). Continue work only in a fork
- [ ] Everything in English

---

## 2. Problem

Small teams build software for people who can't afford it to fail: medicine reminders for elderly patients, caregiver dashboards, NGO health records. They usually have **no DevOps engineer, no QA, no security engineer, and no accessibility expert**.

For these users, ordinary bugs are not ordinary:

- A button that shrinks from 48px to 32px is a missed tap for someone with a hand tremor, which means a dose isn't logged.
- A translation key that falls back to English means a Punjabi-only grandmother can't read the screen.
- A page that takes 9 seconds on a cheap phone over 3G means the app gets abandoned.
- A reminder job that silently fails means a missed dose, and nobody notices.

Today these teams ship with no safety net, and nobody watches production at 2 AM.

## 3. Users

| User | Need |
|---|---|
| **Primary: the small product team** (1–3 devs at a health startup or NGO) | Ship features and fixes safely without a DevOps/QA/security/a11y team |
| **End users of the demo app: elderly patients** | Large, readable, translated, forgiving UI that works on cheap phones |
| **Caregivers** (children, grandchildren, nurses) | Know whether doses were taken; report problems easily; understand what changed |
| **Judges** | See it run end-to-end, trust it isn't reckless, understand impact in <3 minutes |

## 4. Goals and non-goals

### Goals
1. A **fully hands-off loop**: one human action (create an issue, or tap "Something's wrong") → change live in production with no further human action.
2. **Touch all 9 DevSecOps stages**, each with a real, visible artifact.
3. **Self-healing**: production regressions are detected, rolled back, turned into incidents, fixed, and redeployed automatically.
4. **Elderly-first verification**: five synthetic personas gate every merge and every deploy.
5. **Measured sustainability**: SCI score per pipeline and per deployment, with a before/after comparison.
6. **Governed autonomy**: agents can't do anything the policy doesn't allow; every action is auditable.

### Non-goals
- A production-grade medical product. The demo app is real and working, but it uses **synthetic data only**. No real patient data, ever.
- Native mobile apps. The demo app is a responsive web app (PWA-capable).
- Supporting every cloud. Google Cloud only.

---

## 5. Verified platform facts and constraints (read before designing anything)

These come from GitLab docs (docs version 19.6). They shape the architecture. **Re-verify in Phase 0** because features change quickly.

### 5.1 Flows and agents
- **Custom flows** are YAML (Flow Registry v1: `version`, `environment: ambient`, `components`, `routers`, `flow`, `prompts`). Created in the UI (**AI → Flows → New flow**), AI Catalog, or the VS Code flow builder. Creating/enabling flows and triggers needs **Maintainer/Owner** role.
- Component types: `AgentComponent` (multi-turn with tools), `OneOffComponent` (single LLM round + tools), `DeterministicStepComponent` (one tool, no LLM), `HumanInputComponent` (we won't use it in the hands-off path), plus `end` / `abort`.
- **Supervisor mode**: an `AgentComponent` with `subagents` + `max_delegations` delegates to sub-agents (each needs a `description`).
- Routers: simple (`from`/`to`) or conditional (`condition.input` + `routes` + **always `default_route`**).
- **Restricted in custom flows:** `environment` must be `ambient`; no `model` in prompts; **no `response_schema_id`** on AgentComponent; no top-level `name`/`description`/`product_group`.
  → Because we can't use response schemas, **any agent whose output drives a conditional router must end with a single exact keyword** (for example `PASS` / `FAIL`), and the prompt must say so.
- Prompt rules: always include `unit_primitives: []` and `placeholder: history`; always end the system prompt with an explicit stop condition; pass `project_id` via inputs and `Project ID: {{ project_id }}` in the user block; **never use `{{ }}` in system prompt text** except real variables (Jinja crash).
- `model_size_preference: "small" | "large"` per component. Use `small` for triage, notes, and summaries to save credits and carbon.
- Flows triggered from the UI **run in GitLab CI/CD** on runners (`gitlab--duo` tag; GitLab-hosted runners work on GitLab.com).
- `.gitlab/duo/agent-config.yml` (read **only from the default branch**) configures the flow job: `image`, `setup_script`, `cache`, `network_policy.allowed_domains`, `id_tokens`.
- **`AGENTS.md`** at the repo root is read by foundational and custom flows. This is how agents "learn" (Feature F7).
- Flow API token: `GITLAB_TOKEN` (`Authorization: Bearer`), limited to `ai_workflows`-scoped endpoints.
- Agent tools we rely on (exact names): `get_issue`, `update_issue`, `create_issue`, `create_issue_note`, `create_work_item`, `update_work_item`, `get_work_item`, `list_work_items`, `gitlab_issue_search`, `create_branch`, `create_commit`, `create_merge_request`, `update_merge_request`, `get_merge_request`, `list_merge_request_diffs`, `create_merge_request_note`, `create_merge_request_diff_note`, `submit_mr_review`, `get_pipeline_errors`, `get_pipeline_failing_jobs`, `get_job_logs`, `ci_linter`, `list_security_findings`, `get_security_finding_details`, `list_vulnerabilities`, `get_vulnerability_details`, `dismiss_vulnerability`, `confirm_vulnerability`, `create_vulnerability_issue`, `link_vulnerability_to_merge_request`, `list_project_audit_events`, `gitlab_api_get`, `get_repository_file`, `list_repository_tree`, `run_tests`, and in CI-executed flows `read_file`, `edit_file`, `create_file_with_contents`, `run_command`, `grep`, `find_files`.
  - **There is no "merge MR" tool.** Merging is done by our deterministic **merge gate** CI job (see §8.4). This is a governance feature, not a workaround.

### 5.2 Triggers (the most important constraint)
Trigger event types: **Mention**, **Assign**, **Assign reviewer**, **Pipeline events** (Running/Passed/Failed/Canceled), **Merge request** (Approved/Created/Marked ready/Merge conflict), **Work item** (Created/Status changed, filterable by type and status).

> **"All trigger event types require a human user to perform the triggering action. A bot, service account, or another flow cannot activate a trigger."**

The only documented exception: **chain triggers**. When a session finishes, a Work-item "Status changed" trigger can set a new status, and that status change can start the next trigger. This needs flags `ai_flow_trigger_status_on_finish` + `ai_flow_trigger_chaining` (GitLab 19.6, disabled by default). **Unknown whether they're on for the hackathon group. Verify in Phase 0.**

Goal formats received by flows (`context:goal`):
- Mention: `Input: <comment>\nContext: {Issue IID: N}`
- Assign / reviewer: `Context:\nIssue|MergeRequest: <url>` (or an IID, depending on a flag; **handle both**)
- MR / Work item events: `Context:\n<Type>: <url>\nAction: <action>`
- Pipeline events: the **full pipeline webhook JSON payload**

Credits for triggered flows are billed to the namespace.

### 5.3 External agents
GitLab-managed **Claude Code Agent** and **Codex Agent** exist in the AI Catalog with GitLab-managed credentials. They're feature-flagged "for verified customers". **Optional**: use only if they appear enabled in the hackathon group. They are not required.

### 5.4 Design consequence: the Loop Wiring problem
Our loop has events that are *not* human: a failing MR pipeline on an agent's branch, a production rollback, a monitor alert, a user report coming through the app's backend. These **cannot** directly start a flow. Section 8.3 defines how we solve this, in priority order, and Phase 0 picks the working option.

**Ethics rule:** we do **not** use a personal access token to impersonate a human so that bot events look human. That defeats GitLab's loop-protection, and the judges are GitLab engineers. If no legitimate option works for an event, we ask in the GitLab Discord `#transcend-hackathon` and fall back to the next option.

---

## 6. Solution overview

### 6.1 The loop

```
 (human) create issue ─┐            (grandma) taps "Something's wrong" ─┐
                       ▼                                                ▼
                 ┌──────────┐  plan   ┌─────────┐ create ┌──────────────────────┐
                 │  TRIAGE  │────────▶│ BUILDER │───────▶│ MR pipeline (VERIFY) │
                 └──────────┘         └─────────┘        │ unit/e2e, personas,  │
                       ▲                                 │ code review, SAST... │
                       │                                 └──────────┬───────────┘
                       │                                            │ green + policy OK
                       │                                    ┌───────▼────────┐
                       │                                    │  MERGE GATE    │ (govern)
                       │                                    └───────┬────────┘
                       │                                            ▼
                       │   package → staging → live personas → canary prod → promote
                       │                                            │ release + notes
                       │                                            ▼
                ┌──────┴──────┐  incident   ┌─────────┐   watches  ┌────────────┐
                │   HEALER    │◀────────────│ MONITOR │◀───────────│ PRODUCTION │
                └──────┬──────┘             └─────────┘            └────────────┘
                       │ postmortem + lesson → AGENTS.md (SCRIBE)
                       ▼
                  every agent is now smarter
```

### 6.2 Stage coverage map (for "Most Stages Covered")

| Stage | GitLab features used | Agent(s) | Visible proof for judges |
|---|---|---|---|
| **Plan** | Issues/work items, labels, milestones, child tasks, statuses, issue search (dedupe), incidents | Triage | Issue gets acceptance criteria, risk tier, persona test plan, child tasks |
| **Create** | Branches, commits, MRs, `AGENTS.md` | Builder (supervisor: developer + tester + persona-fixer) | Agent-authored MR linked to the issue |
| **Verify** | CI pipelines, unit/e2e tests, test reports, **Code Review flow**, **Fix CI/CD Pipeline flow**, persona panel | Builder, Elder-care Reviewer, Persona Panel, Green Steward | MR comments: persona cards, review verdict, SCI delta |
| **Package** | **Container Registry**, CycloneDX **SBOM**, Package Registry (persona test kit) | (CI) | Image tags per commit; SBOM artifact; published npm package |
| **Secure** | SAST, Secret Detection, Dependency Scanning, Container Scanning, (DAST if available), Vulnerability Report, **SAST false-positive detection** | Sentinel | Findings fixed in-MR or dismissed with a written reason |
| **Release** | Environments, deployments, **canary**, **Releases**, tags, changelog, **Feature Flags** | Herald | GitLab Release with dev notes + Hindi/Punjabi plain-language notes |
| **Configure** | **Terraform** with GitLab-managed state, environment-scoped variables, OIDC/Workload Identity to GCP, `agent-config.yml` | (CI), Green Steward | `terraform plan` on MR, `apply` on main |
| **Monitor** | **Error Tracking**, **Incidents**, synthetic monitor pipeline, Cloud Run metrics, Mission Control | Monitor jobs, Healer, Chaos | Auto-incident → auto-fix MR → recovery timeline |
| **Govern** | Protected branches, **merge request approval / scan execution / pipeline execution policies** (if tier allows), compliance labels, **audit events**, autonomy policy, tool governance | Scribe, Merge Gate | Per-release audit record; policy file; trust ledger |

---

## 7. Features (all in scope)

Each feature has an ID, the user value, the requirements, and the acceptance criteria (AC). **Every feature must leave a visible trace in GitLab** (comment, artifact, pipeline job, release, or Mission Control panel). That's what judges see.

### F1. Hands-off core loop
**Value:** one human action → live in production.
**Requirements**
- Triage flow triggers on **Work item Created** (type Issue) and on **Mention**.
- Triage → Builder handoff via chain triggers (status `Ready for dev`), or the fallback from §8.3.
- Builder opens an MR targeting `main` with a `Closes #N` link.
- MR pipeline runs all verify/secure jobs. On success, the merge gate sets auto-merge.
- `main` pipeline: package → staging → live verification → canary → promote → release.
- Final summary comment posted on the original issue (what changed, which checks ran, SCI grams, links). Issue closed.

**AC:** Create an issue like "Make the 'Taken' button say 'Dose taken' and add a confirmation tick". With no further human input, the change is live in production with a release and a summary on the issue. Pipeline history proves it.

### F2. Triage agent (Plan)
- Reads the issue. Classifies it as `type::feature|bug|chore`. Assigns **risk tier** (`tier::0|1|2`, see F9). Flags `medication-critical` if it touches dose/schedule logic.
- Dedupes with `gitlab_issue_search`. Links and closes duplicates with a polite note.
- Writes **acceptance criteria** (Given/When/Then) and a **persona test plan** (which personas are relevant and why).
- Creates child **tasks** if the work is larger than one MR.
- For user reports (F12): translates Hindi/Punjabi to English, keeping the original text, and turns the complaint into reproducible steps.
- `model_size_preference: small`.

**AC:** The issue description gains a structured "Autopilot Plan" section, labels, and a tier. Visible within ~2 minutes.

### F3. Builder (Create + Verify)
- Supervisor flow with sub-agents:
  - `developer`: implements the change. Must read `AGENTS.md` lessons first.
  - `tester`: writes/updates unit + e2e tests for the acceptance criteria; runs them locally in the flow job (`run_tests` / `run_command`).
  - `persona_fixer`: runs the persona suite locally (F5) and fixes violations before pushing.
- **Self-verify before pushing**: the flow runs lint, typecheck, unit tests, and personas in its own job, so MR pipelines rarely fail. This reduces reliance on bot-triggered fix loops (§5.4).
- `max_delegations` bounded (for example 12) to cap credits.
- Branch name pattern: `duo/feature/<issue-iid>-<slug>` or `duo/fix/...` (agent-push branch rules may be required).

**AC:** The MR contains code + tests. The MR description includes what was done, which personas were run locally, and expected SCI impact.

### F4. Elder-care Reviewer (Verify)
- Runs alongside GitLab's foundational **Code Review flow**, not instead of it.
- Domain checks a generic reviewer misses: timezone handling (Asia/Kolkata), dose arithmetic, missed-dose edge cases (midnight rollover, DST irrelevance in India but still UTC-safe), i18n completeness, plain-language copy, no PII in logs.
- Posts a review with `submit_mr_review`. Final answer ends with exactly `APPROVE` or `CHANGES`.
- **Tier 2** changes get a **second, independent reviewer** pass (separate component, separate prompt). Both must `APPROVE`.

**AC:** Every agent MR shows two review sources: GitLab Code Review + Elder-care Reviewer. Tier 2 shows two reviewer verdicts.

### F5. "Synthetic grandparents": persona panel ⭐ signature feature
Five fictional personas run as **Playwright projects** (+ axe-core). Each produces a pass/fail card with screenshots.

| Persona | Simulates | Checks (all automated) |
|---|---|---|
| **Kamla, 78: hand tremor** | Imprecise taps | Interactive targets ≥ 48×48 CSS px; ≥ 8px spacing between targets; "jitter click" test (random ±6px offset ×20) still hits the intended control; no tiny close icons; destructive actions need confirmation |
| **Harbans, 72: low vision** | 200% zoom, blur | Reflow at 320px width without horizontal scroll (WCAG 1.4.10); body text ≥ 18px; key text contrast ≥ 7:1 (AAA); nothing conveyed by colour alone; blur-filter screenshot attached for humans to see |
| **Rano, 70: reads only Punjabi** | `pa-IN` locale | Every visible string comes from the `pa` catalog; **no English leakage** (scan rendered text nodes against `en` catalog values); all keys present in `pa` and `hi`; Gurmukhi font renders (no tofu boxes) |
| **Mohan, 81: blind, uses a screen reader** | Keyboard + assistive tech | axe-core 0 serious/critical violations; every control has an accessible name; logical focus order; full core flow ("mark dose taken") completable by keyboard only |
| **Bittu's ₹6,000 phone on 3G** | Low-end Android, slow network | CPU throttle 4× + network ~400 kbps / 400 ms RTT; LCP < 3.0 s on the Today screen; JS ≤ 170 KB gzipped on first load; total page weight budget (ties to F10 carbon) |

- Runs in **three places**: inside the Builder flow (pre-push), in the MR pipeline (`personas` stage), and against the **live staging + prod URLs** after deploy (`verify-live`).
- Output: `personas-report.json` + screenshots as artifacts; JUnit for GitLab test reports; a **Persona Panel MR comment** (one card per persona, ✅/❌, the failing element, and a plain-language "what Kamla would experience").
- An LLM step turns failures into human language. The checks themselves are deterministic, so they don't consume credits.
- Optional (Package stage): publish the persona kit as an npm package to the **GitLab Package Registry** so other NGOs can reuse it.

**AC:** Introducing a 32px button makes the Kamla card fail with a screenshot. The Builder fixes it before merge.

### F6. Sentinel (Secure)
- CI includes GitLab templates: SAST, Secret Detection, Dependency Scanning, Container Scanning (+ DAST against the review/staging URL if the tier allows).
- Sentinel flow: reads findings (`list_security_findings`, `get_security_finding_details`, `list_vulnerabilities`):
  - **Real + fixable** → commits a fix to the MR branch, links the vulnerability to the MR.
  - **False positive** → `dismiss_vulnerability` with a written justification (also complements GitLab's SAST FP detection).
  - **Real, not fixable now** → `create_vulnerability_issue` + the merge gate blocks if severity ≥ high.
- **Demo seed:** a deliberately vulnerable dependency version or an unsafe pattern in a demo MR, so the video shows a real find → fix.

**AC:** The vulnerability report shows findings resolved by the agent, with MR links and dismissal reasons.

### F7. Agents that learn: postmortems → `AGENTS.md`
- After any rollback or incident, **Scribe** writes `docs/postmortems/YYYY-MM-DD-<slug>.md` (blameless format: timeline, impact, root cause, detection, fix, lesson).
- Scribe distils one **lesson** into the `## Lessons learned` section of `AGENTS.md` (for example: "Never compute dose times with local-time `Date` math; use the `schedule` helpers in `lib/schedule.ts`.").
- Because flows read `AGENTS.md`, every future run follows the lesson.
- Mission Control shows a "Lessons learned" counter and the latest lesson.

**AC (demo moment):** Chaos injects bug X → heal → lesson recorded. A later issue that tempts the same mistake → the Builder's MR description cites the lesson and avoids it.

### F8. Healer (Monitor → Plan → Create)
- Input: an incident (from the canary watcher, synthetic monitor, error tracking spike, or chaos).
- Steps:
  1. Diagnose with logs (`get_job_logs`), error tracking data, and recent diffs.
  2. If prod is degraded and the last deploy is suspect → confirm the deterministic **auto-rollback** happened (the CI job does the rollback, not the LLM).
  3. Open a fix MR, then go through the normal gate.
  4. Hand off to Scribe for the postmortem.
- Incidents are GitLab **Incident** work items with a timeline of notes.

**AC:** Breaking prod produces: rollback within the canary window, an incident with a diagnosis, a fix MR, redeploy, incident closed with MTTR recorded.

### F9. Earned autonomy (trust score) + autonomy policy
- `.autopilot/policy.yml` (version-controlled, protected by CODEOWNERS):
  - **Risk tiers by path** (examples):
    - `tier::0`: `docs/**`, `*.md`, copy/i18n strings, pure CSS
    - `tier::1`: UI components, pages
    - `tier::2`: `lib/schedule/**`, `lib/doses/**`, auth, data model, infra (`infra/**`), CI config, `.autopilot/**`, `AGENTS.md`
  - **Required checks per tier.** Tier 2 adds: second reviewer, mutation or property tests on schedule logic, longer canary (for example 15 min vs 5 min), 10% traffic split.
  - **Forbidden actions** for agents: editing `.autopilot/policy.yml`, editing security policies, disabling jobs, lowering thresholds, touching `LICENSE`. Any MR touching these is **never auto-merged**; it is labelled `needs-human` and left open. This is the one deliberate exception to hands-off, and it's a selling point.
- **Trust ledger** (`.autopilot/trust.json` on a data branch, or Firestore): per agent per tier. Start 50; +5 per merge that survives 24h; −25 per rollback attributed to the agent; floor 0, cap 100.
- **Trust changes how much verification runs, never whether humans approve**: high trust → shorter canary, fewer redundant persona runs on tier 0/1. Low trust → extra reviewer and longer canary. **Tier 2 minimum checks can never be reduced.**
- The merge gate reads policy + trust and prints its decision as a table in the job log and an MR comment.

**AC:** Mission Control shows trust scores. A rollback visibly lowers the Builder's score and lengthens the next canary.

### F10. Green layer: SCI measurement + carbon budget
- **SCI = ((E × I) + M) per R**, per the Green Software Foundation SCI spec (ISO/IEC 21031:2024).
  - **E (energy, kWh):** sum over CI jobs of `duration × vCPU × watts-per-vCPU` (+ memory term), plus Cloud Run usage for the deploy window. Coefficients from the **Cloud Carbon Footprint** methodology. **Cite the source and version in `docs/sustainability.md`. Don't invent numbers.**
  - **LLM inference energy:** estimated per flow session from token counts (if obtainable) with a published per-token energy estimate. Report it as a **separate, clearly-labelled uncertain line** with low/high bounds.
  - **I (gCO₂e/kWh):** grid intensity for the region where the work ran (Google's published per-region grid carbon data; Electricity Maps if an API key is available). Document assumptions about where GitLab-hosted runners run.
  - **M (embodied):** CCF embodied-emissions approach, time-share of hardware.
  - **R (functional unit):** **per deployment to production** (primary) and **per MR** (secondary).
- `scripts/sci/` computes the score from the GitLab API (job durations, runner types) → `sci-report.json` artifact + MR comment ("This MR: 3.1 gCO₂e; 41% less than baseline").
- **Smart pipeline** (the optimisation we measure):
  - `rules:changes` skips irrelevant jobs (docs-only → no build/e2e/container scan).
  - Test-impact selection: run only affected unit tests (`vitest --changed`) and persona projects tagged by affected routes; full suite on `main` and nightly.
  - Caching (pnpm store, Playwright browsers, Next build cache), `interruptible: true`, auto-cancel redundant pipelines.
  - Smallest viable runner size per job; Cloud Run scale-to-zero with `min-instances=0` for staging.
  - Page-weight budget from F5 (Bittu): fewer bytes → less network + device energy.
  - `model_size_preference: small` for non-coding agents.
- **Carbon budget** (like an SRE error budget): monthly gCO₂e budget in `.autopilot/policy.yml`. A `carbon-gate` job in `.pre` sets `CARBON_MODE=full|lite|defer`:
  - `lite`: skip non-essential heavy jobs (for example the full cross-browser matrix) on tier 0/1.
  - `defer`: postpone nightly/full scans to a scheduled low-intensity window.
  - **Never** defers anything labelled `medication-critical` or any security job on tier 2.
- **Before/after evidence:** run N MRs on a `baseline` CI profile (naive: everything every time) vs the smart profile. Publish the table in `docs/sustainability.md` and on Mission Control.

**AC:** Every MR and release shows SCI. `docs/sustainability.md` has a methodology, a before/after table, and cited coefficients.

### F11. Chaos agent vs healer agents
- **Chaos** flow, triggered by **Mention** (`@ai-chaos-... unleash`) by a human, so it's a legitimate trigger. **Only ever targets staging** (enforced in policy and in the deploy scripts: chaos variables are rejected on the production environment).
- Chaos menu (picked randomly or named):
  1. **a11y regression**: feature flag `chaos_tiny_buttons` shrinks primary buttons to 30px
  2. **i18n leak**: feature flag removes a `pa` key → English fallback appears
  3. **latency**: env `CHAOS_LATENCY_MS=4000` on the staging revision
  4. **crash**: deploys a staging revision whose `/healthz` returns 500
  5. **dependency**: MR pinning a known-vulnerable package version (Sentinel should catch it)
- Each attack is logged as a "round". Detection by monitor/personas → Healer → fix. **Scoreboard**: rounds, detected %, mean time to detect, mean time to recover.

**AC:** The demo video shows one chaos round from attack to recovery, with the scoreboard updating.

### F12. "Something's wrong" button → GitLab issue
- In the demo app: a large, always-visible **"Something's wrong / ਕੁਝ ਗਲਤ ਹੈ / कुछ गड़बड़ है"** button.
- The user can tap a reason chip, type, or **record a voice note** (MediaRecorder).
- The backend stores the report (Firestore) with a screenshot (html2canvas, PII-free), route, device info, locale, and app version.
- Voice → text with **Google Cloud Speech-to-Text** (`hi-IN`, `pa-IN`). The original-language text is kept.
- Report → GitLab issue (label `source::user-report`, `needs-triage`) → Triage (F2) → normal loop. Bot-created issues can't directly trigger flows (§5.2), so this uses the Loop Wiring mechanism (§8.3).
- The reporter sees a big, friendly confirmation in their language. Optional: the app shows "Fixed in version X" on their next visit.
- **Privacy:** no names, phone numbers, or medicine lists are sent to GitLab, only an anonymised report ID. Screenshots mask medicine names.

**AC:** The demo shows a Punjabi voice complaint becoming a translated, triaged issue, then a fix in production.

### F13. Release notes for humans: Herald (Release)
- On every production promotion, the `release` job creates a **GitLab Release** (semver tag, changelog from merged MRs).
- Herald (`OneOffComponent`, small model) writes:
  - Developer notes (English)
  - **Plain-language caregiver notes in Hindi and Punjabi** (for example "The 'Taken' button is now bigger and easier to press.")
  - Optional: audio versions via **Google Cloud Text-to-Speech**, attached as release assets
- The app shows a large "What's new" card in the user's language, with a play button if audio exists.

**AC:** Each GitLab Release has three language sections. The app shows the plain-language note.

### F14. Overnight diary
- Daily scheduled pipeline. A deterministic script aggregates the last 24h: issues closed, MRs merged, vulnerabilities fixed, rollbacks, chaos rounds, SCI grams, credits used (if available).
- Posted as a note on a pinned "Autopilot Diary" issue, and shown on Mission Control.
- An optional one-paragraph LLM summary, generated only if the loop wiring allows a legitimate trigger. Otherwise the diary is template-based, which is fine.

**AC:** The diary issue has one entry per day with real numbers.

### F15. Mission Control dashboard (Presentation)
- Route `/mission-control` in the same Next.js app (read-only, public, no PII).
- Panels:
  1. **The 9-stage ring**: each stage lights up live as jobs and flows run for the current "story" (issue → release)
  2. Live timeline of agent actions (from the GitLab API: notes by `ai-*` service accounts, pipelines, deployments, releases)
  3. Persona Panel results for the latest MR and the latest prod verification
  4. **SCI meter** (per deploy, per MR, monthly budget burn-down) + baseline comparison
  5. **Trust scores** per agent per tier
  6. **Chaos scoreboard** (MTTD/MTTR)
  7. Lessons learned (latest from `AGENTS.md`)
  8. Overnight diary
- Polls server-side every 5s. GitLab token stays server-side. Cached to stay inside API rate limits.
- Designed to be the **main recording surface for the demo video**. Big type, high contrast (it practises what we preach).

**AC:** During the demo, judges can watch the ring light up stage by stage without reading GitLab logs.

### F16. Governance & audit (Govern)
- Protected `main`; CODEOWNERS on `.autopilot/`, `.gitlab-ci.yml`, `infra/`, `AGENTS.md`'s policy header, `LICENSE`.
- If the group tier allows: **scan execution policy** (security scans must run), **merge request approval policy** (block on high/critical findings), **pipeline execution policy**. If not available: enforce the same rules in the merge gate and document it.
- Compliance label on the project (for example "Health data: synthetic only").
- **Release audit record**: Scribe writes `audit/releases/<version>.md` with: triggering issue, every agent session and action (from notes + audit events if accessible), every check result, policy decisions, SCI, and who approved (always "policy merge gate" unless `needs-human`).
- **Agent tool governance:** each flow's `toolset` is minimal (least privilege). Documented in `docs/agents.md` as a table: agent → tools → why.
- PII-in-logs check: CI job greps the build output and test logs for patterns (phone numbers, Aadhaar-like 12-digit numbers, emails). Fails on match.

**AC:** Every production release has an audit record file and a policy decision table.

---

## 8. Architecture

### 8.1 Demo app (`<APP_NAME>`)
- **Next.js (App Router) + TypeScript**, single service, also serves Mission Control.
- **Firestore** (Native mode) for patients (synthetic), medicines, schedules, dose events, user reports, trust/chaos/SCI data. Use the Firestore emulator in CI.
- i18n: `en`, `hi`, `pa` message catalogs (for example `next-intl`). Default to large text and high contrast.
- Core screens: **Today** (big dose cards with "Dose taken" buttons, missed-dose highlight), **Medicines** (add/edit schedule), **Caregiver** (adherence %, missed doses, last 7 days), **Report a problem**, **What's new**, `/healthz`, `/mission-control`.
- `lib/schedule/`: pure, heavily tested functions for dose times (IST-aware, UTC storage). Tier 2.
- Error tracking: Sentry-compatible SDK pointed at **GitLab Error Tracking**.
- Demo mode with seeded synthetic users. No real auth complexity: a simple demo login or shared demo codes. **No real personal data.**

### 8.2 Infrastructure (Google Cloud)
- **Cloud Run** services: `app-staging`, `app-prod`. Prod uses revision tags + traffic splitting for canary.
- **Artifact Registry** (deploy source) + a mirror push to **GitLab Container Registry** (Package stage evidence).
- **Workload Identity Federation** from GitLab CI (OIDC `id_tokens`). **No long-lived service-account keys in CI.**
- **Secret Manager** for app secrets (GitLab API token for Mission Control, STT/TTS settings).
- **Terraform** in `infra/terraform/` with **GitLab-managed Terraform state**. `plan` on MRs, `apply` on `main`.
- Region: prod in `asia-south1` (users are in India). Record the latency-vs-carbon trade-off in `docs/adr/0002-region.md`. Run heavy non-user-facing work (nightly full suites) in a lower-carbon window.
- Cloud Monitoring/Logging for request error rate + latency, read by the canary watcher.

### 8.3 Loop Wiring: how non-human events start flows (decide in Phase 0)
Evaluate in order. Use the first that works per event type, and document the choice in `docs/adr/0001-loop-wiring.md`.

1. **Avoid needing it.** Do as much as possible *inside one flow session*: the Builder self-verifies (tests + personas) before pushing, so failed MR pipelines are rare. Rollbacks are done by **deterministic CI**, not agents.
2. **Official chain triggers** (Work item status → session finish sets the next status → next trigger), if the flags are on. This covers Triage → Builder → (status) chaining natively.
3. **Human-originated pipelines.** Check whether a pipeline from a **schedule owned by Yash** or a **manually-run** pipeline fires a *Pipeline events* trigger. If yes: the synthetic monitor runs as a scheduled pipeline, and a *Failed* event triggers the Healer with the pipeline payload as the goal.
4. **GitLab Duo CLI headless in a CI job.** If the Duo CLI can run a flow non-interactively in CI, a monitor/relay job invokes it directly. This is still the Duo Agent Platform, just started by CI instead of a trigger. Verify auth and credit implications.
5. **Ask GitLab** in Discord `#transcend-hackathon`.
6. **Last resort for the demo:** the event is turned into an issue/incident with all context, and the video shows Yash doing exactly one action (assigning the incident to the Healer). Present this honestly. It still counts as hands-off for the main issue → prod path.

**Never:** a personal token impersonating a human to fake human events.

### 8.4 Merge gate (deterministic, Govern)
- Last job of every MR pipeline: `autopilot:merge-gate` (Node/TS script, no LLM).
- Checks: all required jobs passed; personas all ✅; no unresolved high/critical findings; Elder-care Reviewer `APPROVE` (and the second reviewer for tier 2); no forbidden paths touched; carbon gate didn't skip something required for the tier; MR authored by an `ai-*` service account **or** a human.
- If all pass: set **auto-merge** via the API with a **project access token** (`AUTOPILOT_MERGE_TOKEN`, masked, scope `api`, Maintainer). Post the decision table.
- If anything fails: post the reasons; label `autopilot::blocked`.

### 8.5 CI/CD pipeline (`.gitlab-ci.yml` + `ci/*.yml` includes)
Stages:
```
.pre       carbon-gate, policy-check, pii-scan-config
build      install (cached), lint, typecheck, next build
test       unit (vitest, impact-selected on MRs), e2e (playwright core flows)
personas   persona:kamla, persona:harbans, persona:rano, persona:mohan, persona:bittu
secure     SAST, secret-detection, dependency-scanning, container-scanning, (dast)
package    docker build+push (GitLab registry + Artifact Registry), sbom (CycloneDX), persona-kit npm publish (tags)
review     terraform plan (MR), deploy-staging (main)
verify-live  smoke + personas against staging URL
deploy     canary-prod (10%/tier), canary-watch (5–15 min, error rate & latency SLO), promote | rollback
release    release (tag + GitLab Release), herald-notes
govern     audit-record, trust-update
.post      sci-report, diary (scheduled only), merge-gate (MR only)
```
- Separate **scheduled pipelines**: `synthetic-monitor` (every 30 min; prod smoke + Bittu + Harbans light checks, no LLM), `nightly-full` (full suites, defer-able by carbon gate), `daily-diary`.
- Rollback is **deterministic**: `canary-watch` fails → `rollback` job routes 100% traffic to the previous revision → creates an Incident with job logs attached.

### 8.6 Agent roster (custom flows)

| # | Flow | Stage(s) | Trigger (preferred → fallback) | Key tools | Model size |
|---|---|---|---|---|---|
| 1 | **Triage** | Plan | Work item Created; Mention | `get_issue`, `update_issue`, `gitlab_issue_search`, `create_work_item`, `create_issue_note` | small |
| 2 | **Builder** (supervisor: developer, tester, persona_fixer) | Create, Verify | chain status `Ready for dev`; Assign | file tools, `run_command`, `run_tests`, `create_branch`, `create_commit`, `create_merge_request`, `get_issue` | large |
| 3 | **Elder-care Reviewer** (+ second reviewer for tier 2) | Verify | Merge request Created / Assign reviewer | `get_merge_request`, `list_merge_request_diffs`, `build_review_merge_request_context`, `submit_mr_review` | large |
| 4 | **Persona Explainer** | Verify | runs inside Builder; MR comment from CI artifact | `get_job_logs`, `create_merge_request_note` | small |
| 5 | **Sentinel** | Secure | Merge request Created; Pipeline Passed/Failed on MR (if allowed) | security tools, `create_commit` | large |
| 6 | **Herald** | Release | chain / pipeline Passed on tag (if allowed) | `get_merge_request`, `gitlab_api_get` | small |
| 7 | **Healer** | Monitor → Plan → Create | Pipeline Failed (scheduled monitor) / Work item Created (incident) / §8.3 | `get_job_logs`, `get_pipeline_errors`, file tools, `create_merge_request`, `create_issue_note` | large |
| 8 | **Chaos** | Monitor (verify resilience) | Mention (human) | `create_branch`, `create_commit`, `create_merge_request`, `create_issue_note` | small |
| 9 | **Scribe** | Govern | after Healer / release | file tools, `create_commit`, `create_merge_request`, `list_project_audit_events` | small |
| 10 | **Green Steward** | Verify, Configure | Mention; weekly | `ci_linter`, `get_repository_file`, `create_merge_request` | small |

Also enable **foundational flows**: Code Review, Fix CI/CD Pipeline, Developer/Software Development (as a comparison or backup), and SAST False Positive Detection.

**Flow YAML source of truth:** `.gitlab/duo/flows/<flow>.yaml` in the repo, then pasted into **AI → Flows** (or published via the VS Code flow builder). Keep the repo copy in sync and record the flow's catalog ID in `docs/agents.md`.

### 8.7 Repository layout
```
/                       LICENSE (MIT), README.md, AGENTS.md, CLAUDE.md, PRD.md
/app, /components, /lib   Next.js app (lib/schedule = tier 2)
/messages/{en,hi,pa}.json
/tests/unit  /tests/e2e  /tests/personas/{kamla,harbans,rano,mohan,bittu}
/packages/persona-kit     reusable persona checks (published to GitLab Package Registry)
/scripts/{merge-gate,sci,carbon-gate,trust,diary,audit,chaos-guard}
/infra/terraform          Cloud Run, AR, WIF, Firestore, Secret Manager
/ci/*.yml                 pipeline includes
/.gitlab/duo/agent-config.yml
/.gitlab/duo/flows/*.yaml
/.autopilot/policy.yml    risk tiers, forbidden paths, carbon budget, canary settings
/docs/{architecture.md, agents.md, sustainability.md, demo-script.md, adr/, postmortems/}
/audit/releases/
```

---

## 9. Data & privacy
- **Synthetic data only.** Seed personas and patients are fictional. State this in the README and the video.
- No PII leaves the app to GitLab: user reports carry an anonymised ID, masked screenshots, and transcribed text with names redacted.
- PII-in-logs CI check (F16).
- Mention India's **DPDP Act** in the README as design context (data minimisation, purpose limitation). No legal claims.

## 10. Non-functional requirements
- **Accessibility:** WCAG 2.2 AA minimum, AAA contrast on key text, enforced by personas. Mission Control obeys the same rules.
- **Performance:** Today-screen LCP < 3s on the Bittu profile. JS budget 170 KB gz.
- **Reliability:** canary SLO: error rate < 1% and p95 latency < 1.5s during the watch window.
- **Cost:** stay inside GCP free credits. Cloud Run min instances 0 (staging), 0–1 (prod during judging, so judges don't hit cold starts; decide based on budget).
- **Credits:** budget GitLab Credits per flow. Log the session count. Avoid retry storms (`max_delegations`, explicit stop conditions, no self-triggering loops).
- **Security:** least-privilege toolsets, WIF instead of keys, masked variables, protected branches, no secrets in repo (Secret Detection proves it).

## 11. Build order (priority phases)
The feature list is all in scope. The order protects the demo: **`main` must always be demoable.**

- **Phase 0: spikes (do first, ~2h).** Confirm in the hackathon project: can we create custom flows + triggers (role)? Which trigger types are available? Are chain triggers on? Does a scheduled/manual pipeline fire a Pipeline-events trigger? Can CI-run flows use `run_command`/file tools? Hosted runners for flows working? Credits per typical session? Is the Claude Code external agent available? Write `docs/adr/0001-loop-wiring.md`.
- **Phase 1: skeleton:** MIT LICENSE, README, Next.js app with Today/Medicines/Caregiver + i18n, Firestore emulator, unit tests, base CI, Docker, Terraform + WIF, deploy to Cloud Run staging/prod. *(Unlocks GCP bonus and pipeline history.)*
- **Phase 2: core loop:** Triage + Builder + Elder-care Reviewer + merge gate + main pipeline with canary/promote/rollback + release. First full hands-off run recorded.
- **Phase 3: signature features:** persona panel (all 5) in MR + verify-live; Sentinel + security templates; Herald multilingual notes.
- **Phase 4: self-healing:** synthetic monitor, Healer, incidents, Scribe postmortems + `AGENTS.md` lessons, Chaos + scoreboard.
- **Phase 5: green + govern:** SCI script + baseline vs smart runs; carbon gate; trust ledger; audit records; policies; PII scan.
- **Phase 6: presentation:** Mission Control, "Something's wrong" button + STT, diary, persona-kit package, docs, video, submission form.

Every phase ends with: a green pipeline on `main`, an updated README, and a few real pipeline runs in history.

## 12. Demo video plan (< 3 min, narrated, no copyrighted music, no third-party logos)
1. **0:00–0:20 Hook:** "For Kamla, a button that's 16 pixels too small means a missed dose. Small teams can't afford a DevOps, QA, security and accessibility team. So we built one out of agents."
2. **0:20–0:35:** A Punjabi voice note via "Something's wrong" → Mission Control shows a translated, triaged issue.
3. **0:35–1:25:** Speed-ramped hands-off run on Mission Control: the ring lights up Plan → Create → Verify (persona cards: Kamla ❌ → fixed ✅) → Secure (Sentinel fixes a vuln) → Package → Configure (terraform plan) → Release (canary) → Monitor. The release shows Hindi/Punjabi notes.
4. **1:25–2:10 The memorable moment:** "@chaos unleash" → staging latency/a11y break → monitor detects → rollback → incident → Healer fix → recovery. Scoreboard updates. Scribe writes a lesson. A later MR cites the lesson.
5. **2:10–2:35 Governed + green:** policy decision table, the `needs-human` exception, trust score change, SCI "41% less CO₂ per deploy than baseline" (use the real measured number).
6. **2:35–2:55 Close:** who it's for, the live URL, the GitLab repo, and "nothing in this video was touched by a human after the first issue" (only say it if true).

## 13. Submission text outline (Devpost form)
- **Inspiration**: the elderly-user problem, one concrete story
- **What it does**: the loop + the 16 features, grouped by stage
- **How we built it**: Duo Agent Platform (list every flow, trigger, and foundational flow), CI/CD, GCP, SCI
- **Challenges**: human-only triggers & how we wired the loop honestly; no merge tool → policy merge gate; credits budget
- **Accomplishments**: measured numbers (MTTR, persona catches, SCI reduction, % hands-off)
- **What we learned / What's next**
- **Environmental opt-in** text: methodology, the SCI formula, coefficients with sources, before/after table, uncertainty disclosure
- Links: repo, live app, Mission Control, video

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Human-only triggers break the loop | §8.3 ladder; self-verifying Builder; deterministic rollback |
| Hackathon role can't create flows/triggers | Phase 0 check; ask in Discord immediately |
| Credits run out (500/month) | Small models where possible, bounded delegations, deterministic checks (personas, SCI, gate) cost zero credits, record demo runs early |
| Flow YAML errors | Follow §5.1 rules; validate in VS Code flow builder; keep minimal working versions |
| Agent produces bad code | Personas + tests + two reviewers + canary + rollback, which is the whole point |
| Cold starts during judging | Consider prod `min-instances=1` during the judging window if the budget allows |
| Demo flakiness | Record the video from real runs early; keep evidence links (pipeline IDs) in `docs/demo-script.md` |
| SCI numbers questioned | Transparent methodology, cited coefficients, bounds, raw data artifacts |
